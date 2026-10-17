import { z } from "zod";
import { Role } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publishAdminQueueUpdate } from "@/lib/tickets-events";

const schema = z.object({
  body: z.string().min(1).max(5000),
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

    const note = await prisma.internalNote.create({
      data: {
        ticketId: id,
        adminId: session.id,
        body,
      },
      include: { admin: true },
    });

    publishAdminQueueUpdate(id);

    return jsonOk({
      note: {
        id: note.id,
        body: note.body,
        createdAt: note.createdAt,
        admin: { id: note.admin.id, name: note.admin.name },
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
