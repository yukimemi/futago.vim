// =============================================================================
// File        : open_history.ts
// Author      : yukimemi
// Last Change : 2025/11/02 11:33:55.
// =============================================================================

import * as batch from "@denops/std/batch";
import * as fn from "@denops/std/function";
import type { Denops } from "@denops/std";
import { walk } from "@std/fs";
import { z } from "zod";

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
