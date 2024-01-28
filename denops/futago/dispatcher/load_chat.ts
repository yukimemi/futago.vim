// =============================================================================
// File        : load_chat.ts
// Author      : yukimemi
// Last Change : 2024/01/28 09:59:55.
// =============================================================================

import * as batch from "https://deno.land/x/denops_std@v5.3.0/batch/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.3.0/function/mod.ts";
import * as option from "https://deno.land/x/denops_std@v5.3.0/option/mod.ts";
import { Futago } from "../futago.ts";
import { type Denops } from "https://deno.land/x/denops_core@v5.0.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getDb } from "../db.ts";
import { basename, extname } from "https://deno.land/std@0.205.0/path/mod.ts";

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
    await option.filetype.setBuffer(denops, bnr, "markdown");
    await option.buftype.setBuffer(denops, bnr, "acwrite");
    await option.buflisted.setBuffer(denops, bnr, true);
    await option.swapfile.setBuffer(denops, bnr, false);
    await option.wrap.setBuffer(denops, bnr, true);
    await option.modified.setBuffer(denops, bnr, false);
  });

  const currentBufnr = await fn.bufnr(denops);
  if (currentBufnr === bnr) {
    await denops.cmd("normal! G");
  }

  return futago;
}
