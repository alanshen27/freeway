import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { hasUnreadNotifications } from "@/lib/notifications";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { AppChrome } from "@/components/AppChrome";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (!user.onboarded) redirect("/onboarding/name");

  const unread = await hasUnreadNotifications(user.id, user.notificationsSeenAt);

  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar user={{ name: user.name, email: user.email, isAdmin: user.isAdmin, avatarUrl: user.avatarUrl }} />
      <main className="relative min-h-dvh min-w-0 flex-1 bg-white">
        <TopBar
          user={{ name: user.name, avatarUrl: user.avatarUrl }}
          streak={user.streak}
          xp={user.xp}
          coins={user.coins}
          hasUnreadNotifications={unread}
        />
        <AppChrome />
        {children}
        <BottomNav />
      </main>
    </div>
  );
}
