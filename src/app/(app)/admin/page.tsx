import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { Page, PageTitle } from "@/components/layout/Page";
import { AdminJobsPanel } from "@/components/admin/AdminJobsPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/courses");

  return (
    <Page wide>
      <PageTitle
        eyebrow="Admin"
        title="Generation jobs"
        description="Inspect and delete course generation jobs (database + BullMQ queue)"
      />
      <div className="mt-6">
        <AdminJobsPanel />
      </div>
    </Page>
  );
}
