import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Cpu,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  exerciseHighlights,
  featureCards,
  getStartHref,
  heroStats,
  howItWorksSteps,
} from "@/lib/marketing";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const trackIcons = [Cpu, Wrench, Sparkles] as const;

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.onboarded ? "/courses" : "/onboarding/name");

  const startHref = getStartHref();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(79,70,229,0.14),transparent)]"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Zap className="size-3.5" />
              AI-generated engineering courses
            </p>
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Learn engineering by{" "}
              <span className="bg-course-gradient bg-clip-text text-transparent">
                building real things
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Pick a career path, answer a few questions, and Freeway assembles a personalized
              course — readable lessons, explainer videos, and interactive exercises you can
              actually ship on.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="duo" size="lg" asChild>
                <Link href={startHref}>
                  Get started free
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="duoOutline" size="lg" asChild>
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
          </div>

          <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-border pt-10">
            {heroStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {stat.value}
                </dt>
                <dd className="mt-1 text-sm text-muted-foreground">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Tracks */}
      <section className="border-b border-border bg-slate-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Built for engineering careers
            </h2>
            <p className="mt-3 text-muted-foreground">
              Software, mechanical, and AI engineering — plus the physics and materials science
              that underpin them.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: trackIcons[0],
                title: "Software Engineering",
                text: "Data structures, algorithms, and systems — with Monaco coding exercises.",
              },
              {
                icon: trackIcons[1],
                title: "Mechanical Engineering",
                text: "Statics, dynamics, circuits, and visual sims for real-world intuition.",
              },
              {
                icon: trackIcons[2],
                title: "AI Engineering",
                text: "From tensors to transformers, with AI-graded written work and tutor hints.",
              },
            ].map((track) => (
              <div key={track.title} className="soft-card p-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <track.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{track.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{track.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Not another video playlist
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every course is generated for you — with exercises, forums, and progress tracking
              baked in from day one.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <article key={feature.title} className="soft-card p-6">
                <span
                  className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${feature.accent}`}
                >
                  {feature.title.split(" ")[0]}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Exercise types */}
      <section className="border-y border-border bg-navy py-16 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
                <BookOpen className="size-5" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Eight ways to prove you got it
              </h2>
              <p className="mt-3 text-slate-300">
                Server-side grading on every exercise type — pass to earn XP and unlock the next
                lesson.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
              {exerciseHighlights.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-brand-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              From zero to a full course in minutes
            </h2>
            <p className="mt-3 text-muted-foreground">
              An orchestrator plus specialist agents build your curriculum while you watch the
              progress screen.
            </p>
          </div>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorksSteps.map((step) => (
              <li key={step.step} className="relative">
                <span className="font-mono text-sm font-semibold text-primary">{step.step}</span>
                <h3 className="mt-2 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Community */}
      <section className="border-t border-border bg-slate-50/60 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="soft-card flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="size-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold sm:text-2xl">
                  Learn together, not alone
                </h2>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Each course has a forum. Reference the exact exercise you&apos;re stuck on, get
                  peer help, or ask the AI tutor for a nudge in the right direction.
                </p>
              </div>
            </div>
            <Button variant="duo" asChild>
              <Link href={startHref}>
                Create your first course
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to hit the freeway?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Free during beta. No credit card — just pick a path and start building skills that
            stick.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="duo" size="lg" asChild>
              <Link href={startHref}>Get started free</Link>
            </Button>
            <Button variant="duoOutline" size="lg" asChild>
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
