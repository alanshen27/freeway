import { features } from "@/lib/env";

/** Where primary CTAs should send new visitors. */
export function getStartHref(): string {
  if (features.demoSession) return "/onboarding/name";
  return "/auth";
}

export const marketingNav = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
] as const;

export const heroStats = [
  { value: "8+", label: "exercise types" },
  { value: "3", label: "engineering tracks" },
  { value: "∞", label: "personalized paths" },
] as const;

export const featureCards = [
  {
    title: "AI-built curriculum",
    description:
      "An orchestrator reads your goals and designs units, lessons, videos, and exercises — not a static syllabus.",
    accent: "bg-brand-50 text-brand-600",
  },
  {
    title: "Learn by doing",
    description:
      "Code in Monaco, wire circuits, run projectile sims, and solve free-body problems — all graded server-side.",
    accent: "bg-mint-soft text-mint",
  },
  {
    title: "Explainer videos",
    description:
      "Manim-rendered lessons with inline comprehension checks, or a themed in-app player when renders are off.",
    accent: "bg-sky-soft text-sky",
  },
  {
    title: "Forum + AI tutor",
    description:
      "Stuck on an exercise? Ask the course forum or get a Socratic hint without spoiling the answer.",
    accent: "bg-lemon-soft text-lemon",
  },
  {
    title: "Progress that sticks",
    description:
      "XP, streaks, coins, badges, and a house room keep momentum without turning learning into a slot machine.",
    accent: "bg-peach-soft text-peach",
  },
  {
    title: "Runs anywhere",
    description:
      "Graceful fallbacks for every integration — demo offline in dev, deploy to Render with Postgres + Redis.",
    accent: "bg-blush-soft text-blush",
  },
] as const;

export const howItWorksSteps = [
  {
    step: "01",
    title: "Pick a path",
    description: "Software, mechanical, or AI engineering — plus supporting physics and materials science.",
  },
  {
    step: "02",
    title: "Answer a few questions",
    description: "Tell Freeway what you already know and what you want to build toward.",
  },
  {
    step: "03",
    title: "Watch it generate",
    description: "A background worker assembles text, imagery, videos, and interactive exercises in minutes.",
  },
  {
    step: "04",
    title: "Ship skills",
    description: "Complete lessons, pass exercises, and discuss with peers — your course evolves with you.",
  },
] as const;

export const exerciseHighlights = [
  "Coding (Monaco + sandbox tests)",
  "Circuit builder",
  "Projectile & gear sims",
  "MCQ, ordering, matching",
  "AI-graded written answers",
] as const;

export const pricingTiers = [
  {
    name: "Learner",
    price: "Free",
    period: "during beta",
    description: "Everything you need to generate and complete personalized engineering courses.",
    features: [
      "Unlimited course generation",
      "All exercise types",
      "Forum + AI tutor hints",
      "Progress, XP & badges",
      "Mobile-friendly dashboard",
    ],
    cta: "Start learning",
    highlighted: true,
  },
  {
    name: "Teams",
    price: "Contact",
    period: "coming soon",
    description: "Cohort assignments, instructor grading, and shared forums for classrooms and bootcamps.",
    features: [
      "Everything in Learner",
      "Assignment workflows",
      "Instructor grade panel",
      "Shared course libraries",
      "Priority generation queue",
    ],
    cta: "Get in touch",
    highlighted: false,
  },
] as const;
