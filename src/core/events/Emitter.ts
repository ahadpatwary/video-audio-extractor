/**
 * Minimal typed pub/sub base class.
 *
 * Every long-running class in `core/` (the demuxer, the upload client, the
 * pipeline) extends this instead of taking a single `onProgress` callback,
 * so consumers can subscribe/unsubscribe to as many event types as they need
 * without the constructor signature growing every time.
 */
export abstract class Emitter<Events extends Record<string, unknown>> {
  private readonly listeners: {
    [K in keyof Events]?: Set<(payload: Events[K]) => void>;
  } = {};

  public on<K extends keyof Events>(
    event: K,
    listener: (payload: Events[K]) => void,
  ): () => void {
    const set = this.listeners[event] ?? new Set();
    set.add(listener);
    this.listeners[event] = set;
    return () => this.off(event, listener);
  }

  public off<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): void {
    this.listeners[event]?.delete(listener);
  }

  protected emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.listeners[event]?.forEach((listener) => listener(payload));
  }

  /** Drops every listener. Call when the owning component unmounts. */
  public dispose(): void {
    (Object.keys(this.listeners) as Array<keyof Events>).forEach((key) => {
      this.listeners[key]?.clear();
    });
  }
}
