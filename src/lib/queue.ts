import { Queue, type ConnectionOptions } from "bullmq";
import { getRedis } from "./redis";
import { features } from "./env";

export const COURSE_QUEUE = "course-generation";

export type CourseJobData = {
  jobId: string;
  courseId: string;
  userId: string;
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
    return { mode: "queue" as const };
  }

  // Inline fallback — fire and forget. Imported lazily to keep BullMQ/worker
  // code out of the request path when not needed.
  void (async () => {
    try {
      const { runCourseGeneration } = await import("@/workers/pipeline");
      await runCourseGeneration(data);
    } catch (err) {
      console.error("[queue] inline generation failed", err);
    }
  })();
  return { mode: "inline" as const };
}
