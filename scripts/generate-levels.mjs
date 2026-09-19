import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
const args = process.argv.slice(2);
const option = (name, fallback) =>
  args.includes(name) ? Number(args[args.indexOf(name) + 1]) : fallback;
const count = option("--per-tier", 20),
  seed = option("--seed", 20260913);
if (!Number.isInteger(seed)) throw new Error("seed must be an integer");
await mkdir("output/generator", { recursive: true });
await build({
  entryPoints: ["src/game/levelGenerator.ts"],
  outfile: "output/generator/catalog.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
});
const require = createRequire(import.meta.url);
const { generateCatalog } = require(
  path.resolve("output/generator/catalog.cjs"),
);
const maps = generateCatalog(count, seed);
await writeFile(
  "src/game/levels.generated.json",
  JSON.stringify(maps, null, 2) + "\n",
);
console.log(
  `Generated ${maps.length} unique, verified maps (${count} per difficulty; seed ${seed}).`,
);
