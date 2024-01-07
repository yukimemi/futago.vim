// =============================================================================
// File        : main.ts
// Author      : yukimemi
// Last Change : 2024/01/07 23:32:31.
// =============================================================================

import xdg from "https://deno.land/x/xdg@v10.6.0/src/mod.deno.ts";
import * as vars from "https://deno.land/x/denops_std@v5.2.0/variable/mod.ts";
import * as helper from "https://deno.land/x/denops_std@v5.2.0/helper/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.2.0/function/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.11.0/mod.ts";
import * as buffer from "https://deno.land/x/denops_std@v5.2.0/buffer/mod.ts";
import * as lambda from "https://deno.land/x/denops_std@v5.2.0/lambda/mod.ts";
import * as option from "https://deno.land/x/denops_std@v5.2.0/option/mod.ts";
import * as datetime from "https://deno.land/std@0.211.0/datetime/mod.ts";
import { getLogger, handlers, setup } from "https://deno.land/std@0.211.0/log/mod.ts";
import * as batch from "https://deno.land/x/denops_std@v5.2.0/batch/mod.ts";
import { join } from "https://deno.land/std@0.211.0/path/mod.ts";
import { ensureFile } from "https://deno.land/std@0.211.0/fs/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v5.2.0/mod.ts";

import { Futago } from "./futago.ts";

let debug = false;

export async function main(denops: Denops): Promise<void> {
  debug = await vars.g.get(denops, "futago_debug", false);

  const cacheFile = join(xdg.cache(), "futago", "futago.log");
  await ensureFile(cacheFile);

  setup({
    handlers: {
      console: new handlers.ConsoleHandler("DEBUG"),
      cache: new handlers.RotatingFileHandler("DEBUG", {
        filename: cacheFile,
        maxBytes: 1024 * 1024,
        maxBackupCount: 10,
      }),
    },
    loggers: {
      "futago": {
        level: "INFO",
        handlers: ["console", "cache"],
      },
      "futago-debug": {
        level: "DEBUG",
        handlers: ["cache"],
      },
    },
  });

  const logger = debug ? getLogger("futago-debug") : getLogger("futago");
  const futago = new Futago();
  logger.debug({ debug });

  denops.dispatcher = {
    async startChat(): Promise<void> {
      futago.startChat();

      const now = datetime.format(new Date(), "yyyy-MM-ddTHH-mm-ss.SSS");
      const bufname = `futago://chat/${now}`;
      const buf = await buffer.open(denops, bufname);
      const bufnr = buf.bufnr;

      await batch.batch(denops, async () => {
        await option.filetype.setBuffer(
          denops,
          bufnr,
          "futago.chat",
        );
        await option.buftype.setBuffer(denops, bufnr, "prompt");
        await option.buflisted.setBuffer(denops, bufnr, true);
        await option.swapfile.setBuffer(denops, bufnr, false);
        await fn.bufload(denops, bufnr);
        await fn.prompt_setprompt(denops, bufnr, `futago >> `);
        await denops.cmd(
          "call prompt_setcallback(bufnr, function('futago#internal#callback_helper', [denops_name, bufnr, lambda_id]))",
          {
            bufnr,
            denops_name: denops.name,
            lambda_id: lambda.register(
              denops,
              async (p) => {
                const prompt = ensure(p, is.String);
                await promptCallback(denops, futago, bufnr, prompt);
              },
            ),
          },
        );
        await helper.execute(denops, `tabnew ${bufname}`);
        await helper.execute(denops, "setlocal wrap");
        await helper.execute(denops, "startinsert");
      });
    },
  };

  await helper.execute(
    denops,
    `
      function! s:${denops.name}_notify(method, params) abort
        call denops#plugin#wait_async('${denops.name}', function('denops#notify', ['${denops.name}', a:method, a:params]))
      endfunction
      command! FutagoStart call s:${denops.name}_notify('startChat', [])
    `,
  );
}

async function promptCallback(
  denops: Denops,
  futago: Futago,
  bufnr: number,
  prompt: string,
) {
  const logger = debug ? getLogger("futago-debug") : getLogger("futago");
  try {
    logger.debug(`# user:`);
    logger.debug(prompt);
    logger.debug(`-------------`);

    if (prompt === "exit" || prompt === "quit") {
      await helper.execute(denops, `bunload! ${bufnr}`);
      return;
    }

    const result = await futago.sendMessageStream(prompt);
    logger.debug(`# futago:`);
    const info = await fn.getbufinfo(denops, bufnr);
    let insertLineNum = info[0].linecount - 1;
    await fn.appendbufline(denops, bufnr, insertLineNum++, "------------------------------");
    await fn.appendbufline(denops, bufnr, insertLineNum++, "");

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      logger.debug(chunkText);
      const info = await fn.getbufinfo(denops, bufnr);
      let insertLineNum = info[0].linecount - 1;
      const lines = chunkText.split(/\r?\n/);
      const lastLine = await fn.getbufline(denops, bufnr, insertLineNum);
      await fn.setbufline(denops, bufnr, insertLineNum++, lastLine + lines[0]);
      if (lines.length > 0) {
        await fn.appendbufline(denops, bufnr, insertLineNum, lines.slice(1));
      }
    }
  } catch (e) {
    logger.error(e);
  } finally {
    await option.buftype.setBuffer(denops, bufnr, "prompt");
    await fn.setbufvar(denops, bufnr, "&modified", 0);
  }
}
