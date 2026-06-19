import { Routes, Route, Link, useLocation } from "react-router-dom";
import { ReactLenis } from "lenis/react";
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

  return (
    <ReactLenis root options={{ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 }}>
      <div className="min-h-full bg-bg text-ink noise-overlay mesh-gradient-bg">
        <SpeedInsights />
        {/* ── Top navbar (Contiant-style: wordmark left, links + action right) ── */}
        <header className="sticky top-0 z-20 bg-bg/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            {/* Wordmark — far left */}
            <Link
              to="/"
              className="flex items-center gap-2.5 transition-opacity duration-150 hover:opacity-80"
            >
              <Shield size={20} />
              <span className="font-wordmark text-base lowercase tracking-tight text-ink sm:text-lg">
                dropshield
              </span>
            </Link>

            {/* Links + action — far right */}
            <nav className="flex items-center gap-4 sm:gap-8">
              <NavLink to="/admin" active={pathname.startsWith("/admin")}>
                Create
              </NavLink>
              <NavLink to="/claim" active={pathname.startsWith("/claim")}>
                Claim
              </NavLink>
              <ConnectButton />
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 pb-16 pt-3">
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

/** Top-nav text link — Contiant-style: plain, medium-weight, gray→ink on hover. */
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
      className={
        "link-rise text-sm font-medium transition-colors duration-150 " +
        (active ? "text-ink" : "text-mute hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}
