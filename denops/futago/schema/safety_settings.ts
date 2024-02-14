// =============================================================================
// File        : safety_settings.ts
// Author      : yukimemi
// Last Change : 2024/01/21 22:27:23.
// =============================================================================

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { SafetySetting } from "https://esm.sh/@google/generative-ai@0.2.1";

export const SafetySettingsSchema = z.array(z.record(z.any()).transform((v) => v as SafetySetting));
