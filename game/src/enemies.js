// enemies.js — bats and falling stalactites, the cavern's hazards.
// Both spawn from the right or above and escalate with the wave.

export function createEnemies() {
  return {
    bats: [],
    stalactites: [],
    batTimer: 1.6,
    stalactiteTimer: 2.4,
  };
}

export function resetEnemies(enemies) {
  enemies.bats = [];
  enemies.stalactites = [];
  enemies.batTimer = 1.6;
  enemies.stalactiteTimer = 2.4;
}

export function batSpawnInterval(wave) {
  return Math.max(0.7, 2.1 - 0.16 * (wave - 1));
}

export function stalactiteSpawnInterval(wave) {
  return Math.max(1.1, 3.2 - 0.24 * (wave - 1));
}

function spawnBat(enemies, world) {
  const speed = (150 + world.rng() * 60) * (1 + 0.1 * (world.wave - 1));
  enemies.bats.push({
    x: world.width + 30,
    y: 120 + world.rng() * (world.height - 240),
    baseY: 0,
    radius: 16,
    speed,
    bobAmp: 18 + world.rng() * 26,
    bobFreq: 1.6 + world.rng() * 1.4,
    phase: world.rng() * Math.PI * 2,
    flapPhase: world.rng() * Math.PI * 2,
  });
  const bat = enemies.bats[enemies.bats.length - 1];
  bat.baseY = bat.y;
}

function spawnStalactite(enemies, world) {
  const x = 90 + world.rng() * (world.width - 180);
  enemies.stalactites.push({
    x,
    y: -30,
    radius: 13,
    length: 34 + world.rng() * 26,
    vy: 0,
    fallSpeed: (240 + world.rng() * 90) * (1 + 0.09 * (world.wave - 1)),
    warnUntil: null,
    wobble: world.rng() * Math.PI * 2,
  });
}

// Advance spawn timers, move bats and stalactites, drop the ones off-screen.
export function updateEnemies(enemies, world, dt, now) {
  enemies.batTimer -= dt;
  if (enemies.batTimer <= 0) {
    spawnBat(enemies, world);
    enemies.batTimer = batSpawnInterval(world.wave);
  }

  enemies.stalactiteTimer -= dt;
  if (enemies.stalactiteTimer <= 0) {
    spawnStalactite(enemies, world);
    enemies.stalactiteTimer = stalactiteSpawnInterval(world.wave);
  }

  for (const bat of enemies.bats) {
    bat.x -= bat.speed * dt;
    bat.phase += bat.bobFreq * dt;
    bat.y = bat.baseY + Math.sin(bat.phase) * bat.bobAmp;
    bat.flapPhase += dt * 11;
  }
  enemies.bats = enemies.bats.filter((bat) => bat.x > -50);

  for (const rock of enemies.stalactites) {
    if (rock.warnUntil === null) {
      // Brief warning shimmer at the ceiling before it lets go.
      rock.warnUntil = now + 0.55;
    } else if (now >= rock.warnUntil) {
      rock.vy = rock.fallSpeed;
    }
    rock.y += rock.vy * dt;
    rock.wobble += dt * 3;
  }
  enemies.stalactites = enemies.stalactites.filter((rock) => rock.y < world.height + 80);
}
