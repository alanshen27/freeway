"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/auth");
    router.refresh();
  }
  return (
    <Button variant="duoOutline" className="w-full" onClick={logout}>
      <LogOut className="size-5" /> Log out
    </Button>
  );
}
