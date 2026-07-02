import { llmJSON } from "@/lib/llm";
import { exerciseSchema, type ExerciseSpec } from "@/lib/schemas";

type ExType =
  | "CODING"
  | "CIRCUIT"
  | "VISUAL"
  | "MCQ"
  | "GRADED_TEXT"
  | "ORDERING"
  | "FILL_BLANK"
  | "MATCHING"
  | "NUMERIC"
  | "FLASHCARDS"
  | "CATEGORIZE"
  | "CODE_OUTPUT"
  | "LOGIC_CIRCUIT"
  | "GEOMETRY"
  | "FREE_BODY";

const typeInstructions: Record<ExType, string> = {
  CODING:
    'config: { language:"javascript", functionName, starterCode, tests:[{args:[],expected}], hints:[] }. The tests call functionName(...args) and compare to expected.',
  CIRCUIT:
    "config: { goal, targetResistance (ohms), tolerance, palette:[{label,ohms}] }. Learner drags resistors to hit the target equivalent resistance.",
  VISUAL:
    'config: { kind:"vector-sum"|"lever"|"projectile"|"gear-ratio", target:{...numbers}, prompt }. vector-sum target {x,y}; lever solution {distance}; projectile target {distance}; gear-ratio target {ratio}.',
  MCQ: "config: { choices:string[], answerIndex, explanation }.",
  GRADED_TEXT:
    "config: { rubric:string[], minWords }. A short written answer graded by the model against the rubric.",
  ORDERING:
    "config: { items:string[] } listing the steps in the CORRECT order (UI shuffles them).",
  FILL_BLANK:
    'config: { template:"... ___ ... ___", answers:string[] } where each ___ is filled by the matching answer in order.',
  MATCHING:
    "config: { left:string[], right:string[], pairs:number[] } where pairs[i] is the index in right that matches left[i].",
  NUMERIC:
    "config: { answer:number, tolerance:number, unit?:string, hint?:string }. A calculation with a single numeric result. Pick tolerance sensibly (e.g. 1-2% of answer).",
  FLASHCARDS:
    "config: { cards:[{front,back}] } with 5-8 cards. front is a term/question, back is the definition/answer. Keep both sides short.",
  CATEGORIZE:
    "config: { categories:string[] (2-3 buckets), items:[{label, category:number}] } with 5-8 items where category is the index of the correct bucket.",
  CODE_OUTPUT:
    'config: { language:"javascript"|"python", code:string, expectedOutput:string }. A short (5-12 line) snippet; learner predicts exactly what it prints. expectedOutput is the exact stdout text.',
  LOGIC_CIRCUIT:
    'config: { inputs:["A","B"] (2 or 3 input names), outputs:number[] (0/1 expected output for every input combination in binary counting order, first input is the most significant bit; length must be 2^inputs), expression:string (readable form, e.g. "A XOR B"), availableGates:["AND","OR","NOT","XOR","NAND","NOR"] (subset the learner may use), maxGates:number (3-5) }. Learner wires gates so the circuit matches the truth table.',
  GEOMETRY:
    'config: { grid:{width:number,height:number,snap:number} (e.g. 12x10 snap 1), points:[{id:"A",x,y,fixed?:boolean}] (3-5 single-letter points; fix 1-2 as anchors), polygon:boolean (true to draw the shape connecting points in order), constraints:[{type:"distance",a,b,value,tolerance} | {type:"angle",vertex,a,c,value,tolerance (degrees)} | {type:"area",value,tolerance} | {type:"perimeter",value,tolerance}] (1-3 constraints, all satisfiable on the grid simultaneously), hint?:string }. Learner drags the free points until every constraint holds.',
  FREE_BODY:
    'config: { scene:"flat"|"incline"|"hanging", inclineDeg?:number (only for incline), forces:[{id,label,angleDeg:number,required:boolean}] (3-5 entries; required:true forces belong on the diagram at angleDeg — degrees measured counterclockwise from the positive x axis, so straight down is 270; include 1-2 required:false distractor forces that do NOT act on the body), toleranceDeg:number (10-20) }. Learner picks which forces act on the body and aims each arrow.',
};

/** Subagent: generates one interactive exercise of the requested type. */
export async function writeExercise(args: {
  type: ExType;
  courseTitle: string;
  lessonTitle: string;
  concepts: string[];
}): Promise<ExerciseSpec & { type: ExType }> {
  const fallback = mockExercise(args.type, args.lessonTitle);
  const spec = await llmJSON({
    schema: exerciseSchema,
    system:
      "You design a single self-contained, auto-checkable interactive exercise. " +
      "Output strict JSON. The prompt field must be plain text only — no markdown, " +
      "no backticks, no **bold**, no code fences. Use line breaks and simple dashes for lists. " +
      typeInstructions[args.type],
    prompt: `Type: ${args.type}\nCourse: ${args.courseTitle}\nLesson: ${args.lessonTitle}\nConcepts: ${args.concepts.join(", ")}\n
Return JSON { title, prompt, difficulty, config, solution? }.
config is mandatory — follow the shape for ${args.type} exactly.
prompt must be plain English instructions (no markdown formatting).`,
    mock: () => fallback,
  });

  const config =
    spec.config &&
    typeof spec.config === "object" &&
    !Array.isArray(spec.config) &&
    Object.keys(spec.config).length > 0
      ? spec.config
      : fallback.config;

  return {
    title: spec.title?.trim() || fallback.title,
    prompt: spec.prompt?.trim() || fallback.prompt,
    difficulty: spec.difficulty || fallback.difficulty,
    config,
    solution: spec.solution ?? fallback.solution,
    type: args.type,
  };
}

function mockExercise(type: ExType, lessonTitle: string): ExerciseSpec {
  switch (type) {
    case "CODING":
      return {
        title: `Implement: sum of a list`,
        prompt:
          "Complete `sumList(nums)` so it returns the sum of the array. This warm-up checks your environment works.",
        difficulty: "intro",
        config: {
          language: "javascript",
          functionName: "sumList",
          starterCode:
            "function sumList(nums) {\n  // TODO: return the sum\n  return 0;\n}",
          tests: [
            { args: [[1, 2, 3]], expected: 6 },
            { args: [[]], expected: 0 },
            { args: [[-1, 1, 10]], expected: 10 },
          ],
          hints: ["Use reduce or a for-loop.", "Start the accumulator at 0."],
        },
        solution: {
          code: "function sumList(nums){return nums.reduce((a,b)=>a+b,0);}",
        },
      };
    case "CIRCUIT":
      return {
        title: "Hit the target resistance",
        prompt:
          "Drag resistors into the series slot until the equivalent resistance is 150Ω (±0.5).",
        difficulty: "intro",
        config: {
          goal: "Reach 150Ω equivalent series resistance",
          targetResistance: 150,
          tolerance: 0.5,
          palette: [
            { label: "47Ω", ohms: 47 },
            { label: "56Ω", ohms: 56 },
            { label: "47Ω", ohms: 47 },
            { label: "100Ω", ohms: 100 },
          ],
        },
        solution: { combo: [47, 56, 47] },
      };
    case "VISUAL":
      return {
        title: "Balance the lever",
        prompt:
          "Place the 4kg mass so the beam balances. Torque must be equal on both sides.",
        difficulty: "intro",
        config: {
          kind: "lever",
          target: { torque: 12 },
          prompt: "Left side: 6kg at 2m. Balance it on the right with 4kg.",
        },
        solution: { distance: 3 },
      };
    case "GRADED_TEXT":
      return {
        title: `Explain it in your own words`,
        prompt: `In 60+ words, explain the core idea of "${lessonTitle}" as if teaching a friend.`,
        difficulty: "intro",
        config: {
          rubric: [
            "Mentions the core concept clearly",
            "Uses an analogy or example",
            "Is internally consistent",
          ],
          minWords: 60,
        },
        solution: null,
      };
    case "ORDERING":
      return {
        title: "Order the build steps",
        prompt: "Drag the steps into the correct order, then check.",
        difficulty: "intro",
        config: {
          items: [
            "Understand the problem",
            "Sketch a solution",
            "Implement the core",
            "Test and refine",
          ],
        },
        solution: null,
      };
    case "FILL_BLANK":
      return {
        title: "Complete the statement",
        prompt: "Fill in the blanks.",
        difficulty: "intro",
        config: {
          template: "Good engineering favors ___ over premature ___.",
          answers: ["clarity", "optimization"],
        },
        solution: null,
      };
    case "MATCHING":
      return {
        title: "Match the pairs",
        prompt: "Match each term to its definition.",
        difficulty: "intro",
        config: {
          left: ["Variable", "Function", "Loop"],
          right: [
            "A named storage slot",
            "A reusable block of logic",
            "Repeats work until a condition",
          ],
          pairs: [0, 1, 2],
        },
        solution: null,
      };
    case "NUMERIC":
      return {
        title: "Compute the result",
        prompt:
          "A machine does 240 J of work in 8 seconds. What is its power output in watts?",
        difficulty: "intro",
        config: { answer: 30, tolerance: 0.5, unit: "W", hint: "Power = work / time." },
        solution: { value: 30 },
      };
    case "FLASHCARDS":
      return {
        title: `Key terms: ${lessonTitle}`,
        prompt: "Flip through the deck. Mark each card as known or needs review.",
        difficulty: "intro",
        config: {
          cards: [
            { front: "Concept", back: "A core idea this lesson builds on" },
            { front: "Application", back: "Using the concept on a real problem" },
            { front: "Trade-off", back: "What you give up for what you gain" },
            { front: "Heuristic", back: "A practical rule of thumb" },
            { front: "Edge case", back: "An input at the boundary of validity" },
          ],
        },
        solution: null,
      };
    case "CATEGORIZE":
      return {
        title: "Sort the examples",
        prompt: "Assign each item to the bucket where it belongs.",
        difficulty: "intro",
        config: {
          categories: ["Input", "Process", "Output"],
          items: [
            { label: "Sensor reading", category: 0 },
            { label: "Filtering noise", category: 1 },
            { label: "Control signal", category: 2 },
            { label: "User request", category: 0 },
            { label: "Computing an average", category: 1 },
            { label: "Rendered report", category: 2 },
          ],
        },
        solution: null,
      };
    case "CODE_OUTPUT":
      return {
        title: "Predict the output",
        prompt: "Read the snippet and type exactly what it prints.",
        difficulty: "intro",
        config: {
          language: "javascript",
          code: 'let total = 0;\nfor (const n of [1, 2, 3]) {\n  total += n * 2;\n}\nconsole.log(total);',
          expectedOutput: "12",
        },
        solution: { output: "12" },
      };
    case "LOGIC_CIRCUIT":
      return {
        title: "Build the XOR circuit",
        prompt:
          "Wire gates so the output matches the truth table: the light is on exactly when A and B differ.",
        difficulty: "intro",
        config: {
          inputs: ["A", "B"],
          outputs: [0, 1, 1, 0],
          expression: "A XOR B",
          availableGates: ["AND", "OR", "NOT", "NAND"],
          maxGates: 4,
        },
        solution: {
          gates: [
            { type: "NAND", in: ["A", "B"] },
            { type: "OR", in: ["A", "B"] },
            { type: "AND", in: ["g0", "g1"] },
          ],
          output: "g2",
        },
      };
    case "GEOMETRY":
      return {
        title: "Make it a right triangle",
        prompt:
          "Drag point C so triangle ABC has a right angle at B and an area of 6 square units.",
        difficulty: "intro",
        config: {
          grid: { width: 12, height: 10, snap: 1 },
          points: [
            { id: "A", x: 2, y: 2, fixed: true },
            { id: "B", x: 6, y: 2, fixed: true },
            { id: "C", x: 8, y: 6 },
          ],
          polygon: true,
          constraints: [
            { type: "angle", vertex: "B", a: "A", c: "C", value: 90, tolerance: 3 },
            { type: "area", value: 6, tolerance: 0.4 },
          ],
          hint: "The legs meet at B, so C must sit directly above or below B.",
        },
        solution: { points: [{ id: "C", x: 6, y: 5 }] },
      };
    case "FREE_BODY":
      return {
        title: "Forces on a resting box",
        prompt:
          "A box sits at rest on a horizontal table. Add every force acting on the box and aim each arrow in its true direction.",
        difficulty: "intro",
        config: {
          scene: "flat",
          forces: [
            { id: "gravity", label: "Gravity (W)", angleDeg: 270, required: true },
            { id: "normal", label: "Normal force (N)", angleDeg: 90, required: true },
            { id: "friction", label: "Friction (f)", angleDeg: 180, required: false },
            { id: "applied", label: "Applied push (F)", angleDeg: 0, required: false },
          ],
          toleranceDeg: 15,
        },
        solution: {
          placed: [
            { id: "gravity", angleDeg: 270 },
            { id: "normal", angleDeg: 90 },
          ],
        },
      };
    case "MCQ":
    default:
      return {
        title: `Quick check: ${lessonTitle}`,
        prompt: `Which statement about ${lessonTitle} is most accurate?`,
        difficulty: "intro",
        config: {
          choices: [
            "It builds intuition before formalism.",
            "It can only be memorized.",
            "It has no real-world use.",
          ],
          answerIndex: 0,
          explanation:
            "Intuition-first learning makes the formal version much easier to retain.",
        },
        solution: { answerIndex: 0 },
      };
  }
}
