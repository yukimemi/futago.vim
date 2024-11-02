// =============================================================================
// File        : consts.ts
// Author      : yukimemi
// Last Change : 2024/11/02 18:36:35.
// =============================================================================

import { Opener } from "./schema/opener.ts";

export const DEFAULT_MODEL = "gemini-1.5-flash";

export const DEFAULT_OPENER: Opener = "tabnew";
export const DEFAULT_AI_PROMPT = "Gemini";
export const DEFAULT_HUMAN_PROMPT = "You";

export const SEPARATOR = "-------------";

export const GIT_COMMIT_PROMPT = `
Please make git commit messages for the following diff output.

Each commit message must be one line starting with one of the following words.

* feat: (new feature for the user, not a new feature for build script)
* fix: (bug fix for the user, not a fix to a build script)
* docs: (changes to the documentation)
* style: (formatting, missing semi colons, etc; no production code change)
* refactor: (refactoring production code, eg. renaming a variable)
* test: (adding missing tests, refactoring tests; no production code change)
* chore: (updating grunt tasks etc; no production code change)

### diff

`;
