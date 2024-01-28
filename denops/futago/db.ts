// =============================================================================
// File        : db.ts
// Author      : yukimemi
// Last Change : 2024/01/28 10:24:09.
// =============================================================================

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { GenerationConfigSchema } from "./schema/generation_config.ts";
import { SafetySettingsSchema } from "./schema/safety_settings.ts";
import { HistorySchema } from "./schema/history.ts";

export const KvKeySchema = z.string();
export type KvKey = z.infer<typeof KvKeySchema>;

export const KvValueSchema = z.object({
  model: z.string(),
  generationConfig: GenerationConfigSchema.optional(),
  safetySettings: SafetySettingsSchema.optional(),
  humanPrompt: z.string(),
  aiPrompt: z.string(),
  history: HistorySchema,
});
export type KvValue = z.infer<typeof KvValueSchema>;

export async function getDb(db: Deno.Kv, key: KvKey): Promise<KvValue | undefined> {
  const lastData = await db.get([key]);
  if (lastData.value) {
    const parsed = KvValueSchema.safeParse(lastData.value);
    if (parsed.success) {
      return parsed.data;
    }
  }
}

export async function setDb(db: Deno.Kv, key: KvKey, value: KvValue): Promise<void> {
  await db.set([key], {
    model: value.model,
    generationConfig: value.generationConfig,
    safetySettings: value.safetySettings,
    humanPrompt: value.humanPrompt,
    aiPrompt: value.aiPrompt,
    history: value.history,
  });
}
