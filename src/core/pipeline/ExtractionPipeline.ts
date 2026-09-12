import { WorkerInboundMessage } from "../worker/extraction.worker";
import { WorkerOutboundMessage } from "./types";



export type PipelineState = 
    | "idle"
    | "validating"
    | 'extracting'
    | 'extracted'
    | 'requesting-upload-url'
    | 'uploading'
    | 'done'
    | 'error'
    | 'aborted'
;


export class ExtractionPipeline {
    private readonly worker: Worker;
    private readonly maxFileSizeBytes: number; 

    constructor(maxAllowdFileSizeBytes: number) {
        this.worker = new Worker( new URL(
            "../../workers/extraction.worker.ts", 
            import.meta.url
        ));


        this.maxFileSizeBytes = maxAllowdFileSizeBytes;
    }

    async run(file: File): Promise<void> {

        if(typeof Worker === 'undefined') {
            //TODO:
            throw new Error('Browser do not support web worker');
        }

        if(file.size > this.maxFileSizeBytes) {
            //TODO:
            throw new Error('File size is too long');
        }

        await this.#runWorker(file);

    }

    abort(): void {
        this.worker.postMessage({ kind: "abort" } satisfies WorkerInboundMessage);
        // this.uploadAbortController?.abort();
        // this.setState({ ...this.state, stage: "aborted" });
    }

    destroy(): void {
        this.worker?.terminate();
        // this.worker = null;
    }


    async #runWorker(file: File): Promise<void> {
        return new Promise((resolve, reject) => {

            this.worker.onerror = (ev) => {
                // reject(this.fail(new WorkerCrashedError(ev.message)));
                reject(ev)
            };
            this.worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>): any => {
                const msg = event.data;

                switch(msg.kind) {
                    case 'progress':
                        //TODO: state upadate
                        break;
                    case 'done':
                        //TODO: state uplate
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
}

