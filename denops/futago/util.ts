// =============================================================================
// File        : util.ts
// Author      : yukimemi
// Last Change : 2024/11/02 19:18:28.
// =============================================================================

import * as datetime from "jsr:@std/datetime@0.225.2";
import * as fn from "jsr:@denops/std@7.4.0/function";
import type { Denops } from "jsr:@denops/std@7.4.0";

export function getNow(): string {
  return datetime.format(new Date(), "yyyy-MM-ddTHH-mm-ss.SSS");
}

export async function getLastLineNumber(denops: Denops, bufnr: number): Promise<number> {
  const lines = await fn.getbufline(denops, bufnr, 1, "$");
  return lines.length;
}
