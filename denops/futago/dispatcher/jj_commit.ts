// =============================================================================
// File        : jj_commit.ts
// Author      : yukimemi
// Last Change : 2025/01/12 00:00:00.
// =============================================================================

import * as fn from "@denops/std/function";
import type { Denops } from "@denops/std";
import { GIT_COMMIT_PROMPT } from "../consts.ts";
import { Futago } from "../futago.ts";
import { GenerationConfigSchema } from "../schema/generation_config.ts";
import { SafetySettingsSchema } from "../schema/safety_settings.ts";
import { z } from "zod";

export const JjCommitParamsSchema = z.object({
  model: z.string().optional(),
  db: z.instanceof(Deno.Kv),
  prompt: z.string().optional(),
  safetySettings: SafetySettingsSchema.optional(),
  generationConfig: GenerationConfigSchema.optional(),
  debug: z.boolean().default(false),
});
export type JjCommitParams = z.infer<typeof JjCommitParamsSchema>;

async function getJjRoot(denops: Denops): Promise<string> {
  const cwd = await fn.getcwd(denops);
  const cmd = new Deno.Command("jj", { args: ["root"], cwd });
  const output = await cmd.output();
  return new TextDecoder().decode(output.stdout).trim();
}

async function jj(base: string, args: string[]): Promise<string> {
  const cmd = new Deno.Command("jj", { args: ["-R", base, ...args] });
  const output = await cmd.output();
  return new TextDecoder().decode(output.stdout).trim();
}

async function getDiff(base: string): Promise<string> {
  return await jj(base, ["diff", "--git"]);
}

export async function jjCommit(
  denops: Denops,
  params: JjCommitParams,
): Promise<void> {
  const {
    db,
    model,
    prompt,
    safetySettings,
    generationConfig,
    debug = false,
  } = params;
  const bufnr = await fn.bufnr(denops);
  const futago = new Futago(
    bufnr,
    model,
    db,
    "",
    {
      safetySettings,
      generationConfig,
      debug,
    },
  );

  const diff = await getDiff(await getJjRoot(denops));
  const p = (prompt ?? GIT_COMMIT_PROMPT) + "\n\n" + diff;
  const commitMessage = await futago.generateContent(p);

  const lnum = await fn.line(denops, ".");
  await fn.appendbufline(denops, futago.bufnr, lnum - 1, commitMessage.split("\n"));
}
