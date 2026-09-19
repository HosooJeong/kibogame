import { step } from "./grid";
import { STAGES } from "./stages";
import { MAX_COMMANDS } from "./types";
import type { Command, Pose } from "./types";

export type Mode = "direct" | "code";
export type Motion = {
  from: Pose;
  to: Pose;
  command: Command;
  blocked: boolean;
  elapsed: number;
  duration: number;
};
export type SoundEvent = "move" | "turn" | "bump" | "win" | "add";
export type GameState = {
  stageIndex: number;
  mode: Mode;
  pose: Pose;
  history: Command[];
  commands: Command[];
  busy: boolean;
  playing: boolean;
  stopRequested: boolean;
  won: boolean;
  /** Last unsuccessful program result. Keep it and the pose while editing. */
  failure: "blocked" | "incomplete" | null;
  activeIndex: number | null;
  failedIndex: number | null;
  message: string;
  cleared: number[];
};

/** One synchronous owner of input locking and command execution. No timer chains. */
export class GameController {
  private state: GameState;
  private listeners = new Set<() => void>();
  motion: Motion | null = null;
  onSound: (event: SoundEvent) => void = () => {};
  onClear: (ids: number[]) => void = () => {};
  constructor(cleared: number[] = []) {
    this.state = {
      stageIndex: 0,
      mode: "direct",
      pose: { ...STAGES[0].start },
      history: [],
      commands: [],
      busy: false,
      playing: false,
      stopRequested: false,
      won: false,
      failure: null,
      activeIndex: null,
      failedIndex: null,
      message: STAGES[0].hint,
      cleared,
    };
  }
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  get stage() {
    return STAGES[this.state.stageIndex];
  }
  private update(patch: Partial<GameState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  reset = () => {
    this.motion = null;
    this.update({
      pose: { ...this.stage.start },
      history: [],
      busy: false,
      playing: false,
      stopRequested: false,
      won: false,
      failure: null,
      activeIndex: null,
      failedIndex: null,
      message: this.stage.hint,
    });
  };
  setMode = (mode: Mode) => {
    if (mode === this.state.mode) return;
    this.motion = null;
    this.update({
      mode,
      pose: { ...this.stage.start },
      history: [],
      busy: false,
      playing: false,
      stopRequested: false,
      won: false,
      failure: null,
      activeIndex: null,
      failedIndex: null,
      message:
        mode === "code" ? "순서를 만들고 실행을 눌러 봐." : this.stage.hint,
    });
  };
  selectStage = (stageIndex: number) => {
    if (!STAGES[stageIndex]) return;
    this.motion = null;
    this.update({
      stageIndex,
      pose: { ...STAGES[stageIndex].start },
      history: [],
      commands: [],
      busy: false,
      playing: false,
      stopRequested: false,
      won: false,
      failure: null,
      activeIndex: null,
      failedIndex: null,
      message: STAGES[stageIndex].hint,
    });
  };
  input = (command: Command) => {
    if (this.state.busy) return;
    if (this.state.mode === "code") {
      if (this.state.commands.length >= MAX_COMMANDS) {
        this.update({ message: "20개가 꽉 찼어. 하나 빼 볼까?" });
        return;
      }
      this.onSound("add");
      this.update({
        commands: [...this.state.commands, command],
        failedIndex: null,
        activeIndex: null,
        won: false,
        message: this.state.failure
          ? "순서를 고쳤어. 다시 실행해 봐."
          : "좋아! 다 만들면 실행을 눌러 봐.",
      });
    } else if (!this.state.won) {
      this.update({ history: [...this.state.history, command], message: "" });
      this.begin(command, false);
    }
  };
  private begin(command: Command, playing: boolean) {
    const result = step(this.stage, this.state.pose, command);
    this.motion = {
      from: { ...this.state.pose },
      to: result.pose,
      command,
      blocked: result.blocked,
      elapsed: 0,
      duration: result.blocked
        ? 360
        : command === "left" || command === "right"
          ? 340
          : 420,
    };
    this.onSound(
      result.blocked
        ? "bump"
        : command === "left" || command === "right"
          ? "turn"
          : "move",
    );
    this.update({ busy: true, playing });
  }
  copyHistory = () => {
    if (
      this.state.busy ||
      !this.state.history.length ||
      this.state.history.length > MAX_COMMANDS
    )
      return;
    const commands = [...this.state.history];
    this.setMode("code");
    this.update({ commands, message: "네가 만든 길이야! 실행해 볼까?" });
  };
  remove = (index: number) => {
    if (this.state.busy) return;
    this.update({
      commands: this.state.commands.filter((_, i) => i !== index),
      activeIndex: null,
      failedIndex: null,
      won: false,
      message: this.state.failure
        ? "순서를 고쳤어. 다시 실행해 봐."
        : this.state.message,
    });
  };
  clear = () => {
    if (this.state.busy) return;
    this.update({
      commands: [],
      activeIndex: null,
      failedIndex: null,
      won: false,
      message: "어떤 순서로 가 볼까?",
    });
  };
  run = () => {
    if (
      this.state.busy ||
      this.state.mode !== "code" ||
      !this.state.commands.length
    )
      return;
    this.motion = null;
    this.update({
      pose: { ...this.stage.start },
      won: false,
      failure: null,
      stopRequested: false,
      activeIndex: 0,
      failedIndex: null,
      message: "또또가 순서대로 가고 있어.",
    });
    this.begin(this.state.commands[0], true);
  };
  stop = () => {
    if (!this.state.playing || this.state.stopRequested) return;
    this.update({ stopRequested: true, message: "이 동작을 마치고 멈출게." });
  };
  tick = (ms: number) => {
    let remaining = Math.max(0, ms);
    while (this.motion && remaining > 0) {
      const motion = this.motion;
      const elapsed = Math.min(remaining, motion.duration - motion.elapsed);
      motion.elapsed += elapsed;
      remaining -= elapsed;
      if (motion.elapsed < motion.duration) break;
      this.motion = null;
      const playing = this.state.playing;
      const reached =
        !motion.blocked &&
        motion.to.x === this.stage.goal.x &&
        motion.to.y === this.stage.goal.y;
      if (reached) {
        const cleared = [...new Set([...this.state.cleared, this.stage.id])];
        this.update({
          pose: motion.to,
          won: true,
          failure: null,
          busy: false,
          playing: false,
          stopRequested: false,
          cleared,
          message: "별을 찾았어! 정말 멋져!",
        });
        this.onSound("win");
        this.onClear(cleared);
        break;
      }
      if (motion.blocked) {
        this.update({
          busy: false,
          playing: false,
          stopRequested: false,
          failedIndex: playing ? this.state.activeIndex : null,
          failure: playing ? "blocked" : null,
          message: playing
            ? "여기서 막혔어. 순서를 바꿔볼까?"
            : "여기는 못 가. 다른 쪽으로 가 볼까?",
        });
        break;
      }
      this.update({ pose: motion.to });
      const next = (this.state.activeIndex ?? -1) + 1;
      if (
        playing &&
        !this.state.stopRequested &&
        next < this.state.commands.length
      ) {
        this.update({ activeIndex: next });
        this.begin(this.state.commands[next], true);
      } else {
        this.update({
          busy: false,
          playing: false,
          failure: playing && !this.state.stopRequested ? "incomplete" : null,
          activeIndex: null,
          stopRequested: false,
          message: playing
            ? this.state.stopRequested
              ? "잠깐 멈췄어. 순서를 살펴보자."
              : "여기서 멈췄어. 순서를 더해 볼까?"
            : this.stage.hint,
        });
        break;
      }
    }
  };
  toText = () =>
    JSON.stringify({
      coordinateSystem:
        "integer grid; (0,0) top-left; +x east, +y south; direction 0=N,1=E,2=S,3=W",
      ...this.state,
      stageId: this.stage.id,
      difficulty: this.stage.difficulty,
      ordinal: this.stage.ordinal,
      totalMaps: STAGES.length,
      size: this.stage.size,
      goal: this.stage.goal,
      obstacles: this.stage.obstacles,
      motion: this.motion
        ? {
            command: this.motion.command,
            blocked: this.motion.blocked,
            progress: this.motion.elapsed / this.motion.duration,
          }
        : null,
    });
}
