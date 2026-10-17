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
  author?: { name: string };
  book?: { title: string } | null;
};

export default function AdminQueuePage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (priority) params.set("priority", priority);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/tickets?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => setTickets(j.data?.tickets || []))
      .finally(() => setLoading(false));
  }, [status, category, priority, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEventSource("/api/events/queue", (event) => {
    if (event === "queue_updated") load();
  });

  function openTicket(id: string) {
    router.push(`/admin/tickets/${id}`);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ticket Queue</h1>
          <p className="muted">
            Urgent and oldest unresolved tickets float to the top.
          </p>
        </div>
      </div>

      <Card>
        <div className="filters">
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="">All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </label>
          <label>
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>

        {loading ? <p className="muted">Loading queue…</p> : null}
        {!loading && tickets.length === 0 ? (
          <EmptyState
            title="Queue is clear"
            body="New author tickets will appear here automatically."
          />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Author</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const urgent =
                  (t.priority === "CRITICAL" || t.priority === "HIGH") &&
                  (t.status === "OPEN" || t.status === "IN_PROGRESS");
                return (
                  <tr
                    key={t.id}
                    className={`clickable-row${urgent ? " urgent" : ""}`}
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
                        href={`/admin/tickets/${t.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <strong>{t.subject}</strong>
                      </Link>
                      <div className="muted">
                        {t.book?.title || "General"} · {formatDate(t.createdAt)}
                      </div>
                    </td>
                    <td>{t.author?.name}</td>
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
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
