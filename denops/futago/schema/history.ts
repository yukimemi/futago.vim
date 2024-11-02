// =============================================================================
// File        : history.ts
// Author      : yukimemi
// Last Change : 2024/11/02 18:54:27.
// =============================================================================

import { z } from "npm:zod@3.23.8";
import { InputContent } from "https://esm.sh/@google/generative-ai@0.2.1";

export const InputContentSchema = z.record(z.any()).transform((v) => v as InputContent);
export const HistorySchema = z.array(z.record(z.any()).transform((v) => v as InputContent));
export type History = z.infer<typeof HistorySchema>;
