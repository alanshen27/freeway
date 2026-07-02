import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { adminForbidden, requireAdmin } from "@/lib/admin";
import { deleteGenerationJob } from "@/lib/generation-jobs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  if (!(await requireAdmin())) return adminForbidden();

  const { jobId } = await params;
  try {
    await deleteGenerationJob(jobId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
}
