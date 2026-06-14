/**
 * TrustBar — credibility strip. Muted, small, horizontal. Names the real
 * infrastructure (trust signals, not buzzwords).
 */
const BUILT_ON = ["Zama Protocol", "TokenOps SDK", "ERC-7984", "FHE"];

export function TrustBar() {
  return (
    <div className="mt-20 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[var(--color-edge)] pt-8">
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-faint)]">
        Built on
      </span>
      {BUILT_ON.map((name) => (
        <span key={name} className="font-mono text-sm text-[var(--color-mute)]">
          {name}
        </span>
      ))}
    </div>
  );
}
