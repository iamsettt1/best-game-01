// input.js — keyboard and mouse state for Ember Run.
// Tracks held keys, one-shot key presses, and pointer position over the canvas.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const pointer = { x: canvas.width / 2, y: canvas.height / 2, down: false, inside: false };

  function keyName(event) {
    const k = event.key;
    if (k === ' ') return 'Space';
    return k.length === 1 ? k.toLowerCase() : k;
  }

  function onKeyDown(event) {
    const name = keyName(event);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(name);
    keys.add(name);
  }

  function onKeyUp(event) {
    keys.delete(keyName(event));
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function onPointerMove(event) {
    const p = canvasPoint(event);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.inside = true;
  }

  function onPointerDown(event) {
    const p = canvasPoint(event);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.down = true;
    pointer.inside = true;
  }

  function onPointerUp() {
    pointer.down = false;
  }

  function onPointerLeave() {
    pointer.inside = false;
    pointer.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

  return {
    keys,
    pressed,
    pointer,
    // True while any of the given keys is held down.
    held(...names) {
      return names.some((n) => keys.has(n));
    },
    // True only on the frame the key went down; consumed by endFrame().
    wasPressed(...names) {
      return names.some((n) => pressed.has(n));
    },
    // Steering vector from held movement keys, normalised.
    steerVector() {
      let x = 0;
      let y = 0;
      if (keys.has('ArrowLeft') || keys.has('a')) x -= 1;
      if (keys.has('ArrowRight') || keys.has('d')) x += 1;
      if (keys.has('ArrowUp') || keys.has('w')) y -= 1;
      if (keys.has('ArrowDown') || keys.has('s')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    // Clear one-shot presses at the end of each frame.
    endFrame() {
      pressed.clear();
    },
  };
}
