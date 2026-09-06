import { compileCc65 } from "../../api";
import type { PlatformProvider } from "../types";

export const cc65Provider: PlatformProvider = {
  id: "cc65",
  ToolbarOptions: null,
  compile: (source, targetId) => compileCc65(source, targetId),
};
