import { Link } from "react-router-dom";
import { Shield } from "@/components/Shield";

/**
 * Unified footer: trust signals + wordmark + links + Sepolia indicator.
 * Replaces the old TrustBar + Footer combo that looked like two footers.
 */
const BUILT_ON = ["Zama Protocol", "TokenOps SDK", "ERC-7984", "FHE"];

export function Footer() {
  return (
    <footer className="mt-28 border-t border-[var(--color-edge)]">
      <div className="mx-auto max-w-5xl px-6">
        {/* Trust signals row */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-6">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-faint)]">
            Built on
          </span>
          {BUILT_ON.map((name) => (
            <span key={name} className="font-mono text-sm text-[var(--color-mute)]">
              {name}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--color-edge)]" />

        {/* Bottom row */}
        <div className="flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-[var(--color-mute)]">
            <Shield size={18} />
            <span className="font-display font-semibold text-[var(--color-ink)]">DropShield</span>
            <span className="text-[var(--color-faint)]">— confidential airdrops</span>
          </div>

          <nav className="flex items-center gap-5 text-sm text-[var(--color-mute)]">
            <Link to="/admin" className="transition-colors duration-150 hover:text-[var(--color-ink)]">
              Create
            </Link>
            <Link to="/claim" className="transition-colors duration-150 hover:text-[var(--color-ink)]">
              Claim
            </Link>
            <a
              href="https://docs.zama.org/protocol"
              target="_blank"
              rel="noreferrer"
              className="transition-colors duration-150 hover:text-[var(--color-ink)]"
            >
              Zama Protocol ↗
            </a>
          </nav>

          <span className="inline-flex items-center gap-2 font-mono text-xs text-[var(--color-faint)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-gold)]/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-gold)]" />
            </span>
            Sepolia testnet
          </span>
        </div>
      </div>
    </footer>
  );
}
