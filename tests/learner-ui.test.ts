import assert from "node:assert/strict";
import { test, after } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { buildSync } from "esbuild";

// Bundle with the same automatic JSX runtime as Vite, without adding a browser test runtime.
const directory = mkdtempSync(join(tmpdir(), "coffeeshop-learner-ui-"));
const outfile = join(directory, "completion.cjs");
after(() => rmSync(directory, { recursive: true, force: true }));
buildSync({
  entryPoints: [fileURLToPath(new URL("./completion-render.tsx", import.meta.url))],
  outfile,
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  logLevel: "silent",
});
const { renderCompletion } = createRequire(import.meta.url)(
  outfile
) as typeof import("./completion-render");

test("completion confirms saved progress only after successful account save", () => {
  const html = renderCompletion("saved");
  assert.match(html, /Your result is saved to your account/);
  assert.match(html, /href="\/progress"/);
  assert.match(html, /View saved progress/);
  assert.match(html, /role="status"/);
});

test("completion does not claim success or offer saved progress during a pending save", () => {
  const html = renderCompletion("saving", true);
  assert.match(html, /Saving your result/);
  assert.doesNotMatch(html, /Your result is saved|View saved progress/);
  assert.match(html, /aria-disabled="true"/);
});

test("guest completion explicitly distinguishes unsaved results from future account saves", () => {
  const html = renderCompletion("guest");
  assert.match(html, /not saved to an account/);
  assert.match(html, /before your next run/);
  assert.doesNotMatch(html, /Your result is saved|View saved progress/);
  assert.match(html, /href="\/"/);
});

test("an unknown save outcome never claims a successful save", () => {
  const html = renderCompletion();
  assert.doesNotMatch(html, /Your result is saved|Saving your result|View saved progress/);
});
