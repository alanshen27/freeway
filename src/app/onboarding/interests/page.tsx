"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/SearchField";
import { INTERESTS } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export default function InterestsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("bc_name")) router.replace("/onboarding/name");
  }, [router]);

  const filtered = useMemo(
    () =>
      INTERESTS.filter((i) =>
        i.label.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  function toggle(slug: string) {
    setSelected((s) =>
      s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]
    );
  }

  async function finish() {
    setSubmitting(true);
    const name = sessionStorage.getItem("bc_name") ?? "Learner";
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, interests: selected }),
    });
    if (res.ok) {
      sessionStorage.removeItem("bc_name");
      router.push("/add?first=1");
    } else {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-10 pt-14 lg:min-h-[640px] lg:max-h-[85vh]">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        What are your interests?
      </h1>
      <SearchField
        wrapperClassName="mt-6"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
      />

      <div className="mt-5 flex-1 space-y-2">
        {filtered.map((i) => {
          const on = selected.includes(i.slug);
          return (
            <button
              key={i.slug}
              type="button"
              onClick={() => toggle(i.slug)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                on
                  ? "border-primary bg-brand-50 text-brand-700"
                  : "border-border bg-white hover:bg-secondary/50"
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded border",
                  on ? "border-primary bg-primary text-white" : "border-border"
                )}
              >
                {on && <Check className="size-3" strokeWidth={3} />}
              </span>
              {i.label}
            </button>
          );
        })}
      </div>

      <Button
        variant="duo"
        className="mt-6 w-full"
        disabled={selected.length === 0 || submitting}
        onClick={finish}
      >
        {submitting ? "Setting up…" : "Continue"}
      </Button>
    </div>
  );
}
