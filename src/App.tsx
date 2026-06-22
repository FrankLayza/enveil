import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { ReactLenis, useLenis } from "lenis/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Landing } from "@/pages/Landing";
import { Dashboard } from "@/pages/Dashboard";
import { CampaignWizard } from "@/pages/CampaignWizard";
import { CampaignDetail } from "@/pages/CampaignDetail";
import { Claim } from "@/pages/Claim";
import { ConnectButton } from "@/components/ConnectButton";
import { Shield } from "@/components/Shield";

export function App() {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  return (
    <ReactLenis root options={{ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 }}>
      <div className="min-h-full bg-bg text-ink noise-overlay mesh-gradient-bg">
        <SpeedInsights />

        {isLanding ? <MarketingNav /> : <AppNav pathname={pathname} />}

        <main className={isLanding ? "" : "mx-auto max-w-6xl px-4 pb-16 pt-3 sm:px-6"}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/new" element={<CampaignWizard />} />
            <Route path="/admin/c/:address" element={<CampaignDetail />} />
            <Route path="/claim" element={<Claim />} />
            <Route path="/claim/:address" element={<Claim />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </main>
      </div>
    </ReactLenis>
  );
}

/* ── Brand wordmark (shared by both navs) ─────────────────────────────────── */
function Wordmark({ light }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 transition-opacity duration-150 hover:opacity-80"
      style={{ color: light ? "#fff" : "var(--color-ink)" }}
    >
      <Shield size={20} />
      <span className="font-wordmark text-base lowercase tracking-wider sm:text-lg">
        enveil
      </span>
    </Link>
  );
}

/* ── Marketing nav (landing only) ──────────────────────────────────────────
   Wordmark left · anchor links center · "Open App" pill right. No wallet.
   Transparent at the top, frosts to glass once the hero is scrolled past.
   Anchor links smooth-scroll via Lenis (bare #hash won't animate under Lenis). */
const SECTIONS = [
  { id: "how-it-works", label: "How it works" },
  { id: "use-cases", label: "Use cases" },
  { id: "security", label: "Security" },
];

function MarketingNav() {
  const lenis = useLenis();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useLenis(({ scroll }: { scroll: number }) => {
    const isScrolled = scroll > 80;
    setScrolled(isScrolled);
    if (isScrolled) {
      setMenuOpen(false);
    }
  });

  const goTo = (id: string) => {
    setMenuOpen(false);
    lenis?.scrollTo(`#${id}`, { offset: -72 });
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 0,
        zIndex: 30,
        pointerEvents: "none",
      }}
    >
      {/* ── 1. FULL-WIDTH HEADER (Fades out on scroll) ── */}
      <div
        className="w-full flex items-center justify-between"
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: scrolled
            ? "translateX(-50%) translateY(-10px)"
            : "translateX(-50%) translateY(0)",
          opacity: scrolled ? 0 : 1,
          width: "100%",
          maxWidth: "72rem",
          padding: "0.875rem 1.5rem",
          transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          pointerEvents: scrolled ? "none" : "auto",
        }}
      >
        <Wordmark light={true} />

        {/* Center anchor links (desktop) */}
        <nav className="hidden items-center gap-8 md:flex">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              className="link-rise py-1 text-sm font-medium transition-colors duration-150"
              style={{ color: "rgba(255, 255, 255, 0.78)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.78)")}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Right action & mobile triggers */}
        <div className="flex items-center">
          <Link
            to="/admin"
            className="group inline-flex items-center gap-2 rounded-full bg-violet font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-violet-hover"
            style={{
              padding: "0.6rem 1.25rem",
              fontSize: "0.875rem",
              boxShadow: "0 8px 20px rgba(124,58,237,0.25)",
            }}
          >
            Open App
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-150 group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>

          {/* Mobile hamburger menu */}
          <div className="flex items-center md:hidden ml-2">
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm"
              style={{
                borderColor: "rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. COMPACT FLOATING PILL (Fades in on scroll) ── */}
      <div
        className="flex items-center justify-between"
        style={{
          position: "absolute",
          top: "1.25rem",
          left: "50%",
          transform: scrolled
            ? "translateX(-50%) translateY(0) scale(1)"
            : "translateX(-50%) translateY(-10px) scale(0.95)",
          opacity: scrolled ? 1 : 0,
          width: "calc(100% - 2rem)",
          maxWidth: "360px",
          borderRadius: "9999px",
          padding: "0.45rem 1.25rem",
          background: "rgba(255, 255, 255, 0.72)",
          border: "1px solid rgba(0, 0, 0, 0.08)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 12px 30px -10px rgba(0, 0, 0, 0.12), 0 4px 12px -5px rgba(0, 0, 0, 0.05)",
          transition: "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          pointerEvents: scrolled ? "auto" : "none",
        }}
      >
        <Wordmark light={false} />

        <Link
          to="/admin"
          className="group inline-flex items-center gap-2 rounded-full bg-violet font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-violet-hover"
          style={{
            padding: "0.45rem 1.1rem",
            fontSize: "0.825rem",
            boxShadow: "0 4px 12px rgba(124,58,237,0.2)",
          }}
        >
          Open App
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-150 group-hover:translate-x-0.5"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      {/* Mobile dropdown panel (under the full header, only when unscrolled and open) */}
      {!scrolled && menuOpen && (
        <div
          className="border-t border-edge/60 bg-bg/95 backdrop-blur-md md:hidden animate-step-in"
          style={{
            position: "absolute",
            top: "3.75rem",
            left: 0,
            right: 0,
            pointerEvents: "auto",
          }}
        >
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(s.id)}
                className="py-3 text-left text-sm font-medium text-mute transition-colors hover:text-ink"
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

/* ── App nav (create / claim / dashboard) ──────────────────────────────────
   Minimal app shell: wordmark left, wallet right. Always opaque, no marketing
   links — the chrome stays out of the way of the product. */
function AppNav({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-edge/60 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-4 sm:gap-5">
          <NavLink to="/admin" active={pathname.startsWith("/admin")}>
            Create
          </NavLink>
          <NavLink to="/claim" active={pathname.startsWith("/claim")}>
            Claim
          </NavLink>
          <span className="hidden h-5 w-px bg-edge sm:block" aria-hidden />
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}

/** App-nav text link — slant-underline hover; active route keeps it drawn
    (see `.link-rise[aria-current]` in index.css). */
function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={
        "link-rise py-1 text-sm font-medium transition-colors duration-150 " +
        (active ? "text-violet-deep" : "text-mute hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}
