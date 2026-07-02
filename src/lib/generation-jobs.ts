import { prisma } from "@/lib/prisma";
import { removeQueueJob } from "@/lib/queue";

/** Delete a generation job from BullMQ and the database. */
export async function deleteGenerationJob(jobId: string) {
  await removeQueueJob(jobId);
  await prisma.generationJob.delete({ where: { id: jobId } });
}
