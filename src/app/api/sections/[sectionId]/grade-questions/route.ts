import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gradeOpenQuestion } from "@/lib/grade-questions";
import { isOpenQuestion } from "@/lib/questions";
import type { QuestionsSectionData } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";

const bodySchema = z.object({
  answers: z.array(
    z.object({
      index: z.number().int().min(0),
      text: z.string().min(1),
    })
  ),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No session" }, { status: 401 });

  const { sectionId } = await params;
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const section = await prisma.lessonSection.findUnique({
    where: { id: sectionId },
    include: {
      lesson: { include: { subject: { include: { course: true } } } },
    },
  });
  if (!section || section.lesson.subject.course.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (section.type !== "QUESTIONS") {
    return NextResponse.json({ error: "Not a questions section" }, { status: 400 });
  }

  const data = section.data as QuestionsSectionData;
  const results: {
    index: number;
    marks: number;
    maxMarks: number;
    feedback: string;
  }[] = [];

  for (const ans of body.answers) {
    const item = data.items[ans.index];
    if (!item || !isOpenQuestion(item)) continue;
    const graded = await gradeOpenQuestion({
      question: item.question,
      answer: ans.text,
      markScheme: item.markScheme,
      modelAnswer: item.modelAnswer,
      maxMarks: item.marks,
    });
    results.push({
      index: ans.index,
      marks: graded.marks,
      maxMarks: item.marks,
      feedback: graded.feedback,
    });
  }

  return NextResponse.json({ results });
}
