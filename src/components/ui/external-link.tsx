"use client";

import { ExternalLink as ExternalLinkIcon } from "lucide-react";

export function StopPropExternalLink({
  href,
  className,
  size = 14,
  ariaLabel,
}: {
  href: string;
  className?: string;
  size?: number;
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={className ?? "text-muted-foreground hover:text-primary"}
      aria-label={ariaLabel ?? "open external"}
    >
      <ExternalLinkIcon style={{ width: size, height: size }} />
    </a>
  );
}
