// render.js — everything drawn on the canvas: the cavern, the firefly,
// embers, bats, stalactites, the HUD, and the title / pause / game-over
// screens. All art is drawn with canvas paths; no image assets.

export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 600;

const INK = '#e9e6f5';
const DIM_INK = '#9d97bd';
const EMBER_CORE = '#ffd76a';
const EMBER_HALO = 'rgba(255, 150, 50, 0.55)';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, buttons: [] };
}

function clearScreen(renderer, now) {
  const { ctx } = renderer;
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  grad.addColorStop(0, '#0a0e24');
  grad.addColorStop(0.55, '#141033');
  grad.addColorStop(1, '#0b0a20');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

function drawRidge(ctx, points, top, fill) {
  ctx.beginPath();
  ctx.moveTo(-4, top ? 0 : VIEW_HEIGHT);
  for (const p of points) ctx.lineTo(p.x, p.y);
  ctx.lineTo(VIEW_WIDTH + 4, top ? 0 : VIEW_HEIGHT);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCavern(renderer, world, now) {
  const { ctx } = renderer;
  clearScreen(renderer, now);

  // Distant crystals, softly pulsing.
  for (const crystal of world.crystals) {
    const pulse = 0.55 + 0.45 * Math.sin(now * 1.4 + crystal.phase);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.35 * pulse;
    ctx.shadowColor = crystal.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = crystal.color;
    ctx.beginPath();
    ctx.moveTo(crystal.x, crystal.y - crystal.size);
    ctx.lineTo(crystal.x + crystal.size * 0.55, crystal.y + crystal.size * 0.6);
    ctx.lineTo(crystal.x - crystal.size * 0.55, crystal.y + crystal.size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Rock ceiling and floor.
  drawRidge(ctx, world.ceiling, true, '#1c1440');
  drawRidge(ctx, world.floor, false, '#171130');
  ctx.strokeStyle = 'rgba(150, 120, 220, 0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const p of world.ceiling) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.beginPath();
  for (const p of world.floor) ctx.lineTo(p.x, p.y);
  ctx.stroke();

  // Drifting cave dust.
  ctx.fillStyle = 'rgba(200, 190, 240, 0.35)';
  for (const mote of world.motes) {
    const twinkle = 0.5 + 0.5 * Math.sin(now * 2 + mote.phase);
    ctx.globalAlpha = 0.15 + 0.3 * twinkle;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawEmber(ctx, ember, now) {
  const flicker = 0.85 + 0.15 * Math.sin(now * 5 + ember.bobPhase * 3);
  ctx.save();
  ctx.shadowColor = EMBER_HALO;
  ctx.shadowBlur = 18 * flicker;
  const grad = ctx.createRadialGradient(ember.x, ember.y, 1, ember.x, ember.y, ember.radius);
  grad.addColorStop(0, '#fff3c4');
  grad.addColorStop(0.45, EMBER_CORE);
  grad.addColorStop(1, `hsl(${ember.hue} 95% 55% / 0.9)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(ember.x, ember.y, ember.radius * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Four-point sparkle.
  ctx.strokeStyle = 'rgba(255, 240, 190, 0.9)';
  ctx.lineWidth = 1.5;
  const s = ember.radius + 5;
  ctx.beginPath();
  ctx.moveTo(ember.x - s, ember.y);
  ctx.lineTo(ember.x + s, ember.y);
  ctx.moveTo(ember.x, ember.y - s);
  ctx.lineTo(ember.x, ember.y + s);
  ctx.stroke();
}

function drawFirefly(ctx, player, now) {
  const invulnerable = now < player.invulnerableUntil;
  if (invulnerable && Math.floor(now * 12) % 2 === 0) return; // blink

  // Fading trail.
  player.trail.forEach((point, i) => {
    const alpha = (1 - i / player.trail.length) * 0.28;
    ctx.fillStyle = `rgba(255, 200, 90, ${alpha})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, player.radius * (1 - i / player.trail.length) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  });

  const glow = 22 + 7 * Math.sin(player.glowPhase);
  ctx.save();
  ctx.shadowColor = 'rgba(255, 190, 80, 0.9)';
  ctx.shadowBlur = glow;
  // Body: warm amber abdomen, darker head.
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, 13, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2b12';
  ctx.beginPath();
  ctx.arc(player.x + 11, player.y - 1, 5, 0, Math.PI * 2);
  ctx.fill();
  // Glowing lantern tip.
  ctx.fillStyle = '#ffe98a';
  ctx.beginPath();
  ctx.arc(player.x - 11, player.y + 2, 5.5, 0, Math.PI * 2);
  ctx.fill();
  // Wings, beating fast.
  const flap = Math.sin(player.wingPhase) * 7;
  ctx.fillStyle = 'rgba(220, 230, 255, 0.75)';
  ctx.beginPath();
  ctx.ellipse(player.x - 2, player.y - 10 - flap, 9, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(player.x - 2, player.y + 10 + flap, 9, 4, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // Eye.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(player.x + 12, player.y - 3, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBat(ctx, bat, now) {
  const flap = Math.sin(bat.flapPhase) * 10;
  ctx.save();
  ctx.translate(bat.x, bat.y);
  ctx.fillStyle = '#5d448f';
  // Wings.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-14, -18 - flap, -30, -6 - flap);
  ctx.quadraticCurveTo(-16, 2, 0, 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-14, 18 + flap, -30, 6 + flap);
  ctx.quadraticCurveTo(-16, -2, 0, -4);
  ctx.closePath();
  ctx.fill();
  // Body and head.
  ctx.fillStyle = '#3c2a63';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(11, -2, 6, 0, Math.PI * 2);
  ctx.fill();
  // Ears and eyes.
  ctx.fillStyle = '#3c2a63';
  ctx.beginPath();
  ctx.moveTo(8, -7);
  ctx.lineTo(10, -13);
  ctx.lineTo(13, -7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff5d5d';
  ctx.beginPath();
  ctx.arc(13, -3, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStalactite(ctx, rock, now) {
  ctx.save();
  if (rock.vy === 0) {
    // Warning shimmer while it hangs on the ceiling.
    const warn = 0.5 + 0.5 * Math.sin(now * 14);
    ctx.globalAlpha = 0.55 + 0.45 * warn;
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rock.x - 16, 4);
    ctx.lineTo(rock.x + 16, 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const grad = ctx.createLinearGradient(rock.x, 0, rock.x, rock.y + rock.length);
  grad.addColorStop(0, '#6f6390');
  grad.addColorStop(1, '#b8aede');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(rock.x - 13, 0);
  ctx.lineTo(rock.x + 13, 0);
  ctx.lineTo(rock.x + 3, rock.y + rock.length);
  ctx.lineTo(rock.x - 3, rock.y + rock.length);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHud(renderer, state) {
  const { ctx } = renderer;
  ctx.save();
  ctx.textBaseline = 'top';
  // Score panel.
  ctx.fillStyle = 'rgba(10, 10, 30, 0.55)';
  roundRect(ctx, 14, 12, 250, 64, 10);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`SCORE ${state.score}`, 26, 20);
  ctx.font = '15px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = DIM_INK;
  ctx.fillText(`Wave ${state.world.wave}  ·  ${formatTime(state.world.elapsed)}`, 26, 50);

  // Lives as little fireflies.
  for (let i = 0; i < 3; i++) {
    const x = VIEW_WIDTH - 34 - i * 30;
    const y = 30;
    ctx.save();
    if (i < state.player.lives) {
      ctx.shadowColor = 'rgba(255, 190, 80, 0.9)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffb347';
    } else {
      ctx.fillStyle = 'rgba(120, 110, 150, 0.35)';
    }
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = DIM_INK;
  ctx.font = '13px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('LIVES', VIEW_WIDTH - 124, 22);
  ctx.textAlign = 'left';

  // Pause button, top-right below the lives.
  const pause = { id: 'pause', x: VIEW_WIDTH - 108, y: 52, w: 94, h: 30, label: state.paused ? 'RESUME' : 'PAUSE (P)' };
  drawButton(ctx, pause, state.paused);
  renderer.buttons = [pause];

  // Wave banner.
  if (state.world.waveBannerUntil > state.now) {
    const alpha = Math.min(1, (state.world.waveBannerUntil - state.now) / 0.6);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 170, 60, 0.8)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(state.world.waveBannerText, VIEW_WIDTH / 2, 120);
    ctx.font = '16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = INK;
    ctx.shadowBlur = 0;
    ctx.fillText('Faster bats · more embers · sharper rocks', VIEW_WIDTH / 2, 172);
    ctx.restore();
  }

  // Combo toast after a quick pickup streak.
  if (state.combo >= 3 && state.now < state.comboUntil) {
    ctx.save();
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe98a';
    ctx.fillText(`EMBER STREAK ×${state.combo}`, VIEW_WIDTH / 2, 210);
    ctx.restore();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawButton(ctx, button, active = false) {
  ctx.save();
  ctx.fillStyle = active ? 'rgba(255, 180, 70, 0.9)' : 'rgba(40, 32, 80, 0.85)';
  roundRect(ctx, button.x, button.y, button.w, button.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 215, 106, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = active ? '#241a05' : '#ffe98a';
  ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(button.label, button.x + button.w / 2, button.y + button.h / 2 + 1);
  ctx.restore();
}

function drawCenteredTitle(ctx, text, y, size, color, glow = 0) {
  ctx.save();
  ctx.font = `bold ${size}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, VIEW_WIDTH / 2, y);
  ctx.restore();
}

export function drawTitleScreen(renderer, state, now) {
  const { ctx } = renderer;
  drawCavern(renderer, state.world, now);
  // A few decorative embers drifting on the title screen.
  for (const ember of state.world.embers) drawEmber(ctx, ember, now);
  drawFirefly(ctx, state.player, now);

  ctx.save();
  ctx.fillStyle = 'rgba(5, 5, 18, 0.45)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.restore();

  drawCenteredTitle(ctx, 'EMBER RUN', 150, 72, '#ffd76a', 32);
  drawCenteredTitle(ctx, 'a firefly’s flight through the dark cavern', 208, 20, INK);
  drawCenteredTitle(ctx, 'Collect glowing embers. Dodge the bats. Mind the falling rock.', 268, 17, DIM_INK);
  drawCenteredTitle(ctx, '3 lives · waves get faster · every ember is 10 points', 296, 17, DIM_INK);

  const start = { id: 'start', x: VIEW_WIDTH / 2 - 130, y: 350, w: 260, h: 54, label: '▶  START FLYING' };
  drawButton(ctx, start);
  renderer.buttons = [start];

  drawCenteredTitle(ctx, 'Arrows / WASD to fly · hold the mouse to steer · P pause · R restart', 440, 15, DIM_INK);
  drawCenteredTitle(ctx, 'Press Enter or Space, or click START', 470, 15, '#ffe98a');
  drawCenteredTitle(ctx, 'Best score this visit: ' + state.bestScore, 510, 14, DIM_INK);
}

export function drawPauseScreen(renderer, state, now) {
  const { ctx } = renderer;
  drawGameScene(renderer, state, now);
  ctx.save();
  ctx.fillStyle = 'rgba(5, 5, 18, 0.6)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.restore();
  drawCenteredTitle(ctx, 'PAUSED', 220, 56, '#ffd76a', 24);
  drawCenteredTitle(ctx, 'The cavern waits. Your firefly hovers.', 280, 18, INK);
  const resume = { id: 'resume', x: VIEW_WIDTH / 2 - 130, y: 330, w: 260, h: 52, label: '▶  RESUME' };
  const restart = { id: 'restart', x: VIEW_WIDTH / 2 - 130, y: 398, w: 260, h: 52, label: '↻  RESTART (R)' };
  drawButton(ctx, resume);
  drawButton(ctx, restart);
  renderer.buttons = [resume, restart];
}

export function drawGameOverScreen(renderer, state, now) {
  const { ctx } = renderer;
  drawCavern(renderer, state.world, now);
  ctx.save();
  ctx.fillStyle = 'rgba(5, 5, 18, 0.55)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.restore();
  drawCenteredTitle(ctx, 'THE LIGHT FADES', 150, 54, '#ff8a7a', 22);
  drawCenteredTitle(ctx, 'Your firefly gathered all the light it could carry.', 208, 18, INK);
  drawCenteredTitle(ctx, `FINAL SCORE  ${state.score}`, 280, 34, '#ffd76a', 18);
  drawCenteredTitle(ctx, `Embers collected: ${state.world.embersCollected}  ·  Reached wave ${state.world.wave}  ·  Survived ${formatTime(state.world.elapsed)}`, 330, 16, DIM_INK);
  if (state.score >= state.bestScore && state.score > 0) {
    drawCenteredTitle(ctx, '★ NEW BEST SCORE ★', 366, 18, '#ffe98a');
  } else {
    drawCenteredTitle(ctx, `Best score: ${state.bestScore}`, 366, 16, DIM_INK);
  }
  const again = { id: 'restart', x: VIEW_WIDTH / 2 - 130, y: 410, w: 260, h: 54, label: '↻  FLY AGAIN (R)' };
  drawButton(ctx, again);
  renderer.buttons = [again];
  drawCenteredTitle(ctx, 'Press R or click FLY AGAIN', 500, 15, DIM_INK);
}

// The live scene: cavern, embers, hazards, firefly, HUD.
export function drawGameScene(renderer, state, now) {
  const { ctx } = renderer;
  drawCavern(renderer, state.world, now);
  for (const ember of state.world.embers) drawEmber(ctx, ember, now);
  for (const bat of state.enemies.bats) drawBat(ctx, bat, now);
  for (const rock of state.enemies.stalactites) drawStalactite(ctx, rock, now);
  drawFirefly(ctx, state.player, now);
  drawHud(renderer, state);
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Hit-test a canvas point against the buttons drawn on the last frame.
// Returns the button id or null.
export function buttonAt(renderer, x, y) {
  for (const button of renderer.buttons) {
    if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
      return button.id;
    }
  }
  return null;
}
