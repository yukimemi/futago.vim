// =============================================================================
// File        : generation_config.ts
// Author      : yukimemi
// Last Change : 2024/01/21 22:28:04.
// =============================================================================

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { GenerationConfig } from "https://esm.sh/@google/generative-ai@0.2.0";

export const GenerationConfigSchema = z.record(z.any()).transform((v) => v as GenerationConfig);
