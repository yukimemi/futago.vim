// =============================================================================
// File        : consts.ts
// Author      : yukimemi
// Last Change : 2025/12/27 13:28:01.
// =============================================================================

import { Opener } from "./schema/opener.ts";

export const DEFAULT_MODEL = "gemini-flash-latest";
export const DEFAULT_GIT_MODEL = "gemini-flash-latest";
export const TITLE_MODEL = "gemini-flash-latest";

export const DEFAULT_OPENER: Opener = "tabnew";
export const DEFAULT_AI_PROMPT = "Gemini";
export const DEFAULT_HUMAN_PROMPT = "You";

export const SEPARATOR = "-------------";

export const GIT_COMMIT_PROMPT = `
You are an expert at following the Conventional Commit specification.
Given the git diff listed below, please generate a commit message for me.
Do not use code fences (\`\`\`) in your response:
`;
