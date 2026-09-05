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

### Server internals

```text
server/src/
  index.ts, config.ts        Express bootstrap + generic server config (port, timeouts, limits)
  routes/compile.ts           HTTP layer only - no compiler-specific knowledge
  toolchains/
    types.ts                  Toolchain interface + shared CompileResponse/AsmInstruction contract
    registry.ts                Registers toolchains, routes a target id to its owning toolchain
    runCompile.ts               Validates input, applies the global concurrency limit, dispatches
    shared/                    Compiler-agnostic helpers usable by any toolchain
      z80timing.ts               Z80 opcode -> T-state cycle table (any Z80 backend can reuse this)
      validateSource.ts           Source size/null-byte/unsafe-#include checks
      workspace.ts                Temp-dir lifecycle, file reads, source-line splitting
      semaphore.ts                 Generic concurrency limiter
    z88dk/                      Everything specific to the z88dk toolchain lives here
      index.ts                    Exports the `Toolchain` implementation
      config.ts                    Z88DK_HOME / zcc path resolution
      targets.ts                    Whitelisted `+target` flags
      compiler.ts                    Invokes zcc, reads back .lis/.map/.c.sym
      listParser.ts                  Parses z88dk's .lis/.map listing format
```

To add another compiler (e.g. sdcc), create `server/src/toolchains/sdcc/` implementing the
`Toolchain` interface from `toolchains/types.ts`, then add it to the list in
`toolchains/registry.ts`. Nothing in `routes/`, `runCompile.ts`, or the client needs to change -
targets are dispatched to their owning toolchain automatically by id.

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
- Only a whitelisted set of `+target` values (see `server/src/toolchains/z88dk/targets.ts`)
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

## Adding more targets or compilers

- More z88dk targets: edit `server/src/toolchains/z88dk/targets.ts` and add
  `{ id, label, zccFlag }` entries.
- A whole new compiler backend (e.g. sdcc): see "Server internals" above.
