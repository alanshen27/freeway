# Freeway

AI-generated, hands-on engineering courses. Pick a career path, answer a few
questions, and an orchestrator + subagent pipeline builds you a personalized
course complete with readable text, stock imagery, explainer videos, and
**interactive** exercises (coding, circuits, free-body/vector diagrams,
projectile & gear sims, quizzes, ordering, fill-in-the-blank, matching, and
AI-graded written answers). Clean, modern dashboard-style UI built with
shadcn/ui — **responsive across mobile and desktop** (bottom nav on phones, a
sidebar on desktop).

> Scope for this MVP: **software / mechanical / AI engineering** (+ supporting
> physics & materials science).

## Stack

- **Next.js 15** (App Router, RSC) + **TypeScript** + **Tailwind** + **shadcn/ui**
- **Supabase**: Postgres (via **Prisma**), **Auth** (`@supabase/ssr`), **Storage** (videos)
- **OpenAI SDK** for the generation pipeline (orchestrator + subagents)
- **BullMQ + Redis** for background generation queues
- **Manim** for explainer-video rendering (with a themed in-app player)
- **SERP API** for stock images
- **Monaco** (coding exercises), **SVG/Framer Motion** (circuits & visual sims)

### Designed to run with zero external services

Every integration degrades gracefully so you can demo the whole product offline:

| Service | If unset… |
| --- | --- |
| `OPENAI_API_KEY` | Pipeline uses a deterministic **mock** generator |
| `REDIS_URL` | Generation runs **inline** (no worker needed) |
| `SERPAPI_KEY` | Lessons use **themed gradient** image placeholders |
| `MANIM_ENABLED` | Video player shows a **themed animated scene** instead of an mp4 |
| Supabase keys | **Dev:** a cookie-based demo session. **Prod:** the app refuses to silently run anonymously and shows an "auth not configured" screen |
| Supabase service role | Generated videos are written to `public/generated` instead of Storage |

### Auth behavior

- **Supabase configured** (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`):
  real email/password auth, session refresh via middleware, sign out → `/auth`.
- **Not configured, `NODE_ENV!=production`**: a no-password **demo session** so you
  can develop offline.
- **Not configured, `NODE_ENV=production`**: `/auth` shows a clear configuration
  error — no anonymous demo users are ever created in prod.

## Quick start

```bash
# 1. Install
npm install

# 2. Start Postgres + Redis (Docker). Postgres is mapped to host :5433.
npm run infra:up

# 3. Configure env
cp .env.example .env   # defaults already point at the docker services

# 4. Create the schema + seed a demo course (runs the pipeline once, inline)
npm run prisma:push
npm run seed

# 5. Run the app
npm run dev            # http://localhost:3000

# 6. (Optional) background worker — only needed if REDIS_URL is set
npm run worker
```

Open `http://localhost:3000`, enter a name, pick interests, choose a career, and
watch the course generate.

## How generation works

```
User answers ─▶ POST /api/generate ─▶ GenerationJob (QUEUED)
                                         │
                       enqueue (BullMQ)  │  or inline fallback
                                         ▼
                          src/workers/pipeline.ts
                                         │
        ┌────────────────────────────────┼───────────────────────────────┐
        ▼                ▼                ▼               ▼                ▼
  curriculum.ts       text.ts          video.ts      exercise.ts       serp.ts
  (orchestrator)   (readable text)  (Manim scene +  (CODING/CIRCUIT/  (stock
   units→concepts                    questions)      VISUAL/MCQ/        images)
   →lessons + plan                                   GRADED_TEXT)
```

- The **orchestrator** (`agents/curriculum.ts`) reads the learner's interests and
  preliminary answers and decides the units, concepts, lessons, which lessons get
  a video, and which exercise types fit each lesson.
- **Subagents** expand each piece. Progress is streamed into `GenerationJob.logs`
  and polled by the generation screen (`/add/generating/[jobId]`).

## Exercises

| Type | UI | Grading |
| --- | --- | --- |
| `CODING` | Monaco editor + local test runner | Server runs tests in a `vm` sandbox |
| `CIRCUIT` | SVG series-resistor builder | Equivalent resistance vs target |
| `VISUAL` | Lever / vector-sum / **projectile** / **gear-ratio** (SVG + sliders) | Measured value vs target within tolerance |
| `MCQ` | Choice cards | Index match |
| `GRADED_TEXT` | Textarea | **AI-graded** against a rubric |
| `ORDERING` | Reorderable step list | Position-by-position match |
| `FILL_BLANK` | Inline cloze inputs | Case-insensitive answer match |
| `MATCHING` | Left items → right dropdowns | Pair match |

Passing an exercise awards XP and marks the lesson complete. All grading is
server-side (`src/lib/grade.ts`).

## Video (Manim)

`agents/video.ts` authors a Manim Community scene + narration + inline questions.
When `MANIM_ENABLED=1` and `manim` is on `PATH`, `workers/render/manim.ts` renders
an mp4 into `public/generated/videos`. Either way, the themed `VideoPlayer`
component plays it inside the app's look-and-feel, pausing at timestamps to ask
comprehension questions. With no Manim, it animates a branded scene from the
narration so the UX is identical.

### Enabling real video renders (local dev)

1. Install Manim (Community edition):

   ```bash
   pip install manim
   manim --version   # should print e.g. Manim Community v0.20.x
   ```

2. Set in `.env`:

   ```bash
   MANIM_ENABLED=1
   MANIM_BIN=manim   # or full path if not on PATH
   ```

3. **Install LaTeX** — generated scenes often use `MathTex` for equations (`F=ma`,
   etc.). Manim invokes `latex` under the hood; without it renders fail with
   `manim render exited 1` and `No such file or directory: 'latex'`.

   On macOS (recommended — small install):

   ```bash
   brew install --cask basictex
   # open a new terminal, then:
   sudo tlmgr update --self
   sudo tlmgr install collection-latexrecommended
   which latex   # e.g. /Library/TeX/texbin/latex
   ```

   `collection-latexrecommended` is a TeX Live bundle of common LaTeX packages
   (math, fonts, tables, …). BasicTeX is minimal; this fills in what Manim's
   equation renderer needs.

4. Restart the worker after changing env or installing LaTeX:

   ```bash
   npm run worker
   ```

**Don't want to deal with LaTeX?** Leave `MANIM_ENABLED=0` — the app uses the
themed in-app player instead of mp4 renders. Course generation will not fail on
video sections.

**Debugging failed renders:** if a job dies with `manim render exited 1`, the
scene script from the LLM is usually invalid Python or uses `MathTex` without
LaTeX. Check worker logs; run the saved `sceneScript` manually with
`manim -ql scene.py SceneClassName` to see the traceback.

## Forum

Each course has a forum (`/feed`). Threads can **reference a specific exercise**
the learner is stuck on (the "Ask the forum" link on any exercise), and replies
can request an **AI tutor** hint (Socratic, doesn't just give the answer).

## Project layout

```
src/
  app/
    onboarding/            name + interests
    (app)/                 main shell w/ bottom nav
      courses/             list + course detail
      units/[unitId]       classes in a unit
      lessons/[lessonId]   the learning surface (text/video/exercises)
      add/                 career picker → questions → generation progress
      feed/                forums + threads
      settings, notifications
    api/                   onboarding, generate, jobs, exercises/submit, forum
  components/
    ui/                    shadcn primitives (Duolingo-themed)
    exercises/             the 5 interactive exercise components
    VideoPlayer, Markdown, CourseCard, BottomNav, PageHeader
  lib/                     prisma, llm, queue, redis, serp, grade, session, catalog
  workers/
    index.ts               BullMQ worker entry
    pipeline.ts            end-to-end generation
    agents/                curriculum, text, video, exercise
    render/manim.ts        Manim → mp4
prisma/                    schema + seed
```

## Notes / next steps

- Swap the cookie session for real Supabase auth in `src/lib/session.ts`.
- The CODING sandbox uses Node `vm`; for untrusted users move it to an isolated
  runner (e.g. a container or `isolated-vm`).
- Related courses are created as drafts you can generate on demand.
