import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../middleware/error.js';

const router = Router();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must use YYYY-MM-DD format').refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
}, 'date must be a valid calendar date');

const holdSchema = z.object({
  slotId: z.string().min(1),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().email().max(320),
  tickets: z.array(z.object({
    ticketCategoryId: z.string().min(1),
    quantity: z.number().int().min(1).max(20)
  })).min(1).max(5)
}).superRefine((value, context) => {
  const categoryIds = value.tickets.map((ticket) => ticket.ticketCategoryId);
  if (new Set(categoryIds).size !== categoryIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['tickets'], message: 'Each ticket category may appear only once.' });
  }
});

const response = <T>(data: T) => ({ success: true, data });

export async function releaseExpiredHolds() {
  return prisma.$transaction(async (transaction) => {
    const expiredHolds = await transaction.booking.findMany({
      where: { paymentStatus: 'PENDING', holdExpiresAt: { lt: new Date() } },
      select: { id: true, ticketItems: { select: { slotId: true } } }
    });
    let releasedBookings = 0;

    for (const expiredHold of expiredHolds) {
      const cancelled = await transaction.booking.updateMany({
        where: { id: expiredHold.id, paymentStatus: 'PENDING' },
        data: { paymentStatus: 'CANCELLED' }
      });
      if (cancelled.count !== 1) continue;

      const counts = new Map<string, number>();
      for (const ticket of expiredHold.ticketItems) counts.set(ticket.slotId, (counts.get(ticket.slotId) ?? 0) + 1);
      for (const [slotId, count] of counts) {
        await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${slotId}, 0))`;
        await transaction.slot.update({ where: { id: slotId }, data: { heldCount: { decrement: count } } });
      }
      releasedBookings += 1;
    }

    return releasedBookings;
  });
}

function toSlotResponse(slot: { id: string; startsAt: Date; endsAt: Date; totalCapacity: number; heldCount: number; bookedCount: number; basePriceInCents: number; isPeak: boolean; isBlocked: boolean }) {
  return {
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    totalCapacity: slot.totalCapacity,
    bookedCount: slot.bookedCount,
    heldCount: slot.heldCount,
    remainingCapacity: slot.isBlocked ? 0 : Math.max(0, slot.totalCapacity - slot.bookedCount - slot.heldCount),
    isBlocked: slot.isBlocked,
    basePriceInCents: slot.basePriceInCents,
    isPeak: slot.isPeak
  };
}

async function ensureSlotsForDate(show: { id: string; slug: string; durationMinutes: number; basePriceInCents: number }, date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const slots = [];
  const isPeakDay = start.getUTCDay() === 5 || start.getUTCDay() === 6;

  for (let quarterHour = 40; quarterHour < 88; quarterHour += 1) {
    const startsAt = new Date(start);
    startsAt.setUTCMinutes(quarterHour * 15);
    const endsAt = new Date(startsAt);
    endsAt.setUTCMinutes(endsAt.getUTCMinutes() + show.durationMinutes);
    slots.push({
      showId: show.id,
      startsAt,
      endsAt,
      totalCapacity: show.slug === 'the-black-salt-oath' ? 30 : 24,
      basePriceInCents: show.basePriceInCents + (isPeakDay ? 500 : 0),
      isPeak: isPeakDay
    });
  }

  await prisma.slot.createMany({ data: slots, skipDuplicates: true });
}

router.get('/shows', async (_request, response, next) => {
  try {
    const shows = await prisma.show.findMany({
      where: { isActive: true },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        shortDescription: true,
        fullDescription: true,
        scareLevel: true,
        durationMinutes: true,
        ageRestriction: true,
        sensoryAdvisories: true,
        coverImageUrl: true,
        isActive: true
      }
    });

    response.json(responseEnvelope(shows));
  } catch (error) {
    next(error);
  }
});

router.get('/ticket-categories', async (_request, response, next) => {
  try {
    const categories = await prisma.ticketCategory.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        priceMultiplier: true,
        fixedPriceInCents: true,
        description: true
      }
    });

    response.json(responseEnvelope(categories.map((cat) => ({
      ...cat,
      priceMultiplier: cat.priceMultiplier ? Number(cat.priceMultiplier) : null
    }))));
  } catch (error) {
    next(error);
  }
});

router.get('/addons', async (_request, response, next) => {
  try {
    const addOns = await prisma.addOn.findMany({
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        priceInCents: true,
        inventoryStock: true,
        imageUrl: true
      }
    });

    response.json(responseEnvelope(addOns));
  } catch (error) {
    next(error);
  }
});

router.get('/shows/:slug/timeslots', async (request, response, next) => {
  try {
    const slug = z.string().min(1).parse(request.params.slug);
    const date = dateSchema.parse(request.query.date);
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const show = await prisma.show.findFirst({ where: { slug, isActive: true }, select: { id: true, slug: true, durationMinutes: true, basePriceInCents: true } });
    if (!show) {
      throw new ApiError(404, 'Show not found.', 'SHOW_NOT_FOUND');
    }

    await ensureSlotsForDate(show, date);

    const slots = await prisma.slot.findMany({
      where: { showId: show.id, startsAt: { gte: start, lt: end } },
      orderBy: { startsAt: 'asc' }
    });

    response.json(responseEnvelope({ date, slots: slots.map(toSlotResponse) }));
  } catch (error) {
    next(error);
  }
});

router.post('/bookings/hold-slot', async (request, response, next) => {
  try {
    const input = holdSchema.parse(request.body);
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const ticketCount = input.tickets.reduce((total, ticket) => total + ticket.quantity, 0);
    await releaseExpiredHolds();

    const booking = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.slotId}, 0))`;

      const updated = await transaction.$executeRaw`
        UPDATE "Slot"
        SET "heldCount" = "heldCount" + ${ticketCount}
        WHERE "id" = ${input.slotId}
          AND "startsAt" > NOW()
          AND "isBlocked" = false
          AND "bookedCount" + "heldCount" + ${ticketCount} <= "totalCapacity"
      `;
      if (updated !== 1) {
        throw new ApiError(409, 'The timeslot is unavailable or does not have enough capacity.', 'SLOT_UNAVAILABLE');
      }

      const slot = await transaction.slot.findUnique({ where: { id: input.slotId }, select: { basePriceInCents: true } });
      if (!slot) throw new ApiError(404, 'Timeslot not found.', 'SLOT_NOT_FOUND');

      const categories = await transaction.ticketCategory.findMany({ where: { id: { in: input.tickets.map((ticket) => ticket.ticketCategoryId) } } });
      if (categories.length !== input.tickets.length) throw new ApiError(400, 'One or more ticket categories are invalid.', 'INVALID_TICKET_CATEGORY');

      const categoryById = new Map(categories.map((category) => [category.id, category]));
      const ticketItems = input.tickets.flatMap((ticket) => {
        const category = categoryById.get(ticket.ticketCategoryId)!;
        const priceInCents = category.fixedPriceInCents ?? Math.round(slot.basePriceInCents * Number(category.priceMultiplier ?? 1));
        return Array.from({ length: ticket.quantity }, () => ({ ticketCategoryId: category.id, priceInCents, slotId: input.slotId }));
      });
      const totalPaidInCents = ticketItems.reduce((total, ticket) => total + ticket.priceInCents, 0);
      const created = await transaction.booking.create({
        data: {
          bookingReference: `TMS-${randomBytes(4).toString('hex').toUpperCase()}`,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          totalPaidInCents,
          holdExpiresAt,
          ticketItems: { create: ticketItems }
        },
        select: { id: true, bookingReference: true, totalPaidInCents: true, paymentStatus: true, holdExpiresAt: true, ticketItems: { select: { slotId: true } } }
      });

      return created;
    });

    response.status(201).json(responseEnvelope(booking));
  } catch (error) {
    next(error);
  }
});

function responseEnvelope<T>(data: T) {
  return response(data);
}

export default router;