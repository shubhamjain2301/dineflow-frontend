"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

interface EtaControlProps {
  onSetEta: (minutes: number) => void;
  currentEta: number | null;
}

/**
 * EtaControl — lets a participant set the group's arrival ETA.
 *
 * Accepts a number input (1–120 minutes) and a submit button.
 * Displays the current ETA if one has already been set.
 *
 * Requirements: 4.1, 4.2
 */
export function EtaControl({ onSetEta, currentEta }: EtaControlProps) {
  const [inputValue, setInputValue] = useState<string>(
    currentEta !== null ? String(currentEta) : ""
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const minutes = parseInt(inputValue, 10);
    if (!isNaN(minutes) && minutes >= 1 && minutes <= 120) {
      onSetEta(minutes);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
  }

  const parsedValue = parseInt(inputValue, 10);
  const isValid =
    !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= 120;

  return (
    <div className="rounded-2xl border border-base-border bg-base-surface/60 p-4 backdrop-blur-md shadow-lg shadow-black/30">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-accent-blue" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-white">Set Arrival ETA</h3>
      </div>

      {/* Current ETA display */}
      {currentEta !== null && (
        <p className="mb-3 text-sm text-white/60">
          Current ETA:{" "}
          <span className="font-semibold text-accent-cyan">
            {currentEta} min
          </span>
        </p>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2">
          <input
            id="eta-minutes"
            type="number"
            min={1}
            max={120}
            value={inputValue}
            onChange={handleChange}
            placeholder="e.g. 20"
            aria-label="Arrival ETA in minutes"
            className="w-full rounded-xl border border-base-border bg-base-surface px-3 py-2 text-sm text-white placeholder-white/30 focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue"
          />
          <span className="shrink-0 text-xs text-white/40">min</span>
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className="shrink-0 rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-base-DEFAULT disabled:cursor-not-allowed disabled:opacity-40"
        >
          Set ETA
        </button>
      </form>

      {/* Validation hint */}
      {inputValue !== "" && !isValid && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          Please enter a value between 1 and 120 minutes.
        </p>
      )}
    </div>
  );
}
