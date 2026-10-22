import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Deliberately report locations only, including for history. This is a focused
// pattern scan, not a replacement for provider-side secret scanning.
const patterns = [
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{50,}/,
  /(?:AKIA|ASIA)[A-Z0-9]{16}/,
  /xox[baprs]-[A-Za-z0-9-]{20,}/,
  /sk-(?:proj-|ant-)?[A-Za-z0-9_-]{40,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const locations = new Set();
function inspect(text, label) {
  text.split("\n").forEach((line, index) => {
    if (patterns.some((pattern) => pattern.test(line))) locations.add(`${label}:${index + 1}`);
  });
}
const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const files = git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
  .split("\0")
  .filter(Boolean);
for (const file of files) {
  if (/\.(png|jpe?g|gif|pdf|woff2?|ico|zip)$/i.test(file)) continue;
  try {
    inspect(readFileSync(file, "utf8"), file);
  } catch (error) {
    // Tracked deletions remain in ls-files until the release is staged.
    if (error.code !== "ENOENT") throw error;
  }
}
// Scan every unique reachable historical blob once, without running hooks or filters.
const objects = git(["rev-list", "--objects", "--all"]).trim().split("\n");
const candidates = objects.flatMap((item) => {
  const space = item.indexOf(" ");
  if (space < 0) return [];
  const oid = item.slice(0, space);
  const file = item.slice(space + 1);
  return /\.(png|jpe?g|gif|pdf|woff2?|ico|zip)$/i.test(file) ? [] : [{ oid, file }];
});
const batch = execFileSync("git", ["cat-file", "--batch"], {
  input: candidates.map(({ oid }) => oid).join("\n") + "\n",
  maxBuffer: 256 * 1024 * 1024,
});
let blobs = 0;
let offset = 0;
for (const { oid, file } of candidates) {
  const end = batch.indexOf(10, offset);
  const [actualOid, type, rawSize] = batch.subarray(offset, end).toString("utf8").split(" ");
  const size = Number(rawSize);
  if (actualOid !== oid || end < offset || !Number.isSafeInteger(size) || size < 0) {
    throw new Error("Invalid Git object batch response");
  }
  offset = end + 1;
  if (type === "blob") {
    blobs++;
    inspect(
      batch.subarray(offset, offset + size).toString("utf8"),
      `history/${oid.slice(0, 12)}/${file}`
    );
  }
  offset += size + 1;
}
console.log(
  `Focused credential scan: ${files.length} working files, ${blobs} historical text blobs, ${locations.size} candidate locations.`
);
for (const location of locations) console.log(location);
if (locations.size) process.exitCode = 1;
