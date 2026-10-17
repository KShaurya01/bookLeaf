import { Role } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { generateDraftReply } from "@/lib/ai/client";
import type { TicketCategory } from "@/lib/constants";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession([Role.ADMIN]);
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { book: true, author: true },
    });
    if (!ticket) return jsonError("Ticket not found", 404);

    const result = await generateDraftReply({
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category as TicketCategory,
      authorName: ticket.author.name,
      bookTitle: ticket.book?.title,
      bookStatus: ticket.book?.status,
      royaltyPending: ticket.book?.royaltyPending,
      royaltyPaid: ticket.book?.royaltyPaid,
      totalCopiesSold: ticket.book?.totalCopiesSold,
      mrp: ticket.book?.mrp,
    });

    return jsonOk({
      draft: result.draft,
      source: result.source,
      warning: result.warning ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
