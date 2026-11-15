// main.ts — Ember Run entry program (Node 22, standard library only).
//
// Copies game/ and screenshots/ from beside this file into the output
// directory (/output, or $MAKEFUN_OUTPUT_DIR when set) and writes
// /output/dossier.json via buildDossier from ./vendor/makefun-game.ts.
//
// The program runs twice in the sandbox and must emit identical bytes:
// it writes only file contents, never timestamps or random values.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function failFast() {
  // The hand-in is meaningless without the playable game itself.
  const index = join(repoRoot, 'game', 'index.html');
  if (!existsSync(index) || !statSync(index).isFile()) {
    throw new Error('main.ts: game/index.html is missing — refusing to hand in an empty game');
  }
  const shots = readdirSync(join(repoRoot, 'screenshots')).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) {
    throw new Error(`main.ts: screenshots/ holds ${shots.length} images, expected 3 or 4`);
  }
}

function copyEntryTree() {
  mkdirSync(outputDir, { recursive: true });
  for (const name of ['game', 'screenshots']) {
    const source = join(repoRoot, name);
    const target = join(outputDir, name);
    if (!existsSync(source)) {
      throw new Error(`main.ts: missing ${name}/ beside main.ts`);
    }
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
    cpSync(source, target, { recursive: true });
  }
}

function main() {
  failFast();
  copyEntryTree();
  const dossier = buildDossier(outputDir, DOSSIER_CAPS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  const gameFiles = readdirSync(join(outputDir, 'game'), { recursive: true }).length;
  const shotFiles = readdirSync(join(outputDir, 'screenshots')).length;
  console.log(`ember-run: handed in ${gameFiles} game entries, ${shotFiles} screenshots, dossier.json ${dossier.length} bytes -> ${outputDir}`);
}

main();
