// =============================================================================
// File        : opener.ts
// Author      : yukimemi
// Last Change : 2024/01/21 23:25:06.
// =============================================================================

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const OpenerSchema = z.enum(["split", "vsplit", "tabnew", "edit", "new", "vnew"]).default(
  "tabnew",
);
export type Opener = z.infer<typeof OpenerSchema>;
