function! futago#complete(lead, cmd, pos)
  let options = ["split", "vsplit", "tabnew", "edit", "new", "vnew"]
  return filter(options, 'v:val =~# "^\\V" . escape(a:lead, "\\")')
endfunction
