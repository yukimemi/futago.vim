// =============================================================================
// File        : db.ts
// Author      : yukimemi
// Last Change : 2024/11/03 00:06:34.
// =============================================================================

import { z } from "npm:zod@3.24.3";
import { GenerationConfigSchema } from "./schema/generation_config.ts";
import { SafetySettingsSchema } from "./schema/safety_settings.ts";
import { ContentSchema, HistorySchema } from "./schema/history.ts";

export const RecordSchema = z.object({
  model: z.string(),
  generationConfig: GenerationConfigSchema.optional(),
  safetySettings: SafetySettingsSchema.optional(),
  humanPrompt: z.string(),
  aiPrompt: z.string(),
  history: HistorySchema,
});
export type Record = z.infer<typeof RecordSchema>;

export const RecordMasterSchema = RecordSchema.omit({
  history: true,
});
export type RecordMaster = z.infer<typeof RecordMasterSchema>;

export async function getDb(db: Deno.Kv, key: string): Promise<Record | undefined> {
  const lastData = await db.get([key, "master"]);
  if (lastData.value) {
    const parsed = RecordMasterSchema.safeParse(lastData.value);
    if (parsed.success) {
      const record: Record = { history: [], ...parsed.data };
      const history = db.list({ prefix: [key, "history"] });
      for await (const h of history) {
        const inputContent = ContentSchema.parse(h.value);
        record.history.push(inputContent);
      }
      return record;
    }
  }
}

export async function setDb(db: Deno.Kv, key: string, record: Record): Promise<void> {
  await db.set([key, "master"], {
    model: record.model,
    generationConfig: record.generationConfig,
    safetySettings: record.safetySettings,
    humanPrompt: record.humanPrompt,
    aiPrompt: record.aiPrompt,
  });
  for (const [index, inputContent] of record.history.entries()) {
    await db.set([key, "history", index], inputContent);
  }
}
