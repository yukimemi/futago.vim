// =============================================================================
// File        : consts.ts
// Author      : yukimemi
// Last Change : 2024/12/30 14:54:44.
// =============================================================================

import { join } from "jsr:@std/path@1.0.8";
import { dir } from "jsr:@cross/dir@1.1.0";
import { Opener } from "./schema/opener.ts";

export const DEFAULT_MODEL = "gemini-2.0-flash-exp";
export const TITLE_MODEL = "gemini-2.0-flash-exp";

export const DEFAULT_OPENER: Opener = "tabnew";
export const DEFAULT_AI_PROMPT = "Gemini";
export const DEFAULT_HUMAN_PROMPT = "You";

export const CACHE_DIR = join(await dir("cache"), "futago");

export const SEPARATOR = "-------------";

export const GIT_COMMIT_PROMPT = `
You are an expert at following the Conventional Commit specification.
Given the git diff listed below, please generate a commit message for me.
Do not use code fences (\`\`\`) in your response:
`;
