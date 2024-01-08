function! futago#internal#callback_helper(denops_name, lambda_id, ...) abort
  call denops#request(a:denops_name, a:lambda_id, a:000)
endfunction
