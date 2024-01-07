function futago#internal#callback_helper(denops_name, bufnr, lambda_id, ...)
  call setbufvar(a:bufnr, "&buftype", "")
  call denops#notify(a:denops_name, a:lambda_id, a:000)
endfunction

function futago#internal#cancel_helper(denops_name)
  call denops#notify(a:denops_name, "cancel", [])
  return '<C-c>'
endfunction
