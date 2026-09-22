import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const shows = [
  {
    title: 'The Black Salt Oath',
    slug: 'the-black-salt-oath',
    shortDescription: 'A forbidden rite beneath the old quarter.',
    fullDescription: 'Follow the trail of a vanished order through flooded crypts, sealed chambers, and a secret that refuses to stay buried.',
    scareLevel: 4,
    durationMinutes: 75,
    ageRestriction: 16,
    sensoryAdvisories: 'Low lighting, smoke effects, sudden sounds, confined spaces',
    coverImageUrl: '/images/black-salt-oath.jpg',
    basePriceInCents: 3200
  },
  {
    title: 'The House of Hollow Bells',
    slug: 'house-of-hollow-bells',
    shortDescription: 'A cursed manor where every bell tolls for someone.',
    fullDescription: 'Enter the abandoned Bellwether house and uncover why its bells still ring long after the family disappeared.',
    scareLevel: 3,
    durationMinutes: 60,
    ageRestriction: 14,
    sensoryAdvisories: 'Flashing lights, theatrical fog, sudden sounds',
    coverImageUrl: '/images/hollow-bells.jpg',
    basePriceInCents: 2800
  },
  {
    title: 'The Red Veil Society',
    slug: 'red-veil-society',
    shortDescription: 'A secret society is recruiting, and you are on the list.',
    fullDescription: 'Solve the Society\'s riddles, earn your invitation, and decide how much of yourself you are willing to leave behind.',
    scareLevel: 2,
    durationMinutes: 50,
    ageRestriction: 12,
    sensoryAdvisories: 'Low lighting, theatrical fog',
    coverImageUrl: '/images/red-veil-society.jpg',
    basePriceInCents: 2400
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

  for (let day = 0; day < 7; day += 1) {
    for (let quarterHour = 40; quarterHour < 88; quarterHour += 1) {
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