import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import { Page, PageTitle } from "@/components/layout/Page";
import { NotificationsList } from "@/components/NotificationsList";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/onboarding/name");

  const notifications = await getNotifications(user.id, user.notificationsSeenAt, 15);

  // Visiting the full page also counts as viewing — clears the bell dot.
  await prisma.user.update({
    where: { id: user.id },
    data: { notificationsSeenAt: new Date() },
  });

  return (
    <Page>
      <PageTitle
        eyebrow="Account"
        title="Notifications"
        description="Generation updates and replies on discussions you started"
      />
      <NotificationsList initialNotifications={notifications} />
    </Page>
  );
}
