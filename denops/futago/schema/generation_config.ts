// =============================================================================
// File        : generation_config.ts
// Author      : yukimemi
// Last Change : 2025/11/02 11:32:00.
// =============================================================================

import { z } from "zod";
import { GenerationConfig } from "@google/generative-ai";

export const GenerationConfigSchema = z.record(z.string(), z.any()).transform((v) =>
  v as GenerationConfig
);
