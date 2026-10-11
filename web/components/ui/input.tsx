import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-sm border border-input bg-ink/60 px-3 py-1 text-[0.95rem] text-ivory shadow-xs transition-[color,box-shadow,border-color] outline-none placeholder:text-mist/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-ruby aria-invalid:ring-ruby/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
