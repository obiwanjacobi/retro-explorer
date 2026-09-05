# z88dk Explorer

A Compiler Explorer / SharpLab style tool for the [z88dk](https://github.com/z88dk/z88dk) Z80 C compiler.
Write C code, compile it against a real z88dk target, and see the generated Z80
assembly with linked addresses, instruction bytes, mnemonics, and T-state cycle
counts — with click-to-highlight mapping between C source lines and their
generated instructions.

## Project layout

```text
server/   Node.js + TypeScript + Express API that shells out to zcc (z88dk)
client/   React + TypeScript + Vite frontend (Monaco editor + asm view)
```

## How it works

1. The client posts C source + a target id to `POST /api/compile`.
2. The server writes the source to an isolated temp directory and runs:
   `zcc +<target> --list --c-code-in-asm -m -s -no-cleanup -o main main.c`
3. It parses the resulting `main.c.lis` (per-instruction address/bytes/mnemonic
   plus inlined source comments), `main.c.sym` and `main.map` (to convert
   module-relative addresses into true linked addresses), computes cycle
   counts from a built-in Z80 opcode timing table, and maps every instruction
   back to the C source line it came from.
4. The temp directory is deleted after every request.

## Prerequisites

- [z88dk](https://github.com/z88dk/z88dk) installed locally (`bin/zcc`, `lib/config/`, etc).
- Node.js 18+.

## Setup

```powershell
npm install
copy server\.env.example server\.env
# edit server\.env and set Z88DK_HOME to your z88dk install directory
```

## Running in development

```powershell
npm run dev:server   # starts the API on http://localhost:4000
npm run dev:client   # starts the Vite dev server on http://localhost:5173 (proxies /api to the server)
```

Open <http://localhost:5173>.

## Security notes

- The server never builds a shell command string: it invokes `zcc` via
  `execFile` with a fixed, whitelisted argument array, so user-supplied C code
  cannot inject additional compiler flags or shell metacharacters.
- Only a whitelisted set of `+target` values (see `server/src/compile/targets.ts`)
  can be selected — the client cannot pass arbitrary compiler flags.
- Each compile runs in its own temporary directory that is deleted afterwards,
  with a source-size cap, a process timeout, and a concurrency limit to bound
  resource usage.
- `#include "..."` paths containing `..`, drive letters, or leading slashes are
  rejected before compilation to reduce local file inclusion risk.
- **This still runs the z88dk toolchain directly on the host, not inside a
  container/sandbox.** That's an acceptable tradeoff for local/personal use,
  but if you expose this publicly, put it behind a real sandbox (e.g. run the
  compile step inside a locked-down, resource-limited container).

## Adding more targets

Edit `server/src/compile/targets.ts` and add `{ id, label, zccFlag }` entries
for any additional z88dk `+target` you want to expose in the UI.
