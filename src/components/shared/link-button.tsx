"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type LinkButtonProps = VariantProps<typeof buttonVariants> & {
  href: string;
  children: React.ReactNode;
  className?: string;
  download?: boolean | string;
  target?: string;
};

/**
 * A Next.js Link styled as a Button.
 * Use this instead of `<Button asChild>` (which is not supported by base-ui).
 */
export function LinkButton({
  href,
  children,
  variant,
  size,
  className,
  download,
  target,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant, size }), className)}
      {...(download !== undefined ? { download } : {})}
      {...(target ? { target } : {})}
    >
      {children}
    </Link>
  );
}

/**
 * An `<a>` tag styled as a Button (for external links or file downloads).
 */
export function AnchorButton({
  href,
  children,
  variant,
  size,
  className,
  download,
  target,
}: LinkButtonProps) {
  return (
    <a
      href={href}
      className={cn(buttonVariants({ variant, size }), className)}
      {...(download !== undefined ? { download } : {})}
      {...(target ? { target } : {})}
    >
      {children}
    </a>
  );
}
