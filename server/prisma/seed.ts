import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const shows = [
  {
    title: 'The Velvet Contract',
    slug: 'the-velvet-contract',
    shortDescription: 'A ritual of trust, language, and deliberate surrender.',
    fullDescription: 'Enter a private salon where every boundary is spoken, every signal matters, and the evening unfolds through guided BDSM-inspired scenes of trust and control.',
    scareLevel: 2,
    durationMinutes: 60,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, theatrical sound, close-contact performance, verbal participation',
    coverImageUrl: '/images/black-salt-oath.jpg',
    basePriceInCents: 3200
  },
  {
    title: 'The House of Hollow Bells',
    slug: 'house-of-hollow-bells',
    shortDescription: 'A manor of rules, ritual, and beautifully measured control.',
    fullDescription: 'Move through a candlelit house where protocol shapes every encounter. This atmospheric BDSM story explores authority, restraint, and the power of a clearly spoken yes.',
    scareLevel: 2,
    durationMinutes: 60,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, theatrical fog, bells, guided movement',
    coverImageUrl: '/images/hollow-bells.jpg',
    basePriceInCents: 2800
  },
  {
    title: 'The Red Veil Society',
    slug: 'red-veil-society',
    shortDescription: 'A secret society where confidence is your invitation.',
    fullDescription: 'Choose your role, learn the house signals, and take part in an immersive social ritual built around consent, confidence, and the thrill of being seen.',
    scareLevel: 1,
    durationMinutes: 50,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, theatrical fog, social interaction, optional participation',
    coverImageUrl: '/images/red-veil-society.jpg',
    basePriceInCents: 2400
  },
  {
    title: 'The Iron Garden',
    slug: 'the-iron-garden',
    shortDescription: 'A disciplined garden where patience becomes power.',
    fullDescription: 'Follow a structured path through sound, stillness, and ceremony. The Iron Garden is a slow-burn BDSM experience about composure, anticipation, and trust.',
    scareLevel: 2,
    durationMinutes: 75,
    ageRestriction: 18,
    sensoryAdvisories: 'Metallic sound, low lighting, stillness, guided instruction',
    coverImageUrl: '/images/iron-garden.jpg',
    basePriceInCents: 3400
  },
  {
    title: 'Aftercare at Midnight',
    slug: 'aftercare-at-midnight',
    shortDescription: 'A softer room for those who want the story to linger.',
    fullDescription: 'A gentler, intimate experience centred on negotiation, sensation, and aftercare. Come for the atmosphere; leave with a deeper understanding of trust.',
    scareLevel: 1,
    durationMinutes: 60,
    ageRestriction: 18,
    sensoryAdvisories: 'Low lighting, quiet conversation, optional touch, seated scenes',
    coverImageUrl: '/images/aftercare-at-midnight.jpg',
    basePriceInCents: 3000
  },
  {
    title: 'The Nocturne Protocol',
    slug: 'the-nocturne-protocol',
    shortDescription: 'An overnight descent into ritual, roles, and release.',
    fullDescription: 'Stay until morning in our most immersive BDSM story. Negotiate your limits, choose your pace, and let the night become a private performance of trust.',
    scareLevel: 3,
    durationMinutes: 120,
    ageRestriction: 18,
    sensoryAdvisories: 'Overnight stay, low lighting, theatrical sound, guided participation',
    coverImageUrl: '/images/nocturne-protocol.jpg',
    basePriceInCents: 4200
  }
];

const ticketCategories = [
  { name: '1 Hour', fixedPriceInCents: 10000, description: 'One hour experience ticket.' },
  { name: '2 Hours', fixedPriceInCents: 15000, description: 'Two hour experience ticket.' },
  { name: '3 Hours', fixedPriceInCents: 25000, description: 'Three hour experience ticket.' },
  { name: 'Overnight', fixedPriceInCents: 35000, description: 'Overnight experience ticket.' }
];

const addOns = [
  { title: 'Basic Package', description: 'Essential equipment for your experience.', priceInCents: 10000, inventoryStock: 500, imageUrl: '/images/basic-package.jpg' },
  { title: 'Standard Package', description: 'Enhanced equipment for a deeper descent.', priceInCents: 25000, inventoryStock: 500, imageUrl: '/images/standard-package.jpg' },
  { title: 'Exclusive Package', description: 'The complete premium equipment set.', priceInCents: 30000, inventoryStock: 250, imageUrl: '/images/exclusive-package.jpg' }
];

async function main() {
  for (const show of shows) {
    await prisma.show.upsert({
      where: { slug: show.slug },
      update: show,
      create: show
    });
  }

  for (const category of ticketCategories) {
    await prisma.ticketCategory.upsert({
      where: { name: category.name },
      update: category,
      create: category
    });
  }

  for (const addOn of addOns) {
    await prisma.addOn.upsert({
      where: { title: addOn.title },
      update: addOn,
      create: addOn
    });
  }

  const createdShows = await prisma.show.findMany({ select: { id: true, slug: true, durationMinutes: true, basePriceInCents: true } });
  const slots = [];
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);

  for (let day = 0; day < 30; day += 1) {
    for (let quarterHour = 0; quarterHour < 96; quarterHour += 1) {
      const startsAt = new Date(startDate);
      startsAt.setUTCDate(startDate.getUTCDate() + day);
      startsAt.setUTCMinutes(quarterHour * 15);

      for (const show of createdShows) {
        const endsAt = new Date(startsAt);
        endsAt.setUTCMinutes(endsAt.getUTCMinutes() + show.durationMinutes);
        const isPeak = startsAt.getUTCDay() === 5 || startsAt.getUTCDay() === 6;

        slots.push({
          showId: show.id,
          startsAt,
          endsAt,
          totalCapacity: show.slug === 'the-black-salt-oath' ? 30 : 24,
          basePriceInCents: show.basePriceInCents + (isPeak ? 500 : 0),
          isPeak
        });
      }
    }
  }

  await prisma.slot.createMany({ data: slots, skipDuplicates: true });
  console.log(`Seeded ${createdShows.length} shows, ${ticketCategories.length} ticket categories, ${addOns.length} add-ons, and ${slots.length} slots.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });