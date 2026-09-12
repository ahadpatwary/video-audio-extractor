// import * as MP4Box from "mp4box";
// import { ScanResult, TopLevelBoxScanner } from "./TopLevelBoxScanner";
// import { DemuxError, NoAudioTrackError } from "../errors/ExtractionError";
// import { TypedEventEmitter } from "../events/Emitter";
// import { Track } from "node_modules/mp4box/dist/mp4box.simple.cjs";


// export interface DemuxResult {
//     track: AudioTrackInfo;
//     /** The demuxed, re-packaged audio-only file, ready to play or upload. */
//     blob: Blob;
//     /** Size of the original video file, in bytes — used to show the size reduction. */
//     sourceSizeBytes: number;
// }


// export interface DemuxProgressEvent {
//     /** 0–100 */
//     percent: number;
//     bytesProcessed: number;
//     totalBytes: number;
// }
// export interface AudioTrackInfo {
//     trackId: number;
//     codec: string;
//     sampleRate: number;
//     channelCount: number;
//     /** Track duration in seconds. */
//     duration: number;
//     /** MIME type of the packaged output, e.g. "audio/mp4". */
//     mimeType: string;
// }

// export type DemuxEvents = {
//     progress: DemuxProgressEvent;
// };


// const SEGMENT_SAMPLE_COUNT = Number.MAX_SAFE_INTEGER;

// export class AudioTrackDemuxer extends TypedEventEmitter<DemuxEvents> {
//     private resolvedTrack: MP4Box.Track | null = null;
//     constructor(
//         private readonly file: File,
//         private readonly boxScanner: TopLevelBoxScanner, 
//     ) {
//         super();

//         console.log("FILE", {
//             name: file.name,
//             type: file.type,
//             size: file.size
//         })
//     }


//     async run(signal?: AbortSignal): Promise<DemuxResult> {
//         // this.#throwIfAborted(signal);
        

//         // const result: ScanResult = await this.boxScanner.scan()

//         // const moovFile: ScanResult['moov'] = this.#moovFileValidation(result);
       
//         /**
//          * TODO: true dile success, because all previous chunk store hare.
//          * truely I don't know how it works, but it works. I will check the mp4box.js source code to understand how it works.
//          */

//         console.log("step1");
//         const mp4boxFile = MP4Box.createFile(false); 

//         const segments: ArrayBuffer[] = [];
    

    
//         let parserError: Error | null = null;
    
//         let readySettled = false;

//         /**
//          * if onError is triggered before onReady, this will reject the promise and throw an error.
//          */
//         await this.#readyPromise(); 

//         await this.#eventRegister(mp4boxFile, segments, parserError, readySettled);
//         console.log("step2");

//         await this.#sliceFileAndAppendToMP4BoxFile(mp4boxFile, parserError, signal);
//         console.log("step3");

        
//         if (parserError) {
//             throw new DemuxError(
//                 "MP4Box reported an error while processing the file.",
//                 parserError,
//             );
//         }
    
//         if (!this.resolvedTrack) {
//             throw new NoAudioTrackError();
//         }
    
//         if (segments.length === 0) {
//             throw new DemuxError(
//                 "No audio segments were produced. The file may be malformed or the audio track may be unsupported.",
//             );
//         }

//         const track = this.#toAudioTrackInfo(this.resolvedTrack!);

//         console.log("trackkkk", track);
//         console.log("segment", segments);
//         // const blob = new Blob(segments, { type: track.mimeType });
//         const blob = new Blob(
//         segments.map(segment => segment.buffer),
//         {
//           type: track.mimeType,
//         }
//       );

//         return { 
//             track,
//             blob,
//             sourceSizeBytes: this.file.size,
//         };
//     }

//     async #sliceFileAndAppendToMP4BoxFile(
//         mp4boxFile: MP4Box.ISOFile<unknown, unknown>,
//         parserError: Error | null,
//         signal?: AbortSignal
//     ): Promise<void> {
//         try {

//             let offset: number = 0;
//             const totalBytes: number = this.file.size;

//             while (offset < totalBytes) {
//                 // this.#throwIfAborted(signal);

//                 const EXTRACTION_CHUNK_SIZE: number = 8 * 1024 * 1024;
//                 const windowEnd = Math.min(
//                     offset + EXTRACTION_CHUNK_SIZE,
//                     totalBytes,
//                 );


//                 const chunk: ArrayBuffer = await this.file.slice(offset, offset + windowEnd).arrayBuffer();

//                 try {
//                     // const arg: MP4Box.MP4BoxBuffer = {
//                     //     ...chunk,
//                     //     fileStart: offset,
//                     // }

//                     // mp4boxFile.appendBuffer(arg);

//                     const buffer = chunk as MP4Box.MP4BoxBuffer;

//                     buffer.fileStart = offset;

//                     mp4boxFile.appendBuffer(buffer);
//                 } catch (error) {
//                     throw new DemuxError(
//                         `MP4Box failed while appending bytes at offset ${offset}.`,
//                         error,
//                     );
//                 }

//                 if (parserError) {
//                     throw new DemuxError(
//                         "MP4Box reported an error during extraction.",
//                         parserError,
//                     );
//                 }

//                 offset = windowEnd;
//                 console.log("parcent", Math.floor((offset / totalBytes) * 100));

//                 this.emit("progress", {
//                     bytesProcessed: offset,
//                     percent: Math.floor((offset / totalBytes) * 100),
//                     totalBytes: totalBytes,
//                 });
//             }

//             if (!this.resolvedTrack) {
//                 await this.#readyPromise();
//             }

//             try {
//                 mp4boxFile.flush();
//             } catch (error) {
//               console.log("ahadFlushError");
//                 throw new DemuxError(
//                     "MP4Box failed while flushing final samples.",
//                     error,
//                 );
//             }
//         } catch (error) {
//             // throw toAppError(error); //TODO: current leater
//             console.log("finalError" , error);
//             throw new Error(error.message);
//         } finally {
//             try {
//                 mp4boxFile.stop();
//             } catch (error) {
//                 console.warn(
//                     "MP4Box stop failed",
//                     error,
//                 );
//             }
//         }
//     }

//     async #eventRegister(
//         mp4boxFile: MP4Box.ISOFile<unknown, unknown>, 
//         segments: ArrayBuffer[],
//         parserError: Error | null,
//         readySettled: boolean
//     ): Promise<void> {

//         mp4boxFile.onReady = (info: MP4Box.Movie): void => {
//             // find the audio and push to the mp4boxFile
//             const audioTrack = info.tracks.find(
//                 (track) => track.type === "audio",
//             );
//             console.log("audioTrack", audioTrack);

//             if (!audioTrack) {
//                 const error = new NoAudioTrackError();

//                 readySettled = true;

//                 this.#rejectReady(error);

//                 return;
//             }
            

//             mp4boxFile.setSegmentOptions(audioTrack.id, null, {
//                 nbSamples: 200, // nbSamples is the number of samples to extract per call to mp4boxFile.start()
//                 rapAlignement: false,
//             });

//             const initSegments = mp4boxFile.initializeSegmentation();

//             console.log("initSegment", initSegments)

//             const audioInitSegment =
//               initSegments.find(
//                 (segment) =>
//                   segment.id ===
//                   audioTrack.id,
//               );

//             if (!audioInitSegment) {
//                 const error = new DemuxError(
//                     `MP4Box failed to generate an initialization segment for audio track ${audioTrack.id}.`,
//                 );

//                 readySettled = true;
//                 this.#rejectReady(error);

//                 return;
//             }

//             segments.push(audioInitSegment.buffer,);
//             this.resolvedTrack = audioTrack;

//             console.log("resolveTrack", this.resolvedTrack)

//             mp4boxFile.start();

//             readySettled = true;

//             this.#resolveReady(audioTrack);

//         }


//         mp4boxFile.onError = (module: string, message: string): void => {
//             const normalizedError = new Error(
//                 typeof message === "string"
//                     ? message : "Unknown MP4Box parsing error"
//             );
        

//             parserError = normalizedError;

//             if (!readySettled) {
//                 readySettled = true;

//                 this.#rejectReady(
//                     normalizedError,
//                 );
//             }

//         }

//         mp4boxFile.onMoovStart = () => {

//             // this.emit("progress", {
//             //     phase: "parsing",
//             //     // processedBytes:
//             //     // scanResult.moov.start,
//             //     // totalBytes:
//             //     // scanResult.fileSize,
//             // });
//         };

//         mp4boxFile.onSegment = (
//             id: number,
//             user: unknown,
//             buffer: ArrayBuffer,
//             sampleNum: number
//         ): void => {
//             if (this.resolvedTrack && id !== this.resolvedTrack.id) return;

//             segments.push(buffer);      

//         }
//     }

//     #resolveReady!: (track: MP4Box.Track) => void;
//     #rejectReady!: (error: unknown) => void;

//     async #readyPromise(): Promise<void> {

//         new Promise<MP4Box.Track>(
//             (resolve, reject) => {
//                 this.#resolveReady = resolve;
//                 this.#rejectReady = reject;
//             },
//         );
//     }


//     #moovFileValidation(result: ScanResult): ScanResult['moov'] {
//         if (!result?.moov) {
//             throw new DemuxError(
//                 "Could not locate the moov box in the MP4/MOV file.",
//             );
//         }
    
//         if (
//             result.moov.buffer
//             .byteLength === 0
//         ) {
//             throw new DemuxError(
//                 "The located moov box is empty.",
//             );
//         }

//         return result.moov;
//     }

//     #toAudioTrackInfo(track: Track): AudioTrackInfo {
//         return {
//             trackId: track.id,
//             codec: track.codec,
//             sampleRate: track.audio?.sample_rate ?? 0,
//             channelCount: track.audio?.channel_count ?? 0,
//             duration: track.timescale > 0 ? track.duration / track.timescale : 0,
//             mimeType: `audio/mp4; codecs="${track.codec}"`,
//         };
//     }

//     // #throwIfAborted(signal?: AbortSignal): void {
//     //     if (signal?.aborted) {
//     //       throw new AbortedError();
//     //     }
//     // }
// }
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

export class AudioTrackDemuxer extends TypedEventEmitter<DemuxEvents> {
    private resolvedTrack: MP4Box.Track | null = null;
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
        this.#throwIfAborted(signal);
        

        // const result: ScanResult = await this.boxScanner.scan()

        // const moovFile: ScanResult['moov'] = this.#moovFileValidation(result);
       
        /**
         * TODO: true dile success, because all previous chunk store hare.
         * truely I don't know how it works, but it works. I will check the mp4box.js source code to understand how it works.
         */

        console.log("step1");
        const mp4boxFile = MP4Box.createFile(false); 

        const segments: ArrayBuffer[] = [];
    

    
        let parserError: Error | null = null;
    
        let readySettled = false;

        /**
         * Register callbacks before feeding any bytes to MP4Box.
         * MP4Box invokes onReady/onError asynchronously as appendBuffer()
         * discovers enough information from the file.
         */
        const readyPromise = this.#readyPromise();

        await this.#eventRegister(
            mp4boxFile,
            segments,
            (error) => {
                parserError = error;
            },
            () => {
                readySettled = true;
            },
        );
        console.log("step2");

        await this.#sliceFileAndAppendToMP4BoxFile(
            mp4boxFile,
            () => parserError,
            signal,
        );
        console.log("step3");

        if (!readySettled) {
            await readyPromise;
        } else {
            await readyPromise.catch(() => undefined);
        }

        
        if (parserError) {
            throw new DemuxError(
                "MP4Box reported an error while processing the file.",
                parserError,
            );
        }
    
        if (!this.resolvedTrack) {
            throw new NoAudioTrackError();
        }
    
        if (segments.length === 0) {
            throw new DemuxError(
                "No audio segments were produced. The file may be malformed or the audio track may be unsupported.",
            );
        }

        const track = this.#toAudioTrackInfo(this.resolvedTrack!);

        console.log("trackkkk", track);
        console.log("segment", segments);
        // const blob = new Blob(segments, { type: track.mimeType });
        const blob = new Blob(
            segments,
            {
                type: track.mimeType,
            },
        );

        return { 
            track,
            blob,
            sourceSizeBytes: this.file.size,
        };
    }

    async #sliceFileAndAppendToMP4BoxFile(
        mp4boxFile: MP4Box.ISOFile<unknown, unknown>,
        getParserError: () => Error | null,
        signal?: AbortSignal
    ): Promise<void> {
        try {

            let offset: number = 0;
            const totalBytes: number = this.file.size;

            while (offset < totalBytes) {
                this.#throwIfAborted(signal);

                const EXTRACTION_CHUNK_SIZE: number = 8 * 1024 * 1024;
                const windowEnd = Math.min(
                    offset + EXTRACTION_CHUNK_SIZE,
                    totalBytes,
                );


                const chunk: ArrayBuffer = await this.file.slice(offset, windowEnd).arrayBuffer();

                try {
                    // const arg: MP4Box.MP4BoxBuffer = {
                    //     ...chunk,
                    //     fileStart: offset,
                    // }

                    // mp4boxFile.appendBuffer(arg);

                    const buffer = chunk as MP4Box.MP4BoxBuffer;

                    buffer.fileStart = offset;

                    mp4boxFile.appendBuffer(buffer);
                } catch (error) {
                    throw new DemuxError(
                        `MP4Box failed while appending bytes at offset ${offset}.`,
                        error,
                    );
                }

                const parserError = getParserError();

                if (parserError) {
                    throw new DemuxError(
                        "MP4Box reported an error during extraction.",
                        parserError,
                    );
                }

                offset = windowEnd;
                console.log("parcent", Math.floor((offset / totalBytes) * 100));

                this.emit("progress", {
                    bytesProcessed: offset,
                    percent: Math.floor((offset / totalBytes) * 100),
                    totalBytes: totalBytes,
                });
            }

            try {
                mp4boxFile.flush();
            } catch (error) {
              console.log("ahadFlushError");
                throw new DemuxError(
                    "MP4Box failed while flushing final samples.",
                    error,
                );
            }
        } catch (error) {
            console.log("finalError", error);

            if (error instanceof DemuxError) {
                throw error;
            }

            if (error instanceof Error) {
                throw error;
            }

            throw new DemuxError(
                "Unexpected error while processing the media file.",
                error,
            );
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
        setParserError: (error: Error) => void,
        markReadySettled: () => void,
    ): Promise<void> {

        mp4boxFile.onReady = (info: MP4Box.Movie): void => {
            // find the audio and push to the mp4boxFile
            const audioTrack = info.tracks.find(
                (track) => track.type === "audio",
            );
            console.log("audioTrack", audioTrack);

            if (!audioTrack) {
                const error = new NoAudioTrackError();

                markReadySettled();

                this.#rejectReady(error);

                return;
            }
            

            mp4boxFile.setSegmentOptions(audioTrack.id, null, {
                nbSamples: 200, // nbSamples is the number of samples to extract per call to mp4boxFile.start()
                rapAlignement: false,
            });

            const initSegments = mp4boxFile.initializeSegmentation();

            console.log("initSegment", initSegments);

            if (!initSegments?.buffer) {
                const error = new DemuxError(
                    `MP4Box failed to generate an initialization segment for audio track ${audioTrack.id}.`,
                );

                markReadySettled();
                this.#rejectReady(error);

                return;
            }

            segments.push(initSegments.buffer);
            this.resolvedTrack = audioTrack;

            console.log("resolveTrack", this.resolvedTrack)

            mp4boxFile.start();

            markReadySettled();

            this.#resolveReady(audioTrack);

        }


        mp4boxFile.onError = (module: string, message: string): void => {
            const normalizedError = new Error(
                typeof message === "string"
                    ? message : "Unknown MP4Box parsing error"
            );
        

            setParserError(normalizedError);

            this.#rejectReady(
                normalizedError,
            );

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
            if (this.resolvedTrack && id !== this.resolvedTrack.id) return;

            segments.push(buffer);      

        }
    }

    #resolveReady!: (track: MP4Box.Track) => void;
    #rejectReady!: (error: unknown) => void;

    #readyPromise(): Promise<MP4Box.Track> {
        return new Promise<MP4Box.Track>(
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

    #throwIfAborted(signal?: AbortSignal): void {
        if (signal?.aborted) {
            throw new DemuxError("Audio demuxing was aborted.");
        }
    }
}