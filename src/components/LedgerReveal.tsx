import { useEffect, useState } from "react";

/**
 * LedgerReveal — the hero centerpiece. A live "airdrop ledger" where every
 * recipient row shows an encrypted amount (continuously shimmering ciphertext).
 * ONE row — yours — decrypts to a real value on a loop, then re-encrypts.
 *
 * This is the entire product in one image: amounts are public-on-chain but
 * unreadable; only your own allocation resolves, only for you.
 */
const GLYPHS = "█▓▒░#%&0123456789ABCDEF";
const AMOUNT = "1,250.00";
const FIXED = new Set([1, 5]); // "," and "." positions in AMOUNT

const ROWS = [
  { addr: "0x4a3b…c92d", seed: 3 },
  { addr: "0x91fe…02ac", seed: 11 },
  { addr: "0x7f1e…82ac", seed: 0, you: true },
  { addr: "0x22dd…7b10", seed: 7 },
  { addr: "0xab09…4e51", seed: 19 },
  { addr: "0x63c7…1d4f", seed: 5 },
];

const TICK_MS = 90;
const CYCLE = 88; // ticks per full encrypt→reveal→encrypt loop (~8s)

function glyph(n: number): string {
  return GLYPHS[Math.abs(n) % GLYPHS.length];
}

/** A shimmering ciphertext string of given length, animated by `tick`. */
function cipher(len: number, seed: number, tick: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += glyph(seed * 7 + i * 13 + tick * (i + 1));
  return out;
}

/** The "you" amount: locked left-to-right during decrypt, scrambled otherwise. */
function amountDisplay(tick: number): { text: string; revealed: boolean } {
  const p = tick % CYCLE;
  // phases: 0–14 decrypt · 14–58 revealed · 58–70 re-encrypt · 70–88 encrypted
  if (p >= 14 && p < 58) return { text: AMOUNT, revealed: true };
  let lock = 0;
  if (p < 14) lock = Math.floor((p / 14) * AMOUNT.length);
  else if (p < 70) lock = Math.floor(((70 - p) / 12) * AMOUNT.length);
  let out = "";
  for (let i = 0; i < AMOUNT.length; i++) {
    if (FIXED.has(i)) out += AMOUNT[i];
    else if (i < lock) out += AMOUNT[i];
    else out += glyph(i * 17 + tick * (i + 2));
  }
  return { text: out, revealed: false };
}

export function LedgerReveal() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const you = amountDisplay(tick);

  return (
    <div className="w-full max-w-md">
      <div
        className="overflow-hidden rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel)]"
        style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)" }}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-[var(--color-edge)] px-5 py-3">
          <span className="font-mono text-xs tracking-wide text-[var(--color-mute)]">
            Airdrop ledger · Sepolia
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--color-faint)]">
            <LockIcon /> FHE
          </span>
        </div>

        {/* rows */}
        <div className="divide-y divide-[var(--color-edge)]">
          {ROWS.map((row) => {
            if (row.you) {
              return (
                <div
                  key={row.addr}
                  className="relative flex items-center justify-between bg-[var(--color-gold)]/[0.06] px-5 py-3"
                >
                  <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--color-gold)]" />
                  <span className="font-mono text-sm text-[var(--color-ink)]">{row.addr}</span>
                  <span className="flex items-baseline gap-1.5">
                    <span
                      key={you.revealed ? "r" : "e"}
                      className={
                        "font-mono text-sm font-medium tabular-nums " +
                        (you.revealed
                          ? "animate-reveal text-[var(--color-gold-dim)]"
                          : "text-[var(--color-encrypted)]")
                      }
                    >
                      {you.text}
                    </span>
                    <span className="font-mono text-xs text-[var(--color-mute)]">cUSDT</span>
                  </span>
                </div>
              );
            }
            return (
              <div key={row.addr} className="flex items-center justify-between px-5 py-3">
                <span className="font-mono text-sm text-[var(--color-mute)]">{row.addr}</span>
                <span className="flex items-baseline gap-1.5">
                  <span className="select-none font-mono text-sm tabular-nums text-[var(--color-encrypted)]">
                    {cipher(6, row.seed, tick)}
                  </span>
                  <span className="font-mono text-xs text-[var(--color-faint)]">cUSDT</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div className="border-t border-[var(--color-edge)] px-5 py-3">
          <p className="text-xs text-[var(--color-mute)]">
            Amounts are encrypted on-chain.{" "}
            <span className="text-[var(--color-gold-dim)]">Only your row is yours.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
