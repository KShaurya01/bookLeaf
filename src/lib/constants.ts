export const Role = {
  AUTHOR: "AUTHOR",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const TicketStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketCategory = {
  ROYALTY_PAYMENTS: "ROYALTY_PAYMENTS",
  ISBN_METADATA: "ISBN_METADATA",
  PRINTING_QUALITY: "PRINTING_QUALITY",
  DISTRIBUTION_AVAILABILITY: "DISTRIBUTION_AVAILABILITY",
  BOOK_STATUS_PRODUCTION: "BOOK_STATUS_PRODUCTION",
  GENERAL_INQUIRY: "GENERAL_INQUIRY",
} as const;
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const TicketPriority = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;
export type TicketPriority = (typeof TicketPriority)[keyof typeof TicketPriority];

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ROYALTY_PAYMENTS: "Royalty & Payments",
  ISBN_METADATA: "ISBN & Metadata Issues",
  PRINTING_QUALITY: "Printing & Quality",
  DISTRIBUTION_AVAILABILITY: "Distribution & Availability",
  BOOK_STATUS_PRODUCTION: "Book Status & Production Updates",
  GENERAL_INQUIRY: "General Inquiry",
};

export const PRIORITY_ORDER: Record<TicketPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};
