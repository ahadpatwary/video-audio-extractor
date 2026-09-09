import type { AppError } from "../errors/AppError";
import type { AudioTrackInfo, DemuxProgressEvent } from "../extraction/types";
import type { UploadProgressEvent } from "../upload/types";

export type PipelineStage =
  | "idle"
  | "reading"
  | "demuxing"
  | "packaging"
  | "uploading"
  | "done"
  | "error";

export interface PipelineResult {
  track: AudioTrackInfo;
  blob: Blob;
  fileName: string;
  sourceSizeBytes: number;
  fileKey: string;
}

export interface PipelineEvents extends Record<string, unknown> {
  stage: { stage: PipelineStage };
  "demux-progress": DemuxProgressEvent;
  "upload-progress": UploadProgressEvent;
  done: PipelineResult;
  error: { error: AppError };
  [key: string]: unknown;
}
