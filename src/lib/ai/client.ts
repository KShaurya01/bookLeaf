import OpenAI from "openai";
import {
  TicketCategory,
  TicketPriority,
} from "@/lib/constants";
import { getKnowledgeContext } from "../kb/knowledge-base";
import { mockClassify, mockDraftReply } from "./mock";

const CATEGORIES = Object.values(TicketCategory);
const PRIORITIES = Object.values(TicketPriority);
const AI_TIMEOUT_MS = 5_000;

function hasApiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: AI_TIMEOUT_MS,
    maxRetries: 0,
  });
}

function getModel() {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export type ClassifyResult = {
  category: TicketCategory;
  priority: TicketPriority;
  rationale: string;
  source: "openai" | "mock";
};

/** Instant heuristic — used so ticket create never waits on the network. */
export function classifyTicketSync(
  subject: string,
  description: string
): ClassifyResult {
  return { ...mockClassify(subject, description), source: "mock" };
}

export async function classifyTicket(
  subject: string,
  description: string
): Promise<ClassifyResult> {
  if (!hasApiKey()) {
    return classifyTicketSync(subject, description);
  }

  try {
    const client = getClient();
    const completion = await withTimeout(
      client.chat.completions.create({
        model: getModel(),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You classify BookLeaf Publishing author support tickets.
Return JSON: {"category":"...","priority":"...","rationale":"one short sentence"}
category must be one of: ${CATEGORIES.join(", ")}
priority must be one of: ${PRIORITIES.join(", ")}
Priority guidance: unpaid royalties for months / ISBN errors / severe print defects = CRITICAL or HIGH; bio/metadata updates = LOW.`,
          },
          {
            role: "user",
            content: `Subject: ${subject}\n\nDescription: ${description}`,
          },
        ],
      }),
      AI_TIMEOUT_MS
    );

    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as {
      category?: string;
      priority?: string;
      rationale?: string;
    };

    const category = CATEGORIES.includes(parsed.category as TicketCategory)
      ? (parsed.category as TicketCategory)
      : TicketCategory.GENERAL_INQUIRY;
    const priority = PRIORITIES.includes(parsed.priority as TicketPriority)
      ? (parsed.priority as TicketPriority)
      : TicketPriority.MEDIUM;

    return {
      category,
      priority,
      rationale: parsed.rationale || "AI classification",
      source: "openai",
    };
  } catch (err) {
    console.error("classifyTicket fallback:", err);
    return classifyTicketSync(subject, description);
  }
}

export type DraftInput = {
  subject: string;
  description: string;
  category: TicketCategory;
  authorName: string;
  bookTitle?: string | null;
  bookStatus?: string | null;
  royaltyPending?: number | null;
  royaltyPaid?: number | null;
  totalCopiesSold?: number | null;
  mrp?: number | null;
};

export async function generateDraftReply(input: DraftInput): Promise<{
  draft: string;
  source: "openai" | "mock";
  warning?: string;
}> {
  if (!hasApiKey()) {
    return {
      draft: mockDraftReply(input),
      source: "mock",
      warning: "OPENAI_API_KEY missing — using offline draft.",
    };
  }

  try {
    const kb = getKnowledgeContext(input.category);
    const bookContext = input.bookTitle
      ? `Book: ${input.bookTitle}
Status: ${input.bookStatus ?? "n/a"}
MRP: ${input.mrp ?? "n/a"}
Copies sold: ${input.totalCopiesSold ?? 0}
Royalty paid: ₹${input.royaltyPaid ?? 0}
Royalty pending: ₹${input.royaltyPending ?? 0}`
      : "General / account-level query (no specific book).";

    const client = getClient();
    const completion = await withTimeout(
      client.chat.completions.create({
        model: getModel(),
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: `You are a BookLeaf Publishing author support representative drafting a reply for an admin to review and send.
Write in first person as BookLeaf support. Follow the knowledge base and tone guidelines exactly.
Do not invent policies. Be specific with numbers from the book context when available.
Keep the reply under 220 words. Do not include markdown headings.`,
          },
          {
            role: "user",
            content: `KNOWLEDGE BASE (relevant excerpt only):
${kb}

AUTHOR: ${input.authorName}
CATEGORY: ${input.category}
${bookContext}

TICKET SUBJECT: ${input.subject}
TICKET DESCRIPTION: ${input.description}

Draft the email-style response now.`,
          },
        ],
      }),
      AI_TIMEOUT_MS
    );

    const draft = completion.choices[0]?.message?.content?.trim();
    if (!draft) throw new Error("Empty AI draft");
    return { draft, source: "openai" };
  } catch (err) {
    console.error("generateDraftReply fallback:", err);
    const message = err instanceof Error ? err.message : String(err);
    let warning = "OpenAI request failed — using offline draft.";
    if (/429|insufficient_quota|credit/i.test(message)) {
      warning =
        "OpenAI account has no credits (429). Add billing credit at platform.openai.com, then try again.";
    } else if (/401|invalid.*api.*key|Incorrect API key/i.test(message)) {
      warning = "OpenAI API key is invalid — check OPENAI_API_KEY in .env.";
    } else if (/timeout/i.test(message)) {
      warning = "OpenAI timed out — using offline draft.";
    }
    return { draft: mockDraftReply(input), source: "mock", warning };
  }
}
