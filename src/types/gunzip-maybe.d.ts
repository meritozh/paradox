declare module 'gunzip-maybe' {
  import { Stream } from "stream";

  interface gunzip {
    pipe(stream: Stream): void
    on(event: 'error', listener: (error: any) => void): void
    write(buffer: Buffer): void
    end(): void
  }

  const gunzipMaybe: () => gunzip

  export = gunzipMaybe
}