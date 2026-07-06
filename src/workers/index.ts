import "dotenv/config";
import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { getRedis } from "@/lib/redis";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { COURSE_QUEUE, type CourseJobData } from "@/lib/queue";
import { createWorkerLogger } from "@/lib/worker-log";
import { runCourseGeneration } from "./pipeline";
import { getManimRenderEnvironment } from "./render/manim-env";

const log = createWorkerLogger("worker");
const connection = getRedis();

if (!connection) {
  log.info(
    "REDIS_URL not set — nothing to do. The app runs the pipeline inline without a worker. Set REDIS_URL to enable background queues."
  );
  process.exit(0);
}

log.info("listening", { queue: COURSE_QUEUE, concurrency: env.workerConcurrency });

void getManimRenderEnvironment()
  .then((env) => {
    log.info("render environment probed", {
      manimVersion: env.manimVersion,
      latex: env.latex.available,
      ffmpeg: env.ffmpeg.available,
    });
    log.debug("render environment detail", { context: env.llmContext });
  })
  .catch((err) => log.warn("render environment probe failed", {}, err));

/**
 * DB rows stuck in QUEUED/RUNNING whose BullMQ job no longer exists (worker
 * killed mid-run and the job later hit the stall limit, or was removed) would
 * otherwise show as "running" in the UI forever. Fail them on startup; jobs
 * that are still waiting/active/delayed in Redis are left alone.
 */
async function reconcileOrphanedJobs() {
  const stale = await prisma.generationJob.findMany({
    where: { status: { in: ["QUEUED", "RUNNING"] }, type: "course" },
    select: { id: true, courseId: true },
  });
  if (stale.length === 0) return;

  const queue = new Queue(COURSE_QUEUE, {
    connection: connection as unknown as ConnectionOptions,
  });
  try {
    for (const row of stale) {
      const bullJob = await queue.getJob(row.id);
      const state = bullJob ? await bullJob.getState() : "missing";
      if (
        ["waiting", "active", "delayed", "prioritized", "waiting-children"].includes(
          state
        )
      ) {
        continue; // still owned by the queue — it will run or stall-retry
      }
      if (state === "completed") {
        // Job finished but a late progress write left the row RUNNING.
        await prisma.generationJob
          .update({
            where: { id: row.id },
            data: { status: "COMPLETED", progress: 100, step: "done" },
          })
          .catch(() => {});
        log.warn("orphaned job marked completed", { jobId: row.id });
        continue;
      }
      await prisma.generationJob
        .update({
          where: { id: row.id },
          data: {
            status: "FAILED",
            error: `Lost after worker restart (queue state: ${state}). Retry to resume.`,
          },
        })
        .catch(() => {});
      if (row.courseId) {
        await prisma.course
          .updateMany({
            where: { id: row.courseId, status: "GENERATING" },
            data: { status: "FAILED" },
          })
          .catch(() => {});
      }
      log.warn("orphaned job marked failed", { jobId: row.id, queueState: state });
    }
  } finally {
    await queue.close();
  }
}

void reconcileOrphanedJobs().catch((err) =>
  log.error("orphaned job reconciliation failed", {}, err)
);

const worker = new Worker<CourseJobData>(
  COURSE_QUEUE,
  async (job) => {
    const jobLog = log.child({
      bullJobId: job.id ?? "unknown",
      jobId: job.data.jobId,
      courseId: job.data.courseId,
      resume: job.data.resume ?? false,
    });

    const dbJob = await prisma.generationJob.findUnique({
      where: { id: job.data.jobId },
      select: { status: true },
    });
    if (!dbJob || dbJob.status === "COMPLETED" || dbJob.status === "FAILED") {
      jobLog.info("skipping job — DB row missing or already finished", {
        dbStatus: dbJob?.status ?? "missing",
      });
      return;
    }
    // RUNNING at pickup means a previous attempt died mid-run (stall redelivery
    // after a kill/crash) — resume from checkpoint instead of wiping content.
    const resume = job.data.resume === true || dbJob.status === "RUNNING";
    if (resume && !job.data.resume) {
      jobLog.warn("redelivered after stall — resuming from checkpoint");
    }

    const start = performance.now();
    jobLog.info("processing job");
    try {
      await runCourseGeneration(
        { ...job.data, resume },
        jobLog.child({ scope: "pipeline" })
      );
      jobLog.info("job handler finished", {
        durationMs: Math.round(performance.now() - start),
      });
    } catch (err) {
      jobLog.error(
        "job handler threw",
        { durationMs: Math.round(performance.now() - start) },
        err
      );
      throw err;
    }
  },
  {
    connection: connection as unknown as ConnectionOptions,
    concurrency: env.workerConcurrency,
    // Locks auto-renew every lockDuration/2 while the process is alive, so
    // long jobs are fine. 3 min tolerates event-loop starvation under heavy
    // render/upload load (60s proved too tight — "could not renew lock"),
    // while a hard-killed job is still requeued within ~3.5 min instead of 10.
    lockDuration: 180_000,
    stalledInterval: 30_000,
    maxStalledCount: 5,
  }
);

worker.on("ready", () => log.info("worker ready"));
worker.on("active", (job) =>
  log.info("job active", {
    bullJobId: job.id,
    jobId: job.data.jobId,
    courseId: job.data.courseId,
  })
);
worker.on("completed", (job) =>
  log.info("job completed", {
    bullJobId: job.id,
    jobId: job.data.jobId,
    courseId: job.data.courseId,
  })
);
worker.on("failed", (job, err) => {
  log.error(
    "job failed",
    {
      bullJobId: job?.id,
      jobId: job?.data.jobId,
      courseId: job?.data.courseId,
      error: err.message,
    },
    err
  );
  // BullMQ can fail a job without the pipeline running (e.g. "job stalled more
  // than allowable limit"). Make sure the DB row doesn't stay RUNNING forever.
  if (job?.data.jobId) {
    void prisma.generationJob
      .updateMany({
        where: {
          id: job.data.jobId,
          status: { in: ["QUEUED", "RUNNING"] },
        },
        data: { status: "FAILED", error: err.message },
      })
      .catch(() => {});
  }
});
worker.on("stalled", (jobId) => log.warn("job stalled", { bullJobId: jobId }));
worker.on("error", (err) => log.error("worker error", {}, err));

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) {
    log.warn("second signal — exiting immediately");
    process.exit(1);
  }
  shuttingDown = true;
  log.info(`shutting down (${signal}) — active job will resume on next start`);
  // force=true: don't wait for a 10-minute generation to finish. The job's
  // lock expires shortly after and it gets requeued, then resumed from its
  // checkpoint by the RUNNING-at-pickup detection above.
  await worker.close(true);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
