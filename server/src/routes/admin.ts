import { Router } from 'express';
import Stripe from 'stripe';
import { Resend } from 'resend';
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

// ── Manual booking status update ─────────────────────────────────────────────
router.patch('/bookings/:bookingId/status', async (request, response, next) => {
  try {
    const bookingId = idSchema.parse(request.params.bookingId);
    const { status } = z.object({ status: z.enum(['CONFIRMED', 'CANCELLED']) }).parse(request.body);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { ticketItems: true } });
    if (!booking) throw new ApiError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');

    if (status === 'CANCELLED' && booking.paymentStatus !== 'CANCELLED') {
      await prisma.$transaction(async (tx) => {
        const slotCounts = new Map<string, number>();
        for (const t of booking.ticketItems) slotCounts.set(t.slotId, (slotCounts.get(t.slotId) ?? 0) + 1);
        for (const [slotId, count] of slotCounts) {
          const field = booking.paymentStatus === 'CONFIRMED' ? { bookedCount: { decrement: count } } : { heldCount: { decrement: count } };
          await tx.slot.update({ where: { id: slotId }, data: field });
        }
        await tx.booking.update({ where: { id: bookingId }, data: { paymentStatus: 'CANCELLED', cancelledAt: new Date() } });
      });
    } else if (status === 'CONFIRMED' && booking.paymentStatus === 'PENDING') {
      await prisma.$transaction(async (tx) => {
        const slotCounts = new Map<string, number>();
        for (const t of booking.ticketItems) slotCounts.set(t.slotId, (slotCounts.get(t.slotId) ?? 0) + 1);
        for (const [slotId, count] of slotCounts) {
          await tx.slot.update({ where: { id: slotId }, data: { heldCount: { decrement: count }, bookedCount: { increment: count } } });
        }
        await tx.booking.update({ where: { id: bookingId }, data: { paymentStatus: 'CONFIRMED', holdExpiresAt: null } });
      });
    }

    response.json(envelope(await prisma.booking.findUnique({ where: { id: bookingId } })));
  } catch (error) { next(error); }
});

// ── Send email to customer ────────────────────────────────────────────────────
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const emailTemplates = {
  payment_request: (name: string, paymentLink: string) => ({
    subject: 'Thornfun Depths — Complete Your Payment',
    text: `Hi ${name},\n\nYour slot is reserved. To confirm your booking, complete payment via the link below:\n\n${paymentLink}\n\nPayment must be completed within 48 hours or your slot will be released.\n\nThornfun Depths`
  }),
  location_reveal: (name: string, date: string, time: string, address: string) => ({
    subject: 'Thornfun Depths — Your Location Details',
    text: `Hi ${name},\n\nPayment confirmed. Here are your details:\n\nDate: ${date}\nTime: ${time}\nLocation: ${address}\n\nDo not share this address. Arrive alone or with your confirmed group only. You will be greeted at the door.\n\nThornfun Depths`
  }),
  protocol_reminder: (name: string) => ({
    subject: 'Thornfun Depths — Before You Arrive',
    text: `Hi ${name},\n\nA few things before you arrive:\n\n— A safe word will be established on arrival. Use it at any time, no questions asked.\n— Stay within your booked experience. Do not wander.\n— No phones or recording devices inside.\n— Late arrivals more than 15 minutes past your slot forfeit their booking.\n\nThornfun Depths`
  }),
  booking_confirmed: (name: string, reference: string) => ({
    subject: 'Thornfun Depths — Booking Confirmed',
    text: `Hi ${name},\n\nThanks for booking with Thornfun Depths.\n\nYour booking reference is: ${reference}\n\nWe have received your request and will confirm your slot within 24 hours. Please do not share or discuss your booking publicly — discretion is part of the experience.\n\nIf you have any questions, reply to this email.\n\nThornfun Depths`
  }),
  cancellation: (name: string) => ({
    subject: 'Thornfun Depths — Booking Cancelled',
    text: `Hi ${name},\n\nYour booking has been cancelled.\n\nCancellations made more than 48 hours before your slot receive a full refund. Inside 48 hours, no refund is issued.\n\nIf you would like to rebook, reply to this email.\n\nThornfun Depths`
  }),
  custom: (_name: string, subject: string, body: string) => ({
    subject,
    text: body
  })
} as const;

type TemplateKey = keyof typeof emailTemplates;

router.post('/bookings/:bookingId/email', async (request, response, next) => {
  try {
    const bookingId = idSchema.parse(request.params.bookingId);
    const input = z.object({
      template: z.enum(['payment_request', 'location_reveal', 'protocol_reminder', 'booking_confirmed', 'cancellation', 'custom']),
      vars: z.record(z.string()).optional().default({})
    }).parse(request.body);

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new ApiError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
    if (!resend || !process.env.EMAIL_FROM) throw new ApiError(503, 'Email is not configured.', 'EMAIL_NOT_CONFIGURED');

    const fn = emailTemplates[input.template as TemplateKey] as (...args: string[]) => { subject: string; text: string };
    const vars = input.vars;
    let emailContent: { subject: string; text: string };

    if (input.template === 'payment_request') {
      emailContent = fn(booking.customerName, vars.paymentLink ?? '[payment link]');
    } else if (input.template === 'location_reveal') {
      emailContent = fn(booking.customerName, vars.date ?? '[date]', vars.time ?? '[time]', vars.address ?? '[address]');
    } else if (input.template === 'custom') {
      emailContent = fn(booking.customerName, vars.subject ?? 'Message from Thornfun Depths', vars.body ?? '');
    } else {
      emailContent = fn(booking.customerName, booking.bookingReference);
    }

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [booking.customerEmail],
      subject: emailContent.subject,
      text: emailContent.text
    });

    if (result.error) throw new ApiError(502, 'Email could not be sent.', 'EMAIL_FAILED');
    response.status(201).json(envelope({ sent: true, to: booking.customerEmail }));
  } catch (error) { next(error); }
});

// ── Stats overview ────────────────────────────────────────────────────────────
router.get('/stats', async (_request, response, next) => {
  try {
    const [totalBookings, confirmedBookings, pendingBookings, cancelledBookings, revenueResult, upcomingSlots] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { paymentStatus: 'CONFIRMED' } }),
      prisma.booking.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.booking.count({ where: { paymentStatus: 'CANCELLED' } }),
      prisma.booking.aggregate({ where: { paymentStatus: 'CONFIRMED' }, _sum: { totalPaidInCents: true } }),
      prisma.slot.count({ where: { startsAt: { gte: new Date() }, isBlocked: false, bookedCount: { gt: 0 } } })
    ]);
    response.json(envelope({
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      totalRevenueInCents: revenueResult._sum.totalPaidInCents ?? 0,
      upcomingSlots
    }));
  } catch (error) { next(error); }
});

export default router;