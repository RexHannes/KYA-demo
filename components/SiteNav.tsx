import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/demo", label: "Demo" },
  { href: "/report", label: "Report" },
  { href: "/integrate", label: "Integrate" },
  { href: "/status", label: "Status" },
  { href: "/verify", label: "Verify" }
];

export function SiteNav() {
  return (
    <nav className="relative z-10 border-b border-white/60 bg-white/55 px-5 py-3 text-sm font-medium shadow-sm backdrop-blur-2xl sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        <span className="mr-3 rounded-full border border-slate-300/80 bg-slate-950 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
          KYA DEMO
        </span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full px-3 py-1.5 text-slate-600 hover:bg-white/70 hover:text-slate-950"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
