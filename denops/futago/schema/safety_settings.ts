// =============================================================================
// File        : safety_settings.ts
// Author      : yukimemi
// Last Change : 2024/11/02 18:54:25.
// =============================================================================

import { z } from "npm:zod@3.23.8";
import { SafetySetting } from "https://esm.sh/@google/generative-ai@0.2.1";

export const SafetySettingsSchema = z.array(z.record(z.any()).transform((v) => v as SafetySetting));
