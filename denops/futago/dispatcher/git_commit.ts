// =============================================================================
// File        : git_commit.ts
// Author      : yukimemi
// Last Change : 2024/11/02 20:45:06.
// =============================================================================

import * as fn from "jsr:@denops/std@7.3.0/function";
import type { Denops } from "jsr:@denops/std@7.3.0";
import { DEFAULT_MODEL, GIT_COMMIT_PROMPT } from "../consts.ts";
import { Futago } from "../futago.ts";
import { GenerationConfigSchema } from "../schema/generation_config.ts";
import { SafetySettingsSchema } from "../schema/safety_settings.ts";
import { z } from "npm:zod@3.23.8";

export const GitCommitParamsSchema = z.object({
  db: z.instanceof(Deno.Kv),
  model: z.string().default(DEFAULT_MODEL),
  prompt: z.string().optional(),
  safetySettings: SafetySettingsSchema.optional(),
  generationConfig: GenerationConfigSchema.optional(),
  debug: z.boolean().default(false),
});
export type GitCitCommitParams = z.infer<typeof GitCommitParamsSchema>;

async function getGitRoot(): Promise<string> {
  const cmd = new Deno.Command("git", { args: ["rev-parse", "--show-toplevel"] });
  const output = await cmd.output();
  return new TextDecoder().decode(output.stdout).trim();
}

async function git(base: string, args: string[]): Promise<string> {
  const cmd = new Deno.Command("git", { args: ["-C", base, ...args] });
  const output = await cmd.output();
  return new TextDecoder().decode(output.stdout).trim();
}

async function getDiffStaged(base: string): Promise<string> {
  return await git(base, ["diff", "--no-ext-diff", "--staged"]);
}

export async function gitCommit(
  denops: Denops,
  params: GitCitCommitParams,
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
    undefined,
    {
      safetySettings,
      generationConfig,
      debug,
    },
  );

  const diff = await getDiffStaged(await getGitRoot());
  const p = (prompt ?? GIT_COMMIT_PROMPT) + "\n\n" + diff;
  const commitMessage = await futago.generateContent(p);
  console.log(commitMessage);

  const lnum = await fn.line(denops, ".");
  await fn.appendbufline(denops, futago.bufnr, lnum - 1, commitMessage.split("\n"));
}
