"use client";

import React from "react";
import { StageConfig, StageStatus } from "@/lib/types";

interface StageTimelineProps {
  stages: StageConfig[];
  currentStageIndex: number;
  stageStatuses: StageStatus[];
  onSelectStage?: (index: number) => void;
}

export function StageTimeline({
  stages,
  currentStageIndex,
  stageStatuses,
  onSelectStage,
}: StageTimelineProps) {
  return (
    <div className="w-full max-w-xl px-4">
      {/* Segmented Timeline Bar */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {stages.map((stage, idx) => {
          const status = stageStatuses[idx] || "locked";
          const isActive = idx === currentStageIndex;
          const isUnlocked = idx <= currentStageIndex;

          let bgClasses = "bg-surface/60 border-line/50 text-ink-3";
          let badgeText = `${stage.duration}s`;

          if (status === "solved") {
            bgClasses = "bg-emerald/20 border-emerald/60 text-emerald shadow-[0_0_15px_-3px_oklch(0.696_0.17_162.48/0.5)]";
          } else if (status === "failed") {
            bgClasses = "bg-rose/20 border-rose/60 text-rose";
          } else if (status === "skipped") {
            bgClasses = "bg-amber/15 border-amber/40 text-amber";
          } else if (isActive) {
            bgClasses = "bg-indigo-deep/30 border-indigo text-indigo shadow-[0_0_20px_-3px_oklch(0.585_0.204_277.1/0.6)] animate-pulse";
          } else if (isUnlocked) {
            bgClasses = "bg-surface border-line text-ink-2 hover:border-indigo/50";
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={!isUnlocked}
              onClick={() => onSelectStage?.(idx)}
              className={`group relative flex flex-col items-center justify-center rounded-xl border py-2.5 transition-all sm:py-3 ${bgClasses} ${
                isUnlocked ? "cursor-pointer active:scale-95" : "cursor-not-allowed opacity-40"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 sm:text-xs">
                Pista {idx + 1}
              </span>
              <span className="mt-0.5 font-mono text-xs font-extrabold sm:text-sm">
                {badgeText}
              </span>

              {/* Status icon/dot */}
              <div className="mt-1.5 flex h-2 w-2 items-center justify-center">
                {status === "solved" && (
                  <span className="block h-1.5 w-1.5 rounded-full bg-emerald" />
                )}
                {status === "failed" && (
                  <span className="block h-1.5 w-1.5 rounded-full bg-rose" />
                )}
                {status === "skipped" && (
                  <span className="block h-1.5 w-1.5 rounded-full bg-amber" />
                )}
                {isActive && status === "active" && (
                  <span className="block h-1.5 w-1.5 animate-ping rounded-full bg-indigo" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
