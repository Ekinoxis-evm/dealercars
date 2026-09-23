/**
 * A short numbered walk-through, on the page it describes.
 *
 * The front page used to carry six paragraphs about how buying works. They
 * belong next to the thing they explain: the marketplace gets the steps for
 * buying a car, the auction service gets its own. Kept to a line or two each —
 * a step-by-step that needs scrolling is not a step-by-step.
 */
export interface Step {
  title: string;
  body: string;
}

export function Steps({
  id,
  title,
  steps,
  tone = "raised",
}: {
  id?: string;
  title: string;
  steps: readonly Step[];
  tone?: "raised" | "sunken";
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-16 border-b border-rule-strong ${tone === "sunken" ? "bg-paper-sunken" : ""}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <h2 className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
          {title}
        </h2>
        <ol className="mt-4 grid gap-px border border-rule-strong bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="bg-paper-raised px-4 py-3.5">
              <p className="flex items-baseline gap-2">
                <span className="tnum font-mono text-[0.75rem] font-semibold text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-base font-bold leading-tight tracking-tight">
                  {step.title}
                </span>
              </p>
              <p className="mt-1 font-serif text-[0.875rem] leading-snug text-ink-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
