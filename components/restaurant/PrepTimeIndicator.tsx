import { Clock } from "lucide-react";

interface PrepTimeIndicatorProps {
  prepTime: number; // minutes
}

export default function PrepTimeIndicator({ prepTime }: PrepTimeIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5 text-white/40 text-sm">
      <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span>~{prepTime} min prep time</span>
    </div>
  );
}
