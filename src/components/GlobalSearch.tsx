"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SearchField } from "@/components/SearchField";
import { COURSE_CARD_STATUS_BADGE } from "@/lib/course-labels";
import {
  searchResultRowBg,
  searchResultIconStyle,
  searchResultIsComplete,
} from "@/lib/search-result-style";
import { popupSearchPanelMotion } from "@/lib/popup-motion";
import type { SearchResultGroup } from "@/lib/global-search";

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const flatItems = groups.flatMap((g) => g.items);

  const fetchResults = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setGroups([]);
        return;
      }
      const data = (await res.json()) as { groups: SearchResultGroup[] };
      setGroups(data.groups ?? []);
      setActiveIndex(-1);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void fetchResults(q), 200);
    return () => clearTimeout(timer);
  }, [q, open, fetchResults]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && flatItems[activeIndex]) {
      navigate(flatItems[activeIndex].href);
      return;
    }
    if (flatItems[0]) {
      navigate(flatItems[0].href);
      return;
    }
    router.push(q.trim() ? `/courses?q=${encodeURIComponent(q.trim())}` : "/courses");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!flatItems.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flatItems.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      navigate(flatItems[activeIndex].href);
    }
  }

  const showPanel = open && q.trim().length >= 2;
  let itemOffset = 0;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <form onSubmit={onSubmit} role="search">
        <SearchField
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search courses, lessons, assignments…"
          aria-label="Search"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </form>

      {showPanel && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-2 w-[min(100vw-3rem,28rem)] overflow-hidden rounded-xl border border-border bg-white shadow-lg ring-1 ring-black/5",
            popupSearchPanelMotion
          )}
          role="presentation"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching…
            </div>
          ) : groups.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results for &ldquo;{q.trim()}&rdquo;
            </p>
          ) : (
            <ul
              id={listboxId}
              role="listbox"
              className="max-h-[min(24rem,70vh)] overflow-y-auto py-2"
            >
              {groups.map((group) => (
                <li key={group.label} role="presentation">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  <ul role="presentation" className="space-y-1.5">
                    {group.items.map((item) => {
                      const index = itemOffset++;
                      const { Icon, bg, color } = searchResultIconStyle(item);
                      const active = index === activeIndex;
                      return (
                        <li key={`${item.type}-${item.id}`} role="option" aria-selected={active}>
                          <Link
                            href={item.href}
                            onClick={() => {
                              setOpen(false);
                              setQ("");
                            }}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={cn(
                              "mx-2 flex items-start gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-all",
                              searchResultRowBg(item),
                              active
                                ? "border-primary/30 shadow-sm ring-1 ring-primary/15"
                                : "hover:border-brand-100 hover:shadow-sm"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                                bg
                              )}
                            >
                              <Icon className={cn("size-3.5", color)} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium text-foreground">
                                  {item.title}
                                </span>
                                {item.type === "course" && item.courseStatus && (
                                  <Badge
                                    variant={
                                      COURSE_CARD_STATUS_BADGE[item.courseStatus].variant
                                    }
                                    className="shrink-0 text-[10px]"
                                  >
                                    {COURSE_CARD_STATUS_BADGE[item.courseStatus].label}
                                  </Badge>
                                )}
                                {searchResultIsComplete(item) && (
                                  <CheckCircle2 className="size-3.5 shrink-0 text-mint" />
                                )}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {item.subtitle}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
