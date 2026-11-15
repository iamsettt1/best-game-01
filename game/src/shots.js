// shots.js — deterministic screenshot scenes for Ember Run.
// ?shot=start|play|end&seed=1 stages a fixed scene so the screenshots
// are real renders of the game's own code, reproducible from the seed.

import { mulberry32, spawnEmberCluster } from './world.js';

// Read the ?shot= and ?seed= query parameters. Returns null when absent.
export function readShotParams() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  const seed = Number.parseInt(params.get('seed') || '1', 10);
  return { shot, seed: Number.isFinite(seed) ? seed : 1 };
}

// Stage a scene into the live game state. The scene is fully determined
// by the seed: same seed, same layout, every run.
export function stageShotScene(state, shot, seed) {
  const rng = mulberry32(seed * 7919 + 13);
  const { world, enemies, player } = state;

  if (shot === 'start') {
    state.screen = 'title';
    player.x = 640;
    player.y = 300;
    player.vx = 40;
    player.vy = 0;
    world.embers = [];
    for (let i = 0; i < 3; i++) spawnEmberCluster(world);
    for (const ember of world.embers) {
      ember.x = 120 + rng() * 700;
      ember.baseY = 140 + rng() * 320;
      ember.y = ember.baseY;
    }
    return;
  }

  if (shot === 'play') {
    state.screen = 'playing';
    state.score = 340;
    state.combo = 4;
    state.comboUntil = 99999;
    world.wave = 3;
    world.elapsed = 87;
    world.embersCollected = 34;
    world.waveBannerText = 'WAVE 3';
    world.waveBannerUntil = 99999;
    player.x = 300;
    player.y = 280;
    player.vx = 60;
    player.vy = -20;
    player.lives = 2;
    world.embers = [];
    for (let i = 0; i < 4; i++) spawnEmberCluster(world);
    for (const ember of world.embers) {
      ember.x = 180 + rng() * 680;
      ember.baseY = 130 + rng() * 330;
      ember.y = ember.baseY;
    }
    enemies.bats = [
      { x: 620, y: 200, baseY: 200, radius: 16, speed: 180, bobAmp: 24, bobFreq: 2, phase: 0.6, flapPhase: 1.2 },
      { x: 780, y: 400, baseY: 400, radius: 16, speed: 200, bobAmp: 30, bobFreq: 1.8, phase: 2.1, flapPhase: 0.4 },
      { x: 520, y: 130, baseY: 130, radius: 16, speed: 165, bobAmp: 18, bobFreq: 2.4, phase: 4.0, flapPhase: 2.6 },
    ];
    enemies.stalactites = [
      { x: 700, y: 120, radius: 13, length: 52, vy: 260, fallSpeed: 260, warnUntil: 0, wobble: 0.8 },
      { x: 430, y: 40, radius: 13, length: 44, vy: 0, fallSpeed: 240, warnUntil: 99999, wobble: 1.9 },
    ];
    return;
  }

  if (shot === 'end') {
    state.screen = 'over';
    state.score = 480;
    state.bestScore = 480;
    world.wave = 4;
    world.elapsed = 132;
    world.embersCollected = 43;
    player.lives = 0;
    return;
  }
}
