import { STAGES } from "./stages";

const KEY = "ttotto-star-walk-v1";
export type Saved = { sound: boolean; cleared: number[] };
export function readSaved(): Saved {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      sound: typeof value?.sound === "boolean" ? value.sound : true,
      cleared: Array.isArray(value?.cleared)
        ? [
            ...new Set<number>(
              value.cleared.filter(
                (id: unknown) =>
                  Number.isInteger(id) &&
                  STAGES.some((stage) => stage.id === id),
              ),
            ),
          ]
        : [],
    };
  } catch {
    return { sound: true, cleared: [] };
  }
}
export function writeSaved(saved: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false;
  }
}
