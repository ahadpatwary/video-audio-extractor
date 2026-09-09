"use client";

import { useMemo } from "react";
import type { PipelineResult } from "@/core/pipeline/types";
import { formatBytes, formatCodec, formatDuration, formatReduction } from "@/lib/format";

interface ResultPanelProps {
  result: PipelineResult;
  onReset: () => void;
}

export function ResultPanel({ result, onReset }: ResultPanelProps) {
  const objectUrl = useMemo(() => URL.createObjectURL(result.blob), [result.blob]);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-sm font-medium text-ink-primary">{result.fileName}</p>
          <p className="mt-1 font-mono text-xs text-ink-secondary">
            {formatDuration(result.track.duration)} · {formatCodec(result.track.codec)} ·{" "}
            {result.track.sampleRate ? `${result.track.sampleRate / 1000}kHz · ` : ""}
            {formatBytes(result.blob.size)} · {formatReduction(result.sourceSizeBytes, result.blob.size)}
          </p>
        </div>
        <span className="rounded-full bg-success/10 px-2.5 py-1 font-mono text-xs text-success">
          sent to backend
        </span>
      </div>

      <audio controls src={objectUrl} className="mt-4 w-full" />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={objectUrl}
          download={result.fileName}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-primary transition-colors hover:border-signal hover:text-signal"
        >
          Download {result.fileName}
        </a>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg px-4 py-2 text-sm font-medium text-ink-secondary transition-colors hover:text-ink-primary"
        >
          Extract another file
        </button>
      </div>

      <p className="mt-4 font-mono text-[11px] text-ink-muted">file key: {result.fileKey}</p>
    </div>
  );
}
