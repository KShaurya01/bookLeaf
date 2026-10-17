import {
  TicketCategory,
  TicketPriority,
} from "@/lib/constants";

const CATEGORY_KEYWORDS: { category: TicketCategory; patterns: RegExp[] }[] = [
  {
    category: TicketCategory.ROYALTY_PAYMENTS,
    patterns: [/royalt/i, /payment/i, /payout/i, /bank/i, /earned/i, /₹|rs\.?/i],
  },
  {
    category: TicketCategory.ISBN_METADATA,
    patterns: [/isbn/i, /metadata/i, /description/i, /title mismatch/i],
  },
  {
    category: TicketCategory.PRINTING_QUALITY,
    patterns: [/print/i, /blurry/i, /binding/i, /misprint/i, /quality/i, /defect/i],
  },
  {
    category: TicketCategory.DISTRIBUTION_AVAILABILITY,
    patterns: [/amazon/i, /flipkart/i, /unavailable/i, /listing/i, /stock/i, /distribution/i],
  },
  {
    category: TicketCategory.BOOK_STATUS_PRODUCTION,
    patterns: [/typesetting/i, /cover design/i, /production/i, /status/i, /when will/i, /editing/i],
  },
];

export function mockClassify(subject: string, description: string): {
  category: TicketCategory;
  priority: TicketPriority;
  rationale: string;
} {
  const text = `${subject}\n${description}`;
  let category: TicketCategory = TicketCategory.GENERAL_INQUIRY;
  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.patterns.some((p) => p.test(text))) {
      category = rule.category;
      break;
    }
  }

  let priority: TicketPriority = TicketPriority.MEDIUM;
  if (/haven'?t received|months|overdue|wrong isbn|terrible|defect|urgent|critical/i.test(text)) {
    priority = TicketPriority.CRITICAL;
  } else if (/low royalty|unavailable|delayed|3 weeks|blurry|misaligned/i.test(text)) {
    priority = TicketPriority.HIGH;
  } else if (/can i|update|bio|general|question/i.test(text)) {
    priority = TicketPriority.LOW;
  }

  if (category === TicketCategory.ISBN_METADATA && priority === TicketPriority.MEDIUM) {
    priority = TicketPriority.HIGH;
  }

  return {
    category,
    priority,
    rationale: `Heuristic classification (AI unavailable): matched category ${category}, priority ${priority}.`,
  };
}

export function mockDraftReply(input: {
  subject: string;
  description: string;
  category: TicketCategory;
  authorName: string;
  bookTitle?: string | null;
  bookStatus?: string | null;
  royaltyPending?: number | null;
  royaltyPaid?: number | null;
}): string {
  const bookLine = input.bookTitle
    ? `regarding your book "${input.bookTitle}"${input.bookStatus ? ` (current status: ${input.bookStatus})` : ""}`
    : "regarding your account";

  const extras: string[] = [];
  if (input.category === TicketCategory.ROYALTY_PAYMENTS) {
    extras.push(
      "BookLeaf calculates royalties quarterly and pays within 45 days of quarter end, with a ₹1,000 minimum payout threshold.",
      input.royaltyPending != null
        ? `Our records currently show ₹${input.royaltyPending} pending and ₹${input.royaltyPaid ?? 0} already paid for this title.`
        : "Please ensure your bank details are linked in your dashboard so payouts are not held."
    );
  } else if (input.category === TicketCategory.ISBN_METADATA) {
    extras.push(
      "ISBN mismatches are treated as high priority. I am escalating this to our production team immediately, and we will update you within 48 hours."
    );
  } else if (input.category === TicketCategory.PRINTING_QUALITY) {
    extras.push(
      "I am sorry about the print quality issue. Please share clear photos of the defective copy so we can verify and arrange a free reprint (typically 5–7 business days after verification)."
    );
  } else if (input.category === TicketCategory.DISTRIBUTION_AVAILABILITY) {
    extras.push(
      "This is usually a stock sync issue. I am triggering a re-sync with our distribution team — listings typically recover within 24–48 hours."
    );
  } else if (input.category === TicketCategory.BOOK_STATUS_PRODUCTION) {
    extras.push(
      "I will confirm the exact production stage and share a concrete updated timeline. Common delays occur at cover approval and proofreading revision rounds."
    );
  } else {
    extras.push(
      "Metadata and general account updates can be submitted via the dashboard or by following up on this ticket. Platform changes usually reflect within 3–5 business days."
    );
  }

  return [
    `Dear ${input.authorName},`,
    "",
    `Thank you for writing in ${bookLine}. I understand your concern about "${input.subject}", and I am here to help.`,
    "",
    ...extras,
    "",
    "Next step: our team will follow up on this ticket shortly. If you have additional details or screenshots, please reply here.",
    "",
    "Warm regards,",
    "BookLeaf Author Support",
    "",
    "(Draft generated offline — please review before sending.)",
  ].join("\n");
}
