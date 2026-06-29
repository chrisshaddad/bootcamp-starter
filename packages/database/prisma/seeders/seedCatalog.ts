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

interface BookSeed {
  title: string;
  isbn?: string;
  description?: string;
  publishedDate?: Date;
  language?: string;
  pageCount?: number;
  coverUrl?: string;
  salePrice?: string;
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
        salePrice: '16.99',
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
        salePrice: '17.00',
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
        salePrice: '18.00',
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
        salePrice: '10.00',
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
        salePrice: '26.00',
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
        salePrice: '22.00',
        publisherKey: 'scribner',
        authorKeys: ['siddhartha-mukherjee'],
        categoryKeys: ['medicine'],
        copies: [
          {
            barcode: 'HF-EOM-001',
            status: 'AVAILABLE',
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

    const authorsByKey = new Map<string, string>();
    const categoriesByKey = new Map<string, string>();
    const publishersByKey = new Map<string, string>();

    for (const author of catalog.authors) {
      const created = await prisma.author.create({
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
      const created = await prisma.category.create({
        data: {
          organizationId: organization.id,
          name: category.name,
          description: category.description,
        },
      });

      categoriesByKey.set(category.key, created.id);
    }

    for (const publisher of catalog.publishers) {
      const created = await prisma.publisher.create({
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
      const createdBook = await prisma.book.create({
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
          salePrice: book.salePrice,
          edition: book.edition,
        },
      });

      await prisma.bookAuthor.createMany({
        data: book.authorKeys.map((authorKey) => ({
          organizationId: organization.id,
          bookId: createdBook.id,
          authorId: authorsByKey.get(authorKey)!,
        })),
      });

      await prisma.bookCategory.createMany({
        data: book.categoryKeys.map((categoryKey) => ({
          organizationId: organization.id,
          bookId: createdBook.id,
          categoryId: categoriesByKey.get(categoryKey)!,
        })),
      });

      await prisma.bookCopy.createMany({
        data: book.copies.map((copy) => ({
          organizationId: organization.id,
          bookId: createdBook.id,
          barcode: copy.barcode,
          status: copy.status ?? 'AVAILABLE',
          condition: copy.condition ?? 'GOOD',
          acquiredAt: copy.acquiredAt,
        })),
      });

      console.log(
        `  Created book: ${book.title} (${book.copies.length} copies) - Organization: ${organization.name}`,
      );
    }
  }

  const totalBooks = CATALOGS.reduce(
    (count, catalog) => count + catalog.books.length,
    0,
  );

  console.log(`Catalog seeded: ${totalBooks} books total`);
}
