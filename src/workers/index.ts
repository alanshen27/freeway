import "dotenv/config";
import { Worker, type ConnectionOptions } from "bullmq";
import { getRedis } from "@/lib/redis";
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

log.info("listening", { queue: COURSE_QUEUE });

void getManimRenderEnvironment().then((env) => {
  log.info("render environment probed", {
    manimVersion: env.manimVersion,
    latex: env.latex.available,
    ffmpeg: env.ffmpeg.available,
  });
  log.debug("render environment detail", { context: env.llmContext });
});

const worker = new Worker<CourseJobData>(
  COURSE_QUEUE,
  async (job) => {
    const jobLog = log.child({
      bullJobId: job.id ?? "unknown",
      jobId: job.data.jobId,
      courseId: job.data.courseId,
      resume: job.data.resume ?? false,
    });
    const start = performance.now();
    jobLog.info("processing job");
    try {
      await runCourseGeneration(job.data, jobLog.child({ scope: "pipeline" }));
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
  { connection: connection as unknown as ConnectionOptions, concurrency: 1, lockDuration: 600_000, stalledInterval: 120_000, maxStalledCount: 5 }
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
worker.on("failed", (job, err) =>
  log.error(
    "job failed",
    {
      bullJobId: job?.id,
      jobId: job?.data.jobId,
      courseId: job?.data.courseId,
      error: err.message,
    },
    err
  )
);
worker.on("stalled", (jobId) => log.warn("job stalled", { bullJobId: jobId }));
worker.on("error", (err) => log.error("worker error", {}, err));

process.on("SIGINT", async () => {
  log.info("shutting down (SIGINT)");
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  log.info("shutting down (SIGTERM)");
  await worker.close();
  process.exit(0);
});
