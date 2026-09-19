export type Command = "forward" | "backward" | "left" | "right";
export type Direction = 0 | 1 | 2 | 3; // north, east, south, west
export type Cell = { x: number; y: number };
export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6;
export type Pose = Cell & { direction: Direction };
export type Stage = {
  id: number;
  name: string;
  hint: string;
  size: number;
  start: Pose;
  goal: Cell;
  obstacles: Cell[];
  trail?: Cell[];
  difficulty?: Difficulty;
  ordinal?: number;
};
export const COMMANDS: Command[] = ["forward", "backward", "left", "right"];
export const COMMAND_LABELS: Record<Command, string> = {
  forward: "앞으로",
  backward: "뒤로",
  left: "왼쪽 회전",
  right: "오른쪽 회전",
};
export const MAX_COMMANDS = 20;
export const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
