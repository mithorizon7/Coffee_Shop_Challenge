import React from "react";

const BOLD_PATTERN = /\*\*(.+?)\*\*/g;

type RichTextOptions = {
  strongClassName?: string;
};

export function renderRichText(text: string, options?: RichTextOptions): React.ReactNode {
  if (!text) return text;

  const matches = Array.from(text.matchAll(BOLD_PATTERN));
  if (matches.length === 0) return text;

  const strongClassName =
    options?.strongClassName ??
    "font-semibold text-foreground bg-amber-200/40 dark:bg-amber-500/10 ring-1 ring-amber-200/60 dark:ring-amber-500/20 rounded px-1";
  const parts: React.ReactNode[] = [];

  const pushText = (value: string, keyPrefix: string) => {
    if (!value) return;
    const lines = value.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) {
        parts.push(<br key={`${keyPrefix}-br-${index}`} />);
      }
      if (line) {
        parts.push(line);
      }
    });
  };

  let lastIndex = 0;
  matches.forEach((match, index) => {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      pushText(text.slice(lastIndex, matchIndex), `text-${index}`);
    }
    parts.push(
      <strong key={`strong-${index}`} className={strongClassName}>
        {match[1]}
      </strong>
    );
    lastIndex = matchIndex + match[0].length;
  });

  if (lastIndex < text.length) {
    pushText(text.slice(lastIndex), "tail");
  }

  return parts;
}
