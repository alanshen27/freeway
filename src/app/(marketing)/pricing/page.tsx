import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStartHref, pricingTiers } from "@/lib/marketing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Freeway is free during beta. Generate unlimited personalized engineering courses with interactive exercises.",
};

export default function PricingPage() {
  const startHref = getStartHref();

  return (
    <div className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Simple pricing for builders
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free while we&apos;re in beta. Teams features are on the roadmap for
            classrooms and bootcamps.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-8 lg:grid-cols-2">
          {pricingTiers.map((tier) => (
            <article
              key={tier.name}
              className={`soft-card flex flex-col p-8 ${
                tier.highlighted ? "ring-2 ring-primary ring-offset-2" : ""
              }`}
            >
              {tier.highlighted && (
                <span className="mb-4 inline-flex w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  Most popular
                </span>
              )}
              <h2 className="font-display text-xl font-bold">{tier.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
              <p className="mt-6 font-display text-4xl font-bold tracking-tight">
                {tier.price}
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  {tier.period}
                </span>
              </p>
              <ul className="mt-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={tier.highlighted ? "duo" : "duoOutline"}
                className="mt-8 w-full"
                asChild
              >
                <Link href={tier.highlighted ? startHref : "mailto:hello@freeway.app"}>
                  {tier.cta}
                </Link>
              </Button>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted-foreground">
          Deploy your own instance on{" "}
          <a
            href="https://render.com"
            className="font-medium text-primary underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Render
          </a>{" "}
          with the included <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">render.yaml</code>{" "}
          blueprint — Postgres, Redis, web, and worker services included.
        </p>
      </div>
    </div>
  );
}
