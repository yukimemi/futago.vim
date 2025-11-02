// =============================================================================
// File        : history.ts
// Author      : yukimemi
// Last Change : 2025/11/02 11:32:09.
// =============================================================================

import { z } from "zod";
import { Content } from "@google/generative-ai";

export const ContentSchema = z.record(z.string(), z.any()).transform((v) => v as Content);
export const HistorySchema = z.array(z.record(z.string(), z.any()).transform((v) => v as Content));
export type History = z.infer<typeof HistorySchema>;
