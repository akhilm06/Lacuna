import Link from "next/link";

export type SiteNavKey = "graph" | "about" | "admin";

function navLink(
  active: SiteNavKey,
  key: SiteNavKey,
  href: string,
  label: string,
) {
  const isActive = active === key;
  return (
    <Link
      href={href}
      className={
        isActive
          ? "border-b border-solid border-lacuna-ink pb-0.5 font-medium text-lacuna-ink"
          : "text-lacuna-ink/85 transition-colors hover:text-lacuna-ink"
      }
    >
      {label}
    </Link>
  );
}

export function SiteHeader({ active }: { active: SiteNavKey }) {
  return (
    <header
      className="flex min-h-16 w-full shrink-0 flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-solid border-lacuna-border bg-lacuna-canvas px-4 py-4 sm:gap-x-12 sm:px-6 sm:py-5 lg:gap-x-16 lg:px-8"
    >
      <p className="flex min-w-0 max-w-[min(100%,42rem)] flex-nowrap items-baseline gap-x-1 text-sm font-normal leading-snug text-lacuna-ink/90 sm:max-w-[min(100%,52rem)] sm:text-base">
        <Link
          href="/"
          className="shrink-0 text-xl font-semibold tracking-tight text-lacuna-ink sm:text-[1.375rem]"
        >
          Lacuna
        </Link>
        <span className="min-w-0 whitespace-nowrap">
          – A library of known and lost works visualized by interactive nodes.
        </span>
      </p>
      <nav className="shrink-0" aria-label="Primary">
        <div className="flex items-center gap-6 text-sm">
          {navLink(active, "graph", "/", "Graph")}
          {navLink(active, "about", "/about", "About")}
          {navLink(active, "admin", "/admin", "Admin")}
        </div>
      </nav>
    </header>
  );
}
