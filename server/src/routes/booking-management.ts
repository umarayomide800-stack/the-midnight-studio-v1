import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/error.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder');
const envelope = <T>(data: T) => ({ success: true, data });
const emailSchema = z.string().email().max(320);

const bookingInclude = {
  ticketItems: { include: { slot: { include: { show: { select: { title: true, slug: true } } } }, ticketCategory: { select: { name: true } } } },
  addOns: { include: { addOn: { select: { title: true } } } }
} as const;

router.get('/bookings/lookup', async (request, response, next) => {
  try {
    const reference = z.string().trim().min(1).parse(request.query.reference);
    const email = emailSchema.parse(request.query.email);
    const booking = await prisma.booking.findFirst({
      where: { bookingReference: { equals: reference, mode: 'insensitive' }, customerEmail: { equals: email, mode: 'insensitive' } },
      include: bookingInclude
    });
    if (!booking) throw new ApiError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
    response.json(envelope(booking));
  } catch (error) { next(error); }
});

router.post('/bookings/:bookingId/cancel', async (request, response, next) => {
  try {
    const bookingId = z.string().min(1).parse(request.params.bookingId);
    const { email } = z.object({ email: emailSchema }).parse(request.body);
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, customerEmail: { equals: email, mode: 'insensitive' } }, include: { ticketItems: true } });
    if (!booking) throw new ApiError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
    if (booking.paymentStatus === 'CANCELLED') return response.json(envelope({ status: 'CANCELLED', refundId: booking.stripeRefundId }));

    let refundId: string | null = null;
    if (booking.paymentStatus === 'CONFIRMED') {
      if (!booking.stripePaymentIntentId || process.env.STRIPE_SECRET_KEY?.includes('placeholder')) {
        throw new ApiError(503, 'Refunds are not configured for this booking.', 'REFUNDS_NOT_CONFIGURED');
      }
      const refund = await stripe.refunds.create({ payment_intent: booking.stripePaymentIntentId, metadata: { bookingId: booking.id } });
      refundId = refund.id;
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const current = await transaction.booking.findUnique({ where: { id: booking.id }, select: { paymentStatus: true, stripeRefundId: true } });
      if (!current || current.paymentStatus === 'CANCELLED') return current;
      const count = booking.ticketItems.length;
      for (const slotId of new Set(booking.ticketItems.map((ticket) => ticket.slotId))) {
        await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${slotId}, 0))`;
      }
      const slotCounts = new Map<string, number>();
      for (const ticket of booking.ticketItems) slotCounts.set(ticket.slotId, (slotCounts.get(ticket.slotId) ?? 0) + 1);
      for (const [slotId, tickets] of slotCounts) {
        await transaction.slot.update({ where: { id: slotId }, data: current.paymentStatus === 'CONFIRMED' ? { bookedCount: { decrement: tickets } } : { heldCount: { decrement: tickets } } });
      }
      return transaction.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'CANCELLED', cancelledAt: new Date(), stripeRefundId: refundId }, select: { paymentStatus: true, stripeRefundId: true } });
    });
    response.json(envelope({ status: updated?.paymentStatus, refundId: updated?.stripeRefundId ?? refundId }));
  } catch (error) { next(error); }
});

router.post('/bookings/:bookingId/reschedule', async (request, response, next) => {
  try {
    const bookingId = z.string().min(1).parse(request.params.bookingId);
    const input = z.object({ email: emailSchema, slotId: z.string().min(1) }).parse(request.body);
    const booking = await prisma.booking.findFirst({ where: { id: bookingId, customerEmail: { equals: input.email, mode: 'insensitive' }, paymentStatus: { in: ['PENDING', 'CONFIRMED'] } }, include: { ticketItems: true } });
    if (!booking) throw new ApiError(404, 'Active booking not found.', 'BOOKING_NOT_FOUND');
    if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) throw new ApiError(409, 'The booking hold has expired.', 'HOLD_EXPIRED');
    const ticketCount = booking.ticketItems.length;
    const oldSlotIds = [...new Set(booking.ticketItems.map((ticket) => ticket.slotId))];
    const updated = await prisma.$transaction(async (transaction) => {
      for (const slotId of [...oldSlotIds, input.slotId].filter((slotId, index, list) => list.indexOf(slotId) === index).sort()) {
        await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${slotId}, 0))`;
      }
      const newSlot = await transaction.slot.findUnique({ where: { id: input.slotId } });
      if (!newSlot || newSlot.startsAt <= new Date() || newSlot.isBlocked || newSlot.bookedCount + newSlot.heldCount + ticketCount > newSlot.totalCapacity) {
        throw new ApiError(409, 'The requested timeslot is unavailable.', 'SLOT_UNAVAILABLE');
      }
      const oldCounts = new Map<string, number>();
      for (const ticket of booking.ticketItems) oldCounts.set(ticket.slotId, (oldCounts.get(ticket.slotId) ?? 0) + 1);
      for (const [slotId, count] of oldCounts) {
        await transaction.slot.update({ where: { id: slotId }, data: booking.paymentStatus === 'CONFIRMED' ? { bookedCount: { decrement: count } } : { heldCount: { decrement: count } } });
      }
      await transaction.slot.update({ where: { id: input.slotId }, data: booking.paymentStatus === 'CONFIRMED' ? { bookedCount: { increment: ticketCount } } : { heldCount: { increment: ticketCount } } });
      await transaction.ticketItem.updateMany({ where: { bookingId: booking.id }, data: { slotId: input.slotId } });
      return transaction.booking.findUnique({ where: { id: booking.id }, include: bookingInclude });
    });
    response.json(envelope(updated));
  } catch (error) { next(error); }
});

export default router;
