import { AppError } from "../errors/AppError";
import { TypedEventEmitter } from "../events/Emitter";
import { WorkerInboundMessage } from "../worker/extraction.worker";
import { PipelineStage, WorkerOutboundMessage } from "./types";





export interface PipelineState {
  stage: PipelineStage;
  processedBytes: number;
  totalBytes: number;
  persent: number;
  blob?: Blob;
  track?: number;
  error?: AppError;
  objectKey?: string;
}


export type PipelineEvents = {
    state: PipelineState;
}

export class ExtractionPipeline extends TypedEventEmitter<PipelineEvents>  {
    private worker: Worker | null = null;
    private readonly maxFileSizeBytes: number; 
    private state: PipelineState = { 
        stage: "idle", 
        processedBytes: 0, 
        totalBytes: 0,
        persent: 0, 
    };

    constructor(maxAllowdFileSizeBytes: number) {
        super();

        this.maxFileSizeBytes = maxAllowdFileSizeBytes;
    }

    async run(file: File): Promise<void> {

        // if(typeof Worker === 'undefined') {
        //     //TODO:
        //     throw new Error('Browser do not support web worker');
        // }

        // if(file.size > this.maxFileSizeBytes) {
        //     //TODO:
        //     throw new Error('File size is too long');
        // }

        console.log("sendTime", file)

        await this.#runWorker(file);

    }

    abort(): void {
        this.worker?.postMessage({ kind: "abort" } satisfies WorkerInboundMessage);
        // this.uploadAbortController?.abort();
        // this.setState({ ...this.state, stage: "aborted" });
    }

    destroy(): void {
        this.worker?.terminate();
        // this.worker = null;
    }


    async #runWorker(file: File): Promise<void> {
        return new Promise((resolve, reject) => {

            const worker = new Worker(new URL("../worker/extraction.worker.ts", import.meta.url));
            this.worker = worker;

            this.worker.onerror = (ev) => {
                // reject(this.fail(new WorkerCrashedError(ev.message)));
                reject(ev)
            };
            this.worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>): any => {
                const msg = event.data;

                switch(msg.kind) {
                    case 'progress':
                        //TODO: state upadate
                        this.#setState({
                            persent: msg.percent,
                            stage: msg.kind === 'progress' ? 'extracting' : 'extracting',
                            processedBytes: msg.bytesProcessed,
                            totalBytes: msg.totalBytes,
                        })
                        break;
                    case 'done':
                        //TODO: state uplate
                        console.log("pipeline blob emmit", msg.blob);
                        this.#setState({
                            persent: 100,
                            stage: 'done',
                            processedBytes: msg.sourceSizeBytes,
                            totalBytes: msg.sourceSizeBytes,
                            blob: msg.blob,
                        })
                        resolve()
                        break;
                    case 'error':
                        //TODO: we have to update state
                        reject()
                        break;

                }
            }

            this.worker.postMessage({ 
                kind: "start",
                file,
                maxFileSizeBytes: this.maxFileSizeBytes 
            } satisfies WorkerInboundMessage)
        })
  
    }

    #setState(partial: PipelineState) {
        this.state = partial;
        this.emit("state", this.state);
    }
}

