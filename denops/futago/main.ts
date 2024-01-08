// =============================================================================
// File        : main.ts
// Author      : yukimemi
// Last Change : 2024/01/08 17:21:39.
// =============================================================================

import * as batch from "https://deno.land/x/denops_std@v5.2.0/batch/mod.ts";
import * as buffer from "https://deno.land/x/denops_std@v5.2.0/buffer/mod.ts";
import * as datetime from "https://deno.land/std@0.211.0/datetime/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.2.0/function/mod.ts";
import * as helper from "https://deno.land/x/denops_std@v5.2.0/helper/mod.ts";
import * as option from "https://deno.land/x/denops_std@v5.2.0/option/mod.ts";
import * as autocmd from "https://deno.land/x/denops_std@v5.2.0/autocmd/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v5.2.0/variable/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v5.2.0/mod.ts";
import xdg from "https://deno.land/x/xdg@v10.6.0/src/mod.deno.ts";
import { assert, is } from "https://deno.land/x/unknownutil@v3.13.0/mod.ts";
import { ensureFile } from "https://deno.land/std@0.211.0/fs/mod.ts";
import { getLogger, handlers, setup } from "https://deno.land/std@0.211.0/log/mod.ts";
import { join } from "https://deno.land/std@0.211.0/path/mod.ts";

import { Futago } from "./futago.ts";

let debug = false;
const futagos = new Map<number, {
  futago: Futago;
  buf: buffer.OpenResult;
  lines: string[];
}>();

function getNow(): string {
  return datetime.format(new Date(), "yyyy-MM-ddTHH-mm-ss.SSS");
}

async function getLastLineNumber(denops: Denops, bufnr: number): Promise<number> {
  const lines = await fn.getbufline(denops, bufnr, 1, "$");
  return lines.length;
}

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
  logger.debug({ debug });

  denops.dispatcher = {
    async startChat(opener?: unknown): Promise<void> {
      if (opener != undefined) {
        assert(opener, is.String);
      }
      const futago = new Futago();
      futago.startChat();

      const now = getNow();
      const bufname = `futago://chat/${now}`;
      const buf = await buffer.open(denops, bufname, { opener: opener ?? "tabnew" });

      await batch.batch(denops, async () => {
        await option.filetype.setBuffer(denops, buf.bufnr, "markdown");
        await option.buftype.setBuffer(denops, buf.bufnr, "acwrite");
        await option.buflisted.setBuffer(denops, buf.bufnr, true);
        await option.swapfile.setBuffer(denops, buf.bufnr, false);
        await option.wrap.setBuffer(denops, buf.bufnr, true);
        await option.modified.setBuffer(denops, buf.bufnr, false);
        await buffer.replace(denops, buf.bufnr, [`You: ${now}`, `-------------`, ``]);
      });

      await denops.cmd("normal! G");
      await denops.cmd("startinsert");

      futagos.set(buf.bufnr, {
        futago,
        buf,
        lines: await fn.getbufline(denops, buf.bufnr, 1, "$"),
      });
    },

    async sendChatMessage(bufnr: unknown): Promise<void> {
      assert(bufnr, is.Number);
      try {
        const futago = futagos.get(bufnr);
        if (futago == undefined) {
          throw new Error(`Buffer not found: ${bufnr}`);
        }
        const lines = await fn.getbufline(denops, futago.buf.bufnr, 1, "$");
        if (lines === futago.lines) {
          return;
        }
        const startLineIndex = lines.findLastIndex((_, index, obj) =>
          obj[index].startsWith("You:") && obj[index + 1] === "-------------"
        ) + 2;

        const prompt = lines.slice(startLineIndex);
        logger.debug(`You: ${getNow()}}`);
        logger.debug(prompt.join("\n"));
        logger.debug(`-------------`);

        if (
          prompt.every((line) =>
            line.trim() === ""
          )
        ) {
          return;
        }

        const result = await futago.futago.sendMessageStream(prompt.join("\n"));
        await fn.appendbufline(
          denops,
          futago.buf.bufnr,
          await getLastLineNumber(denops, futago.buf.bufnr),
          ["", `Gemini: ${getNow()}`, "-------------", ""],
        );
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          logger.debug(chunkText);
          let insertLineNum = await getLastLineNumber(denops, futago.buf.bufnr);
          const lines = chunkText.split(/\r?\n/);
          const lastLine = await fn.getbufline(denops, futago.buf.bufnr, insertLineNum);
          await fn.setbufline(denops, futago.buf.bufnr, insertLineNum++, [
            lastLine + lines[0],
            ...lines.slice(1),
          ]);
        }
        await fn.appendbufline(
          denops,
          futago.buf.bufnr,
          await getLastLineNumber(denops, futago.buf.bufnr),
          ["", `You: ${getNow()}`, "-------------", ""],
        );

        futagos.set(futago.buf.bufnr, {
          futago: futago.futago,
          buf: futago.buf,
          lines: await fn.getbufline(denops, futago.buf.bufnr, 1, "$"),
        });

        await denops.cmd(`redraw!`);
        await denops.cmd("normal! G");
      } catch (e) {
        logger.error(e);
      } finally {
        await option.modified.setBuffer(denops, bufnr, false);
      }
    },
  };

  await helper.execute(
    denops,
    `
      function! s:${denops.name}_notify(method, params) abort
        call denops#plugin#wait_async('${denops.name}', function('denops#notify', ['${denops.name}', a:method, a:params]))
      endfunction
      command! -nargs=? -complete=customlist,futago#complete FutagoStart call s:${denops.name}_notify('startChat', [<f-args>])
    `,
  );

  await autocmd.group(denops, "futago_chat_buffer", (helper) => {
    helper.remove("*");
    helper.define(
      "BufWriteCmd",
      "futago://chat/*",
      `call denops#notify("${denops.name}", "sendChatMessage", [bufnr()])`,
    );
  });
}
