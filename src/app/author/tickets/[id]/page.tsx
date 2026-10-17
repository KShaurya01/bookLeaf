"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, PriorityBadge, StatusBadge } from "@/components/ui";
import { useEventSource } from "@/hooks/useEventSource";
import { CATEGORY_LABELS, TicketCategory } from "@/lib/constants";
import { formatDate } from "@/lib/format";

type Message = {
  id: string;
  body: string;
  fromRole: string;
  createdAt: string;
  author?: { name: string } | null;
};

type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  attachmentName?: string | null;
  createdAt: string;
  book?: { title: string } | null;
  messages: Message[];
};

export default function AuthorTicketDetailPage() {
  const params = useParams();
  const id = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/tickets/${id}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) {
          setError(j?.error?.message || "Could not load ticket");
          setTicket(null);
          return;
        }
        setError("");
        setTicket(j.data?.ticket || null);
      })
      .catch(() => setError("Network error loading ticket"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEventSource(id ? `/api/tickets/${id}/events` : null, (event) => {
    if (event === "ticket_updated") load();
  });

  if (!id) return <p className="muted">Invalid ticket link.</p>;
  if (loading && !ticket) return <p className="muted">Loading ticket…</p>;
  if (error) {
    return (
      <div>
        <p className="error">{error}</p>
        <Link href="/author/tickets">← Back to My Tickets</Link>
      </div>
    );
  }
  if (!ticket) {
    return (
      <div>
        <p className="muted">Ticket not found.</p>
        <Link href="/author/tickets">← Back to My Tickets</Link>
      </div>
    );
  }

  return (
    <div>
      <p className="muted" style={{ marginBottom: "0.75rem" }}>
        <Link href="/author/tickets">← My Tickets</Link>
      </p>
      <div className="page-header">
        <div>
          <h1 className="page-title">{ticket.subject}</h1>
          <p className="muted">
            {ticket.book?.title || "General / Account Level"} ·{" "}
            {formatDate(ticket.createdAt)}
          </p>
        </div>
        <div className="meta-row">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      <div className="ticket-layout">
        <Card>
          <h3>Conversation</h3>
          <div className="thread" style={{ marginTop: "1rem" }}>
            {ticket.messages.map((m) => (
              <div
                key={m.id}
                className={`message ${m.fromRole === "ADMIN" ? "admin" : "author"}`}
              >
                <div className="meta-row">
                  <strong>
                    {m.fromRole === "ADMIN"
                      ? m.author?.name || "BookLeaf Support"
                      : "You"}
                  </strong>
                  <span className="muted">{formatDate(m.createdAt)}</span>
                </div>
                <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                  {m.body}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3>Details</h3>
          <p>
            <strong>Category:</strong>{" "}
            {CATEGORY_LABELS[ticket.category as TicketCategory] ||
              ticket.category}
          </p>
          <p>
            <strong>Status:</strong> {ticket.status.replaceAll("_", " ")}
          </p>
          {ticket.attachmentName ? (
            <p>
              <strong>Attachment:</strong> {ticket.attachmentName} (UI only)
            </p>
          ) : null}
          <p className="muted">
            This view refreshes automatically when support replies.
          </p>
        </Card>
      </div>
    </div>
  );
}
