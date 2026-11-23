// Turtle renderer for the playground canvas.
//
// Coordinates: canvas pixels, y grows downwards. Heading is in degrees where -90 = up,
// 0 = right, 90 = down. right(n) adds n (clockwise on screen), left(n) subtracts n.
// The turtle starts in the middle of the canvas facing up.

const DEFAULT_COLOUR = '#4f46e5';
const LINE_WIDTH = 3;
const rad = (deg) => (deg * Math.PI) / 180;

export const createTurtle = (canvas, overlay) => {
  const ctx = canvas.getContext('2d');
  const octx = overlay ? overlay.getContext('2d') : null;
  const state = { x: 0, y: 0, heading: -90, colour: DEFAULT_COLOUR, pen: true };
  let frame = null;

  const paintBackground = () => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
    for (let x = 20; x < canvas.width; x += 20) {
      for (let y = 20; y < canvas.height; y += 20) ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.restore();
  };

  const drawTurtle = () => {
    if (!octx) return;
    octx.clearRect(0, 0, overlay.width, overlay.height);
    octx.save();
    octx.translate(state.x, state.y);
    octx.rotate(rad(state.heading));
    octx.beginPath();
    octx.moveTo(12, 0);
    octx.lineTo(-8, 8);
    octx.lineTo(-4, 0);
    octx.lineTo(-8, -8);
    octx.closePath();
    octx.fillStyle = '#16a34a';
    octx.strokeStyle = '#ffffff';
    octx.lineWidth = 2;
    octx.fill();
    octx.stroke();
    octx.restore();
  };

  const reset = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = null;
    state.x = canvas.width / 2;
    state.y = canvas.height / 2;
    state.heading = -90;
    state.colour = DEFAULT_COLOUR;
    state.pen = true;
    paintBackground();
    drawTurtle();
  };

  const stroke = (draw) => {
    ctx.beginPath();
    draw();
    ctx.strokeStyle = state.colour;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const move = (dist) => {
    const nx = state.x + Math.cos(rad(state.heading)) * dist;
    const ny = state.y + Math.sin(rad(state.heading)) * dist;
    if (state.pen) stroke(() => { ctx.moveTo(state.x, state.y); ctx.lineTo(nx, ny); });
    state.x = nx;
    state.y = ny;
  };

  // Arc that bends to the turtle's right (clockwise for a positive angle).
  // The centre sits `radius` to the right of the turtle; the turtle ends on the circle,
  // turned by `angle`. The position is updated even when the pen is up.
  const arc = (radius, angle) => {
    const r = Math.abs(radius);
    if (!r || !angle) { state.heading += angle; return; }
    const toCentre = rad(state.heading + 90);
    const cx = state.x + Math.cos(toCentre) * r;
    const cy = state.y + Math.sin(toCentre) * r;
    const start = rad(state.heading - 90);
    const end = rad(state.heading - 90 + angle);
    if (state.pen) stroke(() => ctx.arc(cx, cy, r, start, end, angle < 0));
    state.x = cx + Math.cos(end) * r;
    state.y = cy + Math.sin(end) * r;
    state.heading += angle;
  };

  const apply = (cmd) => {
    switch (cmd.type) {
      case 'forward': move(cmd.dist); break;
      case 'backward': move(-cmd.dist); break;
      case 'right': state.heading += cmd.angle; break;
      case 'left': state.heading -= cmd.angle; break;
      case 'color': state.colour = cmd.color || DEFAULT_COLOUR; break;
      case 'penUp': state.pen = false; break;
      case 'penDown': state.pen = true; break;
      case 'clear': paintBackground(); break;
      case 'arc': arc(cmd.radius, cmd.angle); break;
      default: break;
    }
  };

  /** Draw the commands. With animate, it draws a few per frame and resolves when done. */
  const run = (commands = [], { animate = true } = {}) => new Promise((resolve) => {
    if (frame) cancelAnimationFrame(frame);
    // Browsers pause animation frames in hidden tabs, so draw instantly when nobody is watching.
    if (!animate || commands.length === 0 || (typeof document !== 'undefined' && document.hidden)) {
      commands.forEach(apply);
      drawTurtle();
      resolve();
      return;
    }
    // Finish in about 1.5 seconds however long the drawing is.
    const perFrame = Math.max(1, Math.ceil(commands.length / 90));
    let i = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      document.removeEventListener('visibilitychange', onHidden);
      frame = null;
      resolve();
    };
    // Hidden tabs get no animation frames: if the page is hidden part-way through, draw the rest at once.
    const onHidden = () => {
      if (!document.hidden || done) return;
      if (frame) cancelAnimationFrame(frame);
      while (i < commands.length) apply(commands[i++]);
      drawTurtle();
      finish();
    };
    document.addEventListener('visibilitychange', onHidden);
    const started = Date.now();
    const step = () => {
      // Safety net: if frames are slow (busy or background window), finish after 3 seconds.
      const batch = Date.now() - started > 3000 ? commands.length : perFrame;
      for (let n = 0; n < batch && i < commands.length; n++) apply(commands[i++]);
      drawTurtle();
      if (i < commands.length) frame = requestAnimationFrame(step);
      else finish();
    };
    frame = requestAnimationFrame(step);
  });

  reset();
  return { reset, run };
};
