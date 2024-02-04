// =============================================================================
// File        : git_commit.ts
// Author      : yukimemi
// Last Change : 2024/02/04 20:29:33.
// =============================================================================

import * as fn from "https://deno.land/x/denops_std@v6.0.1/function/mod.ts";
import { Futago } from "../futago.ts";
import { type Denops } from "https://deno.land/x/denops_core@v6.0.5/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { DEFAULT_MODEL, GIT_COMMIT_PROMPT } from "../consts.ts";
import { SafetySettingsSchema } from "../schema/safety_settings.ts";
import { GenerationConfigSchema } from "../schema/generation_config.ts";

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
  return await git(base, ["diff", "--cached"]);
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
