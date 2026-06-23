import { useEffect, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { Footer } from "@/components/Footer";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Security } from "@/components/Security";

/* ── Landing ─────────────────────────────────────────────────────────────────
   B2B marketing page, "Bankyz" blueprint restyled to Enveil (light + violet).
   Seven stacked sections, plain top-to-bottom scroll:
     hero → trust bar → how it works → use cases → security → final CTA → footer.
   One selling point throughout: token grants are permanently public on-chain;
   Enveil makes them private. The custom cursor is scoped to this page only
   (body.landing-cursor, toggled below). */

const TRUST = [
  "Zama FHE",
  "TokenOps SDK",
  "OpenZeppelin Audited",
  "ERC-7984",
  "Sepolia",
];

export function Landing() {
  const heroRef = useRef<HTMLElement>(null);
  const lenis = useLenis();

  // Scope the custom cursor to the landing page only — added on mount, removed
  // on unmount so /admin and /claim restore the normal system cursor.
  useEffect(() => {
    document.body.classList.add("landing-cursor");
    return () => document.body.classList.remove("landing-cursor");
  }, []);

  // Hero entrance: eyebrow → title → sub → cta → cards. useLayoutEffect so the
  // from-state is set before paint (no flash). Honors reduced-motion.
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".js-eyebrow", { y: 18, opacity: 0, duration: 0.6 })
        .from(".js-title", { y: 28, opacity: 0, duration: 0.9 }, "-=0.35")
        .from(".js-sub", { y: 20, opacity: 0, duration: 0.75 }, "-=0.6")
        .from(".js-cta", { y: 16, opacity: 0, duration: 0.6 }, "-=0.5");
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative">
      {/* ── 1 · HERO ───────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden pt-40 pb-24 text-center min-h-[90vh] flex items-center justify-center bg-[url('/illustrations/hero-bg.png')] bg-center bg-no-repeat bg-[length:auto_100%] md:bg-cover"
      >
        {/* Dark overlay for text contrast */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 0,
          }}
        />

        {/* Content column */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "52rem",
            margin: "0 auto",
            padding: "0 1.5rem",
          }}
        >
          {/* Eyebrow pill */}
          <span
            className="js-eyebrow"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              borderRadius: "9999px",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
              padding: "0.35rem 1rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.9)",
              marginBottom: "1.5rem",
            }}
          >
            <span
              style={{
                width: "0.375rem",
                height: "0.375rem",
                borderRadius: "50%",
                background: "var(--color-violet)",
                flexShrink: 0,
              }}
            />
            Confidential token distribution
          </span>

          {/* Headline */}
          <h1
            className="js-title mx-auto mb-6 max-w-3xl font-display font-extrabold leading-[1.04] tracking-tight text-white text-[clamp(2.15rem,6vw,4.5rem)]"
          >
            Token grants shouldn't be{" "}
            <span
              style={{
                position: "relative",
                display: "inline-block",
                color: "var(--color-violet-line)",
                whiteSpace: "nowrap",
              }}
            >
              everyone's business.
              <UnderlineSquiggle />
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="js-sub"
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.65,
              color: "rgba(255,255,255,0.78)",
              maxWidth: "34rem",
              margin: "0 auto 2.25rem",
            }}
          >
            Enveil encrypts every allocation on-chain with Fully Homomorphic
            Encryption. Your contributors verify and claim only their own grant
            — amounts stay confidential from everyone else. Forever.
          </p>

          {/* CTAs */}
          <div
            className="js-cta"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
            }}
          >
            <Link
              to="/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                borderRadius: "9999px",
                background: "var(--color-violet)",
                padding: "0.9rem 1.75rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "#fff",
                textDecoration: "none",
                boxShadow: "0 8px 28px -10px rgba(124,58,237,0.5)",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
            >
              Open App
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </Link>

            <button
              type="button"
              onClick={() => lenis?.scrollTo("#how-it-works", { offset: -72 })}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                borderRadius: "9999px",
                border: "1.5px solid rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)",
                padding: "0.9rem 1.75rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
            >
              How it works
            </button>
          </div>
        </div>
      </section>

      {/* ── 2 · TRUST BAR ──────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl border-t border-edge px-4 py-10 sm:px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-faint">
          Built on audited, open infrastructure
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {TRUST.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-2 rounded-full border border-edge bg-panel/60 px-4 py-1.5 font-mono text-xs text-mute backdrop-blur-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-violet/70" />
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* ── 3 · HOW IT WORKS ───────────────────────────────────────────────── */}
      <HowItWorks />

      {/* ── 4 · USE CASES ──────────────────────────────────────────────────── */}
      <Features />

      {/* ── 5 · SECURITY ───────────────────────────────────────────────────── */}
      <Security />

      {/* ── 6 · FINAL CTA ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div
          className="flex flex-col items-start gap-6 rounded-3xl border border-violet-edge p-9 sm:flex-row sm:items-center sm:justify-between sm:p-12"
          style={{
            background:
              "linear-gradient(135deg, var(--color-violet-tint), var(--color-violet-edge))",
          }}
        >
          <div>
            <h2 className="font-display text-2xl font-extrabold leading-[1.1] tracking-[-0.02em] text-violet-ink sm:text-3xl">
              Ready to run your first private grant?
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-violet-ink/80 sm:text-base">
              Set up a campaign in under five minutes on Sepolia. No custom
              contracts. No backend.
            </p>
          </div>
          <Link
            to="/admin"
            className="group inline-flex shrink-0 items-center gap-2.5 rounded-full bg-violet px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet/25 transition-all duration-150 hover:-translate-y-0.5 hover:bg-violet-hover"
          >
            Open App
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-150 group-hover:translate-x-1"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── 7 · FOOTER ─────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}

/* ── Hand-drawn underline beneath the highlighted phrase ────────────────── */
function UnderlineSquiggle() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        bottom: "-0.4rem",
        left: 0,
        height: "0.75rem",
        width: "100%",
      }}
    >
      <path
        d="M3 7 C 40 2, 80 11, 120 5 S 180 3, 197 7"
        fill="none"
        stroke="var(--color-violet-line)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
