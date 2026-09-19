import { chromium } from "playwright";
import { build } from "esbuild";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
const url = process.env.GAME_URL || "http://127.0.0.1:5173";
const output = "output/playwright/refinement";
await fs.mkdir(output, { recursive: true });
await build({
  entryPoints: ["src/game/grid.ts"],
  outfile: `${output}/grid.cjs`,
  bundle: true,
  platform: "node",
  format: "cjs",
});
const require = createRequire(import.meta.url);
const { solveStage } = require(path.resolve(`${output}/grid.cjs`));
const maps = JSON.parse(
  await fs.readFile("src/game/levels.generated.json", "utf8"),
);
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  checks = [];
const watch = (p) => {
  p.on("pageerror", (error) => errors.push(String(error)));
  p.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
};
watch(page);
const state = () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text()));
const advance = async (ms = 500) => {
  await page.evaluate((ms) => window.advanceTime(ms), ms);
  await page.waitForTimeout(35);
};
const press = (command) => page.locator(`[data-command="${command}"]`).click();
const shot = (name) =>
  page.screenshot({
    path: `${output}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
const openMenu = async () => {
  if (!(await page.locator("dialog[open]").count()))
    await page.getByRole("button", { name: "놀이 메뉴", exact: true }).click();
  await page.locator("dialog[open]").waitFor();
};
const closeMenu = () =>
  page.getByRole("button", { name: "메뉴 닫기", exact: true }).click();
const mode = async (name) => {
  await openMenu();
  await page.getByRole("button", { name, exact: true }).click();
};
const choose = async (difficulty, ordinal = 1) => {
  await openMenu();
  await page
    .getByRole("button", { name: new RegExp(`^${difficulty}단계 `) })
    .click();
  await page
    .getByRole("button", { name: new RegExp(`^${difficulty}-${ordinal} 놀이`) })
    .click();
  await advance(0);
};
const run = () =>
  page.getByRole("button", { name: /^(다시 )?실행$/ }).click();
const reset = async () => {
  await page.getByRole("button", { name: "처음부터", exact: true }).click();
  await advance(0);
};
const pass = (text) => {
  checks.push(text);
  console.log(`PASS ${text}`);
};
try {
  await page.goto(url);
  await page.waitForSelector("canvas[data-ready=true]");
  assert.equal(await page.locator("button:visible").count(), 6);
  assert.equal(await page.locator(".command-list:visible").count(), 0);
  assert.equal(await page.locator(".sound-button:visible").count(), 0);
  const view = await page.evaluate(() => window.game_world_view());
  assert.ok(Math.abs(view.robot.x) < 0.0001);
  assert.ok(view.robot.y < 0);
  assert.ok(view.north.y > view.robot.y);
  assert.ok(Math.abs(view.north.x - view.robot.x) < 0.0001);
  assert.ok(view.east.x > view.robot.x);
  assert.equal((await state()).pose.direction, 0);
  await shot("desktop-start");
  pass(
    "Minimal direct-play UI: six buttons; centered lower start; forward is screen-up",
  );

  await press("forward");
  assert.equal(await page.locator("[data-command=forward]").isDisabled(), true);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  assert.equal((await state()).history.length, 1);
  await advance();
  assert.deepEqual((await state()).pose, { x: 2, y: 2, direction: 0 });
  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("ArrowUp");
  await page.keyboard.up("ArrowUp");
  await advance();
  assert.equal((await state()).history.length, 2);
  await press("forward");
  await advance();
  assert.equal((await state()).won, true);
  await shot("direct-win");
  await page
    .getByRole("button", { name: "이 순서로 코딩하기", exact: true })
    .click();
  assert.equal((await state()).mode, "code");
  assert.deepEqual((await state()).commands, ["forward", "forward", "forward"]);
  assert.deepEqual((await state()).pose, { x: 2, y: 3, direction: 0 });
  pass(
    "Direct movement, repeat/overlap blocking, victory and copying history to code",
  );

  await run();
  assert.equal(await page.locator(".command-card").first().isDisabled(), true);
  assert.equal(
    await page.getByRole("button", { name: "모두 지우기" }).isDisabled(),
    true,
  );
  await page.keyboard.press("ArrowRight");
  assert.equal((await state()).commands.length, 3);
  await page.getByRole("button", { name: "멈추기", exact: true }).click();
  await advance();
  assert.equal((await state()).busy, false);
  assert.deepEqual((await state()).pose, { x: 2, y: 2, direction: 0 });
  await run();
  assert.deepEqual((await state()).pose, { x: 2, y: 3, direction: 0 });
  await advance(2500);
  assert.equal((await state()).won, true);
  await shot("coding-win");
  pass("Code editing lock, finish-current-action stop, and rerun from start");

  await reset();
  await run();
  await reset();
  await advance(2500);
  assert.deepEqual((await state()).pose, { x: 2, y: 3, direction: 0 });
  await run();
  await mode("직접 움직이기");
  await advance(2500);
  assert.equal((await state()).mode, "direct");
  assert.equal((await state()).busy, false);
  await mode("순서 만들기");
  await run();
  await choose(5);
  await advance(2500);
  assert.deepEqual((await state()).pose, maps.find((s) => s.id === 5).start);
  assert.deepEqual((await state()).commands, []);
  pass("Reset, menu mode changes, and level changes cancel execution safely");

  await press("forward");
  await press("backward");
  await press("backward");
  await run();
  await advance(2500);
  assert.equal((await state()).failedIndex, 0);
  assert.equal((await state()).message, "여기서 막혔어. 순서를 바꿔볼까?");
  await shot("blocked-card");
  await page
    .getByRole("button", { name: "1번째 앞으로 지우기", exact: true })
    .click();
  await run();
  await advance(2500);
  assert.equal((await state()).won, true);
  assert.equal((await state()).pose.direction, 0);
  pass(
    "Backward-learning map: collision card, deletion, correction, and success",
  );

  await choose(1);
  await press("forward");
  await run();
  await advance();
  assert.equal((await state()).won, false);
  assert.deepEqual((await state()).commands, ["forward"]);
  await page.getByRole("button", { name: "모두 지우기" }).click();
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  assert.equal((await state()).commands.length, 20);
  await run();
  await advance(4600);
  assert.equal(
    await page.locator(".command-card.current").evaluate((card) => {
      const a = card.getBoundingClientRect(),
        b = card.parentElement.getBoundingClientRect();
      return a.left >= b.left && a.right <= b.right;
    }),
    true,
  );
  assert.deepEqual(
    (await page.evaluate(() => window.game_world_view())).camera,
    view.camera,
  );
  await shot("running-sequence");
  await advance(5000);
  pass(
    "Incomplete programs are editable; 20-card cap and scrolling; camera stays fixed during turns",
  );

  // Three maps per tier, selected and solved through visible controls (not injected state).
  for (let difficulty = 1; difficulty <= 6; difficulty++)
    for (const ordinal of [1, 10, 20]) {
      await choose(difficulty, ordinal);
      const stage = maps.find(
        (s) => s.difficulty === difficulty && s.ordinal === ordinal,
      );
      const solution = solveStage(stage);
      for (const command of [...solution, "left"]) await press(command);
      await run();
      await advance(14000);
      const result = await state();
      assert.equal(result.won, true, `${difficulty}-${ordinal}`);
      assert.equal(result.activeIndex, solution.length - 1);
    }
  await shot("challenge-win");
  pass(
    "18 representative maps across all six tiers solved through UI; goal skips remaining commands",
  );
  await page.getByRole("button", { name: "다음 놀이", exact: false }).click();
  assert.equal((await state()).difficulty, 1);
  assert.equal((await state()).ordinal, 1);
  pass("Next play advances within each tier and wraps after the final map");

  await openMenu();
  await page.getByRole("button", { name: "소리 끄기", exact: true }).click();
  await page.getByRole("button", { name: /^6단계 / }).click();
  assert.equal(await page.locator(".map-choice").count(), 20);
  await shot("desktop-menu");
  const poseBefore = (await state()).pose;
  await page.keyboard.press("ArrowUp");
  assert.deepEqual((await state()).pose, poseBefore);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  await page.reload();
  await page.waitForSelector("canvas[data-ready=true]");
  assert.equal((await state()).cleared.length, 18);
  await openMenu();
  assert.equal(
    await page.getByRole("button", { name: "소리 켜기", exact: true }).count(),
    1,
  );
  await closeMenu();
  pass(
    "Menu has 20 visual map choices; traps gameplay input; Escape closes; progress and sound persist",
  );

  for (const [width, height] of [
    [1440, 1000],
    [1024, 768],
    [844, 390],
    [390, 844],
    [360, 800],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    await choose(6, 20);
    await mode("직접 움직이기");
    await advance(0);
    await page.waitForTimeout(80);
    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      bounds: window.game_world_bounds(),
      view: window.game_world_view(),
      buttons: [
        ...document.querySelectorAll(
          ".play-header button,.movement-buttons button",
        ),
      ].map((b) => ({
        w: b.getBoundingClientRect().width,
        h: b.getBoundingClientRect().height,
      })),
    }));
    assert.ok(layout.width <= width, `overflow ${width}`);
    layout.buttons.forEach((b) =>
      assert.ok(
        b.w >= 55.9 && b.h >= 55.9,
        `touch target ${width}: ${JSON.stringify(b)}`,
      ),
    );
    layout.bounds.forEach((p) =>
      assert.ok(
        Math.abs(p.x) < 1 && Math.abs(p.y) < 1,
        `board cropped ${width}`,
      ),
    );
    assert.ok(
      Math.abs(layout.view.robot.x) < 0.0001 && layout.view.robot.y < 0,
    );
    await page.evaluate(() => scrollTo(0, 0));
    await shot(`layout-${width}x${height}`);
    await openMenu();
    assert.equal(await page.locator(".map-choice").count(), 20);
    await page
      .getByRole("button", { name: /^6-20 놀이/ })
      .scrollIntoViewIfNeeded();
    assert.ok(
      await page.getByRole("button", { name: /^6-20 놀이/ }).isVisible(),
    );
    if (width === 390) await shot("mobile-menu");
    await closeMenu();
  }
  pass(
    "Six PC/mobile sizes: all board corners visible, 56px buttons, usable scrolling menu",
  );

  const touchContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const touchPage = await touchContext.newPage();
  watch(touchPage);
  await touchPage.goto(url);
  await touchPage.waitForSelector("canvas[data-ready=true]");
  for (const command of [
    "left",
    "right",
    "forward",
    "backward",
    "forward",
    "forward",
    "forward",
  ]) {
    await touchPage.locator(`[data-command=${command}]`).tap();
    await touchPage.waitForFunction(
      () => !JSON.parse(window.render_game_to_text()).busy,
    );
  }
  assert.equal(
    await touchPage.evaluate(
      () => JSON.parse(window.render_game_to_text()).won,
    ),
    true,
  );
  assert.equal(
    await touchPage.evaluate(
      () =>
        document.querySelector(".success-panel").getBoundingClientRect().top >=
        document.querySelector("canvas").getBoundingClientRect().bottom,
    ),
    true,
  );
  await touchPage.evaluate(() => scrollTo(0, 0));
  await touchPage.screenshot({
    path: `${output}/mobile-touch-win.png`,
    fullPage: true,
    animations: "disabled",
  });
  await touchPage.getByRole("button", { name: "다음 놀이" }).tap();
  assert.equal(
    await touchPage.evaluate(
      () => JSON.parse(window.render_game_to_text()).ordinal,
    ),
    2,
  );
  await touchContext.close();
  pass(
    "Real animation frames and touch: all directions, victory, unobscured celebration, next map",
  );

  const failPage = await context.newPage();
  await failPage.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  await failPage.goto(url);
  await failPage.getByText("놀이판을 열지 못했어.", { exact: true }).waitFor();
  assert.equal(
    await failPage.locator("[data-command=forward]").isDisabled(),
    true,
  );
  await failPage.close();
  pass("WebGL initialization failure keeps Korean retry guidance");
  assert.deepEqual(errors, []);
  pass("No gameplay console errors or uncaught exceptions");
  await fs.writeFile(
    `${output}/report.json`,
    JSON.stringify({ url, checks, errors, maps: maps.length }, null, 2),
  );
} catch (error) {
  await shot("failure");
  await fs.writeFile(
    `${output}/failure.json`,
    JSON.stringify(
      {
        error: String(error),
        checks,
        errors,
        state: await state().catch(() => null),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
