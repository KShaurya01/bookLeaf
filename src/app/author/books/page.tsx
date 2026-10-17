"use client";

import { useEffect, useState } from "react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatDate, formatINR } from "@/lib/format";

type Book = {
  id: string;
  title: string;
  isbn: string | null;
  genre: string | null;
  publicationDate: string | null;
  status: string;
  mrp: number | null;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  availableOn: string[];
};

export default function AuthorBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((j) => setBooks(j.data?.books || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Books</h1>
          <p className="muted">
            Your BookLeaf catalog, sales, and royalty snapshot.
          </p>
        </div>
      </div>

      {loading ? <p className="muted">Loading books…</p> : null}
      {!loading && books.length === 0 ? (
        <EmptyState
          title="No books yet"
          body="When your titles are seeded or published, they will appear here."
        />
      ) : null}

      <div className="grid-books">
        {books.map((book) => (
          <Card key={book.id} className="book-card">
            <h3>{book.title}</h3>
            <div className="meta-row">
              <Badge tone="info">{book.status}</Badge>
              {book.genre ? <Badge>{book.genre}</Badge> : null}
            </div>
            <p className="muted">ISBN: {book.isbn || "—"}</p>
            <p className="muted">Published: {formatDate(book.publicationDate)}</p>
            <p className="muted">
              Available on:{" "}
              {book.availableOn?.length ? book.availableOn.join(", ") : "—"}
            </p>
            <div className="stats">
              <div className="stat">
                <span>MRP</span>
                <strong>{formatINR(book.mrp)}</strong>
              </div>
              <div className="stat">
                <span>Copies sold</span>
                <strong>{book.totalCopiesSold}</strong>
              </div>
              <div className="stat">
                <span>Royalty earned</span>
                <strong>{formatINR(book.totalRoyaltyEarned)}</strong>
              </div>
              <div className="stat">
                <span>Pending</span>
                <strong>{formatINR(book.royaltyPending)}</strong>
              </div>
            </div>
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Paid: {formatINR(book.royaltyPaid)}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
