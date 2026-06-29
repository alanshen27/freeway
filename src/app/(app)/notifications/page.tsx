import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { timeAgo } from "@/lib/utils";
import { Sparkles, CheckCircle2, MessagesSquare } from "lucide-react";
import { Page, PageTitle, ListPanel, ListRow } from "@/components/layout/Page";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding/name");
  const jobs = await prisma.generationJob.findMany({
    where: { userId: user.id },
    include: { course: true },
    orderBy: { updatedAt: "desc" },
    take: 15,
  });

  return (
    <Page>
      <PageTitle title="Notifications" description="Generation updates and activity" />
      <ListPanel className="mt-6">
        {jobs.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications yet.
          </p>
        ) : (
          jobs.map((j) => (
            <ListRow key={j.id}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                {j.status === "COMPLETED" ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Sparkles className="size-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {j.status === "COMPLETED"
                    ? `"${j.course?.title}" is ready`
                    : j.status === "FAILED"
                      ? `Generation failed for "${j.course?.title}"`
                      : `Building "${j.course?.title}"…`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeAgo(j.updatedAt)}
                </p>
              </div>
            </ListRow>
          ))
        )}
      </ListPanel>
      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <MessagesSquare className="size-4" />
        Forum replies will appear here in a future update.
      </p>
    </Page>
  );
}
