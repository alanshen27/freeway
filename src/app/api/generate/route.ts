import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { features, isProd } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { enqueueCourseGeneration } from "@/lib/queue";
import { withApiLog } from "@/lib/api-log";
import { careerBySlug } from "@/lib/catalog";
import type { CourseCategory } from "@prisma/client";

const schema = z.object({
  careerSlug: z.string(),
  durationWeeks: z.number().int().min(1).max(104).default(8),
  isTaster: z.boolean().default(false),
  responses: z.array(z.object({ prompt: z.string(), answer: z.string() })),
});

function slugify(s: string) {
  return (
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

export async function POST(req: Request) {
  return withApiLog("POST /api/generate", {}, async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  // In production we never fabricate content — require a real model.
  if (isProd && !features.llm)
    return NextResponse.json(
      {
        error:
          "AI generation is not configured. Set DEEPSEEK_API_KEY on the server.",
      },
      { status: 503 }
    );

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const career = careerBySlug(parsed.data.careerSlug);
  if (!career)
    return NextResponse.json({ error: "Unknown career" }, { status: 404 });

  const category = career.category as CourseCategory;

  // Persist the preliminary answers (orchestrator signal).
  if (parsed.data.responses.length) {
    await prisma.onboardingResponse.createMany({
      data: parsed.data.responses.map((r) => ({
        userId: user.id,
        category,
        prompt: r.prompt,
        answer: r.answer,
      })),
    });
  }

  const course = await prisma.course.create({
    data: {
      slug: slugify(career.title),
      ownerId: user.id,
      title: career.title,
      summary: career.blurb,
      category,
      status: "GENERATING",
      coverColorFrom: career.accent,
      coverColorTo: career.accent,
      durationWeeks: parsed.data.isTaster ? 1 : parsed.data.durationWeeks,
      isTaster: parsed.data.isTaster,
      trackSlug: career.slug,
    },
  });

  const job = await prisma.generationJob.create({
    data: { courseId: course.id, userId: user.id, type: "course" },
  });

  const { mode } = await enqueueCourseGeneration({
    jobId: job.id,
    courseId: course.id,
    userId: user.id,
  });

  return NextResponse.json({ courseId: course.id, jobId: job.id, mode });
  });
}
