import { describe, expect, it } from "vitest";
import { GameController } from "./controller";
import { solveStage } from "./grid";
import { STAGES } from "./stages";

describe("single owner execution and cancellation", () => {
  it("locks direct input synchronously and settles on exact integers", () => {
    const game = new GameController();
    game.input("forward");
    game.input("forward");
    game.input("left");
    expect(game.getSnapshot().history).toEqual(["forward"]);
    game.tick(210);
    expect(game.getSnapshot().busy).toBe(true);
    game.tick(210);
    expect(game.getSnapshot().pose).toEqual({ x: 2, y: 2, direction: 0 });
    expect(game.getSnapshot().busy).toBe(false);
  });
  it("copies direct history and resets the robot", () => {
    const game = new GameController();
    game.input("forward");
    game.tick(420);
    game.copyHistory();
    expect(game.getSnapshot()).toMatchObject({
      mode: "code",
      commands: ["forward"],
      pose: STAGES[0].start,
      history: [],
    });
  });
  it("allows direct history over 20 without silently truncating it on copy", () => {
    const game = new GameController();
    for (let i = 0; i < 21; i++) {
      game.input("right");
      game.tick(340);
    }
    game.copyHistory();
    expect(game.getSnapshot().mode).toBe("direct");
    expect(game.getSnapshot().history).toHaveLength(21);
  });
  it("enforces 20 commands and supports individual and full deletion", () => {
    const game = new GameController();
    game.setMode("code");
    for (let i = 0; i < 25; i++) game.input("right");
    expect(game.getSnapshot().commands).toHaveLength(20);
    game.remove(5);
    expect(game.getSnapshot().commands).toHaveLength(19);
    game.clear();
    expect(game.getSnapshot().commands).toHaveLength(0);
  });
  it("blocks every editing or duplicate execution path during a run", () => {
    const game = new GameController();
    game.setMode("code");
    game.input("forward");
    game.input("right");
    game.run();
    game.tick(100);
    game.run();
    game.input("backward");
    game.remove(0);
    game.clear();
    expect(game.getSnapshot().commands).toEqual(["forward", "right"]);
    expect(game.motion!.elapsed).toBe(100);
  });
  it("stops only after the current operation and restarts at the start", () => {
    const game = new GameController();
    game.setMode("code");
    game.input("forward");
    game.input("right");
    game.run();
    game.tick(100);
    game.stop();
    expect(game.getSnapshot().busy).toBe(true);
    game.tick(319);
    expect(game.getSnapshot().busy).toBe(true);
    game.tick(1);
    expect(game.getSnapshot()).toMatchObject({
      busy: false,
      playing: false,
      failure: null,
      pose: { x: 2, y: 2, direction: 0 },
    });
    expect(game.getSnapshot().commands).toEqual(["forward", "right"]);
    game.run();
    expect(game.motion!.from).toEqual(STAGES[0].start);
  });
  it("blocked card stops execution, preserves the queue, and supports fixing it", () => {
    const game = new GameController();
    game.selectStage(4);
    game.setMode("code");
    game.input("forward");
    game.input("backward");
    game.input("backward");
    game.run();
    game.tick(10000);
    expect(game.getSnapshot()).toMatchObject({
      failedIndex: 0,
      failure: "blocked",
      pose: STAGES[4].start,
      busy: false,
      message: "여기서 막혔어. 순서를 바꿔볼까?",
    });
    game.remove(0);
    game.run();
    game.tick(10000);
    expect(game.getSnapshot().won).toBe(true);
  });
  it.each(["reset", "mode", "stage"])(
    "%s cancels an in-flight motion and any remaining commands",
    (action) => {
      const game = new GameController();
      game.setMode("code");
      game.input("forward");
      game.input("forward");
      game.run();
      game.tick(100);
      if (action === "reset") game.reset();
      else if (action === "mode") game.setMode("direct");
      else game.selectStage(2);
      const before = game.getSnapshot();
      game.tick(100000);
      expect(game.getSnapshot()).toEqual(before);
      expect(game.motion).toBeNull();
      expect(before.pose).toEqual(game.stage.start);
    },
  );
  it("retains an incomplete program for editing", () => {
    const game = new GameController();
    game.setMode("code");
    game.input("forward");
    game.run();
    game.tick(1000);
    expect(game.getSnapshot()).toMatchObject({
      commands: ["forward"],
      busy: false,
      won: false,
      failure: "incomplete",
      activeIndex: null,
      pose: { x: 2, y: 2, direction: 0 },
    });
    game.input("forward");
    game.input("forward");
    expect(game.getSnapshot().failure).toBe("incomplete");
    expect(game.getSnapshot().pose).toEqual({ x: 2, y: 2, direction: 0 });
    game.run();
    expect(game.getSnapshot().failure).toBeNull();
    expect(game.motion!.from).toEqual(STAGES[0].start);
    game.tick(5000);
    expect(game.getSnapshot().won).toBe(true);
  });
  it("keeps the actual stopped cell after moving then hitting the boundary", () => {
    const game = new GameController();
    game.setMode("code");
    game.input("backward");
    game.input("backward");
    game.input("forward");
    game.run();
    game.tick(5000);
    expect(game.getSnapshot()).toMatchObject({
      failure: "blocked",
      failedIndex: 1,
      pose: { x: 2, y: 4, direction: 0 },
      commands: ["backward", "backward", "forward"],
    });
    game.tick(5000);
    game.remove(1);
    expect(game.getSnapshot().pose).toEqual({ x: 2, y: 4, direction: 0 });
    expect(game.getSnapshot().failure).toBe("blocked");
    expect(game.getSnapshot().failedIndex).toBeNull();
    game.run();
    expect(game.getSnapshot().failure).toBeNull();
    expect(game.motion!.from).toEqual(STAGES[0].start);
  });
  it.each(["reset", "mode", "stage"])("%s clears the previous failure", (action) => {
    const game = new GameController();
    game.setMode("code");
    game.input("forward");
    game.run();
    game.tick(1000);
    expect(game.getSnapshot().failure).toBe("incomplete");
    if (action === "reset") game.reset();
    else if (action === "mode") game.setMode("direct");
    else game.selectStage(1);
    expect(game.getSnapshot().failure).toBeNull();
    expect(game.getSnapshot().pose).toEqual(game.stage.start);
  });
  it("clearing and rebuilding a failed program preserves the stopped position until retry", () => {
    const game = new GameController();
    game.setMode("code");
    game.input("forward");
    game.run();
    game.tick(1000);
    game.clear();
    game.run(); // An empty retry does not teleport the robot.
    expect(game.getSnapshot()).toMatchObject({
      failure: "incomplete",
      pose: { x: 2, y: 2, direction: 0 },
      commands: [],
      busy: false,
    });
    game.input("forward");
    game.run();
    expect(game.getSnapshot().failure).toBeNull();
    expect(game.getSnapshot().pose).toEqual(game.stage.start);
  });
  it("a deliberate stop on the last command is not a failed run", () => {
    const game = new GameController();
    game.setMode("code");
    game.input("forward");
    game.run();
    game.stop();
    game.tick(5000);
    expect(game.getSnapshot()).toMatchObject({
      failure: null, playing: false, busy: false,
      pose: { x: 2, y: 2, direction: 0 },
    });
  });
  it("direct collisions do not show a coding failure", () => {
    const game = new GameController();
    game.selectStage(4);
    game.input("forward");
    game.tick(1000);
    expect(game.getSnapshot()).toMatchObject({
      failure: null, failedIndex: null, pose: STAGES[4].start,
    });
  });
  it.each(STAGES)(
    "runs stage $id, emits success once and discards trailing commands",
    (stage) => {
      const game = new GameController();
      game.selectStage(STAGES.indexOf(stage));
      game.setMode("code");
      const solution = solveStage(stage)!;
      [...solution, "left" as const].forEach(game.input);
      let saved = 0;
      game.onClear = () => saved++;
      game.run();
      game.tick(30000);
      game.tick(30000);
      expect(game.getSnapshot()).toMatchObject({
        won: true,
        failure: null,
        busy: false,
        pose: expect.objectContaining(stage.goal),
        activeIndex: solution.length - 1,
      });
      expect(saved).toBe(1);
      expect(game.getSnapshot().commands).toHaveLength(solution.length + 1);
    },
  );
});
