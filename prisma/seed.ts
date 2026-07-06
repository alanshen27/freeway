import "dotenv/config";

// Seed-only: allow mock pipeline when no API keys (never in app/worker by default).
if (!process.env.DEEPSEEK_API_KEY && process.env.LLM_ALLOW_MOCK !== "0") {
  process.env.LLM_ALLOW_MOCK = "1";
}

import { PrismaClient } from "@prisma/client";
import { INTERESTS, careerBySlug, prelimFor } from "../src/lib/catalog";
import { runCourseGeneration } from "../src/workers/pipeline";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding interests…");
  await prisma.interest.createMany({
    data: INTERESTS.map((i) => ({
      slug: i.slug,
      label: i.label,
      category: i.category,
    })),
    skipDuplicates: true,
  });

  const email = "demo@freeway.app";
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("Creating demo user…");
    user = await prisma.user.create({
      data: { name: "Alex", email, xp: 40, coins: 40, streak: 3, onboarded: true },
    });
    const picks = await prisma.interest.findMany({
      where: { slug: { in: ["software-development", "mechanical", "ai-ml"] } },
    });
    await prisma.userInterest.createMany({
      data: picks.map((p) => ({ userId: user!.id, interestId: p.id })),
      skipDuplicates: true,
    });
  }

  const existing = await prisma.course.findFirst({
    where: { ownerId: user.id, status: "READY" },
  });
  if (existing) {
    console.log("Demo course already present:", existing.title);
    return;
  }

  const career = careerBySlug("nuclear-engineering")!;
  const prompts = prelimFor(career.category);
  await prisma.onboardingResponse.createMany({
    data: prompts.map((p, i) => ({
      userId: user!.id,
      category: career.category,
      prompt: p,
      answer: i === 0 ? "Some — I've taken intro physics." : "Intuition first, please.",
    })),
  });

  const course = await prisma.course.create({
    data: {
      slug: "nuclear-engineering-demo",
      ownerId: user.id,
      title: career.title,
      summary: career.blurb,
      category: career.category,
      status: "GENERATING",
      coverColorFrom: career.accent,
      coverColorTo: career.accent,
      trackSlug: career.slug,
    },
  });
  const job = await prisma.generationJob.create({
    data: { courseId: course.id, userId: user.id, type: "course" },
  });

  console.log(
    process.env.DEEPSEEK_API_KEY
      ? "Generating demo course (live LLM)…"
      : "Generating demo course (LLM_ALLOW_MOCK=1 — no DEEPSEEK_API_KEY)…"
  );
  await runCourseGeneration({ jobId: job.id, courseId: course.id, userId: user.id });

  // Seed a forum thread referencing the first exercise.
  const firstExercise = await prisma.exercise.findFirst({
    where: { courseId: course.id },
  });
  const thread = await prisma.forumThread.create({
    data: {
      trackSlug: career.slug,
      courseId: course.id,
      authorId: user.id,
      title: "Stuck on the first exercise — any hints?",
      body: "I think I'm close but my answer keeps getting marked wrong. How should I approach it?",
      exerciseId: firstExercise?.id ?? null,
    },
  });
  await prisma.forumPost.create({
    data: {
      threadId: thread.id,
      authorId: user.id,
      isAI: true,
      body: "Try restating the goal in your own words first, then check the units on each quantity — that usually reveals the missing step!",
    },
  });

  console.log("✅ Seed complete. Demo course:", course.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
