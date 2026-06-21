import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield } from "@/components/Shield";

/**
 * Responsive Sitemap Footer with Collapsible Mobile Accordions
 * On mobile (<768px), navigation columns collapse into clean toggles to reduce page length.
 * On desktop (>=768px), columns display fully expanded.
 */

interface SitemapLink {
  label: string;
  to?: string;
  href?: string;
  external?: boolean;
  disabled?: boolean;
  badge?: string;
  dot?: boolean;
}

interface SitemapColumn {
  title: string;
  links: SitemapLink[];
}

const SITEMAP_DATA: SitemapColumn[] = [
  {
    title: "Operations",
    links: [
      { label: "Create Campaign", to: "/admin/new" },
      { label: "Claim Allocation", to: "/claim" },
      { label: "Admin Dashboard", to: "/admin" },
    ],
  },
  {
    title: "Ecosystem",
    links: [
      { label: "Zama Protocol", href: "https://docs.zama.org/protocol", external: true },
      { label: "tfhe-rs Library", href: "https://github.com/zama-ai/tfhe-rs", external: true },
      { label: "ERC-7984 standard", disabled: true, badge: "🔒" },
    ],
  },
  {
    title: "Network Status",
    links: [
      { label: "Sepolia Explorer", href: "https://sepolia.etherscan.io", external: true },
      { label: "GitHub Source", href: "https://github.com/FrankLayza/dropshield-dapp", external: true },
      { label: "Sepolia testnet", disabled: true, dot: true },
    ],
  },
];

function SitemapSection({ column }: { column: SitemapColumn }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-edge/30 md:border-b-0 py-4 md:py-0">
      {/* Header: Clickable button on mobile, static element on desktop */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left md:pointer-events-none md:block md:w-auto focus:outline-hidden"
      >
        <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-ink">
          {column.title}
        </h4>
        <span
          className="md:hidden text-faint transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {/* Links container: collapsed on mobile, always visible on desktop */}
      <ul className={`${isOpen ? "block animate-step-in" : "hidden"} md:block mt-3.5 md:mt-4 space-y-2.5 text-sm`}>
        {column.links.map((link, idx) => (
          <li key={idx} className="flex items-center">
            {link.to ? (
              <Link to={link.to} className="text-mute hover:text-ink transition-colors duration-150">
                {link.label}
              </Link>
            ) : link.href ? (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-mute hover:text-ink transition-colors duration-150 inline-flex items-center gap-1"
              >
                {link.label} {link.external && <span className="text-[10px] text-faint">↗</span>}
              </a>
            ) : (
              <span className={`inline-flex items-center gap-1.5 ${link.disabled ? "text-mute/60 cursor-not-allowed" : "text-mute"}`}>
                {link.dot && (
                  <span className="relative flex h-2 w-2 mr-1">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                  </span>
                )}
                {link.label}
                {link.badge && <span className="text-[10px] text-faint">{link.badge}</span>}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-32 border-t border-edge/60 bg-panel-2/30 backdrop-blur-xs pt-12 pb-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* Zone 1: Navigation & Brand Sitemap */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-10 pb-6 md:pb-12">
          {/* Brand info */}
          <div className="flex flex-col items-start md:col-span-1 border-b border-edge/30 md:border-b-0 pb-6 md:pb-0">
            <div className="flex items-center gap-2.5">
              <Shield size={20} />
              <span className="font-wordmark text-lg lowercase tracking-tight text-ink">
                dropshield
              </span>
            </div>
            <p className="text-xs text-mute mt-3 leading-relaxed max-w-xs">
              Confidential payroll and token airdrops powered by on-chain Fully Homomorphic Encryption (FHE). Keep allocations strictly private.
            </p>
          </div>

          {/* Render mapping sitemap sections (collapsible on mobile) */}
          {SITEMAP_DATA.map((column, index) => (
            <SitemapSection key={index} column={column} />
          ))}
        </div>

        {/* Zone 2: Bottom Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-edge/30 text-xs text-faint">
          <div>
            © {new Date().getFullYear()} DropShield Protocol. Built under Zama Developer Program.
          </div>
        </div>

      </div>
    </footer>
  );
}
