// =============================================================================
// File        : safety_settings.ts
// Author      : yukimemi
// Last Change : 2024/11/02 23:56:45.
// =============================================================================

import { z } from "npm:zod@3.23.8";
import { SafetySetting } from "npm:@google/generative-ai@0.21.0";

export const SafetySettingsSchema = z.array(z.record(z.any()).transform((v) => v as SafetySetting));
