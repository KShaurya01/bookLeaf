import { Role } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { subscribeAdmin, subscribeAuthor } from "@/lib/tickets-events";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession([Role.AUTHOR, Role.ADMIN]);

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

      send("connected", { role: session.role });

      if (session.role === Role.ADMIN) {
        cleanup = subscribeAdmin(() => {
          send("queue_updated", { at: new Date().toISOString() });
        });
      } else if (session.authorId) {
        cleanup = subscribeAuthor(session.authorId, () => {
          send("tickets_updated", { at: new Date().toISOString() });
        });
      }

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
