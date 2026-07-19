import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_DIR = join(ROOT, "public", "img", "taiwan-food-wars", "titles");
const DOC = readFileSync(join(ROOT, "subdocs", "題庫", "taiwan-food-wars.md"), "utf8");
const KEYS = [
  "hotpot-taro",
  "curry-mix",
  "danbing-batter-crispy",
  "meatball-fried-steamed",
  "cold-noodle-sauce",
  "rice-noodle-thick-thin",
  "north-south-zongzi",
  "beef-noodle-braised-clear",
  "runbing-sweet-savory",
  "rice-cake-style",
  "coriander",
  "meat-soup-thickness",
  "luroufan-mix",
  "savory-food-sweetness",
  "fried-chicken-cut",
  "mainstream",
];

function readWebpSize(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  assert.equal(buffer.toString("ascii", 12, 16), "VP8 ");

  const signature = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
  assert.notEqual(signature, -1, "missing VP8 frame signature");
  return {
    width: buffer.readUInt16LE(signature + 3) & 0x3fff,
    height: buffer.readUInt16LE(signature + 5) & 0x3fff,
  };
}

test("taiwan-food-wars has exactly 16 mapped 512px title badges", () => {
  const expectedFiles = KEYS.map((key) => `${key}.webp`).sort();
  const actualFiles = readdirSync(ASSET_DIR).filter((name) => name.endsWith(".webp")).sort();
  assert.deepEqual(actualFiles, expectedFiles);

  for (const key of KEYS) {
    const relativePath = `/img/taiwan-food-wars/titles/${key}.webp`;
    const row = DOC.split("\n").find((line) => line.startsWith(`| \`${key}\` |`));
    assert.ok(row?.includes(`\`${relativePath}\``), `${key} documentation mapping is missing`);

    const filePath = join(ASSET_DIR, `${key}.webp`);
    const byteLength = statSync(filePath).size;
    assert.ok(byteLength >= 30 * 1024, `${key} is smaller than 30KB`);
    assert.ok(byteLength <= 50 * 1024, `${key} is larger than 50KB`);
    assert.deepEqual(readWebpSize(readFileSync(filePath)), { width: 512, height: 512 });
  }
});
