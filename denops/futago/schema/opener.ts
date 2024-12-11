// =============================================================================
// File        : opener.ts
// Author      : yukimemi
// Last Change : 2024/11/02 18:54:18.
// =============================================================================

import { z } from "npm:zod@3.24.1";

export const OpenerSchema = z.enum(["split", "vsplit", "tabnew", "edit", "new", "vnew"]).default(
  "tabnew",
);
export type Opener = z.infer<typeof OpenerSchema>;
