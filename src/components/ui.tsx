import { CSSProperties, ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger" | "info";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === "CRITICAL"
      ? "danger"
      : priority === "HIGH"
        ? "warn"
        : priority === "LOW"
          ? "neutral"
          : "info";
  return <Badge tone={tone}>{priority}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "RESOLVED" || status === "CLOSED"
      ? "success"
      : status === "IN_PROGRESS"
        ? "info"
        : "warn";
  return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
