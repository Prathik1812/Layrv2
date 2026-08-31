import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-xs font-bold uppercase tracking-[0.14em] transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#FF4B23] text-[#0A0A0B] hover:bg-[#FF5D38] shadow-[0_0_15px_rgba(255,75,35,0.35)]",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-white/12 bg-[#111214] text-[#F4F3EF] hover:border-white/30 hover:bg-[#17181A]",
        secondary: "bg-[#17181A] text-[#F4F3EF] border border-white/8 hover:border-white/20",
        ghost: "text-[#A5A7AA] hover:text-[#F4F3EF] hover:bg-white/5",
        link: "text-[#FF4B23] underline-offset-4 hover:underline lowercase tracking-normal",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 px-3 text-[11px] has-[>svg]:px-2.5",
        lg: "h-11 px-6 text-xs font-extrabold has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
