// Runs REAL Python (CPython compiled to WebAssembly by Pyodide) in the learner's browser.
//
// - Pyodide is downloaded from the CDN the first time someone runs Python (~10 MB, then cached).
// - It runs in a Web Worker, so an endless loop never freezes the page: after a time limit the
//   worker is stopped and a fresh one is started for the next run.
// - A small built-in `turtle` module records drawing commands in the same format as the
//   JavaScript sandbox, so Python drawings appear on the KidsCode turtle canvas.
// - Code runs on the learner's own device; nothing is executed on the server.

const PYODIDE_VERSION = '0.27.7';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const RUN_TIMEOUT_MS = 8000;
const LOAD_TIMEOUT_MS = 90000;

// Python's turtle uses x right / y up, heading in degrees anticlockwise from east, starting at
// (0, 0) facing east - exactly like desktop Python. Commands are relative moves/turns.
const TURTLE_SHIM = String.raw`
import sys, math, json, types, builtins

_t = types.ModuleType('turtle')
_t._cmds = []
_t._state = {}
_LIMIT = 5000

def _cmd(c):
    if len(_t._cmds) < _LIMIT:
        _t._cmds.append(c)

def _reset():
    _t._cmds.clear()
    _t._state.update(x=0.0, y=0.0, heading=0.0)
    _cmd({'type': 'right', 'angle': 90})   # the KidsCode canvas turtle starts facing up; Python's faces east

def _num(v, name):
    try:
        return float(v)
    except Exception:
        raise TypeError(name + '() needs a number')

def _turn(delta):
    delta = ((delta + 180) % 360) - 180
    if delta:
        _cmd({'type': 'left', 'angle': delta})
        _t._state['heading'] = (_t._state['heading'] + delta) % 360

def forward(d):
    d = _num(d, 'forward')
    h = math.radians(_t._state['heading'])
    _t._state['x'] += d * math.cos(h)
    _t._state['y'] += d * math.sin(h)
    _cmd({'type': 'forward', 'dist': d})

def backward(d):
    forward(-_num(d, 'backward'))

def left(a):
    a = _num(a, 'left')
    _cmd({'type': 'left', 'angle': a})
    _t._state['heading'] = (_t._state['heading'] + a) % 360

def right(a):
    left(-_num(a, 'right'))

def setheading(h):
    _turn(_num(h, 'setheading') - _t._state['heading'])

def heading():
    return _t._state['heading']

def position():
    return (round(_t._state['x'], 2), round(_t._state['y'], 2))

def goto(x, y=None):
    if y is None:
        x, y = x
    x, y = _num(x, 'goto'), _num(y, 'goto')
    dx, dy = x - _t._state['x'], y - _t._state['y']
    dist = math.hypot(dx, dy)
    if dist > 1e-9:
        old = _t._state['heading']
        setheading(math.degrees(math.atan2(dy, dx)))
        forward(dist)
        setheading(old)

def home():
    goto(0, 0)
    setheading(0)

def circle(radius, extent=None, steps=None):
    # Same algorithm as CPython's turtle.circle: positive radius bends left.
    radius = _num(radius, 'circle')
    extent = 360.0 if extent is None else _num(extent, 'circle')
    if steps is None:
        frac = abs(extent) / 360.0
        steps = 1 + int(min(11 + abs(radius) / 6.0, 59.0) * frac)
    w = extent / steps
    w2 = 0.5 * w
    l = 2.0 * radius * math.sin(math.radians(w2))
    if radius < 0:
        l, w, w2 = -l, -w, -w2
    left(w2)
    for _ in range(steps):
        forward(l)
        left(w)
    left(-w2)

def _colour(args):
    if len(args) == 1 and isinstance(args[0], str):
        return args[0]
    vals = args[0] if len(args) == 1 else args
    if len(vals) == 3:
        r, g, b = (float(v) for v in vals)
        if max(r, g, b) <= 1.0:
            r, g, b = r * 255, g * 255, b * 255
        return 'rgb(%d, %d, %d)' % (r, g, b)
    raise TypeError('colour must be a name like "red" or (r, g, b)')

def pencolor(*args):
    if args:
        _cmd({'type': 'color', 'color': _colour(args)})

def color(*args):
    if args:
        pencolor(args[0] if len(args) <= 2 else args)

def penup():
    _cmd({'type': 'penUp'})

def pendown():
    _cmd({'type': 'penDown'})

def clear():
    _cmd({'type': 'clear'})

def reset():
    clear()
    penup(); home(); pendown()

def _noop(*args, **kwargs):
    return None

fd, bk, back, rt, lt = forward, backward, backward, right, left
pu, up, pd, down, seth, pos = penup, penup, pendown, pendown, setheading, position
for _name in ['speed', 'shape', 'hideturtle', 'ht', 'showturtle', 'st', 'pensize', 'width', 'bgcolor',
              'title', 'done', 'mainloop', 'exitonclick', 'tracer', 'update', 'colormode', 'fillcolor',
              'begin_fill', 'end_fill', 'setup', 'delay']:
    setattr(_t, _name, _noop)

class Turtle:
    """turtle.Turtle(): every Turtle shares the one KidsCode pen."""
    def __getattr__(self, name):
        return getattr(_t, name)

class Screen:
    def __getattr__(self, name):
        return _noop

Pen = RawTurtle = Turtle

for _name, _val in list(globals().items()):
    if not _name.startswith('__') and _name not in ('sys', 'math', 'json', 'types', 'builtins', '_t', '_LIMIT'):
        setattr(_t, _name, _val)
_t._reset = _reset
_t._commands_json = lambda: json.dumps(_t._cmds)
sys.modules['turtle'] = _t

def _no_input(prompt=''):
    raise RuntimeError('input() is not available here yet - give your variable a value instead, e.g. name = "Amina"')
builtins.input = _no_input
`;

const WORKER_SOURCE = `
importScripts('${PYODIDE_URL}pyodide.js');
let pyodide;
const ready = (async () => {
  pyodide = await loadPyodide({ indexURL: '${PYODIDE_URL}' });
  pyodide.runPython(${JSON.stringify(TURTLE_SHIM)});
})();
ready.then(() => postMessage({ type: 'ready' }), (e) => postMessage({ type: 'loadError', error: String(e && e.message || e) }));

// Keep only the part of a Python traceback that is about the learner's code.
function cleanError(msg) {
  const lines = String(msg).split('\\n');
  const start = lines.findIndex((l) => l.includes('File "<exec>"'));
  const kept = start === -1 ? lines.slice(-1) : ['Traceback (most recent call last):', ...lines.slice(start)];
  return kept.join('\\n').replace(/File "<exec>"/g, 'File "your code"').trim();
}

onmessage = async (e) => {
  const { id, code } = e.data;
  try { await ready; } catch { return; }
  const out = [];
  pyodide.setStdout({ batched: (s) => out.push(s) });
  pyodide.setStderr({ batched: (s) => out.push(s) });
  pyodide.runPython('import turtle; turtle._reset()');
  const ns = pyodide.globals.get('dict')();
  let error = null;
  try {
    await pyodide.runPythonAsync(code, { globals: ns });
  } catch (err) {
    error = cleanError(err && err.message ? err.message : err);
  } finally {
    ns.destroy();
  }
  const turtle = JSON.parse(pyodide.runPython('import turtle; turtle._commands_json()'));
  postMessage({ type: 'result', id, output: out, error, turtle: turtle.length > 1 ? turtle : [] });
};
`;

let worker = null;
let readyPromise = null;
let nextId = 1;

function startWorker() {
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
  worker = new Worker(url);
  URL.revokeObjectURL(url);
  readyPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Python took too long to load. Check your internet connection and try again.')), LOAD_TIMEOUT_MS);
    const onMessage = (e) => {
      if (e.data.type === 'ready') { clearTimeout(timer); worker.removeEventListener('message', onMessage); resolve(); }
      if (e.data.type === 'loadError') { clearTimeout(timer); worker.removeEventListener('message', onMessage); reject(new Error(`Python could not load: ${e.data.error}`)); }
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Python could not load. Check your internet connection and try again.')); });
  });
  readyPromise.catch(() => stopWorker());
}

function stopWorker() {
  if (worker) worker.terminate();
  worker = null;
  readyPromise = null;
}

/** True once Python has been downloaded in this page (so "Loading Python…" can be skipped). */
export const isPythonLoaded = () => Boolean(worker && readyPromise);

/** Start downloading Python early (e.g. when a Python activity opens). */
export function preloadPython() {
  if (!worker) startWorker();
  return readyPromise;
}

/**
 * Run Python code. Resolves to { output: string[], error: string|null, turtle: commands[] }.
 * onStatus('loading' | 'running') lets the page show what is happening.
 */
export async function runPython(code, { onStatus } = {}) {
  if (!worker) startWorker();
  if (onStatus) onStatus('loading');
  await readyPromise;
  if (onStatus) onStatus('running');
  const id = nextId++;
  return new Promise((resolve) => {
    const current = worker;
    const timer = setTimeout(() => {
      current.removeEventListener('message', onMessage);
      stopWorker(); // the only way to stop an endless loop; a fresh Python starts next time
      resolve({ output: [], turtle: [], error: `Your program ran for more than ${RUN_TIMEOUT_MS / 1000} seconds, so it was stopped. Is there a loop that never ends?` });
    }, RUN_TIMEOUT_MS);
    const onMessage = (e) => {
      if (e.data.type !== 'result' || e.data.id !== id) return;
      clearTimeout(timer);
      current.removeEventListener('message', onMessage);
      resolve({ output: e.data.output, error: e.data.error, turtle: e.data.turtle });
    };
    current.addEventListener('message', onMessage);
    current.postMessage({ id, code });
  });
}
