import { describe, expect, it } from 'vitest';
import { generateCatalog, mapSignature } from './levelGenerator';
import { STAGES, nextStageIndex, stagesInDifficulty } from './stages';
import { DIFFICULTIES } from './difficulties';
import { solveStage } from './grid';

describe('bulk map production', () => {
  it('ships 120 unique maps, twenty per learning tier', () => {
    expect(STAGES).toHaveLength(120);
    expect(new Set(STAGES.map(s => s.id)).size).toBe(120);
    expect(new Set(STAGES.map(mapSignature)).size).toBe(120);
    for (const tier of DIFFICULTIES) {
      const maps = stagesInDifficulty(tier.id);
      expect(maps).toHaveLength(20);
      expect(maps.map(s => s.ordinal)).toEqual(Array.from({length:20}, (_, i) => i+1));
    }
  });
  it('reproduces the checked-in catalog and preserves existing maps when extending', () => {
    expect(generateCatalog()).toEqual(STAGES);
    const extended = generateCatalog(25);
    expect(extended).toHaveLength(150);
    for (const stage of STAGES) expect(extended.find(s => s.id === stage.id)).toEqual(stage);
  });
  it('changing the seed creates another reproducible batch', () => {
    const alternate = generateCatalog(3, 42);
    expect(alternate).toEqual(generateCatalog(3, 42));
    expect(alternate[6]).not.toEqual(STAGES[6]);
    expect(alternate.every(s => solveStage(s)!.length <= 20)).toBe(true);
  });
  it('keeps every start below the map center, centered horizontally, facing north', () => {
    for (const stage of STAGES) {
      expect(stage.start.direction).toBe(0);
      expect(stage.start.x).toBe((stage.size-1)/2);
      expect(stage.start.y).toBeGreaterThan((stage.size-1)/2);
    }
  });
  it('enforces the learning concept, rather than labeling arbitrary maps as difficulty tiers', () => {
    for (const stage of STAGES) {
      const solution = solveStage(stage)!;
      const turns = solution.filter(c => c === 'left' || c === 'right').length;
      if (stage.difficulty === 1) expect(solution.every(c => c === 'forward')).toBe(true);
      if (stage.difficulty === 2) expect(turns).toBe(1);
      if (stage.difficulty === 3 || stage.difficulty === 4) expect(turns).toBeGreaterThanOrEqual(2);
      if (stage.difficulty === 5) expect(solution[0]).toBe('backward');
      if (stage.difficulty === 6) { expect(turns).toBeGreaterThanOrEqual(4); expect(solution.length).toBeGreaterThanOrEqual(13); }
    }
  });
  it('next play visits each map in its tier and then progresses to the next tier', () => {
    let index = 0;
    const visited = new Set<number>();
    for (let i = 0; i < STAGES.length; i++) {
      expect(visited.has(index)).toBe(false); visited.add(index);
      index = nextStageIndex(index);
    }
    expect(index).toBe(0); expect(visited.size).toBe(120);
  });
  it('rejects invalid generation limits', () => {
    for (const count of [-1, 0, 1.5, 201, NaN]) expect(() => generateCatalog(count)).toThrow();
  });
});
