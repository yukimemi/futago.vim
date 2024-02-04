// =============================================================================
// File        : util.ts
// Author      : yukimemi
// Last Change : 2024/01/28 00:28:33.
// =============================================================================

import * as datetime from "https://deno.land/std@0.214.0/datetime/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.0.0/function/mod.ts";
import { type Denops } from "https://deno.land/x/denops_core@v6.0.5/mod.ts";

export function getNow(): string {
  return datetime.format(new Date(), "yyyy-MM-ddTHH-mm-ss.SSS");
}

export async function getLastLineNumber(denops: Denops, bufnr: number): Promise<number> {
  const lines = await fn.getbufline(denops, bufnr, 1, "$");
  return lines.length;
}
