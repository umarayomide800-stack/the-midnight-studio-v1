import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/admin.js';
import { ApiError } from '../middleware/error.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder');
const envelope = <T>(data: T) => ({ success: true, data });
const idSchema = z.string().min(1);

router.use(requireAdmin);

router.get('/shows', async (_request, response, next) => {
  try {
    response.json(envelope(await prisma.show.findMany({ orderBy: { title: 'asc' }, include: { _count: { select: { slots: true } } } })));
  } catch (error) { next(error); }
});

router.patch('/shows/:showId', async (request, response, next) => {
  try {
    const showId = idSchema.parse(request.params.showId);
    const input = z.object({
      title: z.string().trim().min(2).max(120).optional(),
      shortDescription: z.string().trim().min(2).max(500).optional(),
      fullDescription: z.string().trim().min(2).max(5000).optional(),
      basePriceInCents: z.number().int().min(0).max(1000000).optional(),
      isActive: z.boolean().optional()
    }).parse(request.body);
    response.json(envelope(await prisma.show.update({ where: { id: showId }, data: input })));
  } catch (error) { next(error); }
});

router.get('/slots', async (request, response, next) => {
  try {
    const from = z.coerce.date().optional().parse(request.query.from) ?? new Date();
    const to = z.coerce.date().optional().parse(request.query.to) ?? new Date(Date.now() + 14 * 86400000);
    response.json(envelope(await prisma.slot.findMany({
      where: { startsAt: { gte: from, lt: to } }, orderBy: { startsAt: 'asc' },
      include: { show: { select: { title: true, slug: true } } }
    })));
  } catch (error) { next(error); }
});

router.patch('/slots/:slotId', async (request, response, next) => {
  try {
    const slotId = idSchema.parse(request.params.slotId);
    const input = z.object({
      isBlocked: z.boolean().optional(),
      totalCapacity: z.number().int().min(0).max(1000).optional(),
      basePriceInCents: z.number().int().min(0).max(1000000).optional()
    }).parse(request.body);
    const slot = await prisma.slot.findUnique({ where: { id: slotId } });
    if (!slot) throw new ApiError(404, 'Slot not found.', 'SLOT_NOT_FOUND');
    if (input.totalCapacity !== undefined && input.totalCapacity < slot.bookedCount + slot.heldCount) {
      throw new ApiError(409, 'Capacity cannot be below tickets already held or booked.', 'CAPACITY_TOO_LOW');
    }
    response.json(envelope(await prisma.slot.update({ where: { id: slotId }, data: input })));
  } catch (error) { next(error); }
});

router.get('/bookings', async (request, response, next) => {
  try {
    const search = z.string().trim().max(320).optional().parse(request.query.search);
    response.json(envelope(await prisma.booking.findMany({
      where: search ? { OR: [
        { bookingReference: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } }
      ] } : undefined,
      orderBy: { createdAt: 'desc' }, take: 500,
      include: { ticketItems: { include: { slot: true, ticketCategory: true } }, addOns: { include: { addOn: true } } }
    })));
  } catch (error) { next(error); }
});

router.get('/bookings/export.csv', async (_request, response, next) => {
  try {
    const bookings = await prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, include: { ticketItems: { include: { slot: true } } } });
    const escape = (value: string | number | Date | null) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = bookings.map((booking) => [booking.bookingReference, booking.customerName, booking.customerEmail, booking.paymentStatus, booking.totalPaidInCents / 100, booking.ticketItems.length, booking.ticketItems[0]?.slot.startsAt.toISOString()].map(escape).join(','));
    response.type('text/csv').send(['reference,name,email,status,total_gbp,tickets,starts_at', ...rows].join('\n'));
  } catch (error) { next(error); }
});

export default router;