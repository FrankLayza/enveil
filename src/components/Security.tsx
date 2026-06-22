import { Reveal } from "@/components/Reveal";

/* ── Security / How privacy works ───────────────────────────────────────────
   Answers the implicit objection: "is this actually private, or just hidden?"
   Full-width tinted band. Short, confident, doesn't oversell. */

const PROPERTIES = [
  {
    title: "On-chain encryption",
    body: "Amounts are FHE ciphertexts on Sepolia. Not obfuscated, not off-chain — mathematically unreadable, on the public chain.",
    icon: CipherIcon,
  },
  {
    title: "Recipient-only decryption",
    body: "Only the intended wallet can decrypt its own allocation. The key is tied to the address — not held by the sender or anyone else.",
    icon: KeyIcon,
  },
  {
    title: "No recipient list on-chain",
    body: "The list of who receives what never touches the blockchain. Only the people who choose to claim ever reveal themselves.",
    icon: ListIcon,
  },
];

export function Security() {
  return (
    <section
      id="security"
      className="w-full py-20 sm:py-28"
      style={{
        background:
          "linear-gradient(180deg, transparent, var(--color-violet-tint) 18%, var(--color-violet-tint) 82%, transparent)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-white/70 px-3.5 py-1.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-violet backdrop-blur-sm">
            Security
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-[1.08] tracking-[-0.025em] text-ink sm:text-[2.75rem]">
            Not hidden.{" "}
            <span className="text-violet">Mathematically private.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-violet-ink/80">
            On a public blockchain, “private” usually means obfuscated — mixers,
            or amounts stashed off-chain. Enveil is different. Every allocation is
            encrypted before it leaves your browser, and the contract processes it
            without ever decrypting it. There is no moment where the amount is
            readable.
          </p>
        </Reveal>

        <Reveal.Stagger className="mt-14 grid gap-5 md:grid-cols-3">
          {PROPERTIES.map((p) => {
            const Icon = p.icon;
            return (
              <Reveal.Item
                key={p.title}
                className="rounded-2xl border border-violet-edge bg-white/80 p-6 shadow-[0_18px_50px_-22px_rgba(80,40,180,0.28)] backdrop-blur-sm"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-tint text-violet">
                  <Icon />
                </span>
                <h3 className="mt-4 font-display text-base font-bold tracking-[-0.01em] text-ink">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-mute">{p.body}</p>
              </Reveal.Item>
            );
          })}
        </Reveal.Stagger>
      </div>
    </section>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────── */
function CipherIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h2M7 13h4M13 9h4M15 13h2" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="4" />
      <path d="m11 11 8 8M16 16l2-2M18 18l2-2" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  );
}
