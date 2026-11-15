// world.js — the cavern: seeded randomness, rock formations, ember
// spawning, and the wave system that escalates speed and density.

export const EMBER_SCORE = 10;
export const EMBERS_PER_WAVE = 15;
export const WAVE_BONUS = 50;

// Deterministic PRNG (mulberry32) so screenshot scenes are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(width, height, seed = 20261115) {
  const rng = mulberry32(seed);
  return {
    width,
    height,
    rng,
    seed,
    // Jagged rock silhouettes along the cavern ceiling and floor.
    ceiling: buildRidge(rng, width, 46, 96),
    floor: buildRidge(rng, width, height - 96, height - 46),
    // Distant glowing crystals embedded in the rock.
    crystals: buildCrystals(rng, width, height),
    // Faint drifting motes of cave dust.
    motes: buildMotes(rng, width, height),
    embers: [],
    emberTimer: 0,
    wave: 1,
    embersCollected: 0,
    embersThisWave: 0,
    elapsed: 0,
    waveBannerUntil: 0,
    waveBannerText: '',
  };
}

// A ridge is a list of {x, y} points forming a jagged rock edge.
function buildRidge(rng, width, minY, maxY) {
  const points = [];
  const step = 64;
  for (let x = 0; x <= width + step; x += step) {
    points.push({ x, y: minY + rng() * (maxY - minY) });
  }
  return points;
}

function buildCrystals(rng, width, height) {
  const crystals = [];
  const palette = ['#7fe7ff', '#b78cff', '#8affc1', '#ff9de2'];
  for (let i = 0; i < 14; i++) {
    crystals.push({
      x: 30 + rng() * (width - 60),
      y: 110 + rng() * (height - 220),
      size: 5 + rng() * 9,
      color: palette[Math.floor(rng() * palette.length)],
      phase: rng() * Math.PI * 2,
    });
  }
  return crystals;
}

function buildMotes(rng, width, height) {
  const motes = [];
  for (let i = 0; i < 42; i++) {
    motes.push({
      x: rng() * width,
      y: rng() * height,
      size: 1 + rng() * 2.2,
      drift: 4 + rng() * 10,
      phase: rng() * Math.PI * 2,
    });
  }
  return motes;
}

export function resetWorld(world) {
  world.embers = [];
  world.emberTimer = 0;
  world.wave = 1;
  world.embersCollected = 0;
  world.embersThisWave = 0;
  world.elapsed = 0;
  world.waveBannerUntil = 0;
  world.waveBannerText = '';
}

export function waveSpeedMultiplier(world) {
  return 1 + 0.14 * (world.wave - 1);
}

export function waveSpawnInterval(world) {
  return Math.max(0.55, 1.5 - 0.11 * (world.wave - 1));
}

// Advance the world clock, drift motes and embers, and spawn new embers.
export function updateWorld(world, dt, now) {
  world.elapsed += dt;
  world.emberTimer -= dt;

  for (const mote of world.motes) {
    mote.x -= mote.drift * dt;
    if (mote.x < -4) {
      mote.x = world.width + 4;
      mote.y = world.rng() * world.height;
    }
  }

  for (const ember of world.embers) {
    ember.x -= ember.drift * dt;
    ember.bobPhase += dt * 2.4;
    ember.y = ember.baseY + Math.sin(ember.bobPhase) * 7;
  }
  world.embers = world.embers.filter((ember) => ember.x > -30);

  if (world.emberTimer <= 0) {
    spawnEmberCluster(world);
    world.emberTimer = waveSpawnInterval(world);
  }
}

// Spawn a small cluster of embers drifting in from the right edge.
export function spawnEmberCluster(world) {
  const count = 2 + Math.floor(world.rng() * 3);
  const baseY = 120 + world.rng() * (world.height - 240);
  for (let i = 0; i < count; i++) {
    world.embers.push({
      x: world.width + 20 + i * 34,
      baseY: Math.max(110, Math.min(world.height - 110, baseY + (world.rng() - 0.5) * 90)),
      y: baseY,
      radius: 10,
      drift: 26 + world.rng() * 22,
      bobPhase: world.rng() * Math.PI * 2,
      hue: 24 + world.rng() * 18,
      value: EMBER_SCORE,
    });
  }
}

// Collect one ember: bump the counters and start the next wave when due.
// Returns the points earned (ember value plus any wave bonus).
export function collectEmber(world, ember, now) {
  world.embersCollected += 1;
  world.embersThisWave += 1;
  let points = ember.value;
  if (world.embersThisWave >= EMBERS_PER_WAVE) {
    world.wave += 1;
    world.embersThisWave = 0;
    points += WAVE_BONUS;
    world.waveBannerText = `WAVE ${world.wave}`;
    world.waveBannerUntil = now + 2.2;
  }
  return points;
}

export function scoreFor(world, embersCollected) {
  return embersCollected * EMBER_SCORE + (world.wave - 1) * WAVE_BONUS;
}
