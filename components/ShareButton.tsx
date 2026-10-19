"use client";
import { useState } from "react";

export default function ShareButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-md border border-border px-3 py-1 text-sm hover:bg-subtle"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href.split("#")[0]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this link:", window.location.href);
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copied" : "Share"}</span>
    </button>
  );
}
