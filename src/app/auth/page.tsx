import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { features } from "@/lib/env";
import { getCurrentUser } from "@/lib/session";
import { CenteredMobile } from "@/components/CenteredMobile";
import { AuthForm } from "./AuthForm";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  // Dev convenience: no Supabase → cookie demo onboarding.
  if (features.demoSession) redirect("/onboarding/name");

  // Production without creds → explicit configuration error (no silent demo).
  if (features.authMisconfigured) {
    return (
      <CenteredMobile>
        <AuthNotConfigured />
      </CenteredMobile>
    );
  }

  const user = await getCurrentUser();
  if (user) redirect(user.onboarded ? "/courses" : "/onboarding/name");

  return (
    <CenteredMobile>
      <AuthForm />
    </CenteredMobile>
  );
}

function AuthNotConfigured() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-8 text-center lg:min-h-[640px]">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-blush-soft text-blush">
        <ShieldAlert className="size-7" />
      </div>
      <h1 className="font-display text-xl font-bold">Authentication isn&apos;t configured</h1>
      <p className="text-sm text-muted-foreground">
        This deployment is missing its Supabase credentials. Set{" "}
        <code className="rounded bg-secondary px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
        and{" "}
        <code className="rounded bg-secondary px-1 py-0.5 text-xs">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>{" "}
        in your environment, then redeploy.
      </p>
    </div>
  );
}
