"use client";

import { diffWords } from "diff";

type LetterDiffProps = {
  previous: string;
  current: string;
};

export function LetterDiff({ previous, current }: LetterDiffProps) {
  const parts = diffWords(previous, current);

  return (
    <pre className="whitespace-pre-wrap rounded-2xl border border-primary/20 bg-white p-6 text-sm leading-relaxed text-accent/80 shadow-inner">
      {parts.map((part, index) => {
        if (part.added) {
          return (
            <span key={index} className="bg-success/10 text-success">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              key={index}
              className="bg-danger/10 text-danger line-through"
            >
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </pre>
  );
}

