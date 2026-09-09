"use client";

import { PIPELINE_STEP_ORDER } from "@/lib/constants";
import { formatBytes, formatCodec } from "@/lib/format";
import type { PipelineStage } from "@/core/pipeline/types";
import type { DemuxProgressEvent } from "@/core/extraction/types";
import type { UploadProgressEvent } from "@/core/upload/types";

interface PipelineStepsProps {
  stage: PipelineStage;
  demuxProgress: DemuxProgressEvent | null;
  uploadProgress: UploadProgressEvent | null;
  audioCodec?: string;
}

const STEP_LABEL: Record<(typeof PIPELINE_STEP_ORDER)[number], string> = {
  reading: "Reading source file",
  demuxing: "Demuxing audio track",
  packaging: "Packaging audio-only file",
  uploading: "Uploading",
};

function stepStatus(
  step: (typeof PIPELINE_STEP_ORDER)[number],
  currentStage: PipelineStage,
): "pending" | "active" | "done" {
  const order = PIPELINE_STEP_ORDER;
  if (currentStage === "idle") return "pending";
  if (currentStage === "error") return order.indexOf(step) < order.length ? "pending" : "pending";
  if (currentStage === "done") return "done";

  const currentIndex = order.indexOf(currentStage as (typeof order)[number]);
  const stepIndex = order.indexOf(step);
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "active";
  return "pending";
}

function stepDetail(
  step: (typeof PIPELINE_STEP_ORDER)[number],
  status: "pending" | "active" | "done",
  demuxProgress: DemuxProgressEvent | null,
  uploadProgress: UploadProgressEvent | null,
  audioCodec: string | undefined,
): string | null {
  if (status === "pending") return null;

  if (step === "reading" || step === "demuxing") {
    if (!demuxProgress) return null;
    return `${formatBytes(demuxProgress.bytesProcessed)} / ${formatBytes(demuxProgress.totalBytes)}`;
  }
  if (step === "packaging") {
    return audioCodec ? `audio track (${formatCodec(audioCodec)})` : null;
  }
  if (step === "uploading") {
    if (!uploadProgress) return status === "active" ? "starting…" : null;
    return `${uploadProgress.percent}%`;
  }
  return null;
}

export function PipelineSteps({ stage, demuxProgress, uploadProgress, audioCodec }: PipelineStepsProps) {
  if (stage === "idle") return null;

  return (
    <ol className="flex flex-col gap-2.5">
      {PIPELINE_STEP_ORDER.map((step, index) => {
        const status = stepStatus(step, stage);
        const detail = stepDetail(step, status, demuxProgress, uploadProgress, audioCodec);

        return (
          <li
            key={step}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
              status === "active"
                ? "border-signal/50 bg-signal/5"
                : status === "done"
                  ? "border-border bg-surface"
                  : "border-border/40 bg-transparent opacity-40"
            }`}
          >
            <span className="font-mono text-xs text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
            <span className="flex-1 text-sm text-ink-primary">{STEP_LABEL[step]}</span>
            {detail && <span className="font-mono text-xs text-ink-secondary">{detail}</span>}
            {status === "done" && (
              <span className="text-success" aria-label="complete">
                ✓
              </span>
            )}
            {status === "active" && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
