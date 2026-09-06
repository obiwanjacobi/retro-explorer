# Retro Explorer

A Compiler Explorer / SharpLab style tool for retro C compilers. Write C code, compile it against a
real toolchain for a chosen CPU and target machine, and see the generated assembly with linked
addresses, instruction bytes, mnemonics, and cycle counts — with click-to-highlight mapping between
C source lines and their generated instructions.

Currently supported: [z88dk](https://z88dk.org/site/) (Z80) and [cc65](https://cc65.github.io/) (6502).
More platforms (SDCC, CMOC) are planned - see "Adding a new platform" below.

## Deployment (Docker / Azure)

The root [`Dockerfile`](Dockerfile) packages everything into a single deployable image: it builds
z88dk (with zsdcc) and cc65 from source in their own stages, builds the client and server, and
copies all of it into an Ubuntu-based runtime image that serves the built client as static files
alongside the API - no external toolchain install or `.env` is needed at runtime, `Z88DK_HOME`/
`CC65_HOME` point at the toolchains baked into the image.

```
docker build -t retro-explorer .
docker run -p 4000:4000 retro-explorer
```

The z88dk/cc65 build stages are the slow part of the image build (zsdcc in particular); they're
independent of the app-builder stage so app-only changes reuse Docker's cache for them. Push the
built image to Azure Container Registry and deploy it to Azure Container Apps (or App Service for
Containers) - any container host that runs a plain Docker image works, since the app is entirely
self-contained.

## Project layout

```text
server/   Node.js + TypeScript + Express API that shells out to each platform's compiler
client/   React + TypeScript + Vite frontend (Monaco editor + asm view)
```

### Server internals

```text
server/src/
  index.ts, config.ts        Express bootstrap + generic server config (port, timeouts, limits)
  routes/
    catalog.ts                 Read-only GET /api/cpus, /api/targets, /api/toolchains
    z88dk.ts                   POST /api/z88dk/compile - typed/whitelisted body for this platform only
    cc65.ts                    POST /api/cc65/compile - typed/whitelisted body for this platform only
  toolchains/
    cpus.ts                    Static CPU list (Z80, 6502, ...), independent of any toolchain
    types.ts                   Toolchain interface + shared CompileResponse/AsmInstruction contract
    registry.ts                 Registers toolchains; listTargets()/listToolchains()/listCpus() for the catalog route
    runCompile.ts                Generic entry point: source validation + the global concurrency limit
    shared/                    Compiler-agnostic helpers usable by any toolchain
      resolveToolHome.ts          Resolves a `<NAME>_HOME` env var + verifies its main executable exists
      z80timing.ts                Z80 opcode -> T-state cycle table (any Z80 backend can reuse this)
      validateSource.ts           Source size/null-byte/unsafe-#include checks
      workspace.ts                Temp-dir lifecycle, file reads, source-line splitting
      semaphore.ts                 Generic concurrency limiter
    z88dk/                      Everything specific to the z88dk toolchain lives here
      index.ts                    Exports the `Toolchain` implementation (cpus: ["z80"])
      config.ts                    Z88DK_HOME / zcc path resolution
      targets.ts                    Whitelisted `+target` flags
      compilers.ts                   SCCZ80/SDCC compiler backend options
      clibDiscovery.ts                Reads each target's .cfg to discover its `-clib=` variants
      compiler.ts                     Invokes zcc, reads back .lis/.map/.c.sym
      listParser.ts                    Parses z88dk's .lis/.map listing format
    cc65/                       Everything specific to the cc65 toolchain lives here
      index.ts                    Exports the `Toolchain` implementation (cpus: ["6502"])
      config.ts                    CC65_HOME / cl65 path resolution
      targets.ts                    Whitelisted `-t` target systems (currently just "c64")
      cycles6502.ts                   6502 opcode -> cycle-count table
      listing.ts                      Parses cl65's ca65 listing (.lst) + VICE label file (.vice)
      compiler.ts                     Invokes cl65, reads the real bytes back out of the linked binary
```

To add another toolchain: implement the `Toolchain` interface in its own `toolchains/<name>/`
folder, register it in `toolchains/registry.ts`, and add its own `routes/<name>.ts` with a typed zod
schema mounted at `/api/<name>/...` in `server/src/index.ts`. Nothing in `routes/catalog.ts`,
`runCompile.ts`, or the other platforms' routes needs to change.

## How it works

1. The client fetches `/api/cpus` (CPU picker), `/api/toolchains` (platforms supporting the
   selected CPU, each with a `cpus` array), and `/api/targets` (machines per platform).
2. Each platform has its **own** `POST /api/<platform>/compile` endpoint with its own zod-validated
   request body - e.g. z88dk's takes `{source, targetId, compilerId?, clibId?}`, cc65's takes
   `{source, targetId}`. There is no generic/shared compile endpoint and no free-form options bag
   reaches a shell: every field is whitelisted against that platform's own known targets/compilers/
   libraries before the compiler is ever invoked.
3. The server writes the source to an isolated temp directory and runs that platform's compiler
   with a fixed, whitelisted argument array (never a shell string), producing a listing + map/label
   file it can parse back into linked addresses, instruction bytes, and the originating C source
   line, plus a built-in per-CPU cycle-count table.
4. The temp directory is deleted after every request.

### Client provider pattern

```text
client/src/platforms/
  types.ts        PlatformProvider interface: ToolbarOptions (extra controls, or null) + compile()
  registry.ts     Maps a toolchain id -> its provider
  z88dk/index.tsx   Renders the compiler/clib pickers, calls compileZ88dk()
  cc65/index.tsx    No extra controls, calls compileCc65()
```

`App.tsx` only knows about CPUs/toolchains/targets generically; it looks up the active toolchain's
provider and renders whatever extra toolbar controls (if any) that provider needs, and calls the
provider's own `compile()` - which hits that platform's own typed endpoint. Adding a new platform's
client side means adding one `platforms/<name>/index.tsx` and registering it, with no changes to
`App.tsx` itself.

## C library variants (z88dk)

Each z88dk target defines its own set of C library variants (e.g. `default`, `new`, `ansi`,
`noclib`) via `-clib=`. Rather than hardcoding these, `clibDiscovery.ts` reads the actual
`<target>.cfg` file from the installed z88dk and lists whatever it finds, excluding the
`sdcc_ix`/`sdcc_iy`/`clang_*` variants (those bake in a specific compiler backend, which is already
controlled by the separate compiler dropdown). The UI defaults to the target's own `default` clib
(falling back to the first discovered variant if a target doesn't define one) - some targets define
a `default` clib that isn't actually buildable in a given z88dk build, so explicit selections can
fail; that's surfaced as a normal compile diagnostic, not a crash.

## Supported targets

**z88dk (Z80):** a generic bare Z80 target (no specific machine), ZX Spectrum 48K, ZX Spectrum Next,
Timex Sinclair 2068, CP/M, RC2014, MSX, Amstrad CPC, Game Boy, Sega Master System, ColecoVision, SAM
Coupé, Agon Light, Sord M5, Cambridge Z88, NEC PC-88, TRS-80, Enterprise 128 - see
`server/src/toolchains/z88dk/targets.ts` for the full whitelist. z88dk itself supports ~90 targets;
this list is a curated, verified-working subset.

**cc65 (6502):** Commodore 64 - see `server/src/toolchains/cc65/targets.ts`. cc65 supports many more
`-t` targets (Apple II, NES, Atari, ...); only verified-working ones are whitelisted.

## Prerequisites

- [z88dk](https://github.com/z88dk/z88dk) installed locally (`bin/zcc`, `lib/config/`, etc), for the z88dk platform.
- [cc65](https://cc65.github.io/) installed locally (`bin/cl65`, etc), for the cc65 platform.
- Node.js 18+.

## Setup

```powershell
npm install
copy server\.env.example server\.env
# edit server\.env and set Z88DK_HOME / CC65_HOME to your install directories
```

## Running in development

```powershell
npm run dev:server   # starts the API on http://localhost:4000
npm run dev:client   # starts the Vite dev server on http://localhost:5173 (proxies /api to the server)
```

Open <http://localhost:5173>.

## Security notes

- The server never builds a shell command string: it invokes each platform's compiler via
  `execFile` with a fixed, whitelisted argument array, so user-supplied C code cannot inject
  additional compiler flags or shell metacharacters.
- Each platform has its own HTTP route with its own zod schema; only whitelisted target/compiler/
  library ids (checked against that platform's own known lists, e.g.
  `server/src/toolchains/z88dk/targets.ts`) can be selected - the client can never pass arbitrary
  compiler flags or an unvalidated options bag.
- Each compile runs in its own temporary directory that is deleted afterwards,
  with a source-size cap, a process timeout, and a concurrency limit to bound
  resource usage.
- `#include "..."` paths containing `..`, drive letters, or leading slashes are
  rejected before compilation to reduce local file inclusion risk.
- **This still runs each toolchain directly on the host, not inside a
  container/sandbox.** That's an acceptable tradeoff for local/personal use,
  but if you expose this publicly, put it behind a real sandbox (e.g. run the
  compile step inside a locked-down, resource-limited container).

## Adding a new platform

- More targets for an existing platform: edit that platform's `targets.ts` (e.g.
  `server/src/toolchains/z88dk/targets.ts`) and add an entry, after verifying it builds a trivial
  program with the flags in that platform's `compiler.ts`.
- A whole new platform (e.g. SDCC, CMOC): implement `toolchains/<name>/` (see "Server internals"
  above), register it in `toolchains/registry.ts`, add `routes/<name>.ts` with its own zod schema
  mounted in `server/src/index.ts`, and add a matching `client/src/platforms/<name>/index.tsx`
  registered in `client/src/platforms/registry.ts`.
