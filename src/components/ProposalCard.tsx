import type { AuctionSource, ConditionLight, Proposal, TitleStatus } from "@/lib/types";
import { formatBps, formatMoney } from "@/lib/finance";
import { RegZDisclosure } from "@/components/RegZDisclosure";

const SOURCE_LABEL: Record<AuctionSource, string> = {
  manheim: "Manheim",
  openlane: "OPENLANE",
  acv: "ACV",
};

/** Auction-light semantics, used faithfully: green = drivable and
 *  arbitratable, yellow = announced, red = as-is. */
const LIGHT: Record<ConditionLight, { label: string; className: string }> = {
  green: { label: "Green light · drivable, arbitratable", className: "bg-light-green" },
  yellow: { label: "Yellow light · announced", className: "bg-light-amber" },
  red: { label: "Red light · as-is", className: "bg-light-red" },
};

const TITLE_LABEL: Record<TitleStatus, string> = {
  clean: "Clean title",
  branded: "Branded title",
  salvage: "Salvage title",
};

/** Mask all but the last six characters of the VIN. */
function maskVin(vin: string): string {
  return "•".repeat(Math.max(vin.length - 6, 0)) + vin.slice(-6);
}

export function ProposalCard({
  proposal,
  commitBy,
}: {
  proposal: Proposal;
  commitBy: string;
}) {
  const { lot, loan } = proposal;
  const light = LIGHT[lot.conditionLight];
  const bidCeilingCents = lot.mmrCents + proposal.headroomCents;

  return (
    <article className="flex flex-col border border-rule-strong bg-paper-raised">
      {/* Lane data — the mono header strip */}
      <p className="tnum flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule bg-paper-sunken px-4 py-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-muted">
        <span className="text-ink">{SOURCE_LABEL[lot.source]}</span>
        <span>
          Lane {lot.lane} · Run {lot.run}
        </span>
        <span className="min-w-0 flex-1 truncate text-right">
          {lot.locationName} · {lot.distanceMiles} mi
        </span>
      </p>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        {/* Vehicle */}
        <h3 className="font-display text-xl font-bold tracking-tight">
          {lot.year} {lot.make} {lot.model}{" "}
          <span className="font-semibold text-ink-muted">{lot.trim}</span>
        </h3>

        <dl className="tnum mt-2 space-y-1 font-mono text-[0.75rem] text-ink-muted">
          <div className="flex justify-between gap-3">
            <dt className="uppercase tracking-[0.08em] text-ink-faint">VIN</dt>
            <dd>{maskVin(lot.vin)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="uppercase tracking-[0.08em] text-ink-faint">Odometer</dt>
            <dd>{lot.mileage.toLocaleString("en-US")} mi</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="uppercase tracking-[0.08em] text-ink-faint">Title</dt>
            <dd>{TITLE_LABEL[lot.titleStatus]}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="uppercase tracking-[0.08em] text-ink-faint">Grade</dt>
            <dd>{lot.conditionGrade.toFixed(1)} / 5.0</dd>
          </div>
        </dl>

        {/* Auction light */}
        <p className="mt-3 flex items-center gap-2 font-mono text-[0.75rem] font-medium text-ink">
          <span
            aria-hidden="true"
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${light.className}`}
          />
          {light.label}
        </p>
        {lot.announcements.length > 0 && (
          <p className="mt-1 pl-[1.125rem] font-mono text-[0.6875rem] leading-relaxed text-ink-muted">
            Announced: {lot.announcements.join("; ")}
          </p>
        )}

        {/* The two figures the member actually decides on */}
        <div className="tnum mt-4 grid grid-cols-2 divide-x divide-rule border-y border-rule">
          <div className="py-3 pr-3">
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
              Down today
            </p>
            <p className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-brass">
              {formatMoney(proposal.downCents)}
            </p>
          </div>
          <div className="py-3 pl-3">
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
              Per month × {loan.termMonths}
            </p>
            <p className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-brass">
              {formatMoney(loan.monthlyPaymentCents, { cents: true })}
            </p>
          </div>
        </div>

        {/* Why this lot */}
        <p className="tnum mt-3 font-serif text-[0.875rem] italic leading-relaxed text-ink-muted">
          {proposal.headroomCents >= 0 ? (
            <>
              MMR {formatMoney(lot.mmrCents)} against a{" "}
              {formatMoney(bidCeilingCents)} bid ceiling — clears with{" "}
              {formatMoney(proposal.headroomCents)} of headroom.
            </>
          ) : (
            <>
              MMR {formatMoney(lot.mmrCents)} against a{" "}
              {formatMoney(bidCeilingCents)} bid ceiling — runs{" "}
              {formatMoney(-proposal.headroomCents)} over; the dealer stops at
              the ceiling.
            </>
          )}
        </p>

        {/* Deal footer */}
        <dl className="tnum mt-auto grid grid-cols-3 gap-3 border-t border-rule pt-3 font-mono text-[0.75rem]">
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
              Out-the-door
            </dt>
            <dd className="font-medium text-ink">
              {formatMoney(proposal.outTheDoorCents)}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
              APR
            </dt>
            <dd className="font-medium text-ink">{formatBps(loan.aprBps)}</dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
              Commit by
            </dt>
            <dd className="font-medium text-accent">{commitBy}</dd>
          </div>
        </dl>

        {/* Down + payment shown above are Reg Z trigger terms. */}
        <RegZDisclosure
          downCents={proposal.downCents}
          loan={loan}
          className="mt-3"
        />
      </div>
    </article>
  );
}
