// =============================================================================
// File        : generation_config.ts
// Author      : yukimemi
// Last Change : 2024/11/02 18:52:00.
// =============================================================================

import { z } from "npm:zod@3.23.8";
import { GenerationConfig } from "https://esm.sh/@google/generative-ai@0.2.1";

export const GenerationConfigSchema = z.record(z.any()).transform((v) => v as GenerationConfig);
