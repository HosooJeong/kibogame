import type { SoundEvent } from "./controller";

export class GameSound {
  private context: AudioContext | null = null;
  enabled: boolean;
  constructor(enabled: boolean) {
    this.enabled = enabled;
  }
  unlock = () => {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended")
        void this.context.resume().catch(() => {});
    } catch {
      /* Sound is optional; the entire game also has visual feedback. */
    }
  };
  play = (event: SoundEvent) => {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    const ctx = this.context;
    const notes =
      event === "win"
        ? [523.25, 659.25, 783.99, 1046.5]
        : [
            event === "bump"
              ? 180
              : event === "turn"
                ? 440
                : event === "add"
                  ? 660
                  : 520,
          ];
    notes.forEach((hz, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + index * 0.115;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(hz, at);
      oscillator.frequency.exponentialRampToValueAtTime(
        hz * (event === "bump" ? 0.7 : 1.05),
        at + 0.13,
      );
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.045, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.2);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.22);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  };
}
