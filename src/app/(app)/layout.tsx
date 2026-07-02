import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
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

  const activeJobs = await prisma.generationJob.count({
    where: { userId: user.id, status: { in: ["QUEUED", "RUNNING"] } },
  });

  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar user={{ name: user.name, email: user.email }} />
      <main className="relative min-h-dvh min-w-0 flex-1 bg-white">
        <TopBar
          user={{ name: user.name }}
          streak={user.streak}
          xp={user.xp}
          coins={user.coins}
          hasActivity={activeJobs > 0}
        />
        <AppChrome />
        {children}
        <BottomNav />
      </main>
    </div>
  );
}
