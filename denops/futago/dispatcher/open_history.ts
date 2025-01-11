// =============================================================================
// File        : open_history.ts
// Author      : yukimemi
// Last Change : 2024/11/02 19:07:09.
// =============================================================================

import * as batch from "jsr:@denops/std@7.4.0/batch";
import * as fn from "jsr:@denops/std@7.4.0/function";
import type { Denops } from "jsr:@denops/std@7.4.0";
import { walk } from "jsr:@std/fs@1.0.9";
import { z } from "npm:zod@3.24.1";

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
