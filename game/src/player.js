// player.js — the firefly: movement, lives, glow and hit handling.

export const PLAYER_RADIUS = 14;
export const PLAYER_START_X = 180;
export const PLAYER_START_Y = 300;
export const PLAYER_MAX_LIVES = 3;

export function createPlayer(canvasWidth, canvasHeight) {
  return {
    x: PLAYER_START_X,
    y: PLAYER_START_Y,
    vx: 0,
    vy: 0,
    radius: PLAYER_RADIUS,
    lives: PLAYER_MAX_LIVES,
    invulnerableUntil: 0,
    wingPhase: 0,
    glowPhase: 0,
    trail: [],
    canvasWidth,
    canvasHeight,
  };
}

export function resetPlayer(player) {
  player.x = PLAYER_START_X;
  player.y = PLAYER_START_Y;
  player.vx = 0;
  player.vy = 0;
  player.lives = PLAYER_MAX_LIVES;
  player.invulnerableUntil = 0;
  player.trail = [];
}

// Steer with acceleration toward the input vector; mouse-follow when the
// pointer is held down inside the canvas. Returns nothing; mutates player.
export function updatePlayer(player, input, dt, now) {
  const accel = 2400;
  const maxSpeed = 340;
  const drag = 0.86;

  let steerX = 0;
  let steerY = 0;
  const keys = input.steerVector();
  if (keys.x !== 0 || keys.y !== 0) {
    steerX = keys.x;
    steerY = keys.y;
  } else if (input.pointer.down && input.pointer.inside) {
    const dx = input.pointer.x - player.x;
    const dy = input.pointer.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 8) {
      steerX = dx / dist;
      steerY = dy / dist;
    }
  }

  player.vx += steerX * accel * dt;
  player.vy += steerY * accel * dt;
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > maxSpeed) {
    player.vx = (player.vx / speed) * maxSpeed;
    player.vy = (player.vy / speed) * maxSpeed;
  }
  // Gentle drag so the firefly glides instead of sliding forever.
  const damp = Math.pow(drag, dt * 60);
  player.vx *= damp;
  player.vy *= damp;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const margin = player.radius + 4;
  player.x = Math.max(margin, Math.min(player.canvasWidth - margin, player.x));
  player.y = Math.max(margin, Math.min(player.canvasHeight - margin, player.y));

  player.wingPhase += dt * (14 + Math.min(18, speed / 22));
  player.glowPhase += dt * 3.2;

  player.trail.unshift({ x: player.x, y: player.y });
  if (player.trail.length > 14) player.trail.pop();
}

export function isInvulnerable(player, now) {
  return now < player.invulnerableUntil;
}

// Apply one hit: lose a life and grant brief invulnerability.
// Returns true when the hit ended the run (no lives left).
export function damagePlayer(player, now) {
  if (isInvulnerable(player, now)) return false;
  player.lives -= 1;
  player.invulnerableUntil = now + 2.0;
  player.vx = -220;
  player.vy = -140;
  return player.lives <= 0;
}

// Circle overlap test between the firefly and another round object.
export function touchesPlayer(player, obj) {
  const dx = player.x - obj.x;
  const dy = player.y - obj.y;
  const reach = player.radius + (obj.radius || 0);
  return dx * dx + dy * dy < reach * reach;
}
