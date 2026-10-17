import type { Author, Book, Ticket, TicketMessage, InternalNote, User } from "@prisma/client";

export function serializeBook(book: Book) {
  let availableOn: string[] = [];
  try {
    availableOn = JSON.parse(book.availableOn || "[]");
  } catch {
    availableOn = [];
  }
  return {
    id: book.id,
    bookCode: book.bookCode,
    title: book.title,
    isbn: book.isbn,
    genre: book.genre,
    publicationDate: book.publicationDate,
    status: book.status,
    mrp: book.mrp,
    authorRoyaltyPerCopy: book.authorRoyaltyPerCopy,
    totalCopiesSold: book.totalCopiesSold,
    totalRoyaltyEarned: book.totalRoyaltyEarned,
    royaltyPaid: book.royaltyPaid,
    royaltyPending: book.royaltyPending,
    lastRoyaltyPayoutDate: book.lastRoyaltyPayoutDate,
    printPartner: book.printPartner,
    availableOn,
  };
}

export function serializeTicket(
  ticket: Ticket & {
    book?: Book | null;
    author?: Author;
    assignee?: User | null;
    messages?: (TicketMessage & { author?: User | null })[];
    internalNotes?: (InternalNote & { admin?: User })[];
  },
  opts?: { includeInternalNotes?: boolean }
) {
  return {
    id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    category: ticket.category,
    priority: ticket.priority,
    categoryOverride: ticket.categoryOverride,
    priorityOverride: ticket.priorityOverride,
    aiRationale: ticket.aiRationale,
    attachmentName: ticket.attachmentName,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    authorId: ticket.authorId,
    bookId: ticket.bookId,
    assigneeId: ticket.assigneeId,
    author: ticket.author
      ? {
          id: ticket.author.id,
          name: ticket.author.name,
          email: ticket.author.email,
          authorCode: ticket.author.authorCode,
        }
      : undefined,
    book: ticket.book ? serializeBook(ticket.book) : null,
    assignee: ticket.assignee
      ? {
          id: ticket.assignee.id,
          name: ticket.assignee.name,
          email: ticket.assignee.email,
        }
      : null,
    messages: (ticket.messages || []).map((m) => ({
      id: m.id,
      body: m.body,
      fromRole: m.fromRole,
      isAiDraft: m.isAiDraft,
      createdAt: m.createdAt,
      author: m.author
        ? { id: m.author.id, name: m.author.name, role: m.author.role }
        : null,
    })),
    internalNotes: opts?.includeInternalNotes
      ? (ticket.internalNotes || []).map((n) => ({
          id: n.id,
          body: n.body,
          createdAt: n.createdAt,
          admin: n.admin
            ? { id: n.admin.id, name: n.admin.name }
            : undefined,
        }))
      : undefined,
  };
}
