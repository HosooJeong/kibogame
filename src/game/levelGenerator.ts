import { solveStage, executeCommands } from "./grid";
import { DIFFICULTIES } from "./difficulties";
import type { Cell, Difficulty, Stage } from "./types";
const key = (p: Cell) => `${p.x},${p.y}`;
const cells = (points: number[][]): Cell[] =>
  points.map(([x, y]) => ({ x, y }));
const allCells = (size: number) =>
  Array.from({ length: size * size }, (_, i) => ({
    x: i % size,
    y: Math.floor(i / size),
  }));
const walls = (size: number, path: Cell[]) =>
  allCells(size).filter((p) => !path.some((q) => key(q) === key(p)));
const directions = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
export function randomSource(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function stageFromPath(
  id: number,
  difficulty: Difficulty,
  ordinal: number,
  size: number,
  path: Cell[],
  obstacles = walls(size, path),
): Stage {
  const meta = DIFFICULTIES[difficulty - 1];
  return {
    id,
    difficulty,
    ordinal,
    name: `${meta.name} ${ordinal}`,
    hint: meta.hint,
    size,
    start: { ...path[0], direction: 0 },
    goal: path[path.length - 1],
    obstacles,
    trail: path,
  };
}
/** The original six learning concepts retain IDs 1..6 and clear records. */
export const TUTORIALS: Stage[] = [
  stageFromPath(
    1,
    1,
    1,
    5,
    cells([
      [2, 3],
      [2, 2],
      [2, 1],
      [2, 0],
    ]),
    [],
  ),
  stageFromPath(
    2,
    2,
    1,
    5,
    cells([
      [2, 3],
      [2, 2],
      [2, 1],
      [1, 1],
      [0, 1],
    ]),
    [],
  ),
  stageFromPath(
    3,
    3,
    1,
    5,
    cells([
      [2, 3],
      [2, 2],
      [3, 2],
      [3, 1],
      [4, 1],
      [4, 0],
    ]),
  ),
  stageFromPath(
    4,
    4,
    1,
    7,
    cells([
      [3, 5],
      [3, 4],
      [2, 4],
      [1, 4],
      [1, 3],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
      [5, 1],
    ]),
    cells([
      [3, 3],
      [2, 3],
      [4, 3],
      [4, 4],
      [3, 1],
      [4, 1],
      [0, 2],
      [6, 4],
    ]),
  ),
  stageFromPath(
    5,
    5,
    1,
    7,
    cells([
      [3, 4],
      [3, 5],
      [3, 6],
    ]),
    cells([
      [3, 3],
      [2, 4],
      [4, 4],
    ]),
  ),
  stageFromPath(
    6,
    6,
    1,
    7,
    cells([
      [3, 5],
      [3, 4],
      [3, 3],
      [2, 3],
      [1, 3],
      [1, 2],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [5, 0],
    ]),
  ),
];
function route(
  random: () => number,
  size: number,
  start: Cell,
  length: number,
  first: number,
) {
  const path = [start];
  while (path.length <= length) {
    const current = path[path.length - 1];
    const choices = directions
      .map((v, direction) => ({
        x: current.x + v.x,
        y: current.y + v.y,
        direction,
      }))
      .filter(
        (p) =>
          p.x >= 0 &&
          p.y >= 0 &&
          p.x < size &&
          p.y < size &&
          (path.length !== 1 || p.direction === first),
      )
      .filter(
        (p) =>
          !path.some((q) => key(p) === key(q)) &&
          !path
            .slice(0, -1)
            .some((q) => Math.abs(q.x - p.x) + Math.abs(q.y - p.y) === 1),
      );
    if (!choices.length) return null;
    const next = choices[Math.floor(random() * choices.length)];
    path.push({ x: next.x, y: next.y });
  }
  return path;
}
export function mapSignature(stage: Stage) {
  return JSON.stringify([
    stage.size,
    stage.start,
    stage.goal,
    stage.obstacles.map(key).sort(),
  ]);
}
/** Seeded, bounded offline production. Every accepted map is solver-checked. */
export function generateCatalog(perDifficulty = 20, seed = 20260913): Stage[] {
  if (
    !Number.isInteger(perDifficulty) ||
    perDifficulty < 1 ||
    perDifficulty > 200
  )
    throw new Error("perDifficulty must be 1..200");
  const result = TUTORIALS.map((stage) => structuredClone(stage));
  const seen = new Set(result.map(mapSignature));
  for (const meta of DIFFICULTIES) {
    const random = randomSource(seed + meta.id * 7919);
    let ordinal = 2;
    for (
      let attempt = 0;
      ordinal <= perDifficulty && attempt < 100000;
      attempt++
    ) {
      const size =
        meta.id <= 2
          ? random() < 0.65
            ? 5
            : 7
          : meta.id === 3
            ? random() < 0.5
              ? 5
              : 7
            : 7;
      const center = (size - 1) / 2;
      const start = { x: center, y: size - (meta.id === 5 ? 3 : 2) };
      let path: Cell[] | null;
      if (meta.id <= 2) {
        const distance = 1 + Math.floor(random() * start.y);
        path = Array.from({ length: distance + 1 }, (_, i) => ({
          x: center,
          y: start.y - i,
        }));
        if (meta.id === 2) {
          const sign = random() < 0.5 ? -1 : 1;
          const across = 1 + Math.floor(random() * center);
          for (let i = 1; i <= across; i++)
            path.push({ x: center + sign * i, y: start.y - distance });
        }
      } else {
        const length =
          meta.id === 3
            ? 5 + Math.floor(random() * 4)
            : meta.id === 5
              ? 3 + Math.floor(random() * 5)
              : 8 + Math.floor(random() * 7);
        path = route(random, size, start, length, meta.id === 5 ? 2 : 0);
      }
      if (!path) continue;
      let obstacles = walls(size, path);
      if (meta.id <= 2)
        obstacles = obstacles.filter(
          () => random() < 0.1 + (Math.min(ordinal, 20) / 20) * 0.15,
        );
      if (meta.id === 4) obstacles = obstacles.filter(() => random() < 0.64);
      const stage = stageFromPath(
        meta.id * 10000 + ordinal,
        meta.id,
        ordinal,
        size,
        path,
        obstacles,
      );
      const solution = solveStage(stage);
      if (
        !solution ||
        solution.length > 19 ||
        !executeCommands(stage, solution).reachedGoal
      )
        continue;
      const turns = solution.filter(
        (c) => c === "left" || c === "right",
      ).length;
      if (meta.id === 1 && solution.some((c) => c !== "forward")) continue;
      if (meta.id === 2 && turns !== 1) continue;
      if (
        meta.id === 3 &&
        (turns < 2 || solution.length < 7 || solution.length > 12)
      )
        continue;
      if (
        meta.id === 4 &&
        (turns < 2 || solution.length < 8 || solution.length > 14)
      )
        continue;
      if (meta.id === 5 && (solution[0] !== "backward" || solution.length > 11))
        continue;
      if (meta.id === 6 && (turns < 4 || solution.length < 13)) continue;
      const signature = mapSignature(stage);
      if (seen.has(signature)) continue;
      seen.add(signature);
      result.push(stage);
      ordinal++;
    }
    if (ordinal <= perDifficulty)
      throw new Error(
        `Could not generate ${perDifficulty} maps for difficulty ${meta.id}`,
      );
  }
  return result;
}
