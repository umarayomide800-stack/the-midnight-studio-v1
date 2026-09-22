import { Router, type Request, type Response, type NextFunction } from 'express';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/error.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const checkoutSchema = z.object({
  bookingId: z.string().min(1),
  slotId: z.string().min(1),
  customerEmail: z.string().email().max(320),
  addOns: z.array(z.object({ addOnId: z.string().min(1), quantity: z.number().int().min(1).max(20) })).max(10).default([])
});

const envelope = <T>(data: T) => ({ success: true, data });

router.get('/bookings/:bookingId/status', async (request, response, next) => {
  try {
    const bookingId = z.string().min(1).parse(request.params.bookingId);
    const email = z.string().email().parse(request.query.email);
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, customerEmail: { equals: email, mode: 'insensitive' } },
      include: {
        ticketItems: {
          include: { ticketCategory: { select: { name: true } }, slot: { select: { startsAt: true, endsAt: true } } }
        }
      }
    });
    if (!booking) throw new ApiError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');

    response.json(envelope({
      status: booking.paymentStatus,
      confirmation: booking.paymentStatus === 'CONFIRMED'
        ? {
            bookingReference: booking.bookingReference,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            totalPaidInCents: booking.totalPaidInCents,
            ticketCount: booking.ticketItems.length,
            ticketCategories: booking.ticketItems.map((ticket) => ticket.ticketCategory.name),
            slot: booking.ticketItems[0]?.slot
          }
        : null
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/checkout/create-intent', async (request, response, next) => {
  try {
    const input = checkoutSchema.parse(request.body);
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { ticketItems: { select: { slotId: true } }, addOns: true }
    });

    if (!booking || booking.customerEmail.toLowerCase() !== input.customerEmail.toLowerCase()) {
      throw new ApiError(404, 'Booking hold not found.', 'BOOKING_NOT_FOUND');
    }
    if (booking.paymentStatus !== 'PENDING' || !booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) {
      throw new ApiError(409, 'The booking hold has expired or is no longer payable.', 'HOLD_EXPIRED');
    }
    if (!booking.ticketItems.some((ticket) => ticket.slotId === input.slotId)) {
      throw new ApiError(400, 'The booking does not contain the requested slot.', 'SLOT_MISMATCH');
    }
    if (booking.stripePaymentIntentId) {
      const existingIntent = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
      response.json(envelope({ clientSecret: existingIntent.client_secret, paymentIntentId: existingIntent.id, bookingId: booking.id }));
      return;
    }

    const addOnIds = input.addOns.map((addOn) => addOn.addOnId);
    const addOns = await prisma.addOn.findMany({ where: { id: { in: addOnIds } } });
    if (addOns.length !== addOnIds.length) throw new ApiError(400, 'One or more add-ons are invalid.', 'INVALID_ADD_ON');
    const addOnById = new Map(addOns.map((addOn) => [addOn.id, addOn]));
    const addOnTotal = input.addOns.reduce((total, item) => total + addOnById.get(item.addOnId)!.priceInCents * item.quantity, 0);
    const amount = booking.totalPaidInCents + addOnTotal;

    const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('placeholder'));
    if (!isStripeConfigured) throw new ApiError(503, 'Online payments are not configured yet.', 'PAYMENTS_NOT_CONFIGURED');
    let clientSecret: string | null = null;
    let paymentIntentId: string;

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'gbp',
      receipt_email: booking.customerEmail,
      metadata: { bookingId: booking.id, slotId: input.slotId }
    });
    clientSecret = intent.client_secret;
    paymentIntentId = intent.id;

    await prisma.$transaction(async (transaction) => {
      const updated = await transaction.booking.updateMany({
        where: { id: booking.id, paymentStatus: 'PENDING', stripePaymentIntentId: null },
        data: { stripePaymentIntentId: paymentIntentId, totalPaidInCents: amount }
      });
      if (updated.count !== 1) throw new ApiError(409, 'This booking is already being checked out.', 'CHECKOUT_CONFLICT');

      for (const item of input.addOns) {
        const addOn = addOnById.get(item.addOnId)!;
        const stock = await transaction.addOn.updateMany({
          where: { id: addOn.id, inventoryStock: { gte: item.quantity } },
          data: { inventoryStock: { decrement: item.quantity } }
        });
        if (stock.count !== 1) throw new ApiError(409, `Add-on is out of stock: ${addOn.title}.`, 'ADD_ON_OUT_OF_STOCK');
        await transaction.bookingAddOn.create({ data: { bookingId: booking.id, addOnId: addOn.id, quantity: item.quantity, unitPriceInCents: addOn.priceInCents } });
      }
    });

    response.status(201).json(envelope({ clientSecret, paymentIntentId, bookingId: booking.id, amount }));
  } catch (error) {
    next(error);
  }
});

export async function stripeWebhook(request: Request, response: Response, next: NextFunction) {
  try {
    const signature = request.headers['stripe-signature'];
    if (typeof signature !== 'string' || !process.env.STRIPE_WEBHOOK_SECRET) throw new ApiError(400, 'Stripe webhook signature is missing.', 'WEBHOOK_SIGNATURE_MISSING');
    const event = stripe.webhooks.constructEvent(request.body as Buffer, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata.bookingId;
      if (!bookingId) throw new ApiError(400, 'PaymentIntent is missing booking metadata.', 'WEBHOOK_METADATA_MISSING');

      const confirmed = await prisma.$transaction(async (transaction) => {
        const booking = await transaction.booking.findUnique({ where: { id: bookingId }, include: { ticketItems: true } });
        if (!booking) throw new ApiError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
        if (booking.paymentStatus === 'CONFIRMED') return booking;
        if (booking.paymentStatus !== 'PENDING' || booking.stripePaymentIntentId !== paymentIntent.id || booking.totalPaidInCents !== paymentIntent.amount) {
          throw new ApiError(409, 'Payment does not match the booking hold.', 'PAYMENT_MISMATCH');
        }
        const confirmed = await transaction.booking.update({
          where: { id: booking.id },
          data: { paymentStatus: 'CONFIRMED', holdExpiresAt: null },
          include: { ticketItems: true }
        });
        const ticketsBySlot = new Map<string, number>();
        for (const ticket of confirmed.ticketItems) ticketsBySlot.set(ticket.slotId, (ticketsBySlot.get(ticket.slotId) ?? 0) + 1);
        for (const [slotId, count] of ticketsBySlot) {
          await transaction.slot.update({ where: { id: slotId }, data: { heldCount: { decrement: count }, bookedCount: { increment: count } } });
        }
        return confirmed;
      });

      await sendReceipt(confirmed.customerEmail, confirmed.bookingReference);
    }

    response.json({ received: true });
  } catch (error) {
    next(error);
  }
}

async function sendReceipt(email: string, bookingReference: string) {
  if (!resend || !process.env.EMAIL_FROM) {
    console.warn('Receipt email skipped because Resend is not configured.');
    return;
  }
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `The Midnight Studio ticket ${bookingReference}`,
    html: `<p>Your The Midnight Studio booking is confirmed.</p><p>Booking reference: <strong>${bookingReference}</strong></p>`
  });
  if (result.error) console.error('Receipt email failed', result.error);
}

export default router;