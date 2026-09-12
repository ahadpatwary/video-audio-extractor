import * as MP4Box from "mp4box";
import { ScanResult, TopLevelBoxScanner } from "./TopLevelBoxScanner";
import { DemuxError, NoAudioTrackError } from "../errors/ExtractionError";
import { TypedEventEmitter } from "../events/Emitter";
import { Track } from "node_modules/mp4box/dist/mp4box.simple.cjs";


export interface DemuxResult {
    track: AudioTrackInfo;
    /** The demuxed, re-packaged audio-only file, ready to play or upload. */
    blob: Blob;
    /** Size of the original video file, in bytes — used to show the size reduction. */
    sourceSizeBytes: number;
}


export interface DemuxProgressEvent {
    /** 0–100 */
    percent: number;
    bytesProcessed: number;
    totalBytes: number;
}
export interface AudioTrackInfo {
    trackId: number;
    codec: string;
    sampleRate: number;
    channelCount: number;
    /** Track duration in seconds. */
    duration: number;
    /** MIME type of the packaged output, e.g. "audio/mp4". */
    mimeType: string;
}

export type DemuxEvents = {
    progress: DemuxProgressEvent;
};


const SEGMENT_SAMPLE_COUNT = Number.MAX_SAFE_INTEGER;

export class AudioTrackDemuxer extends TypedEventEmitter<DemuxEvents> {
    constructor(
        private readonly file: File,
        private readonly boxScanner: TopLevelBoxScanner, 
    ) {
        super();

        console.log("FILE", {
            name: file.name,
            type: file.type,
            size: file.size
        })
    }


    async run(signal?: AbortSignal): Promise<DemuxResult> {
        // this.#throwIfAborted(signal);
        

        // const result: ScanResult = await this.boxScanner.scan()

        // const moovFile: ScanResult['moov'] = this.#moovFileValidation(result);
       
        /**
         * TODO: true dile success, because all previous chunk store hare.
         * truely I don't know how it works, but it works. I will check the mp4box.js source code to understand how it works.
         */
        const mp4boxFile = MP4Box.createFile(false); 

        const segments: ArrayBuffer[] = [];
    
        let resolvedTrack: MP4Box.Track | null = null;
    
        let parserError: Error | null = null;
    
        let readySettled = false;

        /**
         * if onError is triggered before onReady, this will reject the promise and throw an error.
         */
        await this.#readyPromise(); 

        await this.#eventRegister(mp4boxFile, segments, resolvedTrack, parserError, readySettled);

        await this.#sliceFileAndAppendToMP4BoxFile(mp4boxFile, resolvedTrack, parserError, signal);

        
        if (parserError) {
            throw new DemuxError(
                "MP4Box reported an error while processing the file.",
                parserError,
            );
        }
    
        if (!resolvedTrack) {
            throw new NoAudioTrackError();
        }
    
        if (segments.length === 0) {
            throw new DemuxError(
                "No audio segments were produced. The file may be malformed or the audio track may be unsupported.",
            );
        }

        const track = this.#toAudioTrackInfo(resolvedTrack);
        const blob = new Blob(segments, { type: track.mimeType });

        return { 
            track,
            blob,
            sourceSizeBytes: this.file.size,
        };
    }

    async #sliceFileAndAppendToMP4BoxFile(
        mp4boxFile: MP4Box.ISOFile<unknown, unknown>,
        resolvedTrack: MP4Box.Track | null,
        parserError: Error | null,
        signal?: AbortSignal
    ): Promise<void> {
        try {

            let offset: number = 0;
            const totalBytes: number = this.file.size;

            while (offset < totalBytes) {
                // this.#throwIfAborted(signal);

                const EXTRACTION_CHUNK_SIZE: number = 8 * 1024 * 1024;
                const windowEnd = Math.min(
                    offset + EXTRACTION_CHUNK_SIZE,
                    totalBytes,
                );


                const chunk: ArrayBuffer = await this.file.slice(offset, offset + windowEnd).arrayBuffer();

                try {
                    const arg: MP4Box.MP4BoxBuffer = {
                        ...chunk,
                        fileStart: offset,
                    }

                    mp4boxFile.appendBuffer(arg);
                } catch (error) {
                    throw new DemuxError(
                        `MP4Box failed while appending bytes at offset ${offset}.`,
                        error,
                    );
                }

                if (parserError) {
                    throw new DemuxError(
                        "MP4Box reported an error during extraction.",
                        parserError,
                    );
                }

                offset = windowEnd;

                this.emit("progress", {
                    bytesProcessed: offset,
                    percent: Math.floor((offset / totalBytes) * 100),
                    totalBytes: totalBytes,
                });
            }

            if (!resolvedTrack) {
                await this.#readyPromise();
            }

            try {
                mp4boxFile.flush();
            } catch (error) {
                throw new DemuxError(
                    "MP4Box failed while flushing final samples.",
                    error,
                );
            }
        } catch (error) {
            // throw toAppError(error); //TODO: current leater
        } finally {
            try {
                mp4boxFile.stop();
            } catch (error) {
                console.warn(
                    "MP4Box stop failed",
                    error,
                );
            }
        }
    }

    async #eventRegister(
        mp4boxFile: MP4Box.ISOFile<unknown, unknown>, 
        segments: ArrayBuffer[],
        resolvedTrack: MP4Box.Track | null,
        parserError: Error | null,
        readySettled: boolean
    ): Promise<void> {

        mp4boxFile.onReady = (info: MP4Box.Movie): void => {
            // find the audio and push to the mp4boxFile
            const audioTrack = info.tracks.find(
                (track) => track.type === "audio",
            );

            if (!audioTrack) {
                const error = new NoAudioTrackError();

                readySettled = true;

                this.#rejectReady(error);

                return;
            }
            

            mp4boxFile.setExtractionOptions(audioTrack.id, null, {
                nbSamples: 200, // nbSamples is the number of samples to extract per call to mp4boxFile.start()
            });

            const initSegment = mp4boxFile.initializeSegmentation();

            const audioTrackSegment = initSegment.tracks.find(
                (track) => track.id === audioTrack.id,
            );

            if (!audioTrackSegment) {
                const error = new DemuxError(
                    `MP4Box failed to generate an initialization segment for audio track ${audioTrack.id}.`,
                );

                readySettled = true;
                this.#rejectReady(error);

                return;
            }

            segments.push(initSegment.buffer);
            resolvedTrack = audioTrack;

            mp4boxFile.start();

            readySettled = true;

            this.#resolveReady(audioTrack);

        }


        mp4boxFile.onError = (module: string, message: string): void => {
            const normalizedError = new Error(
                typeof message === "string"
                    ? message : "Unknown MP4Box parsing error"
            );
        

            parserError = normalizedError;

            if (!readySettled) {
                readySettled = true;

                this.#rejectReady(
                    normalizedError,
                );
            }

        }

        mp4boxFile.onMoovStart = () => {

            // this.emit("progress", {
            //     phase: "parsing",
            //     // processedBytes:
            //     // scanResult.moov.start,
            //     // totalBytes:
            //     // scanResult.fileSize,
            // });
        };

        mp4boxFile.onSegment = (
            id: number,
            user: unknown,
            buffer: ArrayBuffer,
            sampleNum: number
        ): void => {
            if (resolvedTrack && id !== resolvedTrack.id) return;

            segments.push(buffer);      

        }
    }

    #resolveReady!: (track: MP4Box.Track) => void;
    #rejectReady!: (error: unknown) => void;

    async #readyPromise(): Promise<void> {

        new Promise<MP4Box.Track>(
            (resolve, reject) => {
                this.#resolveReady = resolve;
                this.#rejectReady = reject;
            },
        );
    }


    #moovFileValidation(result: ScanResult): ScanResult['moov'] {
        if (!result?.moov) {
            throw new DemuxError(
                "Could not locate the moov box in the MP4/MOV file.",
            );
        }
    
        if (
            result.moov.buffer
            .byteLength === 0
        ) {
            throw new DemuxError(
                "The located moov box is empty.",
            );
        }

        return result.moov;
    }

    #toAudioTrackInfo(track: Track): AudioTrackInfo {
        return {
            trackId: track.id,
            codec: track.codec,
            sampleRate: track.audio?.sample_rate ?? 0,
            channelCount: track.audio?.channel_count ?? 0,
            duration: track.timescale > 0 ? track.duration / track.timescale : 0,
            mimeType: `audio/mp4; codecs="${track.codec}"`,
        };
    }

    // #throwIfAborted(signal?: AbortSignal): void {
    //     if (signal?.aborted) {
    //       throw new AbortedError();
    //     }
    // }
}