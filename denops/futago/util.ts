// =============================================================================
// File        : util.ts
// Author      : yukimemi
// Last Change : 2025/11/02 11:29:26.
// =============================================================================

import * as datetime from "@std/datetime";
import * as fn from "@denops/std/function";
import type { Denops } from "@denops/std";

export function getNow(): string {
  return datetime.format(new Date(), "yyyy-MM-ddTHH-mm-ss.SSS");
}

export async function getLastLineNumber(denops: Denops, bufnr: number): Promise<number> {
  const lines = await fn.getbufline(denops, bufnr, 1, "$");
  return lines.length;
}
