# futago.vim

[![DeepWiki](https://img.shields.io/badge/DeepWiki-yukimemi%2Ffutago.vim-blue.svg?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAyCAYAAAAnWDnqAAAAAXNSR0IArs4c6QAAA05JREFUaEPtmUtyEzEQhtWTQyQLHNak2AB7ZnyXZMEjXMGeK/AIi+QuHrMnbChYY7MIh8g01fJoopFb0uhhEqqcbWTp06/uv1saEDv4O3n3dV60RfP947Mm9/SQc0ICFQgzfc4CYZoTPAswgSJCCUJUnAAoRHOAUOcATwbmVLWdGoH//PB8mnKqScAhsD0kYP3j/Yt5LPQe2KvcXmGvRHcDnpxfL2zOYJ1mFwrryWTz0advv1Ut4CJgf5uhDuDj5eUcAUoahrdY/56ebRWeraTjMt/00Sh3UDtjgHtQNHwcRGOC98BJEAEymycmYcWwOprTgcB6VZ5JK5TAJ+fXGLBm3FDAmn6oPPjR4rKCAoJCal2eAiQp2x0vxTPB3ALO2CRkwmDy5WohzBDwSEFKRwPbknEggCPB/imwrycgxX2NzoMCHhPkDwqYMr9tRcP5qNrMZHkVnOjRMWwLCcr8ohBVb1OMjxLwGCvjTikrsBOiA6fNyCrm8V1rP93iVPpwaE+gO0SsWmPiXB+jikdf6SizrT5qKasx5j8ABbHpFTx+vFXp9EnYQmLx02h1QTTrl6eDqxLnGjporxl3NL3agEvXdT0WmEost648sQOYAeJS9Q7bfUVoMGnjo4AZdUMQku50McDcMWcBPvr0SzbTAFDfvJqwLzgxwATnCgnp4wDl6Aa+Ax283gghmj+vj7feE2KBBRMW3FzOpLOADl0Isb5587h/U4gGvkt5v60Z1VLG8BhYjbzRwyQZemwAd6cCR5/XFWLYZRIMpX39AR0tjaGGiGzLVyhse5C9RKC6ai42ppWPKiBagOvaYk8lO7DajerabOZP46Lby5wKjw1HCRx7p9sVMOWGzb/vA1hwiWc6jm3MvQDTogQkiqIhJV0nBQBTU+3okKCFDy9WwferkHjtxib7t3xIUQtHxnIwtx4mpg26/HfwVNVDb4oI9RHmx5WGelRVlrtiw43zboCLaxv46AZeB3IlTkwouebTr1y2NjSpHz68WNFjHvupy3q8TFn3Hos2IAk4Ju5dCo8B3wP7VPr/FGaKiG+T+v+TQqIrOqMTL1VdWV1DdmcbO8KXBz6esmYWYKPwDL5b5FA1a0hwapHiom0r/cKaoqr+27/XcrS5UwSMbQAAAABJRU5ErkJggg==)](https://deepwiki.com/yukimemi/futago.vim)

Google gemini chat for Vim / Neovim.

![futago](https://github.com/yukimemi/futago.vim/assets/6442108/29e371e3-c16e-4b94-8a0c-67a37e26f7b5)

# Features

This plugin is a Google gemini chat for Vim / Neovim.

# Installation

If you use [folke/lazy.nvim](https://github.com/folke/lazy.nvim).

```lua
{
  "yukimemi/futago.vim",
  lazy = false,
  dependencies = {
    "vim-denops/denops.vim",
  },
}
```

If you use [yukimemi/dvpm](https://github.com/yukimemi/dvpm).

```typescript
dvpm.add({ url: "yukimemi/futago.vim" });
```

# Requirements

- [Deno - A modern runtime for JavaScript and TypeScript](https://deno.land/)
- [vim-denops/denops.vim: 🐜 An ecosystem of Vim/Neovim which allows developers to write cross-platform plugins in Deno](https://github.com/vim-denops/denops.vim)

Using Deno.KV, you need the `--unstable-kv` flag.
Please specify as below.

```vim
let g:denops#server#deno_args = ['-q', '--no-lock', '--unstable-kv', '-A']
```

- Environment: `GEMINI_API_KEY`

See [Get API key](https://ai.google.dev/)

# Functions

## `futago#start_chat([params])`

Start Futago chat with params.
params is dictionaly.

- [opener]: Default is "tabnew".

Options are "split", "vsplit", "tabnew", "edit", "new", "vnew".

- [history]: List of chat history.

example:

[{"role": "user", "parts": [{ "text": "user prompt" }]}, {"role": "model", "parts": [{ "text": "model reply" }]}]

See [Content[]](https://ai.google.dev/api/caching?#Content)

- [safetySettings]: Default is no setting.

See [SafetySetting](https://ai.google.dev/api/generate-content?#safetysetting)

- [generationConfig]: Default is no setting.

See [GenerationConfig](https://ai.google.dev/api/generate-content?#generationconfig)

- [aiPrompt]: Default is `Gemini`.

- [humanPrompt]: Default is `You`.

## `futago#git_commit([params])`

Generate a message for git commit based on the `git diff --no-ext-diff --staged` result.
The generated message will be inserted at the current cursor position.

- [prompt]: Default is [here](https://github.com/yukimemi/futago.vim/blob/main/denops/futago/consts.ts#L21).

`git diff --no-ext-diff --staged` result will be appended to the prompt.

## `futago#jj_commit([params])`

Generate a message for jj commit based on the `jj diff --git` result.
The generated message will be inserted at the current cursor position.

- [prompt]: Default is [here](https://github.com/yukimemi/futago.vim/blob/main/denops/futago/consts.ts#L21).

`jj diff --git` result will be appended to the prompt.

# Commands

## `:FutagoStartChat`

`call futago#start_chat()` with default argument.

## `:FutagoHistory`

Show list of chat history with quickfix.
If you open a past chat file, you can start chatting based on the automatically saved history.

## `:FutagoGitCommit`

`call futago#git_commit()` with default argument.

## `:FutagoJjCommit`

`call futago#jj_commit()` with default argument.

# Config

No settings are required. However, the following settings can be made if necessary.

- `g:futago_debug`

Enable debug messages.

Default is v:false

- g:futago_model

Gemini API model.

Default is "gemini-flash-latest"


See [Model](https://ai.google.dev/gemini-api/docs/models/gemini?#model-variations)

- g:futago_git_model

Gemini API model used by futago#git_commit().

Default is "gemini-flash-latest"


- `g:futago_chat_path`

Path to save chat files.

Default is `(await dir("cache"))/futago/chat`

See [@cross/dir - JSR](https://jsr.io/@cross/dir)

If you open a past chat file saved in g:futago_chat_path, you can start chatting based on the automatically saved chat history.

- `g:futago_log_file`

Path to save log files.

Default is `(await dir("cache"))/futago/log`

See [@cross/dir - JSR](https://jsr.io/@cross/dir)

- `g:futago_history_db`

Path to save history db (Deno KV).

Default is `(await dir("cache"))/futago/db/history.db`

See [@cross/dir - JSR](https://jsr.io/@cross/dir)

- `g:futago_safety_settings`

See [SafetySetting](https://ai.google.dev/api/generate-content?#safetysetting)

Default is no setting.

- `g:futago_generation_config`

See [GenerationConfig](https://ai.google.dev/api/generate-content?#generationconfig)

Default is no setting.

- `g:futago_ai_prompt`

AI prompt.

Default is `Gemini`.

- `g:futago_human_prompt`

Human prompt.

Default is `You`.

- `g:futago_opener`

Options are "split", "vsplit", "tabnew", "edit", "new", "vnew".

Default is "tabnew".

# Example

```vim
let g:futago_debug = v:true
let g:futago_model = "gemini-3-pro-preview"
let g:futago_chat_path = '~/.cache/vim/futago/chat'
let g:futago_log_file = '~/.cache/vim/futago/log/futago.log'
let g:futago_history_db = '~/.cache/vim/futago/db/history.db'
let g:futago_safety_settings = [
  \ { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
  \ { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"  },
  \ { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH" },
  \ { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
  \ ]
let g:futago_generation_config = {
  \   "temperature": 0.9,
  \   "maxOutputTokens": 256,
  \ }
nnoremap <Leader>fc <Cmd>call futago#start_chat({
  \ "opener": "vsplit",
  \ "history": [
  \   {"role": "user", "parts": [{ "text": "僕の名前は yukimemi" }]},
  \   {"role": "model", "parts": [{ "text": "了解！覚えておくね" }]},
  \ ],
  \ "humanPrompt": "yukimemi"
  \ })<CR>
nnoremap <Leader>fg <Cmd>call futago#git_commit({ "model": "gemini-3-flash-preview" })<CR>
```

# License

Licensed under MIT License.

Copyright (c) 2024 yukimemi

