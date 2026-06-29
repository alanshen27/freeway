import "dotenv/config";
import { Worker, type ConnectionOptions } from "bullmq";
import { getRedis } from "@/lib/redis";
import { COURSE_QUEUE, type CourseJobData } from "@/lib/queue";
import { runCourseGeneration } from "./pipeline";

const connection = getRedis();

if (!connection) {
  console.log(
    "[worker] REDIS_URL not set — nothing to do. The app runs the pipeline " +
      "inline without a worker. Set REDIS_URL to enable background queues."
  );
  process.exit(0);
}

console.log(`[worker] listening on queue "${COURSE_QUEUE}"…`);

const worker = new Worker<CourseJobData>(
  COURSE_QUEUE,
  async (job) => {
    console.log(`[worker] processing job ${job.id} (course ${job.data.courseId})`);
    await runCourseGeneration(job.data);
  },
  { connection: connection as unknown as ConnectionOptions, concurrency: 1 }
);

worker.on("completed", (job) => console.log(`[worker] completed ${job.id}`));
worker.on("failed", (job, err) =>
  console.error(`[worker] failed ${job?.id}:`, err.message)
);

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
