import type { CourseCategory } from "@prisma/client";

export type CareerOption = {
  slug: string;
  title: string;
  category: CourseCategory;
  blurb: string;
  /** Muted accent for the track icon/tint — no gradients. */
  accent: string;
};

// Curated career tracks the user can choose to generate a course from.
// MVP scope: software / mechanical / AI engineering (+ supporting sciences).
export const CAREERS: CareerOption[] = [
  {
    slug: "software-engineering",
    title: "Software Engineering",
    category: "SOFTWARE_ENGINEERING",
    blurb: "Build real programs: data structures, algorithms, and systems.",
    accent: "#7c3aed",
  },
  {
    slug: "ai-engineering",
    title: "AI Engineering",
    category: "AI_ENGINEERING",
    blurb: "From tensors to transformers — ship intelligent systems.",
    accent: "#4f46e5",
  },
  {
    slug: "mechanical-engineering",
    title: "Mechanical Engineering",
    category: "MECHANICAL_ENGINEERING",
    blurb: "Statics, dynamics, and the machines that move the world.",
    accent: "#d97706",
  },
  {
    slug: "nuclear-engineering",
    title: "Nuclear Engineering",
    category: "PHYSICS",
    blurb: "Reactor physics, materials, and energy at the atomic scale.",
    accent: "#e11d48",
  },
  {
    slug: "introduction-to-physics",
    title: "Introduction to Physics",
    category: "PHYSICS",
    blurb: "Mass, momentum, and the laws behind everything.",
    accent: "#059669",
  },
  {
    slug: "materials-science",
    title: "Materials Science",
    category: "MECHANICAL_ENGINEERING",
    blurb: "Why materials behave the way they do — and how to pick them.",
    accent: "#0284c7",
  },
];

export type InterestOption = { slug: string; label: string; category: CourseCategory };

export const INTERESTS: InterestOption[] = [
  { slug: "math", label: "Math", category: "MATHEMATICS" },
  { slug: "bioengineering", label: "Bioengineering", category: "GENERAL" },
  { slug: "software-development", label: "Software Development", category: "SOFTWARE_ENGINEERING" },
  { slug: "ai-ml", label: "AI / Machine Learning", category: "AI_ENGINEERING" },
  { slug: "mechanical", label: "Mechanical Engineering", category: "MECHANICAL_ENGINEERING" },
  { slug: "physics", label: "Physics", category: "PHYSICS" },
  { slug: "electronics", label: "Electronics & Circuits", category: "PHYSICS" },
  { slug: "robotics", label: "Robotics", category: "MECHANICAL_ENGINEERING" },
];

// Preliminary questions per category — the orchestrator reads the answers.
export const PRELIM_QUESTIONS: Record<string, string[]> = {
  SOFTWARE_ENGINEERING: [
    "How comfortable are you writing code today (none / some / fluent)?",
    "What do you most want to build?",
  ],
  AI_ENGINEERING: [
    "Do you know any linear algebra or calculus?",
    "Are you more interested in research or shipping products?",
  ],
  MECHANICAL_ENGINEERING: [
    "How comfortable are you with forces and free-body diagrams?",
    "Do you prefer design, analysis, or manufacturing?",
  ],
  PHYSICS: [
    "What's the last physics topic you studied?",
    "Do you prefer intuition or rigorous math?",
  ],
  DEFAULT: [
    "What's your current experience level with this topic?",
    "What would make this course a success for you?",
  ],
};

export function prelimFor(category: string): string[] {
  return PRELIM_QUESTIONS[category] ?? PRELIM_QUESTIONS.DEFAULT;
}

export function careerBySlug(slug: string) {
  return CAREERS.find((c) => c.slug === slug);
}
