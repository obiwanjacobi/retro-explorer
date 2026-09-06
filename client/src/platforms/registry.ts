import { cc65Provider } from "./cc65";
import type { PlatformProvider } from "./types";
import { z88dkProvider } from "./z88dk";

/** Maps a toolchain id to its client-side provider. Register new platforms here. */
export const platforms: Record<string, PlatformProvider> = {
  z88dk: z88dkProvider,
  cc65: cc65Provider,
};
