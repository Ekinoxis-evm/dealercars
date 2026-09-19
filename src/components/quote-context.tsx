"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ContactPayload } from "@/lib/whatsapp";

/**
 * What the contact button should carry.
 *
 * The button is in the layout and the figures are built several levels down in
 * `PlanPicker` and `BudgetCalculator`, so the quote has to travel upwards. A
 * context is the cheap way: whichever component owns a live quote publishes it
 * here, and the button reads it.
 *
 * Deliberately a SNAPSHOT of what is already on screen, never a second
 * calculation. The publisher passes figures the server returned, so the message
 * and the page can only ever agree.
 *
 * Null is a real state and the common one — most pages have no quote, and the
 * button falls back to a general enquiry rather than inventing numbers.
 */
type Ctx = {
  payload: ContactPayload | null;
  setPayload: (payload: ContactPayload | null) => void;
};

const QuoteContext = createContext<Ctx | null>(null);

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<ContactPayload | null>(null);
  const value = useMemo(() => ({ payload, setPayload }), [payload]);
  return (
    <QuoteContext.Provider value={value}>{children}</QuoteContext.Provider>
  );
}

/** Read the live quote. Used by the contact button. */
export function useQuote(): ContactPayload | null {
  return useContext(QuoteContext)?.payload ?? null;
}

/**
 * Publish a quote for the contact button.
 *
 * Returns a setter rather than taking a value, so the caller decides when to
 * publish — which matters because the figure worth sending is the settled one,
 * not every intermediate state while somebody is still typing.
 *
 * Safe outside a provider: returns a no-op instead of throwing, because a
 * component rendering without a contact button is a missing convenience, not a
 * broken page.
 */
export function usePublishQuote(): (payload: ContactPayload | null) => void {
  return useContext(QuoteContext)?.setPayload ?? (() => {});
}
