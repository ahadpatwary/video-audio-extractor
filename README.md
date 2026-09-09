# audio/extract — frontend

Client-side video → audio extraction. The browser demuxes the audio track
out of an uploaded video (MP4/MOV/M4V) without ever decoding the video
track, packages it into a small `.m4a` file, and uploads that file to your
backend. No backend logic lives in this repo — see **Backend contract**
below for the one place it plugs in.

## Why this approach

A video file is almost entirely video bytes — audio is typically 2-5% of
the total size. `AudioTrackDemuxer` (see `src/core/extraction`) uses
[mp4box.js](https://github.com/gpac/mp4box.js) to parse the container's box
structure progressively, 8 MB at a time (`ChunkedFileReader`), and
re-packages only the audio track's samples into a new fragmented MP4. The
video track is parsed for its layout but never decoded or copied — so a
multi-gigabyte, hour-long video finishes in seconds without spiking browser
memory.

## Project layout

```
src/
  app/                Next.js App Router: layout, page, global styles
  components/          Presentational React components (function components)
  core/                 Framework-agnostic business logic, in classes
    errors/              AppError -> ExtractionError / UploadError hierarchies
    events/              Emitter<T> — typed pub/sub base class
    extraction/           ChunkedFileReader, AudioTrackDemuxer
    upload/               UploadClient (abstract) + HttpUploadClient
    pipeline/             ExtractionPipeline — orchestrates demux -> upload
  hooks/               useExtractionPipeline — the only place core/ meets React
  lib/                 Formatting helpers + constants
  types/               Ambient type declarations (mp4box has no official types)
```

**Why classes in `core/` but function components in `components/`:** this
follows the same split as your NestJS/Express backends — DI-friendly service
classes with a thin adapter on top. In the browser, that adapter is a React
hook rather than a controller, since hooks are how modern Next.js/React
reads state (class components can't use hooks and don't work in Server
Components). `ExtractionPipeline`, `AudioTrackDemuxer`, and `UploadClient`
have no React import at all — they're plain TypeScript classes you could
reuse in a CLI or a web worker unchanged.

## Backend contract

The only class that talks to a server is `HttpUploadClient`
(`src/core/upload/UploadClient.ts`). It expects:

1. `POST /api/uploads/presign` with JSON body:
   ```ts
   { fileName: string; contentType: string; sizeBytes: number }
   ```
   returning:
   ```ts
   { uploadUrl: string; fileKey: string; headers?: Record<string, string> }
   ```
2. The browser then does a raw `PUT` of the `.m4a` file to `uploadUrl`.

Point `HttpUploadClient` at a different path via its constructor
(`new HttpUploadClient("/api/v2/uploads/presign")`), or swap in your own
class that extends `UploadClient` if the shape differs (e.g. multipart POST
instead of a presigned PUT) — `ExtractionPipeline` only depends on the
abstract `UploadClient` contract, never on `HttpUploadClient` directly.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Until a real `/api/uploads/presign` route
exists, the upload step will fail with a clear "couldn't start the upload"
error — extraction and playback/download still work fully offline.

## Notes

- Supported containers: MP4, MOV, M4V (anything MP4Box.js can parse the box
  structure of). Output is always `.m4a` (AAC-LC in a fragmented MP4).
- `MAX_FILE_SIZE_BYTES` in `src/lib/constants.ts` is a client-side guard
  only — keep it in sync with whatever limit the backend/storage provider
  enforces.
