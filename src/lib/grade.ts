import vm from "node:vm";
import { llmJSON } from "./llm";
import { z } from "zod";
import {
  checkGeometryConstraint,
  type GeoConstraint,
  type GeoPoint,
} from "./geometry";

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
    case "NUMERIC":
      return gradeNumeric(exercise, answer);
    case "FLASHCARDS":
      return gradeFlashcards(exercise, answer);
    case "CATEGORIZE":
      return gradeCategorize(exercise, answer);
    case "CODE_OUTPUT":
      return gradeCodeOutput(exercise, answer);
    case "LOGIC_CIRCUIT":
      return gradeLogicCircuit(exercise, answer);
    case "GEOMETRY":
      return gradeGeometry(exercise, answer);
    case "FREE_BODY":
      return gradeFreeBody(exercise, answer);
    default:
      return { status: "SUBMITTED", score: 0, feedback: "Recorded." };
  }
}

function gradeNumeric(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { answer: number; tolerance?: number; unit?: string };
  const value = (answer as { value?: number })?.value;
  if (value === undefined || Number.isNaN(value)) {
    return { status: "FAILED", score: 0, feedback: "Enter a numeric answer." };
  }
  const tol = cfg.tolerance ?? 0;
  const ok = Math.abs(value - cfg.answer) <= tol;
  const unit = cfg.unit ? ` ${cfg.unit}` : "";
  return {
    status: ok ? "PASSED" : "FAILED",
    score: ok ? 100 : 0,
    feedback: ok
      ? `Correct — ${cfg.answer}${unit}.`
      : `You answered ${value}${unit}; that's outside the accepted range. Check your setup and units.`,
  };
}

function gradeFlashcards(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { cards: { front: string }[] };
  const known = (answer as { known?: number })?.known ?? 0;
  const total = cfg.cards.length;
  const pct = Math.round((known / total) * 100);
  const ok = known >= Math.ceil(total * 0.8);
  return {
    status: ok ? "PASSED" : "FAILED",
    score: pct,
    feedback: ok
      ? `${known}/${total} known — nice recall.`
      : `${known}/${total} known. Review the ones you missed and run the deck again.`,
  };
}

function gradeCategorize(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { items: { label: string; category: number }[] };
  const assignments = (answer as { assignments?: number[] })?.assignments ?? [];
  const right = cfg.items.filter((it, i) => assignments[i] === it.category).length;
  const ok = right === cfg.items.length;
  return {
    status: ok ? "PASSED" : "FAILED",
    score: Math.round((right / cfg.items.length) * 100),
    feedback: ok
      ? "Every item sorted correctly!"
      : `${right}/${cfg.items.length} sorted correctly. Rethink the misplaced ones.`,
  };
}

function gradeCodeOutput(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { expectedOutput: string };
  const got = ((answer as { output?: string })?.output ?? "").trim();
  const want = cfg.expectedOutput.trim();
  // Whitespace-forgiving comparison per line.
  const normalize = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");
  const ok = normalize(got) === normalize(want);
  return {
    status: ok ? "PASSED" : "FAILED",
    score: ok ? 100 : 0,
    feedback: ok
      ? "Exactly right — you traced it correctly."
      : "Not what the snippet prints. Trace through it line by line, tracking each variable.",
  };
}

type GateSpec = { type: string; in: string[] };

function evalGate(type: string, a: number, b: number): number {
  switch (type) {
    case "AND":
      return a & b;
    case "OR":
      return a | b;
    case "XOR":
      return a ^ b;
    case "NAND":
      return 1 - (a & b);
    case "NOR":
      return 1 - (a | b);
    case "NOT":
      return 1 - a;
    default:
      return 0;
  }
}

/** Evaluates a gate network for one row of input values. Throws on bad refs. */
function evalCircuit(
  gates: GateSpec[],
  outputRef: string,
  inputVals: Record<string, number>
): number {
  const gateVals: number[] = [];
  const resolve = (ref: string, before: number): number => {
    if (ref in inputVals) return inputVals[ref];
    const m = /^g(\d+)$/.exec(ref);
    const idx = m ? Number(m[1]) : -1;
    if (idx < 0 || idx >= before) throw new Error(`Bad wire reference "${ref}"`);
    return gateVals[idx];
  };
  gates.forEach((g, i) => {
    const a = resolve(g.in[0] ?? "", i);
    const b = g.type === "NOT" ? 0 : resolve(g.in[1] ?? "", i);
    gateVals.push(evalGate(g.type, a, b));
  });
  return resolve(outputRef, gates.length);
}

function gradeLogicCircuit(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { inputs: string[]; outputs: number[] };
  const ans = answer as { gates?: GateSpec[]; output?: string };
  if (!ans?.gates?.length || !ans.output) {
    return {
      status: "FAILED",
      score: 0,
      feedback: "Add at least one gate and connect it to the output.",
    };
  }
  const rows = 1 << cfg.inputs.length;
  let right = 0;
  const misses: string[] = [];
  for (let row = 0; row < rows; row++) {
    const inputVals: Record<string, number> = {};
    cfg.inputs.forEach((name, i) => {
      inputVals[name] = (row >> (cfg.inputs.length - 1 - i)) & 1;
    });
    try {
      const got = evalCircuit(ans.gates, ans.output, inputVals);
      if (got === cfg.outputs[row]) right++;
      else
        misses.push(
          cfg.inputs.map((n) => `${n}=${inputVals[n]}`).join(", ") +
            ` → got ${got}, expected ${cfg.outputs[row]}`
        );
    } catch (err) {
      return { status: "FAILED", score: 0, feedback: (err as Error).message };
    }
  }
  const ok = right === rows;
  return {
    status: ok ? "PASSED" : "FAILED",
    score: Math.round((right / rows) * 100),
    feedback: ok
      ? "Your circuit matches the truth table on every row!"
      : `${right}/${rows} truth-table rows match.\n` + misses.slice(0, 3).join("\n"),
  };
}

function gradeGeometry(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as { points: GeoPoint[]; constraints: GeoConstraint[] };
  const submitted = (answer as { points?: { id: string; x: number; y: number }[] })
    ?.points;
  const pts = new Map<string, { x: number; y: number }>();
  // Fixed points always come from the config; free points from the submission.
  for (const pt of cfg.points) pts.set(pt.id, { x: pt.x, y: pt.y });
  for (const pt of submitted ?? []) {
    const orig = cfg.points.find((o) => o.id === pt.id);
    if (orig && !orig.fixed) pts.set(pt.id, { x: pt.x, y: pt.y });
  }
  const order = cfg.points.map((pt) => pt.id);
  const results = cfg.constraints.map((c) => checkGeometryConstraint(c, pts, order));
  const right = results.filter((r) => r.ok).length;
  const ok = right === results.length;
  const missed = results
    .filter((r) => !r.ok)
    .map((r) => `${r.label} (currently ${r.actual.toFixed(1)})`);
  return {
    status: ok ? "PASSED" : "FAILED",
    score: Math.round((right / results.length) * 100),
    feedback: ok
      ? "All constraints satisfied — nice construction!"
      : `${right}/${results.length} constraints met. Still off: ` + missed.join("; "),
  };
}

/** Smallest circular difference between two angles in degrees. */
function angleDiff(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

function gradeFreeBody(ex: ExerciseLike, answer: unknown): GradeResult {
  const cfg = ex.config as {
    forces: { id: string; label: string; angleDeg: number; required: boolean }[];
    toleranceDeg?: number;
  };
  const placed = (answer as { placed?: { id: string; angleDeg: number }[] })?.placed ?? [];
  const tol = cfg.toleranceDeg ?? 15;
  const required = cfg.forces.filter((f) => f.required);
  const problems: string[] = [];
  let right = 0;
  for (const f of required) {
    const got = placed.find((pl) => pl.id === f.id);
    if (!got) problems.push(`${f.label} is missing.`);
    else if (angleDiff(got.angleDeg, f.angleDeg) > tol)
      problems.push(`${f.label} points the wrong way.`);
    else right++;
  }
  for (const pl of placed) {
    const f = cfg.forces.find((cf) => cf.id === pl.id);
    if (f && !f.required) problems.push(`${f.label} does not act on this body.`);
  }
  const total = required.length + placed.filter((pl) => {
    const f = cfg.forces.find((cf) => cf.id === pl.id);
    return f && !f.required;
  }).length;
  const ok = problems.length === 0 && right === required.length;
  return {
    status: ok ? "PASSED" : "FAILED",
    score: total > 0 ? Math.round((right / total) * 100) : 0,
    feedback: ok
      ? "Correct free-body diagram — every force present and properly aimed."
      : problems.slice(0, 3).join(" "),
  };
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
    task: "gradeText",
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
