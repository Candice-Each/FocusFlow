/** Fixed-window throttle. One command per window; identical repeats are dropped. */
export class Throttle {
  private lastId: string | null = null;
  private lastAt = 0;

  constructor(private readonly windowMs: number) {}

  /** Returns true when the command may run. */
  tryTake(id: string, now: number): boolean {
    if (id === this.lastId && now - this.lastAt < this.windowMs) return false;
    this.lastId = id;
    this.lastAt = now;
    return true;
  }

  reset(): void {
    this.lastId = null;
    this.lastAt = 0;
  }
}
