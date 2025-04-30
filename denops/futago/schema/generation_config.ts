// =============================================================================
// File        : generation_config.ts
// Author      : yukimemi
// Last Change : 2024/11/02 23:49:19.
// =============================================================================

import { z } from "npm:zod@3.24.3";
import { GenerationConfig } from "npm:@google/generative-ai@0.24.1";

export const GenerationConfigSchema = z.record(z.any()).transform((v) => v as GenerationConfig);
