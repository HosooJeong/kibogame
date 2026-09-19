import catalog from "./levels.generated.json";
import type { Difficulty, Stage } from "./types";
export const STAGES = catalog as Stage[];
export const stagesInDifficulty = (difficulty: Difficulty) =>
  STAGES.filter((stage) => stage.difficulty === difficulty).sort(
    (a, b) => a.ordinal! - b.ordinal!,
  );
export function nextStageIndex(index: number) {
  const stage = STAGES[index];
  const group = stagesInDifficulty(stage.difficulty!);
  const next =
    group.find((item) => item.ordinal === stage.ordinal! + 1) ??
    stagesInDifficulty(((stage.difficulty! % 6) + 1) as Difficulty)[0];
  return STAGES.indexOf(next);
}
