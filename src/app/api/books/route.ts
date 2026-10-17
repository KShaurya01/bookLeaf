import { Role } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializeBook } from "@/lib/serializers";

export async function GET() {
  try {
    const session = await requireSession([Role.AUTHOR, Role.ADMIN]);

    if (session.role === Role.ADMIN) {
      const books = await prisma.book.findMany({
        include: { author: true },
        orderBy: { title: "asc" },
      });
      return jsonOk({
        books: books.map((b) => ({
          ...serializeBook(b),
          author: { id: b.author.id, name: b.author.name },
        })),
      });
    }

    if (!session.authorId) {
      return jsonOk({ books: [] });
    }

    const books = await prisma.book.findMany({
      where: { authorId: session.authorId },
      orderBy: { title: "asc" },
    });
    return jsonOk({ books: books.map(serializeBook) });
  } catch (err) {
    return handleApiError(err);
  }
}
