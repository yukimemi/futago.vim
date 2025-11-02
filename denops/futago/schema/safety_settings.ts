// =============================================================================
// File        : safety_settings.ts
// Author      : yukimemi
// Last Change : 2025/11/02 11:32:22.
// =============================================================================

import { z } from "zod";
import { SafetySetting } from "@google/generative-ai";

export const SafetySettingsSchema = z.array(
  z.record(z.string(), z.any()).transform((v) => v as SafetySetting),
);
