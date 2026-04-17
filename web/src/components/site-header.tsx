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
      className="flex min-h-16 w-full shrink-0 flex-row items-start justify-between gap-x-4 gap-y-2 border-b border-solid border-lacuna-border bg-lacuna-canvas px-4 py-4 sm:gap-x-8 sm:px-6 sm:py-5 lg:gap-x-12 lg:px-8"
    >
      <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1 text-pretty text-sm font-normal leading-snug text-lacuna-ink/90 sm:text-base">
        <Link
          href="/"
          className="shrink-0 text-xl font-semibold tracking-tight text-lacuna-ink sm:text-[1.375rem]"
        >
          Lacuna
        </Link>
        <span className="min-w-0">
          – A library of known and lost works visualized by interactive nodes.
        </span>
      </p>
      <nav className="shrink-0 pt-0.5" aria-label="Primary">
        <div className="flex items-center justify-end gap-4 text-sm sm:gap-6">
          {navLink(active, "graph", "/", "Graph")}
          {navLink(active, "about", "/about", "About")}
          {navLink(active, "admin", "/admin", "Admin")}
        </div>
      </nav>
    </header>
  );
}
