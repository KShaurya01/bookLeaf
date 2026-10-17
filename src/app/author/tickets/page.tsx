"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Card, EmptyState, PriorityBadge, StatusBadge } from "@/components/ui";
import { useEventSource } from "@/hooks/useEventSource";
import { CATEGORY_LABELS, TicketCategory } from "@/lib/constants";
import { formatDate, relativeAge } from "@/lib/format";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  category: string;
  priority: string;
  createdAt: string;
  book?: { title: string } | null;
};

export default function AuthorTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/tickets")
      .then((r) => r.json())
      .then((j) => setTickets(j.data?.tickets || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEventSource("/api/events/queue", (event) => {
    if (event === "tickets_updated" || event === "queue_updated") load();
  });

  function openTicket(id: string) {
    router.push(`/author/tickets/${id}`);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tickets</h1>
          <p className="muted">
            Updates appear live when the BookLeaf team responds.
          </p>
        </div>
        <Link href="/author/tickets/new" className="btn btn-primary">
          New query
        </Link>
      </div>

      <Card>
        {loading ? <p className="muted">Loading…</p> : null}
        {!loading && tickets.length === 0 ? (
          <EmptyState
            title="No tickets yet"
            body="Submit a support query to get help with royalties, ISBN, printing, or production."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Book</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  className="clickable-row"
                  role="link"
                  tabIndex={0}
                  onClick={() => openTicket(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openTicket(t.id);
                    }
                  }}
                >
                  <td>
                    <Link
                      href={`/author/tickets/${t.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <strong>{t.subject}</strong>
                    </Link>
                    <div className="muted">{formatDate(t.createdAt)}</div>
                  </td>
                  <td>{t.book?.title || "General"}</td>
                  <td>
                    {CATEGORY_LABELS[t.category as TicketCategory] ||
                      t.category}
                  </td>
                  <td>
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>{relativeAge(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
