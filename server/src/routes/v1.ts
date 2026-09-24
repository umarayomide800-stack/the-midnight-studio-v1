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

const defaultShows = [
  {
    id: 'show-1',
    title: 'The Velvet Contract',
    slug: 'the-velvet-contract',
    shortDescription: 'A ritual of trust, language, and deliberate surrender.',
    fullDescription: 'Enter a private salon where every boundary is spoken, every signal matters, and the evening unfolds through guided scenes of trust and control.',
    scareLevel: 2,
    durationMinutes: 60,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, theatrical sound, close-contact performance, verbal participation',
    coverImageUrl: '/images/black-salt-oath.jpg',
    basePriceInCents: 3200,
    isActive: true
  },
  {
    id: 'show-2',
    title: 'The House of Hollow Bells',
    slug: 'house-of-hollow-bells',
    shortDescription: 'A manor of rules, ritual, and beautifully measured control.',
    fullDescription: 'Move through a candlelit house where protocol shapes every encounter. This atmospheric BDSM story explores authority, restraint, and the power of a clearly spoken yes.',
    scareLevel: 2,
    durationMinutes: 60,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, theatrical fog, bells, guided movement',
    coverImageUrl: '/images/hollow-bells.jpg',
    basePriceInCents: 2800,
    isActive: true
  },
  {
    id: 'show-3',
    title: 'The Red Veil Society',
    slug: 'red-veil-society',
    shortDescription: 'A secret society where confidence is your invitation.',
    fullDescription: 'Choose your role, learn the house signals, and take part in an immersive social ritual built around consent, confidence, and the thrill of being seen.',
    scareLevel: 1,
    durationMinutes: 50,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, theatrical fog, social interaction, optional participation',
    coverImageUrl: '/images/red-veil-society.jpg',
    basePriceInCents: 2400,
    isActive: true
  },
  {
    id: 'show-4',
    title: 'The Iron Garden',
    slug: 'the-iron-garden',
    shortDescription: 'A disciplined garden where patience becomes power.',
    fullDescription: 'Follow a structured path through sound, stillness, and ceremony. The Iron Garden is a slow-burn experience about composure, anticipation, and trust.',
    scareLevel: 2,
    durationMinutes: 75,
    ageRestriction: 18,
    sensoryAdvisories: 'Metallic sound, low lighting, stillness, guided instruction',
    coverImageUrl: '/images/iron-garden.jpg',
    basePriceInCents: 3400,
    isActive: true
  },
  {
    id: 'show-5',
    title: 'Aftercare at Midnight',
    slug: 'aftercare-at-midnight',
    shortDescription: 'A softer room for those who want the story to linger.',
    fullDescription: 'A gentler, intimate experience centred on negotiation, sensation, and aftercare. Come for the atmosphere; leave with a deeper understanding of trust.',
    scareLevel: 1,
    durationMinutes: 60,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, quiet conversation, optional touch, seated scenes',
    coverImageUrl: '/images/aftercare-at-midnight.jpg',
    basePriceInCents: 3000,
    isActive: true
  },
  {
    id: 'show-6',
    title: 'The Nocturne Protocol',
    slug: 'the-nocturne-protocol',
    shortDescription: 'An overnight descent into ritual, roles, and release.',
    fullDescription: 'Stay until morning in our most immersive story. Negotiate your limits, choose your pace, and let the night become a private performance of trust.',
    scareLevel: 3,
    durationMinutes: 120,
    ageRestriction: 18,
    sensoryAdvisories: 'Overnight stay, low lighting, theatrical sound, guided participation',
    coverImageUrl: '/images/nocturne-protocol.jpg',
    basePriceInCents: 4200,
    isActive: true
  }
];

const defaultTicketCategories = [
  { id: 'cat-1-hour', name: '1 Hour Experience', fixedPriceInCents: 10000, priceMultiplier: null, description: 'One hour experience ticket.' },
  { id: 'cat-2-hours', name: '2 Hours Experience', fixedPriceInCents: 15000, priceMultiplier: null, description: 'Two hour experience ticket.' },
  { id: 'cat-3-hours', name: '3 Hours Experience', fixedPriceInCents: 25000, priceMultiplier: null, description: 'Three hour experience ticket.' },
  { id: 'cat-overnight', name: 'Overnight Experience', fixedPriceInCents: 35000, priceMultiplier: null, description: 'Overnight experience ticket.' }
];

const defaultAddOns = [
  { id: 'addon-basic', title: 'Basic Package', description: 'Essential equipment for your experience.', priceInCents: 10000, inventoryStock: 500, imageUrl: '/images/basic-package.jpg' },
  { id: 'addon-standard', title: 'Standard Package', description: 'Enhanced equipment for a deeper descent.', priceInCents: 25000, inventoryStock: 500, imageUrl: '/images/standard-package.jpg' },
  { id: 'addon-exclusive', title: 'Exclusive Package', description: 'The complete premium equipment set.', priceInCents: 30000, inventoryStock: 250, imageUrl: '/images/exclusive-package.jpg' }
];

function generateFallbackSlotsForDate(date: string, show: { id: string; slug: string; durationMinutes: number; basePriceInCents: number }) {
  const [year, month, day] = date.split('-').map(Number);
  const slots = [];
  const hours = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  const minutes = [0, 30];

  for (const h of hours) {
    for (const m of minutes) {
      const startsAt = new Date(Date.UTC(year, month - 1, day, h, m, 0));
      const endsAt = new Date(startsAt.getTime() + (show.durationMinutes || 60) * 60 * 1000);
      const isPeak = startsAt.getUTCDay() === 5 || startsAt.getUTCDay() === 6;
      const bookedCount = (h * 2 + m) % 10;
      const totalCapacity = 24;
      slots.push({
        id: `slot-${show.slug}-${date}-${h}-${m}`,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        totalCapacity,
        bookedCount,
        heldCount: 0,
        remainingCapacity: totalCapacity - bookedCount,
        isBlocked: false,
        basePriceInCents: show.basePriceInCents + (isPeak ? 500 : 0),
        isPeak
      });
    }
  }
  return slots;
}

async function ensureSlotsForDate(show: { id: string; slug: string; durationMinutes: number; basePriceInCents: number }, date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const slots = [];
  const isPeakDay = start.getUTCDay() === 5 || start.getUTCDay() === 6;

  for (let quarterHour = 0; quarterHour < 96; quarterHour += 1) {
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

router.get('/shows', async (_request, response, _next) => {
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

    if (shows && shows.length > 0) {
      response.json(responseEnvelope(shows));
      return;
    }
  } catch (error) {
    console.warn('Prisma shows query failed, serving default catalog:', error);
  }

  response.json(responseEnvelope(defaultShows));
});

router.get('/ticket-categories', async (_request, response, _next) => {
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

    if (categories && categories.length > 0) {
      response.json(responseEnvelope(categories.map((cat) => ({
        ...cat,
        priceMultiplier: cat.priceMultiplier ? Number(cat.priceMultiplier) : null
      }))));
      return;
    }
  } catch (error) {
    console.warn('Prisma ticket-categories query failed, serving default categories:', error);
  }

  response.json(responseEnvelope(defaultTicketCategories));
});

router.get('/addons', async (_request, response, _next) => {
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

    if (addOns && addOns.length > 0) {
      response.json(responseEnvelope(addOns));
      return;
    }
  } catch (error) {
    console.warn('Prisma addons query failed, serving default add-ons:', error);
  }

  response.json(responseEnvelope(defaultAddOns));
});

router.get('/shows/:slug/timeslots', async (request, response, next) => {
  try {
    const slug = z.string().min(1).parse(request.params.slug);
    const date = dateSchema.parse(request.query.date);
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    let show = null;
    try {
      show = await prisma.show.findFirst({ where: { slug, isActive: true }, select: { id: true, slug: true, durationMinutes: true, basePriceInCents: true } });
    } catch (e) {
      console.warn('Prisma show lookup error:', e);
    }

    if (!show) {
      show = defaultShows.find((s) => s.slug === slug) ?? defaultShows[0];
    }

    let slots: any[] = [];
    try {
      await ensureSlotsForDate(show, date);
      slots = await prisma.slot.findMany({
        where: { showId: show.id, startsAt: { gte: start, lt: end } },
        orderBy: { startsAt: 'asc' }
      });
    } catch (e) {
      console.warn('Prisma slot generation/lookup error, falling back to procedural slots:', e);
    }

    if (!slots || slots.length === 0) {
      response.json(responseEnvelope({ date, slots: generateFallbackSlotsForDate(date, show) }));
      return;
    }

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