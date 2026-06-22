import { useState } from "react";
import { Reveal } from "@/components/Reveal";

/* ── How It Works ───────────────────────────────────────────────────────────
   Numbered-circle connector design (matching the Bankyz-style screenshot):
   · Eyebrow label + large display headline
   · Three numbered circles joined by a horizontal line on desktop
   · Title + body copy beneath each circle
   · Rounded photo/illustration card beneath each column
   Horizontal on desktop, vertical stack on mobile.                          */

const STEPS = [
  {
    number: 1,
    title: "Upload your list",
    body: "Add contributors or grantees with their amounts. No minimum, and no wallet needed to start.",
    img: "/illustrations/hiw-step1.png",
    imgAlt: "Spreadsheet showing contributor list being uploaded",
  },
  {
    number: 2,
    title: "Amounts encrypted in-browser",
    body: "FHE encrypts each allocation before it ever leaves your browser. On-chain: ciphertext only. Nobody reads it.",
    img: "/illustrations/hiw-step2.png",
    imgAlt: "Encrypted ciphertext and lock icon illustration",
  },
  {
    number: 3,
    title: "Recipients claim privately",
    body: "Each person opens their private link, verifies their own amount, and claims. On-chain: only that a claim happened.",
    img: "/illustrations/recipients-enveil.png",
    imgAlt: "Mobile phone showing claim confirmed screen",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="w-full py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Reveal className="mx-auto max-w-2xl text-center mb-16 sm:mb-20">
          <span
            style={{
              display: "inline-block",
              fontFamily: "var(--font-mono)",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--color-violet)",
              marginBottom: "1.1rem",
            }}
          >
            Simple Setup
          </span>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: "-0.025em",
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Get started in minutes
          </h2>
        </Reveal>

        {/* ── Steps ──────────────────────────────────────────────────────── */}
        <Reveal.Stagger className="relative grid gap-12 md:grid-cols-3 md:gap-8">

          {/* Horizontal connector line (desktop only) */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "1.5rem",        /* aligns with circle center */
              left: "calc(16.667% + 1.5rem)",
              right: "calc(16.667% + 1.5rem)",
              height: "1px",
              background: "var(--color-violet-line)",
              display: "none",
            }}
            className="hiw-rail"
          />

          {STEPS.map((step) => (
            <Reveal.Item key={step.number} className="flex flex-col items-center text-center">
              <StepColumn step={step} />
            </Reveal.Item>
          ))}
        </Reveal.Stagger>
      </div>

      {/* ── Rail desktop reveal via CSS ─────────────────────────────────── */}
      <style>{`
        @media (min-width: 768px) {
          .hiw-rail { display: block !important; }
        }
      `}</style>
    </section>
  );
}

/* ── Individual step column ─────────────────────────────────────────────── */
function StepColumn({ step }: { step: (typeof STEPS)[number] }) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <>
      {/* Numbered circle */}
      <div
        style={{
          position: "relative",
          width: "3rem",
          height: "3rem",
          borderRadius: "50%",
          border: "1.5px solid var(--color-violet-line)",
          background: "var(--color-panel)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.5rem",
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--color-ink)",
            lineHeight: 1,
          }}
        >
          {step.number}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.35rem",
          fontWeight: 700,
          letterSpacing: "-0.015em",
          color: "var(--color-ink)",
          marginBottom: "0.65rem",
          lineHeight: 1.2,
        }}
      >
        {step.title}
      </h3>

      {/* Body */}
      <p
        style={{
          fontSize: "0.9rem",
          lineHeight: 1.65,
          color: "var(--color-mute)",
          maxWidth: "22rem",
          marginBottom: "1.5rem",
        }}
      >
        {step.body}
      </p>

      {/* Photo card */}
      <div
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          borderRadius: "1.25rem",
          overflow: "hidden",
          background: imgOk
            ? "var(--color-recessed)"
            : "linear-gradient(135deg, var(--color-violet-tint), var(--color-violet-edge))",
          boxShadow: "0 4px 24px -8px rgba(40,24,80,0.14)",
          flexShrink: 0,
        }}
      >
        {imgOk ? (
          <img
            src={step.img}
            alt={step.imgAlt}
            onError={() => setImgOk(false)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          /* Graceful fallback — styled placeholder */
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1.5rem",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.65rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-violet-deep)",
                opacity: 0.6,
              }}
            >
              Step {step.number} · Illustration
            </span>
          </div>
        )}
      </div>
    </>
  );
}
