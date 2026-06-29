"use client";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-white px-4 py-3">
      <button
        onClick={() => router.back()}
        aria-label="Back"
        className="flex size-8 items-center justify-center rounded-md hover:bg-secondary"
      >
        <ChevronLeft className="size-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
        {title}
      </h1>
      {action}
    </header>
  );
}
