"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NamePage() {
  const router = useRouter();
  const [name, setName] = useState("");

  function next() {
    if (!name.trim()) return;
    sessionStorage.setItem("bc_name", name.trim());
    router.push("/onboarding/interests");
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-10 pt-16 lg:min-h-[640px]">
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          What&apos;s your name?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll personalize your learning path.
        </p>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && next()}
          placeholder="Type your name"
          className="mt-8 border-0 border-b-2 rounded-none px-0 text-2xl focus:border-primary"
        />
      </div>
      <div className="flex flex-col items-center gap-6">
        <Button variant="duo" className="w-full" disabled={!name.trim()} onClick={next}>
          Continue
        </Button>
        <span className="font-display text-sm font-extrabold tracking-tight text-muted-foreground">
          Freeway
        </span>
      </div>
    </div>
  );
}
