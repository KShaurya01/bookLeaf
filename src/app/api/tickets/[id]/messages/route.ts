import { z } from "zod";
import { Role, TicketStatus } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializeTicket } from "@/lib/serializers";
import { publishAdminQueueUpdate, publishAuthorUpdate } from "@/lib/tickets-events";

const schema = z.object({
  body: z.string().min(1).max(8000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession([Role.ADMIN]);
    const { id } = await params;
    const { body } = schema.parse(await req.json());

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) return jsonError("Ticket not found", 404);

    await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        body,
        fromRole: Role.ADMIN,
        authorId: session.id,
        isAiDraft: false,
      },
    });

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        status:
          existing.status === TicketStatus.OPEN
            ? TicketStatus.IN_PROGRESS
            : existing.status,
        assigneeId: existing.assigneeId ?? session.id,
      },
      include: {
        book: true,
        author: true,
        assignee: true,
        messages: { orderBy: { createdAt: "asc" }, include: { author: true } },
        internalNotes: {
          orderBy: { createdAt: "asc" },
          include: { admin: true },
        },
      },
    });

    publishAuthorUpdate(ticket.authorId, ticket.id);
    publishAdminQueueUpdate(ticket.id);

    return jsonOk({
      ticket: serializeTicket(ticket, { includeInternalNotes: true }),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
