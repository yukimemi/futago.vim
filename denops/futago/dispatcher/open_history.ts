// =============================================================================
// File        : open_history.ts
// Author      : yukimemi
// Last Change : 2024/01/28 01:47:40.
// =============================================================================

import * as batch from "https://deno.land/x/denops_std@v6.0.1/batch/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.0.1/function/mod.ts";
import { type Denops } from "https://deno.land/x/denops_core@v6.0.5/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { walk } from "https://deno.land/std@0.216.0/fs/walk.ts";

export const openHistoryParamsSchema = z.object({
  chatDir: z.string(),
});
export type OpenHistoryParams = z.infer<typeof openHistoryParamsSchema>;

export async function openHistory(
  denops: Denops,
  params: OpenHistoryParams,
): Promise<void> {
  try {
    const chatFiles: string[] = [];
    const chatDir = params.chatDir;
    for await (
      const entry of walk(chatDir, {
        maxDepth: 1,
        includeDirs: false,
      })
    ) {
      chatFiles.push(entry.path);
    }
    chatFiles.sort().reverse();
    await batch.batch(denops, async (denops) => {
      await fn.setqflist(denops, [], " ", {
        title: `Chat History`,
        efm: "%f",
        lines: chatFiles,
      });
    });
    await denops.cmd("botright copen");
  } catch (e) {
    console.error(`open_history.ts`, e);
  }
}
