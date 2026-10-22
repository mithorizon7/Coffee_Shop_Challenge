import { pathToFileURL } from "node:url";

export function isSupportedRuntime(version) {
  const parts = version.replace(/^v/, "").split(".").map(Number);
  const [major, minor, patch] = parts;
  const minimum = { 22: [23, 4], 24: [22, 1], 26: [12, 1] }[major];
  return (
    parts.length === 3 &&
    parts.every(Number.isInteger) &&
    minimum !== undefined &&
    (minor > minimum[0] || (minor === minimum[0] && patch >= minimum[1]))
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!isSupportedRuntime(process.version)) {
    console.error(
      "Use Node.js 22.23.4+, 24.22.1+, or 26.12.1+ on a supported LTS line. See .nvmrc."
    );
    process.exitCode = 1;
  } else {
    console.log(`Node.js runtime meets the October 21, 2026 baseline: ${process.version}`);
  }
}
