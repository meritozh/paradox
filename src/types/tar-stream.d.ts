declare module 'tar-stream' {

import { Writable, Stream } from "stream";

  type TarStreamHeader = {
    name: string,
    mode: number,
    mtime: Date,
    size: number,
    type: "file" | "directory" | "symlink",
    uid: number,
    gid: number,
  };

  type TarStreamListener = (header: TarStreamHeader, steam: TarStreamStream, next: () => void ) => void;

  interface TarStreamWritable extends Stream {
    on(event: 'entry', listener: TarStreamListener): this;
    on(event: 'finish', listener: TarStreamListener): this;
    on(event: 'error', listener: TarStreamListener): this;
  }

  interface TarStreamStream extends Stream {
    resume(): void
  }

  /**
   * return a readable stream
   */
  export const extract: () => TarStreamWritable;
}
