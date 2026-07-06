import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { marketingNav } from "@/lib/marketing";

export function MarketingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <BrandLogo href="/" size="md" />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              AI-generated, hands-on engineering courses. Pick a career path, answer a few
              questions, and learn by building.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Product
              </p>
              <ul className="mt-3 space-y-2">
                {marketingNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                App
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/auth"
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/courses"
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Stack
              </p>
              <ul className="mt-3 space-y-2 text-sm text-foreground/80">
                <li>Next.js 15</li>
                <li>Supabase + Prisma</li>
                <li>BullMQ + Manim</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Freeway. Built for learners who ship.</p>
          <p>Deploy with Render · Postgres · Redis</p>
        </div>
      </div>
    </footer>
  );
}
