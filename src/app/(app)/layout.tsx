import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");
  if (!user.onboarded) redirect("/onboarding/name");

  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar user={{ name: user.name, email: user.email }} />
      <main className="relative min-h-dvh min-w-0 flex-1 bg-white">
        {children}
        <BottomNav />
      </main>
    </div>
  );
}
