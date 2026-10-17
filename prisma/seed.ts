import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const Role = { AUTHOR: "AUTHOR", ADMIN: "ADMIN" } as const;

type SampleBook = {
  book_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
};

type SampleAuthor = {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books: SampleBook[];
};

async function main() {
  const candidates = [
    path.join(process.cwd(), "prisma", "sample-data.json"),
    path.join(process.cwd(), "..", "FULLSTACK-SAMPLEDATA (1) (1).json"),
  ];
  const dataPath = candidates.find((p) => fs.existsSync(p));
  if (!dataPath) throw new Error("Sample data JSON not found");

  const raw = JSON.parse(fs.readFileSync(dataPath, "utf-8")) as {
    authors: SampleAuthor[];
  };

  await prisma.internalNote.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.book.deleteMany();
  await prisma.author.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("author123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);

  await prisma.user.create({
    data: {
      email: "admin@bookleafpub.com",
      passwordHash: adminHash,
      role: Role.ADMIN,
      name: "BookLeaf Admin",
    },
  });

  for (const a of raw.authors) {
    const user = await prisma.user.create({
      data: {
        email: a.email.toLowerCase(),
        passwordHash,
        role: Role.AUTHOR,
        name: a.name,
      },
    });

    const author = await prisma.author.create({
      data: {
        authorCode: a.author_id,
        name: a.name,
        email: a.email.toLowerCase(),
        phone: a.phone,
        city: a.city,
        joinedDate: new Date(a.joined_date),
        userId: user.id,
      },
    });

    for (const b of a.books) {
      await prisma.book.create({
        data: {
          bookCode: b.book_id,
          title: b.title,
          isbn: b.isbn,
          genre: b.genre,
          publicationDate: b.publication_date
            ? new Date(b.publication_date)
            : null,
          status: b.status,
          mrp: b.mrp,
          authorRoyaltyPerCopy: b.author_royalty_per_copy,
          totalCopiesSold: b.total_copies_sold,
          totalRoyaltyEarned: b.total_royalty_earned,
          royaltyPaid: b.royalty_paid,
          royaltyPending: b.royalty_pending,
          lastRoyaltyPayoutDate: b.last_royalty_payout_date
            ? new Date(b.last_royalty_payout_date)
            : null,
          printPartner: b.print_partner,
          availableOn: JSON.stringify(b.available_on ?? []),
          authorId: author.id,
        },
      });
    }
  }

  console.log(
    `Seeded admin + ${raw.authors.length} authors, ${raw.authors.reduce(
      (n, a) => n + a.books.length,
      0
    )} books.`
  );
  console.log("Admin: admin@bookleafpub.com / admin123");
  console.log("Authors: <author email> / author123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
