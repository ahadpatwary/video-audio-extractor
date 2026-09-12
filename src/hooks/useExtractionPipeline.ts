'use client'

import { AppError } from "@/core/errors/AppError";
import { ExtractionPipeline, PipelineState } from "@/core/pipeline/ExtractionPipeline";
import { PipelineResult, PipelineStage } from "@/core/pipeline/types"
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";
import { useCallback, useMemo, useRef, useState } from "react"

export interface ExtractionState {
  stage: PipelineStage;
  extructProgress: ProgressEvent | null;
//   uploadProgress: UploadProgressEvent | null;
  result: PipelineResult | null;
  error: AppError | null;
}

const INITIAL_STATE: ExtractionState = {
  stage: "idle",
  extructProgress: null,
//   uploadProgress: null,
  result: null,
  error: null,
};

export function useExtractionPipeline() {
    const [state, setState] = useState<ExtractionState>(INITIAL_STATE);
    const pipelineRef = useRef<ExtractionPipeline | null>(null);

    const getPipeline = useCallback((): ExtractionPipeline => {
        if(pipelineRef.current) return pipelineRef.current;

        const pipeline = new ExtractionPipeline(MAX_FILE_SIZE_BYTES); //TODO: we have to change 1000 leater
        
        pipeline.on('state', (data: PipelineState) => {
          // setState((prev) => ({
          //   prev.stage = data.stage,
          //   prev.extructProgress = data.persent,
          //   prev.result = data.blob,
          //   prev.error = data.error,  
          // }))

          if (data.stage === "done") {
              setState((prev) => ({
                  ...prev,
                  stage: data.stage,
                  result: {
                      blob: data.blob!,
                      fileKey: "fileKey",
                      fileName: "voice",
                      sourceSizeBytes: 1000,
                  },
              }));
          }

          console.log("final data", data);
        })
        return pipelineRef.current = pipeline;
    }, [])

    const start = useCallback(async(file: File) => {
        // setState({ ...INITIAL_STATE, stage: "reading" });
        console.log("file", file);
        const pipeline = getPipeline();
        console.log("pipeline", pipeline);
        
        await pipeline.run(file);
            // .catch(() => {
            //     // Errors already land in state via the "error" event above;
            //     // this catch only exists so a rejected promise never surfaces
            //     // as an unhandled rejection.
            // });
        },
        [getPipeline],
    )

    const reset = useCallback(() => {
        pipelineRef.current?.destroy();
        pipelineRef.current = null;
        setState(INITIAL_STATE);
    }, []);

    return useMemo(() => ({ ...state, start, reset }), [state, start, reset]);

}