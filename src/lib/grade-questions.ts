import { z } from "zod";
import { llmJSON } from "@/lib/llm";

const gradeSchema = z.object({
  marks: z.number(),
  feedback: z.string(),
});

export async function gradeOpenQuestion(args: {
  question: string;
  answer: string;
  markScheme: string;
  modelAnswer: string;
  maxMarks: number;
}): Promise<{ marks: number; feedback: string }> {
  const result = await llmJSON({
    task: "gradeOpenQuestion",
    schema: gradeSchema,
    system:
      "You are a fair exam marker. Award partial credit using the mark scheme. " +
      "Compare the student answer to the model answer. Be specific in feedback " +
      "(what was good, what was missing). Respond with strict JSON only.",
    prompt: `Question: ${args.question}
Max marks: ${args.maxMarks}

Mark scheme:
${args.markScheme}

Model answer:
${args.modelAnswer}

Student answer:
${args.answer}

Return JSON { marks: number (0-${args.maxMarks}), feedback: string }.`,
    mock: () => ({
      marks: Math.max(1, Math.round(args.maxMarks * 0.7)),
      feedback:
        "You captured the main idea. To earn full marks, add more detail from the mark scheme and tie your reasoning to the lesson concepts.",
    }),
  });

  const marks = Math.max(0, Math.min(args.maxMarks, Math.round(result.marks)));
  return { marks, feedback: result.feedback };
}
