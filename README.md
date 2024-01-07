# futago.vim

Google gemini chat for Vim / Neovim.

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

`:FutagStart`                                        

Start Futago chat.

# Config 

No settings are required. However, the following settings can be made if necessary.

`g:futago_debug`                        
Enable debug messages.
default is v:false

# Example 

```vim
let g:futago_debug = v:true
```

# License 

Licensed under MIT License.

Copyright (c) 2023 yukimemi

