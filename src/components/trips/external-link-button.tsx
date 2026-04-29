"use client";

import { ExternalLink } from "lucide-react";

type ExternalLinkButtonProps = {
  href: string | null;
  label: string;
};

export function ExternalLinkButton({ href, label }: ExternalLinkButtonProps) {
  if (!href) return null;

  return (
    <button
      type="button"
      className="text-muted-foreground transition-colors hover:text-foreground"
      aria-label={`Open link for ${label}`}
      title="Open link"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
    >
      <ExternalLink className="size-4" />
    </button>
  );
}
