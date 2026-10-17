import { z } from "zod";
import { Role, TicketCategory, TicketPriority, TicketStatus } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { classifyTicket, classifyTicketSync } from "@/lib/ai/client";
import { serializeTicket } from "@/lib/serializers";
import { publishAdminQueueUpdate, publishAuthorUpdate } from "@/lib/tickets-events";

const createSchema = z.object({
  subject: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  bookId: z.string().nullable().optional(),
  attachmentName: z.string().max(255).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireSession([Role.AUTHOR, Role.ADMIN]);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};

    if (session.role === Role.AUTHOR) {
      if (!session.authorId) return jsonOk({ tickets: [] });
      where.authorId = session.authorId;
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        book: true,
        author: true,
        assignee: true,
        messages: { orderBy: { createdAt: "asc" }, include: { author: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    const priorityRank: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    const sorted = [...tickets].sort((a, b) => {
      const unresolved = (s: string) =>
        s === TicketStatus.OPEN || s === TicketStatus.IN_PROGRESS ? 0 : 1;
      const ur = unresolved(a.status) - unresolved(b.status);
      if (ur !== 0) return ur;
      const pr =
        (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
      if (pr !== 0) return pr;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return jsonOk({
      tickets: sorted.map((t) =>
        serializeTicket(t, { includeInternalNotes: false })
      ),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession([Role.AUTHOR]);
    if (!session.authorId) return jsonError("Author profile missing", 400);

    const body = createSchema.parse(await req.json());

    if (body.bookId) {
      const book = await prisma.book.findFirst({
        where: { id: body.bookId, authorId: session.authorId },
      });
      if (!book) return jsonError("Book not found for this author", 404);
    }

    // Instant heuristic so create + navigation never waits on OpenAI.
    const classification = classifyTicketSync(body.subject, body.description);

    const ticket = await prisma.ticket.create({
      data: {
        subject: body.subject,
        description: body.description,
        attachmentName: body.attachmentName ?? null,
        authorId: session.authorId,
        bookId: body.bookId || null,
        status: TicketStatus.OPEN,
        category: classification.category,
        priority: classification.priority,
        aiRationale: `${classification.rationale} [${classification.source}]`,
        messages: {
          create: {
            body: body.description,
            fromRole: Role.AUTHOR,
            authorId: session.id,
          },
        },
      },
      include: {
        book: true,
        author: true,
        messages: { include: { author: true } },
      },
    });

    publishAuthorUpdate(session.authorId, ticket.id);
    publishAdminQueueUpdate(ticket.id);

    // Refine category/priority in the background when an API key is configured.
    void (async () => {
      try {
        const refined = await classifyTicket(body.subject, body.description);
        if (refined.source !== "openai") return;
        if (ticket.categoryOverride || ticket.priorityOverride) return;
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            category: refined.category,
            priority: refined.priority,
            aiRationale: `${refined.rationale} [${refined.source}]`,
          },
        });
        publishAuthorUpdate(session.authorId!, ticket.id);
        publishAdminQueueUpdate(ticket.id);
      } catch (err) {
        console.error("background classify failed", err);
      }
    })();

    return jsonOk(
      {
        ticket: serializeTicket(ticket),
        classification: {
          category: classification.category as TicketCategory,
          priority: classification.priority as TicketPriority,
          source: classification.source,
          rationale: classification.rationale,
        },
      },
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}
