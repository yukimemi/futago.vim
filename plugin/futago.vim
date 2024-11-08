if exists('g:loaded_futago')
  finish
endif
let g:loaded_futago = 1

command! FutagoStartChat call futago#denops_notify('startChat', [])
command! FutagoGitCommit call futago#denops_notify('gitCommit', [])
command! FutagoHistory call futago#denops_notify('openHistory', [])
