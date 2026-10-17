"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";

type Book = { id: string; title: string };

export default function NewTicketPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((j) => setBooks(j.data?.books || []));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          description,
          bookId: bookId || null,
          attachmentName: attachmentName || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Could not create ticket");
        setLoading(false);
        return;
      }
      const id = json.data?.ticket?.id;
      if (!id) {
        setError("Ticket created but no id returned");
        setLoading(false);
        return;
      }
      // Hard navigation avoids soft-nav stalls after long-running requests.
      window.location.assign(`/author/tickets/${id}`);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Submit a Support Query</h1>
          <p className="muted">
            Tell us what you need — our team (and AI assist) will pick it up.
          </p>
        </div>
      </div>
      <Card>
        <form className="form" onSubmit={onSubmit}>
          <label>
            Related book
            <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
              <option value="">General / Account Level</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              minLength={3}
              placeholder="e.g. Royalty not received for Q3"
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
              placeholder="Share details, dates, platforms, and what you’ve already checked."
            />
          </label>
          <label>
            Attachment (UI only)
            <input
              type="file"
              onChange={(e) =>
                setAttachmentName(e.target.files?.[0]?.name || "")
              }
            />
          </label>
          {attachmentName ? (
            <p className="muted">Selected: {attachmentName}</p>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Submitting…" : "Submit ticket"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
