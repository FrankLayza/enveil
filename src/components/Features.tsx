import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* ── Use Cases ──────────────────────────────────────────────────────────────
   Bento grid: a tall featured card (Token Vesting — the lead use case) plus two
   stacked cards (Payroll, Investor Distributions). Copy shifts from "features"
   to "who uses this and why", which is more persuasive for a B2B sender.
   Community Airdrop is intentionally NOT shown here — it stays in the app/README
   only, so the landing leads with the more serious B2B framing. */
const USE_CASES = [
  {
    title: "Token Vesting",
    tagline: "Your grant schedule is your business.",
    body: "Startups and protocols hand grants to team members, advisors, and early contributors — and every amount and schedule sits in public on Etherscan. Enveil encrypts the total grant on-chain. Recipients see only what they've vested; nobody else sees anything.",
    bestFor: "protocol teams, founder & advisor grants",
    illustration: "/illustrations/salary-privacy.png",
    bg: "#DFD1F4",
    accent: "var(--color-violet)",
    accentTint: "var(--color-violet-tint)",
  },
  {
    title: "Contributor Payroll",
    tagline: "Salaries between you and your team.",
    body: "Monthly payments to DAO contributors are fully transparent on any block explorer. Enveil keeps the amounts encrypted while still delivering them on-chain — verifiably and privately.",
    bestFor: "DAOs, recurring contributor payments",
    illustration: "/illustrations/verify-before-claim.png",
    bg: "#DFC9C0",
    accent: "var(--color-gold)",
    accentTint: "var(--color-gold-tint)",
  },
  {
    title: "Investor Distributions",
    tagline: "Cap table privacy, on-chain.",
    body: "Token unlocks to investors expose allocation sizes to the public. Enveil delivers them privately — each recipient verifies their own share without exposing the total or the list.",
    bestFor: "token unlocks, SAFT distributions",
    illustration: "/illustrations/no-roster.png",
    bg: "#DFF3F6",
    accent: "#0891b2",
    accentTint: "#e0f7fa",
  },
];

/* ── Use Cases Section ──────────────────────────────────────────────────────── */
export function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  // Sync Lenis' smooth scroll position into ScrollTrigger on every frame, so the
  // scrub-driven parallax tracks the eased scroll instead of the native one.
  useLenis(() => ScrollTrigger.update());

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: "(min-width: 768px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { reduceMotion, isDesktop } = context.conditions!;
          if (reduceMotion) return;

          /* Header: eyebrow → title → subtitle rise in on enter. */
          gsap.from(".js-features-header > *", {
            scrollTrigger: { trigger: ".js-features-header", start: "top 85%" },
            y: 24,
            autoAlpha: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: "power3.out",
          });

          /* Bento cards stagger up as the grid enters. */
          gsap.from(".js-feature-card", {
            scrollTrigger: { trigger: ".features-grid", start: "top 80%" },
            y: 56,
            autoAlpha: 0,
            duration: 0.9,
            stagger: 0.14,
            ease: "power3.out",
          });

          /* Scroll-driven parallax on each illustration (desktop only). Driven by
             scrub → smoothed by the Lenis ↔ ScrollTrigger sync above. */
          if (isDesktop) {
            gsap.utils.toArray<HTMLElement>(".js-feature-illustration").forEach((el, i) => {
              gsap.to(el, {
                yPercent: i % 2 === 0 ? -10 : -16,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 1,
                },
              });
            });
          }
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="features-section" id="use-cases">
      <div className="features-inner">
        {/* ── Heading ── */}
        <div className="features-heading js-features-header">
          <span className="features-label">Use cases</span>
          <h2 className="features-title">
            One tool, three{" "}
            <span className="features-title-accent">private distributions</span>
          </h2>
          <p className="features-subtitle">
            Lead with vesting, extend to payroll and investor unlocks — the same
            encryption, the same private claim, whoever's on the other end.
          </p>
        </div>

        {/* ── Bento cards ── */}
        <div className="features-grid">
          {USE_CASES.map((useCase, i) => (
            <div
              key={useCase.title}
              className={
                "js-feature-card feature-card" +
                (i === 0 ? " feature-card--featured" : "")
              }
              style={
                {
                  "--card-bg": useCase.bg,
                  "--card-accent": useCase.accent,
                  "--card-accent-tint": useCase.accentTint,
                } as React.CSSProperties
              }
            >
              {/* Number */}
              <span className="js-feature-number feature-card-number">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Illustration */}
              <div className="feature-card-illustration-wrap">
                <img
                  src={useCase.illustration}
                  alt={useCase.title}
                  className="js-feature-illustration feature-card-illustration"
                  loading="lazy"
                  width={50}
                />
              </div>

              {/* Content */}
              <div className="js-feature-content feature-card-content">
                <h3 className="feature-card-title">{useCase.title}</h3>
                <p className="feature-card-tagline">{useCase.tagline}</p>
                <p className="feature-card-body">{useCase.body}</p>
                <p className="feature-card-bestfor">Best for: {useCase.bestFor}</p>
              </div>

              {/* Featured card fills its extra height with an on-chain cipher cue. */}
              {i === 0 && (
                <div className="feature-card-cipher">
                  <p className="feature-card-cipher-label">Allocation · encrypted on-chain</p>
                  <div className="feature-card-cipher-row">
                    {["a9", "f3", "0c", "7d", "e1", "4b", "2f", "c8"].map((h) => (
                      <span key={h} className="feature-card-cipher-chip">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
