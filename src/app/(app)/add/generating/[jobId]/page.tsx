import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Legacy route — generation progress now lives on the course page. */
export default async function GeneratingPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const job = await prisma.generationJob.findUnique({
    where: { id: jobId },
    select: { courseId: true },
  });
  redirect(job?.courseId ? `/courses/${job.courseId}` : "/courses");
}
