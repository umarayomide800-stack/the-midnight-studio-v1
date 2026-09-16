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
  { name: 'Adult', priceMultiplier: 1, description: 'Standard admission for guests aged 16 and over.' },
  { name: 'Child', priceMultiplier: 0.75, description: 'Reduced admission for eligible younger guests.' },
  { name: 'VIP FastPass', fixedPriceInCents: 5200, description: 'Priority entry with a complimentary keepsake.' },
  { name: 'Group', priceMultiplier: 0.85, description: 'Reduced rate for groups of 10 or more.' },
  { name: 'Student', priceMultiplier: 0.8, description: 'Discounted admission with valid student identification.' }
];

const addOns = [
  { title: 'Souvenir Photo', description: 'A printed photo from your descent.', priceInCents: 1200, inventoryStock: 500, imageUrl: '/images/souvenir-photo.jpg' },
  { title: 'Tavern Drink Voucher', description: 'One non-alcoholic drink at the dungeon tavern.', priceInCents: 800, inventoryStock: 1000, imageUrl: '/images/tavern-drink.jpg' },
  { title: 'Soma Keepsake Pin', description: 'A limited enamel pin bearing the Soma mark.', priceInCents: 1000, inventoryStock: 250, imageUrl: '/images/keepsake-pin.jpg' }
];

async function main() {
  await prisma.bookingAddOn.deleteMany();
  await prisma.ticketItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.addOn.deleteMany();
  await prisma.ticketCategory.deleteMany();
  await prisma.show.deleteMany();

  await prisma.show.createMany({ data: shows });
  await prisma.ticketCategory.createMany({
    data: ticketCategories.map((category) => ({
      ...category,
      priceMultiplier: category.priceMultiplier
    }))
  });
  await prisma.addOn.createMany({ data: addOns });

  const createdShows = await prisma.show.findMany({ select: { id: true, slug: true, durationMinutes: true, basePriceInCents: true } });
  const slots = [];
  const startDate = new Date();
  startDate.setUTCSeconds(0, 0);
  startDate.setUTCMinutes(startDate.getUTCMinutes() + (15 - (startDate.getUTCMinutes() % 15)));

  for (let day = 0; day < 7; day += 1) {
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

  await prisma.slot.createMany({ data: slots });
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