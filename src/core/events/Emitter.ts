
// export abstract class Emitter<Events extends Record<string, unknown>> {
//   private readonly listeners: {
//     [K in keyof Events]?: Set<(payload: Events[K]) => void>;
//   } = {};

//   public on<K extends keyof Events>(
//     event: K,
//     listener: (payload: Events[K]) => void,
//   ): () => void {
//     const set = this.listeners[event] ?? new Set();
//     set.add(listener);
//     this.listeners[event] = set;
//     return () => this.off(event, listener);
//   }

//   public off<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): void {
//     this.listeners[event]?.delete(listener);
//   }

//   protected emit<K extends keyof Events>(event: K, payload: Events[K]): void {
//     this.listeners[event]?.forEach((listener) => listener(payload));
//   }

//   /** Drops every listener. Call when the owning component unmounts. */
//   public dispose(): void {
//     (Object.keys(this.listeners) as Array<keyof Events>).forEach((key) => {
//       this.listeners[key]?.clear();
//     });
//   }
// }


// export class Emitter<Events extends Record<string, unknown>>{
//   private readonly listeners = new Set<(
//     event: keyof Events, 
//     payload: Events[keyof Events]
//   ) => void>();

//   public on(listener: (event: keyof Events, payload: Events[keyof Events]) => void): () => void {
//     this.listeners.add(listener);
//     return () => this.off(listener);
//   }

//   public off(listener: (event: keyof Events, payload: Events[keyof Events]) => void): void {
//     this.listeners.delete(listener);
//   }

//   protected emit<K extends Events>(event: K, payload: Events[K]): void {
//     this.listeners.forEach((listener) => listener(event, payload));
//   }
  
//   /** Drops every listener. Call when the owning component unmounts. */
//   public dispose(): void {
//     this.listeners.clear();
//   }

// }


import { EventEmitter } from "node:events";

// export type DemuxEvents = {
//     progress: DemuxProgressEvent;
//     ready: {
//         track: AudioTrackInfo;
//     };
// };

type EventMap = Record<string, unknown>;

export class TypedEventEmitter<Events extends EventMap> extends EventEmitter {
    on<K extends keyof Events>(
        eventName: K,
        listener: (data: Events[K]) => void
    ): this {
        return super.on(
            eventName as string | symbol,
            listener as (...args: any[]) => void
        );
    }

    emit<K extends keyof Events>(
        eventName: K,
        data: Events[K]
    ): boolean {
        return super.emit(eventName as string | symbol, data);
    }
}