/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // AudioTrackDemuxer streams the file with SharedArrayBuffer-free chunking,
  // but we still set these headers so a future WebCodecs upgrade
  // (hardware-accelerated decode) can enable cross-origin isolation
  // without touching this file again.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default nextConfig;
