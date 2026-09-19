import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const url = process.env.GAME_URL || "http://127.0.0.1:5173";
const output = "output/playwright/feedback";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const errors = [], checks = [], measurements = [];
const pass = (name) => { checks.push(name); console.log(`PASS ${name}`); };
try {
  for (const [width, height] of [[1440, 1000], [1024, 768], [768, 650], [390, 844], [360, 800], [320, 740]]) {
    const touch = width <= 390;
    const context = await browser.newContext({viewport: {width, height}, hasTouch: touch, isMobile: touch});
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const act = async (locator) => touch ? locator.tap() : locator.click();
    const button = (name) => page.getByRole("button", {name, exact: true});
    const command = (name) => act(page.locator(`[data-command=${name}]`));
    const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
    const idle = () => page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).busy);
    const settle = () => page.waitForTimeout(100);
    const layout = () => page.evaluate(() => {
      const r = document.querySelector("canvas").getBoundingClientRect();
      return {canvas: {x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height}, bounds: window.game_world_bounds(), scale: visualViewport.scale};
    });
    const shot = (name) => page.screenshot({path: `${output}/${width}-${name}.png`, fullPage: true});
    const mode = async (name) => { await act(button("놀이 메뉴")); await act(button(name)); await settle(); };
    const marker = () => page.evaluate(() => window.game_world_view().stoppedTile);
    const assertFailure = async (reason, pose) => {
      const s = await state();
      assert.equal(s.failure, reason);
      assert.deepEqual(s.pose, pose);
      assert.equal(s.busy, false);
      assert.deepEqual(await marker(), {x: pose.x, y: pose.y});
      assert.equal(await page.locator(`.failure-message[data-failure=${reason}]`).isVisible(), true);
      assert.equal(await page.getByText("별에 닿지 못했어", {exact: true}).isVisible(), true);
      assert.equal(await button("다시 실행").isVisible(), true);
    };
    await page.goto(url);
    await page.waitForSelector("canvas[data-ready=true]");
    await settle();
    const first = await layout();
    await act(page.locator("canvas"));
    await settle();
    assert.deepEqual(await layout(), first, `${width}: blank first touch`);
    if ([1440, 390].includes(width)) await shot("start");
    await command("forward");
    await idle();
    await settle();
    const after = await layout();
    assert.deepEqual(after, first, `${width}: first command changed world size/projection`);
    if ([1440, 390].includes(width)) await shot("first-command");
    await act(button("처음부터"));
    await settle();
    assert.deepEqual(await layout(), first, `${width}: reset changed world size/projection`);
    // A long direct history must not add scrollbar height or move the board.
    for (let i = 0; i < 22; i++) {
      await page.keyboard.press("ArrowRight");
      await page.evaluate(() => window.advanceTime(400));
    }
    await settle();
    assert.deepEqual(await layout(), first, `${width}: overflowing history changed world size`);
    measurements.push({width, height, before: first, after});
    pass(`${width}x${height}: blank touch, first command, reset and history overflow have zero layout/projection change`);

    await mode("순서 만들기");
    const codeLayout = await layout();
    await command("forward");
    await settle();
    assert.deepEqual(await layout(), codeLayout, `${width}: first code card`);
    await act(button("실행"));
    await idle(); // Real requestAnimationFrame timing, no clock fast-forward.
    await settle();
    await assertFailure("incomplete", {x: 2, y: 2, direction: 0});
    assert.deepEqual(await layout(), codeLayout, `${width}: failure resized the board`);
    assert.equal(await page.locator(".command-card.current").count(), 0);
    const targets = await page.locator(".movement-buttons button,.run-button").evaluateAll((buttons) => buttons.map((b) => ({w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height})));
    targets.forEach((b) => assert.ok(b.w >= 55.9 && b.h >= 55.9, `${width} touch size ${JSON.stringify(b)}`));
    const contentsFit = await page.locator(".failure-message").evaluate((el) => {
      const a = el.getBoundingClientRect(), b = el.parentElement.getBoundingClientRect();
      return a.top >= b.top && a.bottom <= b.bottom && el.scrollWidth <= el.clientWidth;
    });
    assert.equal(contentsFit, true, `${width}: failure feedback clipped`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    (await layout()).bounds.forEach((p) => assert.ok(Math.abs(p.x) < 1 && Math.abs(p.y) < 1));
    await shot("incomplete");

    // Unchanged retry starts from the original pose, not the stopped cell.
    await act(button("다시 실행"));
    assert.equal((await state()).failure, null);
    assert.deepEqual((await state()).pose, {x: 2, y: 3, direction: 0});
    assert.equal(await marker(), null);
    await idle();
    await assertFailure("incomplete", {x: 2, y: 2, direction: 0});
    await command("forward");
    await command("forward");
    await assertFailure("incomplete", {x: 2, y: 2, direction: 0});
    await act(button("다시 실행"));
    await page.evaluate(() => window.advanceTime(2000));
    await settle();
    assert.equal((await state()).won, true);
    assert.equal(await marker(), null);
    assert.equal(await page.locator(".failure-message").count(), 0);
    pass(`${width}x${height}: incomplete result, visible stopped tile, stable feedback, retry from start, edit and success`);

    if ([1440, 390].includes(width)) {
      await act(button("처음부터"));
      await act(button("모두 지우기"));
      await command("backward");
      await command("backward");
      await command("forward");
      await act(button("실행"));
      await page.evaluate(() => window.advanceTime(2000));
      await settle();
      await assertFailure("blocked", {x: 2, y: 4, direction: 0});
      assert.equal((await state()).failedIndex, 1);
      assert.equal(await page.locator(".command-card.failed").count(), 1);
      assert.deepEqual(await layout(), codeLayout);
      await shot("blocked");
      await act(button("2번째 뒤로 지우기"));
      await assertFailure("blocked", {x: 2, y: 4, direction: 0});
      await act(button("다시 실행"));
      await act(button("멈추기"));
      await page.evaluate(() => window.advanceTime(1000));
      await settle();
      assert.equal((await state()).failure, null);
      assert.equal((await state()).playing, false);
      assert.equal(await marker(), null);
      await act(button("실행"));
      await page.evaluate(() => window.advanceTime(2000));
      await settle();
      assert.equal((await state()).failure, "incomplete");
      await act(button("처음부터"));
      await settle();
      assert.equal((await state()).failure, null);
      assert.equal(await marker(), null);
      await act(button("실행"));
      await page.evaluate(() => window.advanceTime(2000));
      await mode("직접 움직이기");
      assert.equal((await state()).failure, null);
      assert.equal(await marker(), null);
      pass(`${width}x${height}: moved-then-blocked position retained, failed card, edit, retry, intentional stop, reset and mode cleanup`);
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  pass("No console errors or uncaught exceptions");
} finally {
  await fs.writeFile(`${output}/report.json`, JSON.stringify({url, checks, errors, measurements}, null, 2));
  await browser.close();
}
