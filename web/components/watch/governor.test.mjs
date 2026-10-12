// npm test — Node runs the TypeScript under test directly (type stripping, Node ≥ 22.18).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGovernor } from "./governor.ts";

const feed = (g, ms, n) => {
  for (let i = 0; i < n; i++) g.sample(typeof ms === "number" ? ms : ms());
};

test("a fast page is left alone", () => {
  const seen = [];
  const g = createGovernor(5, (l) => seen.push(l));
  feed(g, 16.7, 1000);
  assert.deepEqual(seen, []);
});

test("a GPU-bound page steps down until it is fast, and stays there", () => {
  let cost = 40; // ms a frame at level 0; each step makes a frame 25% cheaper
  const g = createGovernor(5, (l) => (cost = 40 * Math.pow(0.75, l)));
  feed(g, () => Math.max(16.7, cost), 2000);
  assert.equal(g.level, 3); // 40 → 30 → 22.5 → 16.9
  assert.equal(g.frozen, false);
});

test("one stall is not load", () => {
  const seen = [];
  const g = createGovernor(5, (l) => seen.push(l));
  for (let i = 0; i < 400; i++) g.sample(i % 40 === 7 ? 600 : 16.7);
  assert.deepEqual(seen, []);
});

test("a 30 Hz cap is not load: the step is taken back and the governor stops", () => {
  const seen = [];
  const g = createGovernor(5, (l) => seen.push(l));
  feed(g, 33.3, 2000);
  assert.deepEqual(seen, [1, 0]);
  assert.equal(g.frozen, true);
});

test("it never steps past the last level", () => {
  let cost = 200;
  const g = createGovernor(3, (l) => (cost = 200 - l * 40));
  feed(g, () => cost, 5000);
  assert.equal(g.level, 2);
});
