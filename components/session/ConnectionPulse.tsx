interface ConnectionPulseProps {
  status: "connecting" | "connected" | "disconnected";
}

const statusConfig = {
  connected: {
    dotClass: "bg-green-500 animate-pulse",
    label: "Live",
    textClass: "text-green-400",
  },
  connecting: {
    dotClass: "bg-amber-500 animate-pulse",
    label: "Connecting...",
    textClass: "text-amber-400",
  },
  disconnected: {
    dotClass: "bg-red-500",
    label: "Disconnected",
    textClass: "text-red-400",
  },
} as const;

export function ConnectionPulse({ status }: ConnectionPulseProps) {
  const { dotClass, label, textClass } = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
        aria-hidden="true"
      />
      <span className={`text-xs font-medium ${textClass}`}>{label}</span>
    </div>
  );
}
