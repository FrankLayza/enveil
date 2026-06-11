import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Landing } from "@/pages/Landing";
import { Admin } from "@/pages/Admin";
import { Claim } from "@/pages/Claim";
import { ConnectButton } from "@/components/ConnectButton";

export function App() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-full bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="text-lg">🛡️</span>
          DropShield
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink to="/admin" active={pathname.startsWith("/admin")}>
            Create
          </NavLink>
          <NavLink to="/claim" active={pathname.startsWith("/claim")}>
            Claim
          </NavLink>
          <div className="ml-2">
            <ConnectButton />
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
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
  );
}

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
        "rounded-md px-3 py-1.5 transition-colors " +
        (active ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white")
      }
    >
      {children}
    </Link>
  );
}
