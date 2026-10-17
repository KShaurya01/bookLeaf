/** BookLeaf knowledge base — server-only context for AI responses */

export const KB_OVERVIEW = `
BookLeaf Publishing is a self-publishing company operating in India and the US.
Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium, paid, with marketing/distribution add-ons).
We handle cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.
In-house printing facility and warehouse are in Delhi. Print partners: Repro India, Epitome Books.
`.trim();

export const KB_ROYALTY = `
Royalty Policy:
- 80/20 split: 80% of net profit per book to author, 20% to BookLeaf.
- Net profit = MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping.
- Royalties calculated quarterly; paid within 45 days of quarter end.
- Minimum payout threshold: ₹1,000 (rolls over if below).
- Payouts via bank transfer to account linked in author dashboard.
- Authors can view detailed royalty breakdown (sales per platform) in dashboard.
`.trim();

export const KB_ISBN = `
ISBN Policy:
- Every BookLeaf book gets a unique ISBN assigned by BookLeaf.
- ISBNs registered under BookLeaf's publisher imprint. Own-imprint ISBN must be obtained independently.
- ISBN errors (duplicate, wrong book linked) are high-priority and escalated to production.
`.trim();

export const KB_PRINTING = `
Printing & Quality:
- In-house printing for most orders; overflow/special formats via Repro India or Epitome Books.
- Standard print turnaround: 5–7 business days from order confirmation.
- Quality issues (misprints, binding defects, color inconsistency): free reprint after verification; author may need to share photos of defective copy.
`.trim();

export const KB_DISTRIBUTION = `
Distribution & Availability:
- Platforms: Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store.
- New listings typically live within 7–10 business days after publication is complete.
- "Unavailable" usually means stock sync issue — team can re-sync within 24–48 hours.
`.trim();

export const KB_PRODUCTION = `
Production Stages:
Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
Authors updated at each stage via email. Common delays: Cover Design (author approval), Proofreading (revision rounds).
`.trim();

export const KB_TONE = `
Communication Tone:
- Empathetic and professional. Authors are partners.
- Acknowledge concern before solutions.
- Be specific: numbers, dates, statuses — not vague reassurances.
- If BookLeaf's fault, own it. No corporate deflection.
- Escalation: clear timeline (e.g. within 48 hours).
- Always end with a clear next step.
`.trim();

export const KB_BY_CATEGORY: Record<string, string> = {
  ROYALTY_PAYMENTS: KB_ROYALTY,
  ISBN_METADATA: KB_ISBN,
  PRINTING_QUALITY: KB_PRINTING,
  DISTRIBUTION_AVAILABILITY: KB_DISTRIBUTION,
  BOOK_STATUS_PRODUCTION: KB_PRODUCTION,
  GENERAL_INQUIRY: [KB_OVERVIEW, KB_DISTRIBUTION].join("\n\n"),
};

export function getKnowledgeContext(category: string) {
  const specific = KB_BY_CATEGORY[category] ?? KB_OVERVIEW;
  return [KB_OVERVIEW, specific, KB_TONE].join("\n\n");
}

export const FULL_KB = [
  KB_OVERVIEW,
  KB_ROYALTY,
  KB_ISBN,
  KB_PRINTING,
  KB_DISTRIBUTION,
  KB_PRODUCTION,
  KB_TONE,
].join("\n\n");
