// =============================================================================
// File        : history.ts
// Author      : yukimemi
// Last Change : 2024/11/03 00:00:20.
// =============================================================================

import { z } from "npm:zod@3.24.3";
import { Content } from "npm:@google/generative-ai@0.24.1";

export const ContentSchema = z.record(z.any()).transform((v) => v as Content);
export const HistorySchema = z.array(z.record(z.any()).transform((v) => v as Content));
export type History = z.infer<typeof HistorySchema>;
