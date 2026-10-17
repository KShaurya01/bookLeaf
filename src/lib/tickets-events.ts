type Listener = (ticketId: string) => void;

const globalStore = globalThis as unknown as {
  ticketListeners?: Map<string, Set<Listener>>;
};

function getMap() {
  if (!globalStore.ticketListeners) {
    globalStore.ticketListeners = new Map();
  }
  return globalStore.ticketListeners;
}

export function subscribeTicket(ticketId: string, listener: Listener) {
  const map = getMap();
  if (!map.has(ticketId)) map.set(ticketId, new Set());
  map.get(ticketId)!.add(listener);
  return () => {
    map.get(ticketId)?.delete(listener);
  };
}

export function publishTicketUpdate(ticketId: string) {
  const listeners = getMap().get(ticketId);
  if (!listeners) return;
  for (const listener of listeners) {
    try {
      listener(ticketId);
    } catch (err) {
      console.error("ticket listener error", err);
    }
  }
}

/** Author-level channel for any of their tickets */
export function subscribeAuthor(authorId: string, listener: Listener) {
  return subscribeTicket(`author:${authorId}`, listener);
}

export function publishAuthorUpdate(authorId: string, ticketId: string) {
  publishTicketUpdate(`author:${authorId}`);
  publishTicketUpdate(ticketId);
}

export function subscribeAdmin(listener: Listener) {
  return subscribeTicket("admin:queue", listener);
}

export function publishAdminQueueUpdate(ticketId: string) {
  publishTicketUpdate("admin:queue");
  publishTicketUpdate(ticketId);
}
