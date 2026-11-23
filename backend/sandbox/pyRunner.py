"""
KidsCode Python runner: runs one learner program (main.py in the current folder).

Started by runPython.js as:  python -u -E -P pyRunner.py main.py

Defence in depth (the Node side also adds a time limit, an output cap, a clean
environment and a throw-away folder):
  - an audit hook blocks running other programs, network access, ctypes, and changing
    or reading files outside the program's own folder and Python's own libraries
  - on Linux, resource limits cap CPU time, memory and file size

Audit hooks are not a complete security boundary on their own. In production also run
the server as an unprivileged user (see docs/DEPLOY_RENDER.md / the VPS notes).

On an uncaught error the runner prints one line to stderr:
  __KC_ERROR__{"name": ..., "message": ..., "line": ..., "traceback": ...}
"""
import json
import os
import sys
import traceback

MARKER = "__KC_ERROR__"
USER_FILE = "main.py"


def limit_resources():
    try:
        import resource  # Linux / macOS only
    except ImportError:
        return
    for name, value in (("RLIMIT_CPU", 6), ("RLIMIT_AS", 1536 * 1024 * 1024), ("RLIMIT_FSIZE", 2 * 1024 * 1024)):
        try:
            limit = getattr(resource, name)
            resource.setrlimit(limit, (value, value))
        except (AttributeError, ValueError, OSError):
            pass


def real(path):
    return os.path.normcase(os.path.realpath(path))


def install_guard(work):
    import site

    work = real(work)
    readable = {work}
    for p in [sys.prefix, sys.base_prefix, sys.exec_prefix, sys.base_exec_prefix, *sys.path]:
        if p and os.path.isdir(p):
            readable.add(real(p))
    try:
        readable.update(real(p) for p in site.getsitepackages())
        readable.add(real(site.getusersitepackages()))
    except Exception:
        pass
    readable = tuple(sorted(readable))

    def inside(path, roots):
        if isinstance(path, int):  # an already-open file descriptor (stdin/stdout)
            return True
        if isinstance(path, bytes):
            path = os.fsdecode(path)
        try:
            p = real(os.fspath(path))
        except Exception:
            return False
        return any(p == r or p.startswith(r + os.sep) for r in roots)

    blocked_prefixes = (
        "subprocess.", "os.system", "os.exec", "os.spawn", "os.posix_spawn", "os.fork", "os.forkpty",
        "os.kill", "os.killpg", "os.startfile", "os.chdir",
        "socket.", "ctypes.", "winreg.", "_winapi.", "msvcrt.", "webbrowser.", "urllib.Request",
        "http.client.", "ftplib.", "smtplib.", "poplib.", "imaplib.", "nntplib.", "telnetlib.",
        "shutil.",
    )
    writes = ("os.remove", "os.unlink", "os.rmdir", "os.rename", "os.replace", "os.mkdir", "os.makedirs",
              "os.chmod", "os.chown", "os.link", "os.symlink", "os.truncate", "os.utime")

    def deny(event):
        raise PermissionError(f"'{event}' is not allowed in the KidsCode practice sandbox")

    def hook(event, args):
        if event.startswith(blocked_prefixes):
            deny(event)
        if event == "open":
            path, mode = args[0], args[1] or "r"
            if path is None:
                return
            writing = any(c in str(mode) for c in "wax+")
            if writing and not inside(path, (work,)):
                deny("writing files outside your program's folder")
            if not writing and not inside(path, readable):
                deny("reading files outside your program's folder")
        elif event in writes:
            if not args or not inside(args[0], (work,)):
                deny(event)
            if event in ("os.rename", "os.replace", "os.link", "os.symlink") and len(args) > 1 and not inside(args[1], (work,)):
                deny(event)
        elif event in ("os.listdir", "os.scandir", "glob.glob"):
            target = args[0] if args and args[0] not in (None, "") else "."
            if not inside(target, readable):
                deny("listing folders outside your program's folder")

    sys.addaudithook(hook)


def report(exc, source_lines):
    name = type(exc).__name__
    line = None
    if isinstance(exc, SyntaxError):
        line = exc.lineno
        message = exc.msg or str(exc)
        text = (exc.text or "").rstrip("\n")
        detail = f'  File "{USER_FILE}", line {line}\n    {text.strip()}\n{name}: {message}' if text else f"{name}: {message}"
    else:
        message = str(exc)
        te = traceback.TracebackException.from_exception(exc)
        te.stack = traceback.StackSummary.from_list([f for f in te.stack if f.filename == USER_FILE])
        for f in te.stack:
            line = f.lineno
        detail = "".join(te.format()).rstrip("\n")
    sys.stdout.flush()
    sys.stderr.write("\n" + MARKER + json.dumps({"name": name, "message": message, "line": line, "traceback": detail}) + "\n")
    sys.stderr.flush()


def main():
    work = os.getcwd()
    with open(os.path.join(work, USER_FILE), encoding="utf-8") as f:
        source = f.read()
    source_lines = source.splitlines()

    # Things the learner's program may want later; importing them first keeps the guard simple.
    import linecache  # noqa: F401  (used by tracebacks)
    import re

    # Data libraries load system DLLs through ctypes while importing (blocked for learner
    # code), so import the ones the program mentions before the guard is switched on.
    for lib in ("numpy", "pandas"):
        if re.search(r"\b" + lib + r"\b", source):
            try:
                __import__(lib)
            except Exception:
                pass  # the learner's own import will report the problem

    limit_resources()
    install_guard(work)

    sys.argv = [USER_FILE]
    namespace = {"__name__": "__main__", "__file__": USER_FILE, "__builtins__": __builtins__}
    try:
        code = compile(source, USER_FILE, "exec")
        exec(code, namespace)
    except SystemExit as exc:
        if exc.code is not None and not isinstance(exc.code, int):
            print(exc.code, file=sys.stderr)
        sys.stdout.flush()
        sys.stderr.flush()
        code = exc.code if isinstance(exc.code, int) else (0 if exc.code is None else 1)
        os._exit(code)
    except BaseException as exc:  # noqa: BLE001 - report every learner error
        report(exc, source_lines)
        sys.stdout.flush()
        os._exit(1)
    sys.stdout.flush()


if __name__ == "__main__":
    main()
