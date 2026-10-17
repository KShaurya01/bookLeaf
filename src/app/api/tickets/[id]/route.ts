import { z } from "zod";
import { Role, TicketCategory, TicketPriority, TicketStatus } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializeTicket } from "@/lib/serializers";
import { publishAdminQueueUpdate, publishAuthorUpdate } from "@/lib/tickets-events";

async function loadTicket(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    include: {
      book: true,
      author: true,
      assignee: true,
      messages: { orderBy: { createdAt: "asc" }, include: { author: true } },
      internalNotes: { orderBy: { createdAt: "asc" }, include: { admin: true } },
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession([Role.AUTHOR, Role.ADMIN]);
    const { id } = await params;
    const ticket = await loadTicket(id);
    if (!ticket) return jsonError("Ticket not found", 404);

    if (
      session.role === Role.AUTHOR &&
      ticket.authorId !== session.authorId
    ) {
      return jsonError("Forbidden", 403);
    }

    return jsonOk({
      ticket: serializeTicket(ticket, {
        includeInternalNotes: session.role === Role.ADMIN,
      }),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  category: z
    .enum([
      "ROYALTY_PAYMENTS",
      "ISBN_METADATA",
      "PRINTING_QUALITY",
      "DISTRIBUTION_AVAILABILITY",
      "BOOK_STATUS_PRODUCTION",
      "GENERAL_INQUIRY",
    ])
    .optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  assignToSelf: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession([Role.ADMIN]);
    const { id } = await params;
    const body = patchSchema.parse(await req.json());

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) return jsonError("Ticket not found", 404);

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(body.status
          ? { status: body.status as (typeof TicketStatus)[keyof typeof TicketStatus] }
          : {}),
        ...(body.category
          ? {
              category: body.category as TicketCategory,
              categoryOverride: true,
            }
          : {}),
        ...(body.priority
          ? {
              priority: body.priority as TicketPriority,
              priorityOverride: true,
            }
          : {}),
        ...(body.assignToSelf ? { assigneeId: session.id } : {}),
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
