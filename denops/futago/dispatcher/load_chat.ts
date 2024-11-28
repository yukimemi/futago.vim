// =============================================================================
// File        : load_chat.ts
// Author      : yukimemi
// Last Change : 2024/11/04 01:16:38.
// =============================================================================

import * as batch from "jsr:@denops/std@7.4.0/batch";
import * as buffer from "jsr:@denops/std@7.4.0/buffer";
import * as fn from "jsr:@denops/std@7.4.0/function";
import type { Denops } from "jsr:@denops/std@7.4.0";
import { Futago } from "../futago.ts";
import { basename, extname } from "jsr:@std/path@1.0.8";
import { getDb } from "../db.ts";
import { getNow } from "../util.ts";
import { z } from "npm:zod@3.23.8";

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
  const bufPath = await fn.fnamemodify(denops, await fn.bufname(denops, bufnr), ":p");
  const chatTitle = basename(bufPath, extname(bufPath));
  const lastDb = await getDb(db, chatTitle);
  if (lastDb == undefined) {
    throw new Error(`Chat ${chatTitle} history is not found`);
  }
  const lines = await fn.getbufline(denops, bufnr, 1, "$");
  const now = getNow();
  const bufname = `futago://chat/${now}`;
  const buf = await buffer.open(denops, bufname);
  await denops.cmd(`bwipeout! ${bufnr}`);

  const futago = new Futago(
    buf.bufnr,
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
  futago.chatPath = bufPath;
  futago.startChat({ history: lastDb.history });

  await batch.batch(denops, async () => {
    await fn.setbufvar(denops, buf.bufnr, "&filetype", "markdown");
    await fn.setbufvar(denops, buf.bufnr, "&buftype", "acwrite");
    await fn.setbufvar(denops, buf.bufnr, "&buflisted", true);
    await fn.setbufvar(denops, buf.bufnr, "&swapfile", false);
    await fn.setbufvar(denops, buf.bufnr, "&wrap", true);
    await fn.setbufvar(denops, buf.bufnr, "&modified", false);

    await buffer.replace(denops, buf.bufnr, lines);
  });

  await denops.cmd("normal! G");

  return futago;
}
