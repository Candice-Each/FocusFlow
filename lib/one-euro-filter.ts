export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  constructor(private minCutoff = 0.85, private beta = 0.015, private dCutoff = 1.0) {}

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(x: number, tMs: number): number {
    if (!isFinite(x)) return this.xPrev ?? 0;
    if (this.tPrev === null || this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = tMs;
      return x;
    }
    const rawDt = (tMs - this.tPrev) / 1000;
    this.tPrev = tMs;

    // Post-blink recovery: use a gentle low cutoff (0.35) to damp out upward eyelid-reopening overshoot
    if (rawDt > 0.085) {
      const alphaRecovery = this.alpha(0.35, 0.033);
      const filtered = this.xPrev + alphaRecovery * (x - this.xPrev);
      this.dxPrev = 0;
      this.xPrev = filtered;
      return filtered;
    }

    const dt = Math.max(rawDt, 1e-4);
    const dx = (x - this.xPrev) / dt;
    const edx = this.dxPrev + this.alpha(this.dCutoff, dt) * (dx - this.dxPrev);
    this.dxPrev = edx;
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const filtered = this.xPrev + this.alpha(cutoff, dt) * (x - this.xPrev);
    this.xPrev = filtered;
    return filtered;
  }
}