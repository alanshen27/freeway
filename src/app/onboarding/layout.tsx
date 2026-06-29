import { CenteredMobile } from "@/components/CenteredMobile";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CenteredMobile>{children}</CenteredMobile>;
}
