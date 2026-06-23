import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Mirrors the three campaign types in the create wizard (payroll / investor /
// community). No "vesting" — the confidential airdrop is a single private claim,
// not a vesting schedule. The selling point is the same across all three: amounts
// are otherwise public on every block explorer; Enveil encrypts them on-chain.
const USE_CASES = [
  {
    title: "Contributor Payroll",
    tagline: "Salaries stay between you and your team.",
    body: "Pay DAO contributors on-chain without posting everyone's salary to a public explorer. Enveil keeps each amount encrypted — paid verifiably, but privately.",
    bestFor: "DAOs, recurring contributor payments",
    illustration: "/illustrations/salary-privacy.png",
    bg: "#DFC9C0",
    accent: "var(--color-gold)",
    accentTint: "var(--color-gold-tint)",
  },
  {
    title: "Investor Distributions",
    tagline: "Cap-table privacy, on-chain.",
    body: "Token distributions expose each investor's allocation to the public. Enveil delivers them privately — every recipient verifies their own share without revealing the total or the list.",
    bestFor: "token distributions, SAFT payouts",
    illustration: "/illustrations/no-roster.png",
    bg: "#DFD1F4",
    accent: "var(--color-violet)",
    accentTint: "var(--color-violet-tint)",
  },
  {
    title: "Community Rewards",
    tagline: "Reward members without a public leaderboard.",
    body: "Airdrops put every reward amount on display forever. Enveil encrypts allocations on-chain — members claim and verify their own, and nobody else's.",
    bestFor: "community airdrops, contributor bonuses",
    illustration: "/illustrations/verify-before-claim.png",
    bg: "#DFF3F6",
    accent: "#0891b2",
    accentTint: "#e0f7fa",
  },
];

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const [vestingImgOk, setVestingImgOk] = useState(true);
  const [payrollImgOk, setPayrollImgOk] = useState(true);
  const [investorImgOk, setInvestorImgOk] = useState(true);

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

          /* Scroll-driven parallax on each illustration (desktop only). */
          if (isDesktop) {
            gsap.utils.toArray<HTMLElement>(".js-feature-illustration").forEach((el, i) => {
              gsap.to(el, {
                yPercent: i % 2 === 0 ? -5 : -10,
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

  const vesting = USE_CASES[0];
  const payroll = USE_CASES[1];
  const investor = USE_CASES[2];

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

        {/* ── Bento grid ── */}
        <div className="features-grid">
          
          {/* CARD 1: Token Vesting (Tall, Left Column) */}
          <div
            className="js-feature-card feature-card feature-card--vesting"
            style={{
              "--card-bg": vesting.bg,
              "--card-accent": vesting.accent,
              "--card-accent-tint": vesting.accentTint,
            } as React.CSSProperties}
          >
            <span className="feature-card-number">01</span>
            
            <div className="feature-card-content">
              <h3 className="feature-card-title">{vesting.title}</h3>
              <p className="feature-card-tagline">{vesting.tagline}</p>
              <p className="feature-card-body">{vesting.body}</p>
              <p className="feature-card-bestfor">Best for: {vesting.bestFor}</p>
            </div>

            {/* Illustration container */}
            <div className="feature-card-image-wrap feature-card-image-wrap--tall">
              {vestingImgOk ? (
                <img
                  src={vesting.illustration}
                  alt={vesting.title}
                  onError={() => setVestingImgOk(false)}
                  className="js-feature-illustration feature-card-image"
                  loading="lazy"
                />
              ) : (
                <div className="feature-card-image-fallback">
                  <span>Token Vesting Illustration</span>
                </div>
              )}
            </div>

            {/* Allocation cipher display */}
            <div className="feature-card-cipher">
              <p className="feature-card-cipher-label">Allocations encrypted on-chain</p>
              <div className="feature-card-cipher-row">
                {["a9", "f3", "0c", "7d", "e1", "4b"].map((h) => (
                  <span key={h} className="feature-card-cipher-chip">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CARD 2: Contributor Payroll (Wide, Right Column Top) */}
          <div
            className="js-feature-card feature-card feature-card--payroll"
            style={{
              "--card-bg": payroll.bg,
              "--card-accent": payroll.accent,
              "--card-accent-tint": payroll.accentTint,
            } as React.CSSProperties}
          >
            <span className="feature-card-number">02</span>
            
            <div className="feature-card-payroll-inner">
              <div className="feature-card-content">
                <h3 className="feature-card-title">{payroll.title}</h3>
                <p className="feature-card-tagline">{payroll.tagline}</p>
                <p className="feature-card-body">{payroll.body}</p>
                <p className="feature-card-bestfor">Best for: {payroll.bestFor}</p>
              </div>

              <div className="feature-card-image-wrap feature-card-image-wrap--wide">
                {payrollImgOk ? (
                  <img
                    src={payroll.illustration}
                    alt={payroll.title}
                    onError={() => setPayrollImgOk(false)}
                    className="js-feature-illustration feature-card-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="feature-card-image-fallback">
                    <span>Payroll Illustration</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CARD 3: Investor Distributions (Medium, Bottom Middle) */}
          <div
            className="js-feature-card feature-card feature-card--investor"
            style={{
              "--card-bg": investor.bg,
              "--card-accent": investor.accent,
              "--card-accent-tint": investor.accentTint,
            } as React.CSSProperties}
          >
            <span className="feature-card-number">03</span>
            
            <div className="feature-card-content">
              <h3 className="feature-card-title">{investor.title}</h3>
              <p className="feature-card-tagline">{investor.tagline}</p>
              <p className="feature-card-body">{investor.body}</p>
              <p className="feature-card-bestfor">Best for: {investor.bestFor}</p>
            </div>

            <div className="feature-card-image-wrap feature-card-image-wrap--medium">
              {investorImgOk ? (
                <img
                  src={investor.illustration}
                  alt={investor.title}
                  onError={() => setInvestorImgOk(false)}
                  className="js-feature-illustration feature-card-image"
                  loading="lazy"
                />
              ) : (
                <div className="feature-card-image-fallback">
                  <span>Distributions Illustration</span>
                </div>
              )}
            </div>
          </div>

          {/* CARD 4: Try-it CTA (Small, Bottom Right) */}
          <div
            className="js-feature-card feature-card feature-card--trust"
            style={{
              "--card-bg": "#EAF3DE",
              "--card-accent": "var(--color-success-green)",
              "--card-accent-tint": "var(--color-success-bg)",
            } as React.CSSProperties}
          >
            <span className="feature-card-number">★</span>

            <div className="feature-card-cta-content">
              <h3 className="feature-card-cta-title">See it for yourself</h3>
              <p className="feature-card-cta-body">
                Run a private campaign on Sepolia in about five minutes. No
                signup, no custom contracts.
              </p>

              <div className="feature-card-cta-actions">
                <Link to="/admin" className="feature-card-cta-primary">
                  Open App
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <a
                  href="https://github.com/FrankLayza/dropshield-dapp"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="feature-card-cta-secondary"
                >
                  View source
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
