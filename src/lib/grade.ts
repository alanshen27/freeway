import vm from "node:vm";
import { llmJSON } from "./llm";
import { z } from "zod";

export type GradeResult = {
  status: "PASSED" | "FAILED" | "SUBMITTED";
  score: number; // 0-100
  feedback: string;
};

type ExerciseLike = {
  type: string;
  prompt: string;
  config: unknown;
  solution: unknown;
};

export async function gradeAttempt(
  exercise: ExerciseLike,
  answer: unknown
): Promise<GradeResult> {
  switch (exercise.type) {
    case "MCQ":
      return gradeMcq(exercise, answer);
    case "CODING":
      return gradeCoding(exercise, answer);
    case "CIRCUIT":
      return gradeCircuit(exercise, answer);
    case "VISUAL":
      return gradeVisual(exercise, answer);
    case "GRADED_TEXT":
      return gradeText(exercise, answer);
    case "ORDERING":
      return gradeOrdering(exercise, answer);
    case "FILL_BLANK":
      return gradeFillBlank(exercise, answer);
    case "MATCHING":
      return gradeMatching(exercise, answer);
    default:
      return { status: "SUBMITTED", score: 0, feedback: "Recorded." };
  }
}

function gradeOrdering(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { items: string[] };
  const seq = (answer as { sequence?: string[] })?.sequence ?? [];
  const correct = seq.length === cfg.items.length && seq.every((s, i) => s === cfg.items[i]);
  const right = seq.filter((s, i) => s === cfg.items[i]).length;
  return {
    status: correct ? "PASSED" : "FAILED",
    score: Math.round((right / cfg.items.length) * 100),
    feedback: correct
      ? "Perfect order!"
      : `${right}/${cfg.items.length} in the right position. Keep rearranging.`,
  };
}

function gradeFillBlank(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { answers: string[] };
  const vals = (answer as { values?: string[] })?.values ?? [];
  const norm = (s: string) => s.trim().toLowerCase();
  const right = cfg.answers.filter((a, i) => norm(a) === norm(vals[i] ?? "")).length;
  const ok = right === cfg.answers.length;
  return {
    status: ok ? "PASSED" : "FAILED",
    score: Math.round((right / cfg.answers.length) * 100),
    feedback: ok
      ? "All blanks correct!"
      : `${right}/${cfg.answers.length} blanks correct.`,
  };
}

function gradeMatching(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { left: string[]; pairs: number[] };
  const mapping = (answer as { mapping?: number[] })?.mapping ?? [];
  const right = cfg.pairs.filter((p, i) => mapping[i] === p).length;
  const ok = right === cfg.pairs.length;
  return {
    status: ok ? "PASSED" : "FAILED",
    score: Math.round((right / cfg.pairs.length) * 100),
    feedback: ok ? "Every pair matched!" : `${right}/${cfg.pairs.length} pairs matched.`,
  };
}

function gradeMcq(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { answerIndex: number; explanation?: string };
  const picked = (answer as { choiceIndex?: number })?.choiceIndex;
  const ok = picked === cfg.answerIndex;
  return {
    status: ok ? "PASSED" : "FAILED",
    score: ok ? 100 : 0,
    feedback: ok
      ? `Correct! ${cfg.explanation ?? ""}`.trim()
      : `Not quite. ${cfg.explanation ?? ""}`.trim(),
  };
}

function gradeCoding(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as {
    functionName: string;
    tests: { args: unknown[]; expected: unknown }[];
  };
  const code = (answer as { code?: string })?.code ?? "";
  let passed = 0;
  const failures: string[] = [];
  for (const t of cfg.tests) {
    try {
      const ctx: Record<string, unknown> = {};
      vm.createContext(ctx);
      const script = `${code}\n;globalThis.__r = ${cfg.functionName}(...${JSON.stringify(
        t.args
      )});`;
      vm.runInContext(script, ctx, { timeout: 1000 });
      const got = (ctx as { __r?: unknown }).__r;
      if (JSON.stringify(got) === JSON.stringify(t.expected)) passed++;
      else
        failures.push(
          `${cfg.functionName}(${t.args
            .map((a) => JSON.stringify(a))
            .join(", ")}) → ${JSON.stringify(got)}, expected ${JSON.stringify(
            t.expected
          )}`
        );
    } catch (err) {
      failures.push(`Error: ${(err as Error).message}`);
    }
  }
  const score = Math.round((passed / cfg.tests.length) * 100);
  return {
    status: score === 100 ? "PASSED" : "FAILED",
    score,
    feedback:
      score === 100
        ? `All ${cfg.tests.length} tests passed!`
        : `${passed}/${cfg.tests.length} tests passed.\n` +
          failures.slice(0, 3).join("\n"),
  };
}

function gradeCircuit(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { targetResistance: number; tolerance: number };
  const total = (answer as { total?: number })?.total ?? 0;
  const ok = Math.abs(total - cfg.targetResistance) <= (cfg.tolerance ?? 0.5);
  return {
    status: ok ? "PASSED" : "FAILED",
    score: ok ? 100 : 0,
    feedback: ok
      ? `Nailed it — ${total}Ω matches the ${cfg.targetResistance}Ω target.`
      : `You're at ${total}Ω; target is ${cfg.targetResistance}Ω.`,
  };
}

function gradeVisual(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = (ex.config as { kind?: string; target?: Record<string, number> }) ?? {};
  const ans = (answer as Record<string, number>) ?? {};

  // Vector-sum: compare the resultant (x,y) against the target within tolerance.
  if (cfg.kind === "vector-sum" && cfg.target) {
    const dx = (ans.x ?? 0) - (cfg.target.x ?? 0);
    const dy = (ans.y ?? 0) - (cfg.target.y ?? 0);
    const dist = Math.hypot(dx, dy);
    const ok = dist <= 0.4;
    return {
      status: ok ? "PASSED" : "FAILED",
      score: ok ? 100 : Math.max(0, Math.round(100 - dist * 25)),
      feedback: ok
        ? "Your resultant matches the target vector!"
        : `Off by ${dist.toFixed(2)} units — keep tuning the magnitudes and angles.`,
    };
  }

  // Projectile / gear-ratio: compare a single measured value to config.target.
  if ((cfg.kind === "projectile" || cfg.kind === "gear-ratio") && cfg.target) {
    const key = cfg.kind === "projectile" ? "range" : "ratio";
    const targetKey = cfg.kind === "projectile" ? "distance" : "ratio";
    const tol = cfg.kind === "projectile" ? 0.6 : 0.05;
    const got = ans[key] ?? 0;
    const want = cfg.target[targetKey] ?? 0;
    const ok = Math.abs(got - want) <= tol;
    return {
      status: ok ? "PASSED" : "FAILED",
      score: ok ? 100 : 0,
      feedback: ok
        ? "On target."
        : `You got ${got.toFixed(2)}; aim for ${want}. Keep adjusting.`,
    };
  }

  // Lever (and other single-value visual targets): compare the solution key.
  const sol = (ex.solution as Record<string, number>) ?? {};
  const key = Object.keys(sol)[0];
  if (!key) return { status: "SUBMITTED", score: 50, feedback: "Recorded." };
  const ok = Math.abs((ans[key] ?? 0) - sol[key]) <= 0.25;
  return {
    status: ok ? "PASSED" : "FAILED",
    score: ok ? 100 : 0,
    feedback: ok
      ? "Balanced! The torques are equal."
      : `Close — adjust ${key}. You set ${ans[key]}, target ≈ ${sol[key]}.`,
  };
}

async function gradeText(ex: ExerciseLike, answer: unknown): Promise<GradeResult> {
  const cfg = ex.config as { rubric: string[]; minWords: number };
  const text = (answer as { text?: string })?.text ?? "";
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < (cfg.minWords ?? 0)) {
    return {
      status: "FAILED",
      score: 0,
      feedback: `Please write at least ${cfg.minWords} words (you wrote ${words}).`,
    };
  }
  const result = await llmJSON({
    schema: z.object({ score: z.number(), feedback: z.string() }),
    system:
      "You are a fair, encouraging grader. Grade the answer 0-100 against the " +
      "rubric and give 1-2 sentences of feedback. Respond as strict JSON.",
    prompt: `Question: ${ex.prompt}\nRubric: ${cfg.rubric.join(
      "; "
    )}\nAnswer: ${text}\nReturn JSON { score, feedback }.`,
    mock: () => ({
      score: 80,
      feedback:
        "Solid explanation that hits the core idea. To go further, add a concrete example and tie it back to the key term.",
    }),
  });
  return {
    status: result.score >= 60 ? "PASSED" : "FAILED",
    score: Math.max(0, Math.min(100, Math.round(result.score))),
    feedback: result.feedback,
  };
}
