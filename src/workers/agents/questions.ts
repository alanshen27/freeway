import { llmJSON } from "@/lib/llm";
import { questionsSectionSchema, type QuestionsSection } from "@/lib/schemas";

export async function writeQuestionsSection(args: {
  courseTitle: string;
  subjectTitle: string;
  lessonTitle: string;
  goals: string[];
}): Promise<QuestionsSection> {
  return llmJSON({
    schema: questionsSectionSchema,
    system:
      "You write review questions for a professional LMS. Multiple-choice only. JSON only.",
    prompt: `Course: ${args.courseTitle}
Subject: ${args.subjectTitle}
Lesson: ${args.lessonTitle}
Goals: ${args.goals.join("; ")}

Return { title, items: [{ question, choices, answerIndex, explanation }] } with 4-6 items.`,
    mock: () => ({
      title: "Review questions",
      items: [
        {
          question: `What is the main goal of "${args.lessonTitle}"?`,
          choices: [
            args.goals[0] ?? "Understand core concepts",
            "Memorize unrelated facts",
            "Skip practice",
            "Avoid real examples",
          ],
          answerIndex: 0,
          explanation: "Aligned to lesson goals.",
        },
        {
          question: "When should you apply this material?",
          choices: [
            "Only on exams",
            "When solving real problems",
            "Never",
            "Before reading",
          ],
          answerIndex: 1,
          explanation: "Applied learning is the focus.",
        },
        {
          question: "Best next step after reading?",
          choices: ["Complete the worksheet", "Skip exercises", "Ignore video", "Log out"],
          answerIndex: 0,
          explanation: "Worksheets reinforce reading.",
        },
      ],
    }),
  });
}
