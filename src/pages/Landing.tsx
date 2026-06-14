import { Link } from "react-router-dom";
import { Footer } from "@/components/Footer";

const FEATURES = [
  {
    title: "Private",
    body: "Amounts are encrypted on-chain with FHE. No observer — not even validators — can read who received how much.",
  },
  {
    title: "Verifiable",
    body: "Each recipient decrypts and cryptographically verifies their own allocation — and only their own — with one signature.",
  },
  {
    title: "Composable",
    body: "Built on the ERC-7984 standard and the audited TokenOps airdrop contracts on the Zama Protocol.",
  },
];

export function Landing() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="flex min-h-[68vh] flex-col justify-center py-12">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-edge)] bg-[var(--color-panel)]/60 px-3 py-1 text-xs font-medium text-[var(--color-mute)] backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-iris)]" />
          Zama Developer Program · Season 3
        </span>

        <h1 className="mt-6 max-w-3xl text-balance font-display text-5xl font-extrabold leading-[1.0] tracking-[-0.02em] text-[var(--color-ink)] sm:text-6xl lg:text-7xl">
          Only you can see your{" "}
          <span className="relative inline-block whitespace-nowrap text-[var(--color-ink)]">
            <span
              aria-hidden
              className="absolute inset-x-[-0.08em] bottom-[0.1em] h-[0.5em] -rotate-1 rounded-sm bg-[var(--color-gold)]"
            />
            <span className="relative">allocation</span>
          </span>
          .
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-mute)]">
          DropShield airdrops confidential ERC-7984 tokens with every amount encrypted
          on-chain. Recipients decrypt and claim only their own — invisible to everyone
          else, including validators.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-iris)] px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-[var(--color-iris-dim)]"
          >
            Create an airdrop
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link
            to="/claim"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--color-edge-strong)] bg-[var(--color-panel)]/60 px-6 py-3 text-sm font-semibold text-[var(--color-ink)] backdrop-blur-sm transition-all duration-150 hover:bg-[var(--color-panel-2)]"
          >
            Claim my tokens
          </Link>
        </div>
      </section>

      {/* Features — tight row, hairline separators */}
      <section className="mt-12 grid gap-px overflow-hidden rounded-lg border border-[var(--color-edge)] bg-[var(--color-edge)] sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-[var(--color-panel)] p-7">
            <h3 className="font-display text-lg font-semibold tracking-tight text-[var(--color-ink)]">
              {f.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-mute)]">{f.body}</p>
          </div>
        ))}
      </section>

      <Footer />
    </div>
  );
}
