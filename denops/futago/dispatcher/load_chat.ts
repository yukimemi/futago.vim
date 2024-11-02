// =============================================================================
// File        : load_chat.ts
// Author      : yukimemi
// Last Change : 2024/11/02 19:34:38.
// =============================================================================

import * as batch from "jsr:@denops/std@7.3.0/batch";
import * as fn from "jsr:@denops/std@7.3.0/function";
import { Futago } from "../futago.ts";
import type { Denops } from "jsr:@denops/std@7.3.0";
import { z } from "npm:zod@3.23.8";
import { getDb } from "../db.ts";
import { basename, extname } from "jsr:@std/path@1.0.8";

export const loadChatParamsSchema = z.object({
  bufnr: z.number(),
  db: z.instanceof(Deno.Kv),
  chatDir: z.string(),
  debug: z.boolean().default(false),
});
export type LoadChatParams = z.infer<typeof loadChatParamsSchema>;

export async function loadChat(
  denops: Denops,
  params: LoadChatParams,
): Promise<Futago> {
  const {
    bufnr,
    db,
    chatDir,
    debug,
  } = params;
  const bufname = await fn.bufname(denops, bufnr);
  const chatTitle = basename(bufname, extname(bufname));
  const lastDb = await getDb(db, chatTitle);
  if (lastDb == undefined) {
    throw new Error(`Chat ${chatTitle} history is not found`);
  }
  const bnr = z.number().parse(bufnr);
  const futago = new Futago(
    bnr,
    lastDb.model,
    db,
    chatDir,
    {
      safetySettings: lastDb.safetySettings,
      generationConfig: lastDb.generationConfig,
      debug: z.boolean().parse(debug),
      humanPrompt: lastDb.humanPrompt,
      aiPrompt: lastDb.aiPrompt,
    },
  );
  futago.chatTitle = chatTitle;
  futago.chatPath = bufname;
  futago.startChat({ history: lastDb.history });

  await batch.batch(denops, async () => {
    await fn.setbufvar(denops, bnr, "&filetype", "markdown");
    await fn.setbufvar(denops, bnr, "&buftype", "acwrite");
    await fn.setbufvar(denops, bnr, "&buflisted", true);
    await fn.setbufvar(denops, bnr, "&swapfile", false);
    await fn.setbufvar(denops, bnr, "&wrap", true);
    await fn.setbufvar(denops, bnr, "&modified", false);
  });

  const currentBufnr = await fn.bufnr(denops);
  if (currentBufnr === bnr) {
    await denops.cmd("normal! G");
  }

  return futago;
}
