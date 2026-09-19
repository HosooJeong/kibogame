import { COMMANDS, sameCell } from "./types";
import type { Command, Direction, Pose, Stage } from "./types";

const VECTORS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
export type StepResult = { pose: Pose; blocked: boolean; reachedGoal: boolean };

/** All rules use integers. Three.js coordinates never enter the game rules. */
export function step(stage: Stage, pose: Pose, command: Command): StepResult {
  let next = { ...pose };
  if (command === "left" || command === "right") {
    next.direction = ((pose.direction + (command === "left" ? 3 : 1)) %
      4) as Direction;
  } else {
    const v = VECTORS[pose.direction];
    const sign = command === "forward" ? 1 : -1;
    next = { ...pose, x: pose.x + sign * v.x, y: pose.y + sign * v.y };
  }
  const blocked =
    next.x < 0 ||
    next.y < 0 ||
    next.x >= stage.size ||
    next.y >= stage.size ||
    stage.obstacles.some((cell) => sameCell(cell, next));
  if (blocked) next = { ...pose };
  return { pose: next, blocked, reachedGoal: sameCell(next, stage.goal) };
}

export function executeCommands(stage: Stage, commands: readonly Command[]) {
  let pose = { ...stage.start };
  let executed = 0;
  for (const command of commands) {
    const result = step(stage, pose, command);
    pose = result.pose;
    executed++;
    if (result.blocked || result.reachedGoal) return { ...result, executed };
  }
  return {
    pose,
    blocked: false,
    reachedGoal: sameCell(pose, stage.goal),
    executed,
  };
}

/** BFS is a validation tool, never a score or hint imposed on the child. */
export function solveStage(stage: Stage): Command[] | null {
  const key = (p: Pose) => `${p.x},${p.y},${p.direction}`;
  const pending = [{ pose: stage.start, path: [] as Command[] }];
  const visited = new Set([key(stage.start)]);
  for (let i = 0; i < pending.length; i++) {
    const { pose, path } = pending[i];
    if (sameCell(pose, stage.goal)) return path;
    for (const command of COMMANDS) {
      const result = step(stage, pose, command);
      if (result.blocked || visited.has(key(result.pose))) continue;
      visited.add(key(result.pose));
      pending.push({ pose: result.pose, path: [...path, command] });
    }
  }
  return null;
}
