import { useInView } from "@/lib/useInView";
import { useRef, useState, useEffect, useCallback } from "react";

/**
 * FeaturesSection — three properties of DropShield, redesigned to feel alive.
 *
 * Each card has:
 *  - An animated SVG icon that plays its micro-animation on hover
 *  - Lift + border glow on hover
 *  - A mini interactive demo snippet (encrypted text, signature check, etc.)
 *  - Stagger-in on scroll
 */

/* ── Encrypted text scramble effect ─────────────────────────────────────── */
const CIPHER_CHARS = "█▓▒░▐▌▄▀■□▪▫●○◆◇";

function useScramble(finalText: string, active: boolean) {
  const [display, setDisplay] = useState(
    Array.from(finalText)
      .map(() => CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)])
      .join("")
  );
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      // Reset to scrambled
      setDisplay(
        Array.from(finalText)
          .map(() => CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)])
          .join("")
      );
      return;
    }

    let iteration = 0;
    const totalFrames = finalText.length * 3;

    function tick() {
      iteration++;
      const revealCount = Math.floor((iteration / totalFrames) * finalText.length);
      setDisplay(
        Array.from(finalText)
          .map((char, i) =>
            i < revealCount
              ? char
              : CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
          )
          .join("")
      );
      if (iteration < totalFrames) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, finalText]);

  return display;
}

/* ── Feature card data ──────────────────────────────────────────────────── */
interface Feature {
  title: string;
  body: string;
  icon: "lock" | "eye" | "stack";
  demo: "encrypt" | "verify" | "compose";
}

const FEATURES: Feature[] = [
  {
    title: "Private",
    body: "Allocation amounts are encrypted on-chain with FHE. No observer — not even validators — can read who received how much.",
    icon: "lock",
    demo: "encrypt",
  },
  {
    title: "Verifiable",
    body: "Each recipient decrypts and cryptographically verifies their own allocation — and only their own — with a single signature.",
    icon: "eye",
    demo: "verify",
  },
  {
    title: "Composable",
    body: "Built on the ERC-7984 confidential token standard and the audited TokenOps airdrop contracts on the Zama Protocol.",
    icon: "stack",
    demo: "compose",
  },
];

/* ── Main component ─────────────────────────────────────────────────────── */
export function FeaturesSection() {
  const ref = useInView<HTMLDivElement>();
  return (
    <section ref={ref} className="mt-28">
      <div className="mb-10 text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--color-ink)]">
          Privacy by default
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[var(--color-mute)]">
          Every airdrop on DropShield is confidential from creation to claim.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} feature={f} index={i} />
        ))}
      </div>
    </section>
  );
}

/* ── Individual feature card ────────────────────────────────────────────── */
function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="stagger group relative overflow-hidden rounded-xl border border-[var(--color-edge)] bg-[var(--color-panel)] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-gold)]/40 hover:shadow-lg hover:shadow-[var(--color-gold)]/5"
      style={{ animationDelay: `${index * 120}ms` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover glow — subtle radial gradient behind the card */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)",
          opacity: hovered ? 0.06 : 0,
        }}
      />

      {/* Animated icon */}
      <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-panel-2)] transition-all duration-300 group-hover:bg-[var(--color-gold)]/10 group-hover:text-[var(--color-gold-dim)]">
        <AnimatedIcon type={feature.icon} active={hovered} />
      </div>

      {/* Title */}
      <h3 className="font-display text-xl font-semibold tracking-tight text-[var(--color-ink)]">
        {feature.title}
      </h3>

      {/* Body */}
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-mute)]">{feature.body}</p>

      {/* Mini demo strip */}
      <div className="mt-5 rounded-md bg-[var(--color-panel-2)] px-3 py-2.5">
        <MiniDemo type={feature.demo} active={hovered} />
      </div>
    </div>
  );
}

/* ── Animated SVG icons ─────────────────────────────────────────────────── */
function AnimatedIcon({ type, active }: { type: Feature["icon"]; active: boolean }) {
  const size = 22;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (type === "lock") {
    // Lock → unlocks on hover (shackle lifts)
    return (
      <svg {...common}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path
          d={active ? "M7 11V7a5 5 0 0 1 9.9-1" : "M7 11V7a5 5 0 0 1 10 0v4"}
          style={{ transition: "d 0.4s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        {/* Keyhole dot */}
        <circle
          cx="12"
          cy="16.5"
          r={active ? "0" : "1"}
          fill="currentColor"
          stroke="none"
          style={{ transition: "r 0.3s ease" }}
        />
      </svg>
    );
  }

  if (type === "eye") {
    // Eye → pupil dilates on hover
    return (
      <svg {...common}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle
          cx="12"
          cy="12"
          r={active ? "4" : "3"}
          style={{ transition: "r 0.3s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        {active && (
          <circle
            cx="12"
            cy="12"
            r="1.5"
            fill="currentColor"
            stroke="none"
            className="animate-reveal"
          />
        )}
      </svg>
    );
  }

  // Stack → layers spread on hover
  return (
    <svg {...common}>
      <path
        d="M12 2 2 7l10 5 10-5-10-5Z"
        style={{
          transform: active ? "translateY(-2px)" : "translateY(0)",
          transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <path d="M2 17l10 5 10-5" />
      <path
        d="M2 12l10 5 10-5"
        style={{
          transform: active ? "translateY(1px)" : "translateY(0)",
          transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </svg>
  );
}

/* ── Mini demos inside each card ────────────────────────────────────────── */
function MiniDemo({ type, active }: { type: Feature["demo"]; active: boolean }) {
  if (type === "encrypt") {
    return <EncryptDemo active={active} />;
  }
  if (type === "verify") {
    return <VerifyDemo active={active} />;
  }
  return <ComposeDemo active={active} />;
}

function EncryptDemo({ active }: { active: boolean }) {
  const scrambled = useScramble("1,250.00 cUSDT", active);
  return (
    <div className="flex items-center justify-between font-mono text-xs">
      <span className="text-[var(--color-faint)]">allocation</span>
      <span
        className={
          "transition-colors duration-300 " +
          (active ? "text-[var(--color-gold-dim)] font-medium" : "text-[var(--color-encrypted)]")
        }
      >
        {scrambled}
      </span>
    </div>
  );
}

function VerifyDemo({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);

  const runVerification = useCallback(() => {
    setStep(1);
    const t1 = setTimeout(() => setStep(2), 400);
    const t2 = setTimeout(() => setStep(3), 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (active) {
      const cleanup = runVerification();
      return cleanup;
    } else {
      setStep(0);
    }
  }, [active, runVerification]);

  const labels = ["awaiting signature", "verifying…", "checking proof…", "✓ verified"];
  const colors = [
    "text-[var(--color-faint)]",
    "text-[var(--color-mute)]",
    "text-[var(--color-mute)]",
    "text-emerald-600 font-medium",
  ];

  return (
    <div className="flex items-center justify-between font-mono text-xs">
      <span className="text-[var(--color-faint)]">EIP-712</span>
      <span className={`transition-colors duration-200 ${colors[step]}`}>{labels[step]}</span>
    </div>
  );
}

function ComposeDemo({ active }: { active: boolean }) {
  const blocks = ["ERC-7984", "TokenOps", "Zama"];
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs">
      {blocks.map((b, i) => (
        <span
          key={b}
          className={
            "rounded border px-1.5 py-0.5 transition-all duration-300 " +
            (active
              ? "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 text-[var(--color-gold-dim)]"
              : "border-[var(--color-edge)] text-[var(--color-faint)]")
          }
          style={{
            transitionDelay: active ? `${i * 80}ms` : "0ms",
          }}
        >
          {b}
        </span>
      ))}
      <span
        className={
          "ml-auto transition-opacity duration-300 " +
          (active ? "text-[var(--color-mute)] opacity-100" : "opacity-0")
        }
      >
        →
      </span>
    </div>
  );
}
