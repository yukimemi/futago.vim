// =============================================================================
// File        : start_chat.ts
// Author      : yukimemi
// Last Change : 2024/01/28 11:29:27.
// =============================================================================

import * as batch from "https://deno.land/x/denops_std@v6.1.0/batch/mod.ts";
import * as buffer from "https://deno.land/x/denops_std@v6.1.0/buffer/mod.ts";
import * as option from "https://deno.land/x/denops_std@v6.1.0/option/mod.ts";
import { Futago } from "../futago.ts";
import { GenerationConfigSchema } from "../schema/generation_config.ts";
import { HistorySchema } from "../schema/history.ts";
import { OpenerSchema } from "../schema/opener.ts";
import { SafetySettingsSchema } from "../schema/safety_settings.ts";
import { getNow } from "../util.ts";
import { type Denops } from "https://deno.land/x/denops_core@v6.0.5/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { DEFAULT_AI_PROMPT, DEFAULT_HUMAN_PROMPT, DEFAULT_MODEL, SEPARATOR } from "../consts.ts";

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
    await option.filetype.setBuffer(denops, buf.bufnr, "markdown");
    await option.buftype.setBuffer(denops, buf.bufnr, "acwrite");
    await option.buflisted.setBuffer(denops, buf.bufnr, true);
    await option.swapfile.setBuffer(denops, buf.bufnr, false);
    await option.wrap.setBuffer(denops, buf.bufnr, true);
    await option.modified.setBuffer(denops, buf.bufnr, false);
    await buffer.replace(denops, buf.bufnr, [`${params.humanPrompt}: ${now}`, SEPARATOR, ""]);
  });

  await denops.cmd("normal! G");

  return futago;
}
