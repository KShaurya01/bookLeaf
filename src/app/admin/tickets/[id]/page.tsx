"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, PriorityBadge, StatusBadge } from "@/components/ui";
import { useEventSource } from "@/hooks/useEventSource";
import { CATEGORY_LABELS, TicketCategory } from "@/lib/constants";
import { formatDate } from "@/lib/format";

type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  aiRationale?: string | null;
  categoryOverride: boolean;
  priorityOverride: boolean;
  createdAt: string;
  author?: { name: string; email: string };
  book?: {
    title: string;
    status: string;
    royaltyPending: number;
    royaltyPaid: number;
  } | null;
  assignee?: { name: string } | null;
  messages: {
    id: string;
    body: string;
    fromRole: string;
    createdAt: string;
    author?: { name: string } | null;
  }[];
  internalNotes?: {
    id: string;
    body: string;
    createdAt: string;
    admin?: { name: string };
  }[];
};

export default function AdminTicketDetailPage() {
  const params = useParams();
  const id = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw || "";
  }, [params]);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [draft, setDraft] = useState("");
  const [draftSource, setDraftSource] = useState<string>("");
  const [draftWarning, setDraftWarning] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    fetch(`/api/tickets/${id}`)
      .then((r) => r.json())
      .then((j) => setTicket(j.data?.ticket || null));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEventSource(id ? `/api/tickets/${id}/events` : null, (event) => {
    if (event === "ticket_updated") load();
  });

  async function patchTicket(body: Record<string, unknown>) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Update failed");
        return;
      }
      setTicket(json.data.ticket);
    } finally {
      setBusy(false);
    }
  }

  async function loadDraft() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${id}/draft`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Draft failed");
        return;
      }
      setDraft(json.data.draft);
      setDraftSource(json.data.source);
      setDraftWarning(json.data.warning || "");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!id || !draft.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Send failed");
        return;
      }
      setTicket(json.data.ticket);
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!id || !note.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tickets/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: note }),
      });
      if (res.ok) {
        setNote("");
        load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!id) return <p className="muted">Invalid ticket link.</p>;
  if (!ticket) return <p className="muted">Loading ticket…</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{ticket.subject}</h1>
          <p className="muted">
            {ticket.author?.name} · {ticket.author?.email} ·{" "}
            {formatDate(ticket.createdAt)}
          </p>
        </div>
        <div className="meta-row">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => patchTicket({ assignToSelf: true })}
          >
            Assign to me
          </Button>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="ticket-layout">
        <div style={{ display: "grid", gap: "1rem" }}>
          <Card>
            <h3>Author query</h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{ticket.description}</p>
            {ticket.book ? (
              <p className="muted">
                Book: {ticket.book.title} ({ticket.book.status}) · Pending royalty
                ₹{ticket.book.royaltyPending}
              </p>
            ) : (
              <p className="muted">General / account-level query</p>
            )}
            {ticket.aiRationale ? (
              <p className="muted">AI: {ticket.aiRationale}</p>
            ) : null}
          </Card>

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
                        ? m.author?.name || "Admin"
                        : ticket.author?.name}
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
            <div className="page-header" style={{ marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0 }}>AI draft response</h3>
              <Button variant="secondary" disabled={busy} onClick={loadDraft}>
                Generate draft
              </Button>
            </div>
            {draftSource ? (
              <p className="muted">Source: {draftSource}</p>
            ) : null}
            {draftWarning ? <p className="error">{draftWarning}</p> : null}
            <form className="form" onSubmit={sendReply}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Generate or write a reply for the author…"
              />
              <Button type="submit" disabled={busy || !draft.trim()}>
                Send to author
              </Button>
            </form>
          </Card>
        </div>

        <div style={{ display: "grid", gap: "1rem" }}>
          <Card>
            <h3>Ticket management</h3>
            <div className="form" style={{ marginTop: "0.75rem" }}>
              <label>
                Status
                <select
                  value={ticket.status}
                  onChange={(e) => patchTicket({ status: e.target.value })}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </label>
              <label>
                Category{" "}
                {ticket.categoryOverride ? (
                  <span className="muted">(overridden)</span>
                ) : null}
                <select
                  value={ticket.category}
                  onChange={(e) => patchTicket({ category: e.target.value })}
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority{" "}
                {ticket.priorityOverride ? (
                  <span className="muted">(overridden)</span>
                ) : null}
                <select
                  value={ticket.priority}
                  onChange={(e) => patchTicket({ priority: e.target.value })}
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </label>
              <p className="muted">
                Assignee: {ticket.assignee?.name || "Unassigned"}
              </p>
              <p className="muted">
                Category label:{" "}
                {CATEGORY_LABELS[ticket.category as TicketCategory]}
              </p>
            </div>
          </Card>

          <Card>
            <h3>Internal notes</h3>
            <p className="muted">Not visible to authors.</p>
            <div className="thread" style={{ margin: "0.75rem 0" }}>
              {(ticket.internalNotes || []).map((n) => (
                <div key={n.id} className="message">
                  <strong>{n.admin?.name}</strong>
                  <span className="muted"> · {formatDate(n.createdAt)}</span>
                  <p style={{ marginBottom: 0 }}>{n.body}</p>
                </div>
              ))}
            </div>
            <form className="form" onSubmit={addNote}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add an internal note…"
              />
              <Button type="submit" variant="secondary" disabled={busy}>
                Add note
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
