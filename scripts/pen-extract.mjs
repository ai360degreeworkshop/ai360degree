// Pull a Pencil frame's JSON out of a saved MCP tool-result file.
//
// `execute` responses are written verbatim under
// .claude/projects/<project>/<session>/tool-results/. A frame dump is far too
// large to move through the conversation, so the frame is printed with a marker
// ahead of it and recovered here — on disk, without re-emitting the bytes.
//
//   node scripts/pen-extract.mjs <marker> <outFile> [toolResultsDir]
//
// The marker line is `@@PENFRAME:<id>@@`; the JSON is everything after the
// following `JSONSTART` line.
import fs from "node:fs";
import path from "node:path";

const [marker, outFile, dir] = process.argv.slice(2);
if (!marker || !outFile) {
  console.error("usage: pen-extract.mjs <marker> <outFile> [toolResultsDir]");
  process.exit(1);
}

const resultsDir =
  dir ??
  "/Users/vaibhavrajawat/.claude/projects/-Users-vaibhavrajawat-Documents-ai360degree/7e9f6575-6869-4aa1-96ed-226ab2ca3275/tool-results";

// Newest first: a re-run should win over a stale dump.
const files = fs
  .readdirSync(resultsDir)
  .filter((name) => name.endsWith(".txt"))
  .map((name) => path.join(resultsDir, name))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (!text.includes(marker)) continue;

  const start = text.indexOf("JSONSTART");
  if (start === -1) continue;

  // The frame JSON is a single line; anything after it is the padding that forced
  // the result to spill to disk in the first place, so stop at the next newline.
  const afterMarker = text.indexOf("\n", start) + 1;
  const lineEnd = text.indexOf("\n", afterMarker);
  const json = (
    lineEnd === -1 ? text.slice(afterMarker) : text.slice(afterMarker, lineEnd)
  ).trim();
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    console.error(`${file}: found marker but JSON did not parse (${error.message})`);
    continue;
  }

  fs.writeFileSync(outFile, JSON.stringify(parsed));
  console.log(
    `ok ${path.basename(file)} -> ${outFile} | ${parsed.name} | ${parsed.width}x${parsed.height} | ${json.length} bytes`,
  );
  process.exit(0);
}

console.error(`no tool-result file contains marker ${marker}`);
process.exit(1);
