import { compileCc65 } from "../../api";
import { SplitCompileButton } from "../shared/SplitCompileButton";
import type { PlatformProvider, PlatformToolbarProps } from "../types";

// cc65's optimizer is a set of distinct flags rather than a numeric scale: -O is the base optimizer,
// -Oi/-Or/-Os each layer on one extra optimization on top of it.
const OPT_LEVELS = [
  { id: "", label: "Optimize: default (none)" },
  { id: "O", label: "Optimize: -O (basic)" },
  { id: "Oi", label: "Optimize: -Oi (inline runtime functions)" },
  { id: "Or", label: "Optimize: -Or (honour register keyword)" },
  { id: "Os", label: "Optimize: -Os (inline known functions)" },
];

function Cc65CompileButton(props: PlatformToolbarProps & { onCompile: () => void; isCompiling: boolean }) {
  return <SplitCompileButton {...props} levels={OPT_LEVELS} formatMainLabel={(lvl) => lvl} />;
}

export const cc65Provider: PlatformProvider = {
  id: "cc65",
  ToolbarOptions: null,
  CompileControl: Cc65CompileButton,
  compile: (source, targetId, options) => compileCc65(source, targetId, options.optLevel),
};
