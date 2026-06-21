import { Link } from "react-router-dom";
import { Shield } from "@/components/Shield";

/**
 * Minimalist Sitemap Footer
 * Displays brand info on the left, primary operation links + testnet status on the right.
 */
export function Footer() {
  return (
    <footer className="mt-32 border-t border-edge/60 bg-panel-2/30 backdrop-blur-xs py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-edge/20">
          
          {/* Left side: Brand info */}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2.5">
              <Shield size={18} />
              <span className="font-wordmark text-base lowercase tracking-tight text-ink">
                dropshield
              </span>
            </div>
            <p className="text-xs text-mute mt-1.5 leading-relaxed max-w-xs">
              Confidential payroll and token airdrops powered by Fully Homomorphic Encryption (FHE).
            </p>
          </div>

          {/* Right side: Operations links & Sepolia indicator */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <Link to="/admin/new" className="text-mute hover:text-ink transition-colors duration-150">
              Create Campaign
            </Link>
            <Link to="/claim" className="text-mute hover:text-ink transition-colors duration-150">
              Claim Allocation
            </Link>
            <Link to="/admin" className="text-mute hover:text-ink transition-colors duration-150">
              Admin Dashboard
            </Link>
            <span className="h-4 w-px bg-edge/60 hidden sm:inline" />
            <span className="text-xs font-mono text-faint flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
              </span>
              Sepolia testnet
            </span>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 text-xs text-faint">
          © {new Date().getFullYear()} DropShield Protocol. Built under Zama Developer Program.
        </div>

      </div>
    </footer>
  );
}
