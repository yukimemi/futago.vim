// =============================================================================
// File        : history.ts
// Author      : yukimemi
// Last Change : 2024/01/22 23:54:21.
// =============================================================================

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { InputContent } from "https://esm.sh/@google/generative-ai@0.1.3";

export const HistorySchema = z.array(z.record(z.any()).transform((v) => v as InputContent));
export type History = z.infer<typeof HistorySchema>;
