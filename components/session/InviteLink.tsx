"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface InviteLinkProps {
  inviteLink: string;
}

export function InviteLink({ inviteLink }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied!");
      setCopied(true);
      // Reset the checkmark after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link. Please copy it manually.");
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-base-border bg-base-surface/60 px-3 py-2">
      {/* Truncated URL display */}
      <span
        className="flex-1 truncate text-sm text-white/60 font-mono select-all"
        title={inviteLink}
      >
        {inviteLink}
      </span>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        aria-label="Copy invite link"
        className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
