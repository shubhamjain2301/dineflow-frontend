interface StatusBadgeProps {
  status: "pending" | "preparing" | "ready";
}

const statusConfig = {
  pending: {
    className:
      "bg-status-pending/20 text-status-pending border border-status-pending/30",
    label: "Pending",
  },
  preparing: {
    className:
      "bg-status-preparing/20 text-status-preparing border border-status-preparing/30",
    label: "Preparing",
  },
  ready: {
    className:
      "bg-status-ready/20 text-status-ready border border-status-ready/30",
    label: "Ready",
  },
} as const;

export function StatusBadge({ status }: StatusBadgeProps) {
  const { className, label } = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
