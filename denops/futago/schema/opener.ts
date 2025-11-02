// =============================================================================
// File        : opener.ts
// Author      : yukimemi
// Last Change : 2025/11/02 11:32:15.
// =============================================================================

import { z } from "zod";

export const OpenerSchema = z.enum(["split", "vsplit", "tabnew", "edit", "new", "vnew"]).default(
  "tabnew",
);
export type Opener = z.infer<typeof OpenerSchema>;
