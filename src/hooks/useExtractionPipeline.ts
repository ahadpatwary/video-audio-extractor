'use client'

import { AppError } from "@/core/errors/AppError";
import { ExtractionPipeline } from "@/core/pipeline/ExtractionPipeline";
import { PipelineResult, PipelineState } from "@/core/pipeline/types"
import { useCallback, useMemo, useRef, useState } from "react"

export interface ExtractionState {
  stage: PipelineState;
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

export function useExtractionPipeline {
    const [state, setState] = useState<ExtractionState>(INITIAL_STATE);
    const pipelineRef = useRef<ExtractionPipeline | null>(null);

    const getPipeline = useCallback((): ExtractionPipeline => {
        if(pipelineRef.current) return pipelineRef.current;

        const pipeline = new ExtractionPipeline(1000); //TODO: we have to change 1000 leater
        return pipelineRef.current = pipeline;
    }, [])

    const start = useCallback((file: File) => {
        // setState({ ...INITIAL_STATE, stage: "reading" });
        getPipeline()
            .run(file)
            .catch(() => {
                // Errors already land in state via the "error" event above;
                // this catch only exists so a rejected promise never surfaces
                // as an unhandled rejection.
            });
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