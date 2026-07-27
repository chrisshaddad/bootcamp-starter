import { PrismaClient } from '../../src/generated/prisma/client';

interface AuthorSeed {
  key: string;
  name: string;
  bio?: string;
  nationality?: string;
  birthYear?: number;
  photoUrl?: string;
}

interface CategorySeed {
  key: string;
  name: string;
  description?: string;
}

interface PublisherSeed {
  key: string;
  name: string;
  email?: string;
  website?: string;
  address?: string;
}

interface BookCopySeed {
  barcode: string;
  status?: 'AVAILABLE' | 'ON_LOAN' | 'RESERVED' | 'LOST' | 'MAINTENANCE';
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  acquiredAt?: Date;
}

interface BookConditionPriceSeed {
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  buyPrice: string;
}

interface BookSeed {
  title: string;
  isbn?: string;
  description?: string;
  publishedDate?: Date;
  language?: string;
  pageCount?: number;
  coverUrl?: string;
  conditionPrices?: BookConditionPriceSeed[];
  edition?: string;
  publisherKey?: string;
  authorKeys: string[];
  categoryKeys: string[];
  copies: BookCopySeed[];
}

interface CatalogSeed {
  organizationSlug: string;
  authors: AuthorSeed[];
  categories: CategorySeed[];
  publishers: PublisherSeed[];
  books: BookSeed[];
}

const CATALOGS: CatalogSeed[] = [
  {
    organizationSlug: 'techcorp-solutions',
    authors: [
      {
        key: 'octavia-butler',
        name: 'Octavia E. Butler',
        bio: 'Award-winning speculative fiction author.',
        nationality: 'American',
        birthYear: 1947,
      },
      {
        key: 'andy-weir',
        name: 'Andy Weir',
        nationality: 'American',
        birthYear: 1972,
      },
      {
        key: 'ursula-le-guin',
        name: 'Ursula K. Le Guin',
        nationality: 'American',
        birthYear: 1929,
      },
    ],
    categories: [
      {
        key: 'science-fiction',
        name: 'Science Fiction',
        description: 'Speculative fiction, future technology, and space.',
      },
      {
        key: 'classics',
        name: 'Classics',
        description: 'Enduring works used for study and discussion.',
      },
    ],
    publishers: [
      {
        key: 'penguin-random-house',
        name: 'Penguin Random House',
        website: 'https://www.penguinrandomhouse.com',
      },
      {
        key: 'crown',
        name: 'Crown Publishing',
      },
    ],
    books: [
      {
        title: 'Kindred',
        isbn: '9780807083697',
        description: 'A modern classic of speculative fiction.',
        publishedDate: new Date('1979-06-01'),
        language: 'English',
        pageCount: 288,
        conditionPrices: [
          { condition: 'GOOD', buyPrice: '16.99' },
          { condition: 'FAIR', buyPrice: '12.99' },
        ],
        edition: 'Paperback',
        publisherKey: 'penguin-random-house',
        authorKeys: ['octavia-butler'],
        categoryKeys: ['science-fiction', 'classics'],
        copies: [
          {
            barcode: 'TC-KIN-001',
            status: 'AVAILABLE',
            condition: 'GOOD',
          },
          {
            barcode: 'TC-KIN-002',
            status: 'ON_LOAN',
            condition: 'FAIR',
          },
        ],
      },
      {
        title: 'The Martian',
        isbn: '9780553418026',
        description: 'A stranded astronaut uses engineering to survive Mars.',
        publishedDate: new Date('2014-02-11'),
        language: 'English',
        pageCount: 369,
        conditionPrices: [
          { condition: 'NEW', buyPrice: '18.00' },
          { condition: 'GOOD', buyPrice: '15.00' },
        ],
        edition: 'Paperback',
        publisherKey: 'crown',
        authorKeys: ['andy-weir'],
        categoryKeys: ['science-fiction'],
        copies: [
          {
            barcode: 'TC-MAR-001',
            status: 'AVAILABLE',
            condition: 'NEW',
          },
          {
            barcode: 'TC-MAR-002',
            status: 'RESERVED',
            condition: 'GOOD',
          },
        ],
      },
      {
        title: 'The Left Hand of Darkness',
        isbn: '9780441478125',
        publishedDate: new Date('1969-03-01'),
        language: 'English',
        pageCount: 304,
        conditionPrices: [{ condition: 'DAMAGED', buyPrice: '8.00' }],
        authorKeys: ['ursula-le-guin'],
        categoryKeys: ['science-fiction', 'classics'],
        copies: [
          {
            barcode: 'TC-LHD-001',
            status: 'MAINTENANCE',
            condition: 'DAMAGED',
          },
        ],
      },
    ],
  },
  {
    organizationSlug: 'green-energy-partners',
    authors: [
      {
        key: 'jane-austen',
        name: 'Jane Austen',
        nationality: 'British',
        birthYear: 1775,
      },
      {
        key: 'ta-nehisi-coates',
        name: 'Ta-Nehisi Coates',
        nationality: 'American',
        birthYear: 1975,
      },
    ],
    categories: [
      {
        key: 'literary-fiction',
        name: 'Literary Fiction',
      },
      {
        key: 'history',
        name: 'History',
      },
    ],
    publishers: [
      {
        key: 'vintage',
        name: 'Vintage Books',
      },
      {
        key: 'one-world',
        name: 'One World',
        website: 'https://www.penguinrandomhouse.com/imprints/OWR/one-world',
      },
    ],
    books: [
      {
        title: 'Pride and Prejudice',
        isbn: '9780141439518',
        publishedDate: new Date('1813-01-28'),
        language: 'English',
        pageCount: 432,
        conditionPrices: [
          { condition: 'GOOD', buyPrice: '10.00' },
          { condition: 'POOR', buyPrice: '6.00' },
        ],
        publisherKey: 'vintage',
        authorKeys: ['jane-austen'],
        categoryKeys: ['literary-fiction', 'history'],
        copies: [
          {
            barcode: 'GE-PP-001',
            status: 'AVAILABLE',
            condition: 'GOOD',
          },
          {
            barcode: 'GE-PP-002',
            status: 'LOST',
            condition: 'POOR',
          },
        ],
      },
      {
        title: 'Between the World and Me',
        isbn: '9780812993547',
        publishedDate: new Date('2015-07-14'),
        language: 'English',
        pageCount: 176,
        conditionPrices: [{ condition: 'NEW', buyPrice: '26.00' }],
        publisherKey: 'one-world',
        authorKeys: ['ta-nehisi-coates'],
        categoryKeys: ['history'],
        copies: [
          {
            barcode: 'GE-BWM-001',
            status: 'AVAILABLE',
            condition: 'NEW',
          },
        ],
      },
    ],
  },
  {
    organizationSlug: 'healthfirst-medical-group',
    authors: [
      {
        key: 'siddhartha-mukherjee',
        name: 'Siddhartha Mukherjee',
        nationality: 'Indian-American',
        birthYear: 1970,
      },
    ],
    categories: [
      {
        key: 'medicine',
        name: 'Medicine',
        description: 'Clinical medicine, public health, and medical history.',
      },
    ],
    publishers: [
      {
        key: 'scribner',
        name: 'Scribner',
      },
    ],
    books: [
      {
        title: 'The Emperor of All Maladies',
        isbn: '9781439170915',
        description: 'A biography of cancer.',
        publishedDate: new Date('2010-11-16'),
        language: 'English',
        pageCount: 592,
        conditionPrices: [{ condition: 'GOOD', buyPrice: '22.00' }],
        publisherKey: 'scribner',
        authorKeys: ['siddhartha-mukherjee'],
        categoryKeys: ['medicine'],
        copies: [
          {
            // On loan to HF-0001 via the OVERDUE rental seeded in seedCirculation.
            barcode: 'HF-EOM-001',
            status: 'ON_LOAN',
            condition: 'GOOD',
          },
          {
            barcode: 'HF-EOM-002',
            status: 'RESERVED',
            condition: 'GOOD',
          },
        ],
      },
    ],
  },
];

interface BulkBookSeed {
  title: string;
  isbn: string;
  description: string;
  publishedDate: Date;
  pageCount: number;
  edition: string;
  authorKey: string;
  categoryKeys: string[];
  publisherKey: string;
  // Total physical copies to stock. Exactly one is seeded ON_LOAN (matched
  // to a rental by seedCirculation's TechCorp bulk-activity generator,
  // which expects one on-loan "TC-EXT-*" copy per book); the rest are
  // AVAILABLE across a mix of conditions.
  copies: number;
}

// Extra TechCorp authors/categories/publishers for the bulk catalog below -
// broadens the genre mix beyond the 3 curated sci-fi/classics authors above.
const TECHCORP_BULK_AUTHORS: AuthorSeed[] = [
  {
    key: 'frank-herbert',
    name: 'Frank Herbert',
    bio: 'American science fiction author best known for the Dune saga.',
    nationality: 'American',
    birthYear: 1920,
  },
  {
    key: 'isaac-asimov',
    name: 'Isaac Asimov',
    bio: 'Prolific American author and biochemist, a founding figure of hard science fiction.',
    nationality: 'American',
    birthYear: 1920,
  },
  {
    key: 'j-r-r-tolkien',
    name: 'J.R.R. Tolkien',
    bio: 'English writer and philologist, author of The Hobbit and The Lord of the Rings.',
    nationality: 'British',
    birthYear: 1892,
  },
  {
    key: 'brandon-sanderson',
    name: 'Brandon Sanderson',
    bio: 'American fantasy author known for the Mistborn and Stormlight Archive series.',
    nationality: 'American',
    birthYear: 1975,
  },
  {
    key: 'agatha-christie',
    name: 'Agatha Christie',
    bio: 'English writer renowned as the best-selling novelist of all time, creator of Hercule Poirot and Miss Marple.',
    nationality: 'British',
    birthYear: 1890,
  },
  {
    key: 'arthur-conan-doyle',
    name: 'Sir Arthur Conan Doyle',
    bio: 'British writer and physician, creator of the detective Sherlock Holmes.',
    nationality: 'British',
    birthYear: 1859,
  },
  {
    key: 'yuval-noah-harari',
    name: 'Yuval Noah Harari',
    bio: 'Israeli historian and author of popular works on history and the future of humanity.',
    nationality: 'Israeli',
    birthYear: 1976,
  },
  {
    key: 'michelle-obama',
    name: 'Michelle Obama',
    bio: 'American attorney and author who served as First Lady of the United States.',
    nationality: 'American',
    birthYear: 1964,
  },
];

const TECHCORP_BULK_CATEGORIES: CategorySeed[] = [
  { key: 'fantasy', name: 'Fantasy' },
  { key: 'mystery', name: 'Mystery' },
  { key: 'non-fiction', name: 'Non-Fiction' },
];

// Publishers referenced by the bulk catalog below, keyed the same way as
// TECHCORP_CATALOGS' publishers. 'crown' is deliberately omitted - it
// already exists in the curated TechCorp catalog above and is looked up by
// name rather than recreated (see seedTechCorpBulkCatalog).
const TECHCORP_BULK_PUBLISHERS: PublisherSeed[] = [
  { key: 'ace-books', name: 'Ace Books' },
  { key: 'bantam-spectra', name: 'Bantam Spectra' },
  { key: 'houghton-mifflin', name: 'Houghton Mifflin' },
  { key: 'tor-books', name: 'Tor Books', website: 'https://www.tor.com' },
  { key: 'collins-crime-club', name: 'Collins Crime Club' },
  { key: 'ward-lock', name: 'Ward Lock & Co' },
  { key: 'george-newnes', name: 'George Newnes' },
  { key: 'harper', name: 'Harper', website: 'https://www.harpercollins.com' },
  { key: 'four-walls-eight-windows', name: 'Four Walls Eight Windows' },
  { key: 'doubleday', name: 'Doubleday' },
  { key: 'ballantine-books', name: 'Ballantine Books' },
  { key: 'harper-row', name: 'Harper & Row' },
  { key: 'parnassus-press', name: 'Parnassus Press' },
];

// A page of Books past 20/page for the staff /books list - real, varied
// titles rather than "Book 1"/"Book 2" placeholders, fully filled in
// (description, publisher, ISBN, page count, edition, stock). Each book gets
// exactly one ON_LOAN copy (matched to a rental by seedCirculation's
// TechCorp bulk-activity generator) plus `copies - 1` AVAILABLE copies.
const TECHCORP_BULK_BOOKS: BulkBookSeed[] = [
  {
    title: 'Dune',
    isbn: '9780441172719',
    description:
      "A young noble's family accepts stewardship of the desert planet Arrakis, the only source of the universe's most valuable substance.",
    publishedDate: new Date('1965-08-01'),
    pageCount: 412,
    edition: 'Mass Market Paperback',
    authorKey: 'frank-herbert',
    categoryKeys: ['science-fiction'],
    publisherKey: 'ace-books',
    copies: 5,
  },
  {
    title: 'Foundation',
    isbn: '9780553293357',
    description:
      "As the Galactic Empire crumbles, a mathematician devises a plan to preserve civilization's knowledge for the ages.",
    publishedDate: new Date('1951-05-01'),
    pageCount: 244,
    edition: 'Paperback',
    authorKey: 'isaac-asimov',
    categoryKeys: ['science-fiction'],
    publisherKey: 'bantam-spectra',
    copies: 3,
  },
  {
    title: 'I, Robot',
    isbn: '9780553294385',
    description:
      'A collection of interlinked short stories exploring the Three Laws of Robotics and their consequences.',
    publishedDate: new Date('1950-12-02'),
    pageCount: 253,
    edition: 'Paperback',
    authorKey: 'isaac-asimov',
    categoryKeys: ['science-fiction'],
    publisherKey: 'bantam-spectra',
    copies: 3,
  },
  {
    title: 'The Fellowship of the Ring',
    isbn: '9780618640157',
    description:
      'Frodo Baggins inherits a powerful ring and must leave the Shire to keep it from the Dark Lord Sauron.',
    publishedDate: new Date('1954-07-29'),
    pageCount: 423,
    edition: 'Paperback',
    authorKey: 'j-r-r-tolkien',
    categoryKeys: ['fantasy'],
    publisherKey: 'houghton-mifflin',
    copies: 4,
  },
  {
    title: 'The Two Towers',
    isbn: '9780618646169',
    description:
      'The Fellowship is broken, and the quest to destroy the One Ring continues on separate perilous paths.',
    publishedDate: new Date('1954-11-11'),
    pageCount: 352,
    edition: 'Paperback',
    authorKey: 'j-r-r-tolkien',
    categoryKeys: ['fantasy'],
    publisherKey: 'houghton-mifflin',
    copies: 3,
  },
  {
    title: 'The Return of the King',
    isbn: '9780618640186',
    description:
      'The final battle for Middle-earth begins as Frodo and Sam approach Mount Doom.',
    publishedDate: new Date('1955-10-20'),
    pageCount: 416,
    edition: 'Paperback',
    authorKey: 'j-r-r-tolkien',
    categoryKeys: ['fantasy'],
    publisherKey: 'houghton-mifflin',
    copies: 3,
  },
  {
    title: 'The Hobbit',
    isbn: '9780618968633',
    description:
      'A reluctant hobbit, Bilbo Baggins, sets out on an unexpected journey to help a group of dwarves reclaim their mountain home.',
    publishedDate: new Date('1937-09-21'),
    pageCount: 310,
    edition: 'Paperback',
    authorKey: 'j-r-r-tolkien',
    categoryKeys: ['fantasy', 'classics'],
    publisherKey: 'houghton-mifflin',
    copies: 5,
  },
  {
    title: 'Mistborn: The Final Empire',
    isbn: '9780765350381',
    description:
      'In a world where ash falls from the sky, a young street thief discovers she has the rare power to control metals through Allomancy.',
    publishedDate: new Date('2006-07-17'),
    pageCount: 541,
    edition: 'Paperback',
    authorKey: 'brandon-sanderson',
    categoryKeys: ['fantasy'],
    publisherKey: 'tor-books',
    copies: 3,
  },
  {
    title: 'The Way of Kings',
    isbn: '9780765326355',
    description:
      'On a world scoured by supernatural storms, warring kingdoms use ancient weapons and armor as an assassin threatens the balance of power.',
    publishedDate: new Date('2010-08-31'),
    pageCount: 1007,
    edition: 'Hardcover',
    authorKey: 'brandon-sanderson',
    categoryKeys: ['fantasy'],
    publisherKey: 'tor-books',
    copies: 4,
  },
  {
    title: 'Elantris',
    isbn: '9780765350374',
    description:
      'Once a city of magic and beauty, Elantris now lies in ruin, cursed alongside everyone who once wielded its power.',
    publishedDate: new Date('2005-05-01'),
    pageCount: 622,
    edition: 'Paperback',
    authorKey: 'brandon-sanderson',
    categoryKeys: ['fantasy'],
    publisherKey: 'tor-books',
    copies: 2,
  },
  {
    title: 'Murder on the Orient Express',
    isbn: '9780062693662',
    description:
      'Detective Hercule Poirot must solve a murder aboard a snowbound train, where every passenger is a suspect.',
    publishedDate: new Date('1934-01-01'),
    pageCount: 256,
    edition: 'Paperback',
    authorKey: 'agatha-christie',
    categoryKeys: ['mystery'],
    publisherKey: 'collins-crime-club',
    copies: 3,
  },
  {
    title: 'And Then There Were None',
    isbn: '9780062073488',
    description:
      'Ten strangers are lured to an isolated island and killed off one by one, each death matching an ominous nursery rhyme.',
    publishedDate: new Date('1939-11-06'),
    pageCount: 264,
    edition: 'Paperback',
    authorKey: 'agatha-christie',
    categoryKeys: ['mystery'],
    publisherKey: 'collins-crime-club',
    copies: 4,
  },
  {
    title: 'The Murder of Roger Ackroyd',
    isbn: '9780062073502',
    description:
      'Hercule Poirot comes out of retirement to investigate the murder of a wealthy man in an English village.',
    publishedDate: new Date('1926-06-01'),
    pageCount: 288,
    edition: 'Paperback',
    authorKey: 'agatha-christie',
    categoryKeys: ['mystery'],
    publisherKey: 'collins-crime-club',
    copies: 2,
  },
  {
    title: 'A Study in Scarlet',
    isbn: '9781420951875',
    description:
      'The first case to bring together Sherlock Holmes and Dr. Watson, unraveling a mysterious revenge killing in London.',
    publishedDate: new Date('1887-11-01'),
    pageCount: 154,
    edition: 'Paperback',
    authorKey: 'arthur-conan-doyle',
    categoryKeys: ['mystery', 'classics'],
    publisherKey: 'ward-lock',
    copies: 2,
  },
  {
    title: 'The Hound of the Baskervilles',
    isbn: '9781420951882',
    description:
      'Sherlock Holmes investigates a legendary curse and a supernatural hound stalking the moors around Baskerville Hall.',
    publishedDate: new Date('1902-04-01'),
    pageCount: 256,
    edition: 'Paperback',
    authorKey: 'arthur-conan-doyle',
    categoryKeys: ['mystery', 'classics'],
    publisherKey: 'george-newnes',
    copies: 3,
  },
  {
    title: 'Sapiens: A Brief History of Humankind',
    isbn: '9780062316097',
    description:
      'A sweeping account of how Homo sapiens came to dominate the world, from the cognitive revolution to the present day.',
    publishedDate: new Date('2015-02-10'),
    pageCount: 443,
    edition: 'Hardcover',
    authorKey: 'yuval-noah-harari',
    categoryKeys: ['non-fiction'],
    publisherKey: 'harper',
    copies: 4,
  },
  {
    title: 'Homo Deus',
    isbn: '9780062464316',
    description:
      "A look at humanity's next possible frontiers, from immortality to artificial intelligence.",
    publishedDate: new Date('2017-02-21'),
    pageCount: 449,
    edition: 'Hardcover',
    authorKey: 'yuval-noah-harari',
    categoryKeys: ['non-fiction'],
    publisherKey: 'harper',
    copies: 3,
  },
  {
    title: 'Becoming',
    isbn: '9781524763138',
    description:
      "The former First Lady's memoir chronicling her journey from Chicago's South Side to the White House.",
    publishedDate: new Date('2018-11-13'),
    pageCount: 448,
    edition: 'Hardcover',
    authorKey: 'michelle-obama',
    categoryKeys: ['non-fiction'],
    publisherKey: 'crown',
    copies: 4,
  },
  {
    title: 'Parable of the Sower',
    isbn: '9781538732182',
    description:
      'In a near-future America ravaged by climate change and inequality, a young woman with hyperempathy sets out to build a new faith and community.',
    publishedDate: new Date('1993-01-01'),
    pageCount: 329,
    edition: 'Paperback',
    authorKey: 'octavia-butler',
    categoryKeys: ['science-fiction'],
    publisherKey: 'four-walls-eight-windows',
    copies: 2,
  },
  {
    title: 'Wild Seed',
    isbn: '9780446603980',
    description:
      'Two immortal shapeshifters, one healer and one predator, forge a centuries-long bond across continents and generations.',
    publishedDate: new Date('1980-01-01'),
    pageCount: 296,
    edition: 'Paperback',
    authorKey: 'octavia-butler',
    categoryKeys: ['science-fiction'],
    publisherKey: 'doubleday',
    copies: 2,
  },
  {
    title: 'Artemis',
    isbn: '9780553448122',
    description:
      "A smuggler in the first city on the moon gets pulled into a conspiracy that threatens the colony's future.",
    publishedDate: new Date('2017-11-14'),
    pageCount: 305,
    edition: 'Hardcover',
    authorKey: 'andy-weir',
    categoryKeys: ['science-fiction'],
    publisherKey: 'crown',
    copies: 3,
  },
  {
    title: 'Project Hail Mary',
    isbn: '9780593135204',
    description:
      "A lone astronaut wakes up with no memory on a mission that may be humanity's last hope for survival.",
    publishedDate: new Date('2021-05-04'),
    pageCount: 476,
    edition: 'Hardcover',
    authorKey: 'andy-weir',
    categoryKeys: ['science-fiction'],
    publisherKey: 'ballantine-books',
    copies: 4,
  },
  {
    title: 'The Dispossessed',
    isbn: '9780061054884',
    description:
      'A physicist travels between two worlds - one anarchist, one capitalist - questioning the price of utopia.',
    publishedDate: new Date('1974-05-01'),
    pageCount: 341,
    edition: 'Paperback',
    authorKey: 'ursula-le-guin',
    categoryKeys: ['science-fiction', 'classics'],
    publisherKey: 'harper-row',
    copies: 2,
  },
  {
    title: 'A Wizard of Earthsea',
    isbn: '9780547773742',
    description:
      "A young wizard's reckless pride unleashes a shadow that hunts him across the islands of Earthsea.",
    publishedDate: new Date('1968-11-01'),
    pageCount: 205,
    edition: 'Paperback',
    authorKey: 'ursula-le-guin',
    categoryKeys: ['fantasy', 'classics'],
    publisherKey: 'parnassus-press',
    copies: 3,
  },
];

// Deterministic buy-price by condition, reused across every bulk book so the
// table isn't full of blank prices.
const BULK_CONDITION_PRICES: BookConditionPriceSeed[] = [
  { condition: 'NEW', buyPrice: '19.99' },
  { condition: 'GOOD', buyPrice: '14.99' },
];

async function seedTechCorpBulkCatalog(prisma: PrismaClient): Promise<number> {
  const organization = await prisma.organization.findUnique({
    where: { slug: 'techcorp-solutions' },
  });
  if (!organization) return 0;

  return prisma.$transaction(async (tx) => {
    const authorsByKey = new Map<string, string>();
    for (const author of TECHCORP_BULK_AUTHORS) {
      const created = await tx.author.create({
        data: {
          organizationId: organization.id,
          name: author.name,
          bio: author.bio,
          nationality: author.nationality,
          birthYear: author.birthYear,
        },
      });
      authorsByKey.set(author.key, created.id);
    }
    // The bulk list also references the three authors already seeded above
    // for TechCorp's curated catalog - look those up rather than re-creating.
    const existingAuthors = await tx.author.findMany({
      where: {
        organizationId: organization.id,
        name: { in: ['Octavia E. Butler', 'Andy Weir', 'Ursula K. Le Guin'] },
      },
    });
    for (const a of existingAuthors) {
      if (a.name === 'Octavia E. Butler')
        authorsByKey.set('octavia-butler', a.id);
      if (a.name === 'Andy Weir') authorsByKey.set('andy-weir', a.id);
      if (a.name === 'Ursula K. Le Guin')
        authorsByKey.set('ursula-le-guin', a.id);
    }

    const categoriesByKey = new Map<string, string>();
    for (const category of TECHCORP_BULK_CATEGORIES) {
      const created = await tx.category.create({
        data: { organizationId: organization.id, name: category.name },
      });
      categoriesByKey.set(category.key, created.id);
    }
    const existingCategories = await tx.category.findMany({
      where: {
        organizationId: organization.id,
        name: { in: ['Science Fiction', 'Classics'] },
      },
    });
    for (const c of existingCategories) {
      if (c.name === 'Science Fiction')
        categoriesByKey.set('science-fiction', c.id);
      if (c.name === 'Classics') categoriesByKey.set('classics', c.id);
    }

    const publishersByKey = new Map<string, string>();
    for (const publisher of TECHCORP_BULK_PUBLISHERS) {
      const created = await tx.publisher.create({
        data: {
          organizationId: organization.id,
          name: publisher.name,
          website: publisher.website,
        },
      });
      publishersByKey.set(publisher.key, created.id);
    }
    // 'crown' (Crown Publishing) already exists in the curated TechCorp
    // catalog above - reuse it instead of creating a duplicate.
    const existingCrown = await tx.publisher.findFirst({
      where: { organizationId: organization.id, name: 'Crown Publishing' },
    });
    if (existingCrown) publishersByKey.set('crown', existingCrown.id);

    const copyConditionCycle: BookCopySeed['condition'][] = [
      'GOOD',
      'NEW',
      'GOOD',
      'FAIR',
    ];
    let copySeq = 0;
    for (const book of TECHCORP_BULK_BOOKS) {
      const createdBook = await tx.book.create({
        data: {
          organizationId: organization.id,
          publisherId: publishersByKey.get(book.publisherKey),
          isbn: book.isbn,
          title: book.title,
          description: book.description,
          publishedDate: book.publishedDate,
          language: 'English',
          pageCount: book.pageCount,
          edition: book.edition,
        },
      });

      await tx.bookAuthor.create({
        data: {
          organizationId: organization.id,
          bookId: createdBook.id,
          authorId: authorsByKey.get(book.authorKey)!,
        },
      });

      await tx.bookCategory.createMany({
        data: book.categoryKeys.map((key) => ({
          organizationId: organization.id,
          bookId: createdBook.id,
          categoryId: categoriesByKey.get(key)!,
        })),
      });

      await tx.bookConditionPrice.createMany({
        data: BULK_CONDITION_PRICES.map((cp) => ({
          organizationId: organization.id,
          bookId: createdBook.id,
          condition: cp.condition,
          buyPrice: cp.buyPrice,
        })),
      });

      // Exactly one copy on loan - it gets a matching rental from
      // seedCirculation's TechCorp bulk-activity generator. The rest are
      // available stock, cycled across a few conditions for realism.
      const copiesData = Array.from({ length: book.copies }, (_, i) => {
        copySeq += 1;
        return {
          organizationId: organization.id,
          bookId: createdBook.id,
          barcode: `TC-EXT-${String(copySeq).padStart(3, '0')}`,
          status: i === 0 ? ('ON_LOAN' as const) : ('AVAILABLE' as const),
          condition: copyConditionCycle[i % copyConditionCycle.length]!,
        };
      });
      await tx.bookCopy.createMany({ data: copiesData });
    }

    return TECHCORP_BULK_BOOKS.length;
  });
}

export async function seedCatalog(prisma: PrismaClient) {
  console.log('Seeding catalog...');

  for (const catalog of CATALOGS) {
    const organization = await prisma.organization.findUnique({
      where: { slug: catalog.organizationSlug },
    });

    if (!organization) {
      console.warn(
        `  Warning: Organization ${catalog.organizationSlug} not found. Skipping catalog.`,
      );
      continue;
    }

    // Seed the whole catalog for one organization atomically so a failure
    // partway through does not leave partial authors/books/copies committed.
    await prisma.$transaction(async (tx) => {
      const authorsByKey = new Map<string, string>();
      const categoriesByKey = new Map<string, string>();
      const publishersByKey = new Map<string, string>();

      for (const author of catalog.authors) {
        const created = await tx.author.create({
          data: {
            organizationId: organization.id,
            name: author.name,
            bio: author.bio,
            nationality: author.nationality,
            birthYear: author.birthYear,
            photoUrl: author.photoUrl,
          },
        });

        authorsByKey.set(author.key, created.id);
      }

      for (const category of catalog.categories) {
        const created = await tx.category.create({
          data: {
            organizationId: organization.id,
            name: category.name,
            description: category.description,
          },
        });

        categoriesByKey.set(category.key, created.id);
      }

      for (const publisher of catalog.publishers) {
        const created = await tx.publisher.create({
          data: {
            organizationId: organization.id,
            name: publisher.name,
            email: publisher.email,
            website: publisher.website,
            address: publisher.address,
          },
        });

        publishersByKey.set(publisher.key, created.id);
      }

      for (const book of catalog.books) {
        const createdBook = await tx.book.create({
          data: {
            organizationId: organization.id,
            publisherId: book.publisherKey
              ? publishersByKey.get(book.publisherKey)
              : undefined,
            isbn: book.isbn,
            title: book.title,
            description: book.description,
            publishedDate: book.publishedDate,
            language: book.language,
            pageCount: book.pageCount,
            coverUrl: book.coverUrl,
            edition: book.edition,
          },
        });

        await tx.bookAuthor.createMany({
          data: book.authorKeys.map((authorKey) => ({
            organizationId: organization.id,
            bookId: createdBook.id,
            authorId: authorsByKey.get(authorKey)!,
          })),
        });

        await tx.bookCategory.createMany({
          data: book.categoryKeys.map((categoryKey) => ({
            organizationId: organization.id,
            bookId: createdBook.id,
            categoryId: categoriesByKey.get(categoryKey)!,
          })),
        });

        await tx.bookCopy.createMany({
          data: book.copies.map((copy) => ({
            organizationId: organization.id,
            bookId: createdBook.id,
            barcode: copy.barcode,
            status: copy.status ?? 'AVAILABLE',
            condition: copy.condition ?? 'GOOD',
            acquiredAt: copy.acquiredAt,
          })),
        });

        if (book.conditionPrices?.length) {
          await tx.bookConditionPrice.createMany({
            data: book.conditionPrices.map((cp) => ({
              organizationId: organization.id,
              bookId: createdBook.id,
              condition: cp.condition,
              buyPrice: cp.buyPrice,
            })),
          });
        }

        console.log(
          `  Created book: ${book.title} (${book.copies.length} copies) - Organization: ${organization.name}`,
        );
      }
    });
  }

  const totalBooks = CATALOGS.reduce(
    (count, catalog) => count + catalog.books.length,
    0,
  );

  const bulkBooks = await seedTechCorpBulkCatalog(prisma);
  if (bulkBooks) {
    console.log(`  Added TechCorp bulk catalog: ${bulkBooks} books`);
  }

  console.log(`Catalog seeded: ${totalBooks + bulkBooks} books total`);
}
