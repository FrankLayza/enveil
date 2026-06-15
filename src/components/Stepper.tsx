/**
 * Stepper — the signature element. A connected pipeline of 5 campaign steps.
 * The connector between nodes FILLS as you advance; completed steps lock with a
 * check; the active step pulses with the iris ring. This encodes the forward-only,
 * irreversible nature of on-chain campaign creation — you can't un-deploy.
 */
export interface StepDef {
  id: number;
  label: string;
}

export function Stepper({
  steps,
  current,
}: {
  steps: StepDef[];
  current: number; // 1-based index of the active step
}) {
  return (
    <ol className="flex items-start">
      {steps.map((step, i) => {
        const status: "done" | "active" | "todo" =
          step.id < current ? "done" : step.id === current ? "active" : "todo";
        const isLast = i === steps.length - 1;
        const connectorFilled = step.id < current;

        return (
          <li key={step.id} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center">
              <Node status={status} n={step.id} />
              <span
                className={
                  "mt-2 text-xs font-medium tracking-wide transition-colors duration-200 " +
                  (status === "active"
                    ? "text-gold-dim"
                    : status === "done"
                      ? "text-ink"
                      : "text-faint")
                }
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div className="relative mt-[15px] h-px flex-1 bg-edge">
                <div
                  className="absolute inset-0 origin-left bg-iris transition-transform duration-500 ease-out"
                  style={{ transform: `scaleX(${connectorFilled ? 1 : 0})` }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Node({ status, n }: { status: "done" | "active" | "todo"; n: number }) {
  const base =
    "relative flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200";
  if (status === "done") {
    return (
      <span className={base + " border-iris bg-iris text-white"}>
        <CheckIcon />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span
        className={
          base +
          " border-gold bg-gold/10 text-gold-dim"
        }
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-gold/20" />
        <span className="relative">{n}</span>
      </span>
    );
  }
  return (
    <span className={base + " border-edge-strong text-faint"}>
      {n}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
