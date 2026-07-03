"use client";

import { forwardRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const searchFieldClassName =
  "h-9 w-full rounded-lg border-0 bg-slate-100/80 pl-9 pr-3 text-sm text-foreground placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-ring/40";

export const SearchField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    wrapperClassName?: string;
  }
>(({ className, wrapperClassName, type = "search", ...props }, ref) => (
  <div className={cn("relative", wrapperClassName)}>
    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    <input
      ref={ref}
      type={type}
      className={cn(searchFieldClassName, className)}
      {...props}
    />
  </div>
));
SearchField.displayName = "SearchField";
