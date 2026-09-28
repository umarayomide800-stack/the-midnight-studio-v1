import { Router, type Request, type Response, type NextFunction } from 'express';
import { Resend } from 'resend';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/error.js';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const BANK_NAME = process.env.BANK_ACCOUNT_NAME ?? 'Thornfun Depth Ltd';
const BANK_SORT_CODE = process.env.BANK_SORT_CODE ?? '00-00-00';
const BANK_ACCOUNT_NUMBER = process.env.BANK_ACCOUNT_NUMBER ?? '00000000';

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

router.post('/checkout/confirm-transfer', async (request, response, next) => {
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
      throw new ApiError(409, 'The booking hold has expired.', 'HOLD_EXPIRED');
    }
    if (!booking.ticketItems.some((t) => t.slotId === input.slotId)) {
      throw new ApiError(400, 'The booking does not contain the requested slot.', 'SLOT_MISMATCH');
    }

    const addOnIds = input.addOns.map((a) => a.addOnId);
    const addOns = addOnIds.length ? await prisma.addOn.findMany({ where: { id: { in: addOnIds } } }) : [];
    if (addOns.length !== addOnIds.length) throw new ApiError(400, 'One or more add-ons are invalid.', 'INVALID_ADD_ON');
    const addOnById = new Map(addOns.map((a) => [a.id, a]));
    const addOnTotal = input.addOns.reduce((sum, item) => sum + addOnById.get(item.addOnId)!.priceInCents * item.quantity, 0);
    const totalAmount = booking.totalPaidInCents + addOnTotal;

    const confirmed = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'CONFIRMED', holdExpiresAt: null, totalPaidInCents: totalAmount },
        include: { ticketItems: { include: { ticketCategory: true, slot: true } }, addOns: { include: { addOn: true } } }
      });

      for (const item of input.addOns) {
        const addOn = addOnById.get(item.addOnId)!;
        const stock = await tx.addOn.updateMany({
          where: { id: addOn.id, inventoryStock: { gte: item.quantity } },
          data: { inventoryStock: { decrement: item.quantity } }
        });
        if (stock.count !== 1) throw new ApiError(409, `Add-on is out of stock: ${addOn.title}.`, 'ADD_ON_OUT_OF_STOCK');
        await tx.bookingAddOn.create({ data: { bookingId: booking.id, addOnId: addOn.id, quantity: item.quantity, unitPriceInCents: addOn.priceInCents } });
      }

      const ticketsBySlot = new Map<string, number>();
      for (const t of updated.ticketItems) ticketsBySlot.set(t.slotId, (ticketsBySlot.get(t.slotId) ?? 0) + 1);
      for (const [slotId, count] of ticketsBySlot) {
        await tx.slot.update({ where: { id: slotId }, data: { heldCount: { decrement: count }, bookedCount: { increment: count } } });
      }

      return updated;
    });

    await sendTransferReceipt(confirmed.customerEmail, confirmed.bookingReference, {
      startsAt: confirmed.ticketItems[0]?.slot.startsAt,
      ticketCategories: confirmed.ticketItems.map((t) => t.ticketCategory.name),
      addOns: confirmed.addOns.map((item) => `${item.addOn.title} x${item.quantity}`),
      totalPaidInCents: confirmed.totalPaidInCents
    });

    response.status(201).json(envelope({
      bookingReference: confirmed.bookingReference,
      bookingId: confirmed.id,
      totalPaidInCents: confirmed.totalPaidInCents,
      bank: { name: BANK_NAME, sortCode: BANK_SORT_CODE, accountNumber: BANK_ACCOUNT_NUMBER, reference: confirmed.bookingReference }
    }));
  } catch (error) {
    next(error);
  }
});

// Legacy webhook stub — no-op, kept so any existing webhook registrations don't 404
export async function stripeWebhook(_request: Request, response: Response, _next: NextFunction) {
  response.json({ received: true });
}

async function sendTransferReceipt(email: string, bookingReference: string, details?: { startsAt?: Date; ticketCategories?: string[]; addOns?: string[]; totalPaidInCents?: number }) {
  if (!resend || !process.env.EMAIL_FROM) {
    console.warn('Receipt email skipped — Resend not configured.');
    return;
  }
  const total = `£${((details?.totalPaidInCents ?? 0) / 100).toFixed(2)}`;
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    bcc: process.env.OWNER_EMAIL ? [process.env.OWNER_EMAIL] : undefined,
    subject: `Thornfun Depth booking confirmed — ${bookingReference}`,
    html: `
      <h1>Booking confirmed</h1>
      <p>Reference: <strong>${bookingReference}</strong></p>
      <p>Arrival: <strong>${details?.startsAt?.toISOString() ?? 'See booking details'}</strong></p>
      <p>Tickets: ${details?.ticketCategories?.join(', ') ?? 'See booking details'}</p>
      <p>Add-ons: ${details?.addOns?.join(', ') || 'None'}</p>
      <p>Total: <strong>${total}</strong></p>
      <hr/>
      <h2>Bank Transfer Details</h2>
      <p>Please transfer <strong>${total}</strong> using your booking reference as the payment reference.</p>
      <ul>
        <li>Account name: <strong>${BANK_NAME}</strong></li>
        <li>Sort code: <strong>${BANK_SORT_CODE}</strong></li>
        <li>Account number: <strong>${BANK_ACCOUNT_NUMBER}</strong></li>
        <li>Reference: <strong>${bookingReference}</strong></li>
      </ul>
      <p>Your booking is reserved. Entry will be confirmed once payment clears.</p>
    `
  });
  if (result.error) console.error('Receipt email failed', result.error);
}

export default router;