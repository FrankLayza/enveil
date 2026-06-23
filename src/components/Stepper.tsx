/**
 * Stepper — the signature element. A connected pipeline of 5 campaign steps.
 * The connector between nodes FILLS as you advance; completed steps lock with a
 * check; the active step carries a soft gold ring. This encodes the forward-only,
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
                  "mt-2.5 whitespace-nowrap text-[11px] font-medium tracking-wide transition-colors duration-200 sm:text-xs " +
                  // On mobile, hide labels to prevent squeezing under the nodes.
                  // The active step title shows in the page header on mobile instead.
                  "hidden sm:block " +
                  (status === "active"
                    ? "text-ink font-semibold"
                    : status === "done"
                      ? "text-ink"
                      : "text-faint")
                }
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div className="relative mt-[17px] h-0.5 flex-1 overflow-hidden rounded-full bg-edge/40">
                <div
                  className="absolute inset-0 origin-left rounded-full transition-transform duration-500 ease-out"
                  style={{ 
                    backgroundColor: "var(--card-accent)",
                    transform: `scaleX(${connectorFilled ? 1 : 0})` 
                  }}
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
    "relative flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200";
  if (status === "done") {
    return (
      <span 
        className={base + " text-white"}
        style={{ backgroundColor: "var(--card-accent)", borderColor: "var(--card-accent)" }}
      >
        <CheckIcon />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span 
        className={base}
        style={{ 
          borderColor: "var(--card-accent)", 
          backgroundColor: "var(--card-accent-tint)", 
          color: "var(--card-accent)",
          boxShadow: "0 0 0 4px var(--card-accent-tint)"
        }}
      >
        {n}
      </span>
    );
  }
  return <span className={base + " border-edge bg-panel-2 text-mute/50"}>{n}</span>;
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
