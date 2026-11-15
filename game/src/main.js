// main.js — Ember Run: game loop and state machine.
// Wires input, audio, world, enemies, player and rendering together.
// Screens: title → playing ⇄ paused → over → playing (restart).

import { createInput } from './input.js';
import { createSoundEngine } from './audio.js';
import { createPlayer, resetPlayer, updatePlayer, damagePlayer, touchesPlayer, isInvulnerable } from './player.js';
import { createWorld, resetWorld, updateWorld, collectEmber, waveSpeedMultiplier } from './world.js';
import { createEnemies, resetEnemies, updateEnemies } from './enemies.js';
import {
  createRenderer,
  drawTitleScreen,
  drawGameScene,
  drawPauseScreen,
  drawGameOverScreen,
  buttonAt,
  VIEW_WIDTH,
  VIEW_HEIGHT,
} from './render.js';
import { readShotParams, stageShotScene } from './shots.js';

const canvas = document.getElementById('game');
const input = createInput(canvas);
const sound = createSoundEngine();
const renderer = createRenderer(canvas);

const state = {
  screen: 'title', // 'title' | 'playing' | 'paused' | 'over'
  score: 0,
  bestScore: loadBestScore(),
  combo: 0,
  comboUntil: 0,
  shakeUntil: 0,
  shakeMagnitude: 0,
  now: 0,
  player: createPlayer(VIEW_WIDTH, VIEW_HEIGHT),
  world: createWorld(VIEW_WIDTH, VIEW_HEIGHT),
  enemies: createEnemies(),
};

function loadBestScore() {
  try {
    return Number.parseInt(window.localStorage.getItem('ember-run-best') || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore() {
  try {
    window.localStorage.setItem('ember-run-best', String(state.bestScore));
  } catch {
    // Storage unavailable (private mode, headless): best score stays in memory.
  }
}

function startGame() {
  resetPlayer(state.player);
  resetWorld(state.world);
  resetEnemies(state.enemies);
  state.score = 0;
  state.combo = 0;
  state.comboUntil = 0;
  state.screen = 'playing';
  state.world.waveBannerText = 'WAVE 1';
  state.world.waveBannerUntil = state.now + 2.2;
  sound.unlock();
  sound.playClick();
}

function endGame() {
  state.screen = 'over';
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    saveBestScore();
  }
  sound.playGameOver();
}

function togglePause() {
  if (state.screen === 'playing') {
    state.screen = 'paused';
    sound.playClick();
  } else if (state.screen === 'paused') {
    state.screen = 'playing';
    sound.playClick();
  }
}

function handleButtons() {
  if (!input.pointer.down) return;
  const id = buttonAt(renderer, input.pointer.x, input.pointer.y);
  if (!id) return;
  input.pointer.down = false; // consume the click
  sound.unlock();
  if (id === 'start' || id === 'restart') startGame();
  else if (id === 'pause') togglePause();
  else if (id === 'resume') togglePause();
}

function handleKeys() {
  if (input.wasPressed('Enter', 'Space')) {
    sound.unlock();
    if (state.screen === 'title' || state.screen === 'over') startGame();
  }
  if (input.wasPressed('r', 'R')) {
    if (state.screen === 'playing' || state.screen === 'paused' || state.screen === 'over') startGame();
  }
  if (input.wasPressed('p', 'P')) {
    togglePause();
  }
  if (input.wasPressed('m', 'M')) {
    sound.toggleMute();
  }
}

// Check ember pickups and hazard collisions for this frame.
function resolveCollisions() {
  const { player, world, enemies } = state;

  for (let i = world.embers.length - 1; i >= 0; i--) {
    const ember = world.embers[i];
    if (touchesPlayer(player, ember)) {
      world.embers.splice(i, 1);
      const gained = collectEmber(world, ember, state.now);
      state.score += gained;
      state.combo = state.now < state.comboUntil ? state.combo + 1 : 1;
      state.comboUntil = state.now + 3;
      sound.playPickup(state.combo);
      if (gained > ember.value) sound.playWave();
    }
  }

  if (isInvulnerable(player, state.now)) return;

  const hitByBat = enemies.bats.some((bat) => touchesPlayer(player, bat));
  const hitByRock = enemies.stalactites.some(
    (rock) => rock.vy > 0 && touchesPlayer(player, { x: rock.x, y: rock.y + rock.length / 2, radius: rock.radius }),
  );
  if (hitByBat || hitByRock) {
    const dead = damagePlayer(player, state.now);
    state.combo = 0;
    state.shakeUntil = state.now + 0.35;
    state.shakeMagnitude = 9;
    sound.playHit();
    if (dead) endGame();
  }
}

function update(dt) {
  handleKeys();
  handleButtons();

  if (state.screen === 'title') {
    // Idle drift behind the title: embers float by, firefly hovers.
    updateWorld(state.world, dt, state.now);
    state.player.wingPhase += dt * 14;
    state.player.glowPhase += dt * 3.2;
    state.player.y = 300 + Math.sin(state.now * 1.2) * 12;
    return;
  }
  if (state.screen !== 'playing') return;

  updateWorld(state.world, dt, state.now);
  updateEnemies(state.enemies, state.world, dt, state.now);
  updatePlayer(state.player, input, dt, state.now);
  resolveCollisions();
}

function render() {
  const { ctx } = renderer;
  ctx.save();
  if (state.now < state.shakeUntil) {
    const mag = state.shakeMagnitude * (state.shakeUntil - state.now) / 0.35;
    ctx.translate((Math.random() - 0.5) * mag * 2, (Math.random() - 0.5) * mag * 2);
  }
  if (state.screen === 'title') drawTitleScreen(renderer, state, state.now);
  else if (state.screen === 'paused') drawPauseScreen(renderer, state, state.now);
  else if (state.screen === 'over') drawGameOverScreen(renderer, state, state.now);
  else drawGameScene(renderer, state, state.now);
  ctx.restore();
}

let lastTimestamp = 0;

function frame(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000 || 0.016);
  lastTimestamp = timestamp;
  state.now = timestamp / 1000;
  update(dt);
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}

function boot() {
  const shot = readShotParams();
  if (shot) {
    // Deterministic screenshot scene: stage it and render one frame.
    stageShotScene(state, shot.shot, shot.seed);
    state.now = 12.5;
    render();
    document.title = `Ember Run — shot ${shot.shot}`;
    return;
  }
  requestAnimationFrame(frame);
}

boot();
