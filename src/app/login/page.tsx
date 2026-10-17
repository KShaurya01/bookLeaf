"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("priya.sharma@email.com");
  const [password, setPassword] = useState("author123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Login failed");
        return;
      }
      const role = json.data.user.role;
      router.push(role === "ADMIN" ? "/admin/tickets" : "/author/books");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <p className="muted">BookLeaf Publishing</p>
        <h1>Author Support Portal</h1>
        <p className="muted">
          Sign in to manage books, raise support queries, or triage tickets.
        </p>
        <form className="form" onSubmit={onSubmit} style={{ marginTop: "1.25rem" }}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <div className="login-hints">
          <p>
            <strong>Author:</strong> priya.sharma@email.com / author123
          </p>
          <p>
            <strong>Admin:</strong> admin@bookleafpub.com / admin123
          </p>
        </div>
      </Card>
    </div>
  );
}
