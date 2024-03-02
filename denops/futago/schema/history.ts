// =============================================================================
// File        : history.ts
// Author      : yukimemi
// Last Change : 2024/03/02 14:02:57.
// =============================================================================

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { InputContent } from "https://esm.sh/@google/generative-ai@0.2.1";

export const InputContentSchema = z.record(z.any()).transform((v) => v as InputContent);
export const HistorySchema = z.array(z.record(z.any()).transform((v) => v as InputContent));
export type History = z.infer<typeof HistorySchema>;
