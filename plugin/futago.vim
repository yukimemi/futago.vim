if exists('g:loaded_futago')
  finish
endif
let g:loaded_futago = 1

command! FutagoHistory call futago#denops_notify('openHistory', [])
