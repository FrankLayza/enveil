import { Routes, Route, Link, useLocation } from "react-router-dom";
import { ReactLenis } from "lenis/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Landing } from "@/pages/Landing";
import { Admin } from "@/pages/Admin";
import { Claim } from "@/pages/Claim";
import { ConnectButton } from "@/components/ConnectButton";
import { Shield } from "@/components/Shield";

export function App() {
  const { pathname } = useLocation();

  return (
    <ReactLenis root>
      <div className="min-h-full bg-bg text-ink noise-overlay mesh-gradient-bg">
        <SpeedInsights />
        {/* ── Floating pill navbar ────────────────────────────────────── */}
        <header className="sticky top-0 z-20 px-6 pt-4 pb-2">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            {/* Left pill: logo + nav links */}
            <div className="flex items-center gap-1 rounded-full border border-edge/40 bg-panel/85 backdrop-blur-md px-2 py-1.5 shadow-lg shadow-black/10">
              <Link
                to="/"
                className="flex items-center gap-2 rounded-full px-3 py-1.5 font-display font-semibold tracking-tight transition-colors duration-150 hover:bg-panel-2/60"
              >
                <Shield size={18} />
                <span className="font-wordmark text-base lowercase tracking-wide">
                  dropshield
                </span>
              </Link>

              <span className="mx-1 h-4 w-px bg-edge/55" aria-hidden />

              <NavPill to="/admin" active={pathname.startsWith("/admin")}>
                Create
              </NavPill>
              <NavPill to="/claim" active={pathname.startsWith("/claim")}>
                Claim
              </NavPill>
            </div>

            {/* Right side: Connect Button */}
            <div className="flex items-center gap-2">
              <ConnectButton />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-14">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/:address" element={<Admin />} />
            <Route path="/claim" element={<Claim />} />
            <Route path="/claim/:address" element={<Claim />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </main>
      </div>
    </ReactLenis>
  );
}

/** Nav link inside the floating pill — uppercase, small, rounded-full. */
function NavPill({
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
        "rounded-full px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider transition-all duration-150 " +
        (active
          ? "bg-iris text-white shadow-sm"
          : "text-mute hover:bg-panel-2/50 hover:text-ink")
      }
    >
      {children}
    </Link>
  );
}
