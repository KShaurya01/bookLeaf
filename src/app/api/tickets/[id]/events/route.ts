import { Role } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscribeTicket } from "@/lib/tickets-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession([Role.AUTHOR, Role.ADMIN]);
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return new Response("Not found", { status: 404 });
  }
  if (
    session.role === Role.AUTHOR &&
    ticket.authorId !== session.authorId
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("connected", { ticketId: id });

      cleanup = subscribeTicket(id, () => {
        send("ticket_updated", { ticketId: id, at: new Date().toISOString() });
      });

      heartbeat = setInterval(() => {
        send("ping", { at: new Date().toISOString() });
      }, 15000);
    },
    cancel() {
      cleanup?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
