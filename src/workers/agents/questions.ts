import { llmJSON } from "@/lib/llm";
import { questionsSectionSchema, type QuestionsSection } from "@/lib/schemas";

export async function writeQuestionsSection(args: {
  courseTitle: string;
  subjectTitle: string;
  lessonTitle: string;
  goals: string[];
}): Promise<QuestionsSection> {
  return llmJSON({
    task: "writeQuestionsSection",
    schema: questionsSectionSchema,
    system:
      "You write review questions for a professional LMS. Mix multiple-choice (type mcq) " +
      "and open-ended (type open) items. Open items need markScheme (bullet criteria for " +
      "partial credit) and modelAnswer (concise ideal answer). Assign marks 1-3 per item. JSON only.",
    prompt: `Course: ${args.courseTitle}
Subject: ${args.subjectTitle}
Lesson: ${args.lessonTitle}
Goals: ${args.goals.join("; ")}

Return { title, items: [...] } with 5-7 items — at least 2 mcq and at least 2 open.`,
    mock: () => ({
      title: "Review questions",
      items: [
        {
          type: "mcq" as const,
          question: `What is the main goal of "${args.lessonTitle}"?`,
          choices: [
            args.goals[0] ?? "Understand core concepts",
            "Memorize unrelated facts",
            "Skip practice",
            "Avoid real examples",
          ],
          answerIndex: 0,
          explanation: "Aligned to lesson goals.",
          marks: 1,
        },
        {
          type: "open" as const,
          question: "Explain when you would apply this material in a real bioengineering task.",
          marks: 3,
          markScheme:
            "- Names a realistic scenario (1 mark)\n- Connects to a lesson concept (1 mark)\n- Explains why the method fits (1 mark)",
          modelAnswer:
            "When preprocessing omics data before clustering, I'd normalize features and choose a representation that preserves biological signal while reducing noise.",
          explanation: "Applied reasoning beats memorization.",
        },
        {
          type: "mcq" as const,
          question: "Best next step after reading?",
          choices: ["Complete the worksheet", "Skip exercises", "Ignore video", "Log out"],
          answerIndex: 0,
          explanation: "Worksheets reinforce reading.",
          marks: 1,
        },
        {
          type: "open" as const,
          question: "What is one common mistake learners make here, and how would you avoid it?",
          marks: 2,
          markScheme:
            "- Identifies a plausible mistake (1 mark)\n- Gives a concrete prevention strategy (1 mark)",
          modelAnswer:
            "Rushing to formulas without checking units; I'd write units beside each variable and sanity-check dimensions first.",
        },
      ],
    }),
  });
}
