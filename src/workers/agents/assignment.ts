import { llmJSON } from "@/lib/llm";
import { assignmentSpecSchema, type AssignmentSpec } from "@/lib/schemas";
import type { AssignmentType } from "@prisma/client";

const TYPE_BRIEF: Record<AssignmentType, string> = {
  PRACTICE:
    "a practice assignment: a focused set of applied tasks the learner works through. " +
    "Instructions should list 3-6 concrete tasks. Do NOT include expected outcomes. Include 2-4 milestones. No quiz items. " +
    "Also include a markscheme field: markdown model answers and brief marking notes for each task.",
  PROJECT:
    "a mini project: one realistic build/analysis deliverable that ties multiple course topics together. " +
    "Instructions should cover context, requirements, deliverables, and evaluation criteria. " +
    "Include 3-6 milestones that break the project into stages. No quiz items.",
  QUIZ:
    "a graded quiz. Provide 6-10 multiple-choice items covering the given scope, mixing recall and applied reasoning. " +
    "Instructions should be a one-paragraph description of scope. No milestones.",
};

export async function writeAssignment(args: {
  type: AssignmentType;
  courseTitle: string;
  courseSummary: string;
  level: string;
  subjects: { title: string; summary: string }[];
  /** Optional learner-provided focus, e.g. "thermodynamics basics". */
  topic?: string;
  durationWeeks: number;
}): Promise<AssignmentSpec> {
  const scope = args.topic
    ? `Focus specifically on: ${args.topic}`
    : `Cover the course material broadly, weighted toward foundational topics.`;

  return llmJSON({
    task: "writeAssignment",
    schema: assignmentSpecSchema,
    system:
      "You create course assignments for a professional LMS. Write clear, practical, self-contained briefs in markdown. JSON only.",
    prompt: `Course: ${args.courseTitle} (${args.level})
Summary: ${args.courseSummary}
Modules: ${args.subjects.map((s) => `${s.title} — ${s.summary}`).join("; ")}
Course pace: about ${args.durationWeeks} weeks total.
${scope}

Create ${TYPE_BRIEF[args.type]}

Return { title, instructions, milestones: [{title, description}], quiz: [...], markscheme?: string }.`,
    mock: () => mockAssignment(args),
  });
}

function mockAssignment(args: {
  type: AssignmentType;
  courseTitle: string;
  topic?: string;
  subjects: { title: string }[];
}): AssignmentSpec {
  const focus = args.topic ?? args.subjects[0]?.title ?? args.courseTitle;
  if (args.type === "QUIZ") {
    return {
      title: `Checkpoint quiz: ${focus}`,
      instructions: `A quick knowledge check on **${focus}**. You can retake it after reviewing the explanations.`,
      milestones: [],
      quiz: [
        {
          question: `Which statement best describes the core idea of ${focus}?`,
          choices: [
            "It connects the fundamentals covered so far",
            "It is unrelated to the course",
            "It only matters for exams",
            "It replaces practice entirely",
          ],
          answerIndex: 0,
          explanation: "Checkpoint quizzes tie back to the module fundamentals.",
        },
        {
          question: "What is the best way to consolidate new material?",
          choices: [
            "Reread passively",
            "Apply it to a small problem",
            "Skip to the next module",
            "Memorize the headings",
          ],
          answerIndex: 1,
          explanation: "Active application beats passive review.",
        },
        {
          question: "When you get a question wrong, you should…",
          choices: [
            "Ignore it",
            "Read the explanation and revisit the lesson",
            "Guess again randomly",
            "Restart the course",
          ],
          answerIndex: 1,
          explanation: "Explanations point you back to the material that needs review.",
        },
      ],
    };
  }
  if (args.type === "PROJECT") {
    return {
      title: `Mini project: apply ${focus}`,
      instructions: `## Brief\nBuild a small, end-to-end artifact that demonstrates **${focus}** in practice.\n\n## Requirements\n- Scope it to a few evenings of work\n- Use at least two ideas from the course\n- Document your decisions as you go\n\n## Deliverables\n- The artifact itself (code, model, document, or analysis)\n- A short write-up (300–500 words) explaining your approach`,
      milestones: [
        { title: "Define scope", description: "Write a 3-sentence project pitch and success criteria." },
        { title: "First working draft", description: "Get an end-to-end rough version working." },
        { title: "Refine and test", description: "Fix weak spots; verify against your success criteria." },
        { title: "Write-up", description: "Summarize approach, trade-offs, and what you'd do next." },
      ],
      quiz: [],
    };
  }
  return {
    title: `Practice set: ${focus}`,
    instructions: `## Practice tasks\nWork through these in order — each should take 15–30 minutes.\n\n1. Summarize the key ideas of **${focus}** in your own words.\n2. Solve one worked example from the lessons without looking at the solution.\n3. Create your own variation of that problem and solve it.\n4. Note one thing that still feels shaky and revisit that section.`,
    milestones: [
      { title: "Tasks 1–2 complete", description: "Recall and reproduce." },
      { title: "Tasks 3–4 complete", description: "Transfer and self-assess." },
    ],
    quiz: [],
    markscheme: `## Task 1 — Summary\nA strong answer names the core concepts of **${focus}**, explains how they connect, and uses course vocabulary accurately.\n\n## Task 2 — Worked example\nReproduce the main steps from a lesson example; arithmetic or logic should match the taught method.\n\n## Task 3 — Variation\nThe new problem should change one parameter while testing the same principle; solution must be complete.\n\n## Task 4 — Self-assessment\nIdentify a specific weak spot and name the lesson section to revisit.`,
  };
}
