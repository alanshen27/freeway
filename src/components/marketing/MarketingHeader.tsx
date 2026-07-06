import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { getStartHref, marketingNav } from "@/lib/marketing";

export function MarketingHeader() {
  const startHref = getStartHref();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLogo href="/" size="md" />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {marketingNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/auth">Sign in</Link>
          </Button>
          <Button variant="duo" size="sm" asChild>
            <Link href={startHref}>Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
