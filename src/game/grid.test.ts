import { describe, expect, it } from "vitest";
import { executeCommands, solveStage, step } from "./grid";
import { STAGES } from "./stages";
import { MAX_COMMANDS } from "./types";
import type { Direction, Stage } from "./types";

const board: Stage = {
  id: 100,
  name: "",
  hint: "",
  size: 5,
  start: { x: 2, y: 2, direction: 0 },
  goal: { x: 4, y: 4 },
  obstacles: [],
};
describe("relative integer grid movement", () => {
  const expected = [
    [2, 1, 2, 3],
    [3, 2, 1, 2],
    [2, 3, 2, 1],
    [1, 2, 3, 2],
  ];
  expected.forEach(([fx, fy, bx, by], direction) => {
    it(`forward and backward from direction ${direction} preserve facing`, () => {
      const pose = { x: 2, y: 2, direction: direction as Direction };
      expect(step(board, pose, "forward").pose).toEqual({
        x: fx,
        y: fy,
        direction,
      });
      expect(step(board, pose, "backward").pose).toEqual({
        x: bx,
        y: by,
        direction,
      });
      expect(pose).toEqual({ x: 2, y: 2, direction });
    });
    it(`turns from direction ${direction} stay in place; four turns return`, () => {
      const pose = { x: 2, y: 2, direction: direction as Direction };
      expect(step(board, pose, "left").pose).toEqual({
        ...pose,
        direction: (direction + 3) % 4,
      });
      expect(step(board, pose, "right").pose).toEqual({
        ...pose,
        direction: (direction + 1) % 4,
      });
      for (const command of ["left", "right"] as const) {
        let next = pose;
        for (let i = 0; i < 4; i++) next = step(board, next, command).pose;
        expect(next).toEqual(pose);
      }
    });
  });
  it.each([
    [0, 0, 0],
    [4, 2, 1],
    [2, 4, 2],
    [0, 2, 3],
  ])(
    "blocks every forward boundary at (%i,%i), direction %i",
    (x, y, direction) => {
      const pose = { x, y, direction: direction as Direction };
      expect(step(board, pose, "forward")).toEqual({
        pose,
        blocked: true,
        reachedGoal: false,
      });
      expect(
        step(
          board,
          { ...pose, direction: ((direction + 2) % 4) as Direction },
          "backward",
        ).blocked,
      ).toBe(true);
    },
  );
  it("blocks obstacles forward and backward without modifying position", () => {
    const stage = {
      ...board,
      obstacles: [
        { x: 2, y: 1 },
        { x: 2, y: 3 },
      ],
    };
    for (const command of ["forward", "backward"] as const) {
      expect(step(stage, board.start, command)).toEqual({
        pose: board.start,
        blocked: true,
        reachedGoal: false,
      });
    }
    expect(step(stage, board.start, "right").blocked).toBe(false);
  });
});
describe("sequential commands", () => {
  it("executes in order and terminates immediately at the goal", () => {
    const stage = { ...board, goal: { x: 3, y: 1 } };
    const result = executeCommands(stage, [
      "forward",
      "right",
      "forward",
      "backward",
    ]);
    expect(result).toEqual({
      pose: { x: 3, y: 1, direction: 1 },
      reachedGoal: true,
      blocked: false,
      executed: 3,
    });
  });
  it("stops at the exact blocked command", () => {
    const result = executeCommands({ ...board, obstacles: [{ x: 2, y: 0 }] }, [
      "forward",
      "forward",
      "right",
    ]);
    expect(result).toEqual({
      pose: { x: 2, y: 1, direction: 0 },
      reachedGoal: false,
      blocked: true,
      executed: 2,
    });
  });
  it("does not report success on an incomplete or empty sequence", () => {
    expect(executeCommands(board, []).reachedGoal).toBe(false);
    expect(executeCommands(board, ["left", "forward"]).reachedGoal).toBe(false);
  });
});
describe("all catalog stages", () => {
  it.each(STAGES)(
    "stage $id is valid and solvable within 20 commands",
    (stage) => {
      expect(stage.size).toBeGreaterThanOrEqual(5);
      expect(stage.size).toBeLessThanOrEqual(7);
      const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
      const occupied = new Set(stage.obstacles.map(key));
      expect(occupied.size).toBe(stage.obstacles.length);
      expect(occupied.has(key(stage.start))).toBe(false);
      expect(occupied.has(key(stage.goal))).toBe(false);
      for (const cell of [...stage.obstacles, stage.start, stage.goal]) {
        expect(Number.isInteger(cell.x) && Number.isInteger(cell.y)).toBe(true);
        expect(
          cell.x >= 0 &&
            cell.y >= 0 &&
            cell.x < stage.size &&
            cell.y < stage.size,
        ).toBe(true);
      }
      const solution = solveStage(stage);
      expect(solution).not.toBeNull();
      expect(solution!.length).toBeLessThanOrEqual(MAX_COMMANDS);
      expect(executeCommands(stage, solution!).reachedGoal).toBe(true);
    },
  );
  it("introduces forward, one turn, multiple turns, and backwards", () => {
    expect(solveStage(STAGES[0])).toEqual(["forward", "forward", "forward"]);
    expect(
      solveStage(STAGES[1])!.filter((c) => c === "left" || c === "right"),
    ).toHaveLength(1);
    expect(
      solveStage(STAGES[2])!.filter((c) => c === "left" || c === "right")
        .length,
    ).toBeGreaterThanOrEqual(2);
    expect(solveStage(STAGES[4])).toEqual(["backward", "backward"]);
  });
});
