# futago.vim

Google gemini chat for Vim / Neovim.

![futago](https://github.com/yukimemi/futago.vim/assets/6442108/2a9f13c1-a66f-4170-aba3-e44a417ef5f7)

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
- Environment: `GEMINI_API_KEY`
[Get API key](https://ai.google.dev/)

# Usage 

# Commands 

`:FutagoStart [opener]`                                          

Start Futago chat.
Enter the prompt, save buffer, and the chat will be sent.

[opener]: Optional. Default is "tabnew".

Options are "split", "vsplit", "tabnew", "edit", "new", "vnew".

`:FutagoHistory`                                               

Show list of chat history with quickfix.
If you open a past chat file, you can start chatting based on the automatically saved history.

# Config 

No settings are required. However, the following settings can be made if necessary.

`g:futago_debug`                                               
Enable debug messages.
Default is v:false

`g:futago_chat_path`                                       
Path to save chat files.
Default is `xdg.cache()/futago/chat`

https://deno.land/x/xdg/src/mod.deno.ts

If you open a past chat file saved in g:futago_chat_path, you can start chatting based on the automatically saved chat history.

`g:futago_log_file`                                         
Path to save log files.
Default is `xdg.cache()/futago/log`

https://deno.land/x/xdg/src/mod.deno.ts

`g:futago_safety_settings`                           

[SafetySetting](https://ai.google.dev/api/rest/v1beta/SafetySetting)
Default is no setting.

`g:futago_generation_config`                       

[GenerationConfig](https://ai.google.dev/api/rest/v1beta/GenerationConfig)
Default is no setting.

# Example 

```vim
let g:futago_debug = v:true
let g:futago_chat_path = '~/.cache/vim/futago/chat'
let g:futago_log_file = '~/.cache/vim/futago/log/futago.log'
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
```

# License 

Licensed under MIT License.

Copyright (c) 2023 yukimemi

