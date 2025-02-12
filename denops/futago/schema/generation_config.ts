// =============================================================================
// File        : generation_config.ts
// Author      : yukimemi
// Last Change : 2024/11/02 23:49:19.
// =============================================================================

import { z } from "npm:zod@3.24.2";
import { GenerationConfig } from "npm:@google/generative-ai@0.21.0";

export const GenerationConfigSchema = z.record(z.any()).transform((v) => v as GenerationConfig);
