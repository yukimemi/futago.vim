// =============================================================================
// File        : start_chat.ts
// Author      : yukimemi
// Last Change : 2024/11/02 19:37:06.
// =============================================================================

import * as batch from "jsr:@denops/std@7.3.2/batch";
import * as buffer from "jsr:@denops/std@7.3.2/buffer";
import * as fn from "jsr:@denops/std@7.3.2/function";
import type { Denops } from "jsr:@denops/std@7.3.2";
import { DEFAULT_AI_PROMPT, DEFAULT_HUMAN_PROMPT, DEFAULT_MODEL, SEPARATOR } from "../consts.ts";
import { Futago } from "../futago.ts";
import { GenerationConfigSchema } from "../schema/generation_config.ts";
import { HistorySchema } from "../schema/history.ts";
import { OpenerSchema } from "../schema/opener.ts";
import { SafetySettingsSchema } from "../schema/safety_settings.ts";
import { getNow } from "../util.ts";
import { z } from "npm:zod@3.23.8";

export const StartChatParamsSchema = z.object({
  model: z.string().default(DEFAULT_MODEL),
  db: z.instanceof(Deno.Kv),
  chatDir: z.string(),
  opener: OpenerSchema,
  safetySettings: SafetySettingsSchema.optional(),
  generationConfig: GenerationConfigSchema.optional(),
  history: HistorySchema.optional(),
  humanPrompt: z.string().default(DEFAULT_HUMAN_PROMPT),
  aiPrompt: z.string().default(DEFAULT_AI_PROMPT),
  debug: z.boolean().default(false),
});

export type StartChatParams = z.infer<typeof StartChatParamsSchema>;

export async function startChat(
  denops: Denops,
  params: StartChatParams,
): Promise<Futago> {
  const now = getNow();
  const bufname = `futago://chat/${now}`;
  const buf = await buffer.open(denops, bufname, { opener: params.opener });

  const {
    model,
    db,
    chatDir,
    safetySettings,
    generationConfig,
    history,
    humanPrompt = DEFAULT_HUMAN_PROMPT,
    aiPrompt = DEFAULT_AI_PROMPT,
    debug = false,
  } = params;
  const futago = new Futago(
    buf.bufnr,
    model,
    db,
    z.string().parse(chatDir),
    { safetySettings, generationConfig, debug, humanPrompt, aiPrompt },
  );
  const parsed = HistorySchema.safeParse(history);
  if (parsed.success) {
    futago.startChat({ history: parsed.data });
  } else {
    futago.startChat();
  }

  await batch.batch(denops, async () => {
    await fn.setbufvar(denops, buf.bufnr, "&filetype", "markdown");
    await fn.setbufvar(denops, buf.bufnr, "&buftype", "acwrite");
    await fn.setbufvar(denops, buf.bufnr, "&buflisted", true);
    await fn.setbufvar(denops, buf.bufnr, "&swapfile", false);
    await fn.setbufvar(denops, buf.bufnr, "&wrap", true);
    await fn.setbufvar(denops, buf.bufnr, "&modified", false);

    await buffer.replace(denops, buf.bufnr, [`${params.humanPrompt}: ${now}`, SEPARATOR, ""]);
  });

  await denops.cmd("normal! G");

  return futago;
}
