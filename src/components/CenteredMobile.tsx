/** Full-screen on mobile; a centered card on desktop. Used for auth/onboarding. */
export function CenteredMobile({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center lg:items-center lg:p-6">
      <div className="relative w-full max-w-md bg-background lg:rounded-xl lg:border lg:border-border lg:shadow-card">
        {children}
      </div>
    </div>
  );
}
