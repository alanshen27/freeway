import { Queue, type ConnectionOptions } from "bullmq";
import { getRedis } from "./redis";
import { features } from "./env";
import { createLogger } from "./logger";

const log = createLogger("queue");

export const COURSE_QUEUE = "course-generation";

export type CourseJobData = {
  jobId: string;
  courseId: string;
  userId: string;
  /** Keep existing curriculum and fill missing sections (retry after failure). */
  resume?: boolean;
};

const globalForQueue = globalThis as unknown as { courseQueue?: Queue };

function getCourseQueue(): Queue | null {
  const connection = getRedis();
  if (!connection) return null;
  if (!globalForQueue.courseQueue) {
    globalForQueue.courseQueue = new Queue(COURSE_QUEUE, {
      connection: connection as unknown as ConnectionOptions,
    });
  }
  return globalForQueue.courseQueue;
}

/**
 * Enqueue a course-generation job. With Redis configured this hands off to the
 * BullMQ worker (`npm run worker`). Without Redis it executes the same pipeline
 * inline, after the HTTP response, so demos need no extra processes.
 */
export async function enqueueCourseGeneration(data: CourseJobData) {
  const queue = getCourseQueue();
  if (queue && features.queue) {
    await queue.add("generate", data, {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: 100,
      jobId: data.jobId,
    });
    log.info("job enqueued", {
      jobId: data.jobId,
      courseId: data.courseId,
      resume: data.resume ?? false,
    });
    return { mode: "queue" as const };
  }

  // Inline fallback — fire and forget. Imported lazily to keep BullMQ/worker
  // code out of the request path when not needed.
  void (async () => {
    const inlineLog = log.child({
      jobId: data.jobId,
      courseId: data.courseId,
      mode: "inline",
    });
    inlineLog.info("inline generation started");
    try {
      const { runCourseGeneration } = await import("@/workers/pipeline");
      await runCourseGeneration(
        data,
        inlineLog.child({ scope: "pipeline" })
      );
      inlineLog.info("inline generation completed");
    } catch (err) {
      inlineLog.error("inline generation failed", {}, err);
    }
  })();
  return { mode: "inline" as const };
}
