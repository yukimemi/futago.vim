function! futago#complete(lead, cmd, pos) abort
  let options = ["split", "vsplit", "tabnew", "edit", "new", "vnew"]
  return filter(options, 'v:val =~# "^\\V" . escape(a:lead, "\\")')
endfunction

function! futago#denops_notify(method, params) abort
  call denops#plugin#wait_async("futago", function("denops#notify", ["futago", a:method, a:params]))
endfunction

function! futago#start_chat(...) abort
  call futago#denops_notify("startChat", a:000)
endfunction

function! futago#open_history(...) abort
  call futago#denops_notify("openHistory", a:000)
endfunction

function! futago#git_commit(...) abort
  call futago#denops_notify("gitCommit", a:000)
endfunction

