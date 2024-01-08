// =============================================================================
// File        : main.ts
// Author      : yukimemi
// Last Change : 2024/01/08 22:30:51.
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
import { walk } from "https://deno.land/std@0.211.0/fs/walk.ts";
import { assert, ensure, is } from "https://deno.land/x/unknownutil@v3.13.0/mod.ts";
import { ensureDir, ensureFile } from "https://deno.land/std@0.211.0/fs/mod.ts";
import { getLogger, handlers, setup } from "https://deno.land/std@0.211.0/log/mod.ts";
import { basename, extname, join } from "https://deno.land/std@0.211.0/path/mod.ts";

import { Futago } from "./futago.ts";
import { FileHandler } from "https://deno.land/std@0.211.0/log/handlers.ts";

import { InputContent } from "https://esm.sh/@google/generative-ai@0.1.3";

let debug = false;
const futagos = new Map<number, {
  futago: Futago;
  buf: buffer.OpenResult;
  lines: string[];
  path: string;
}>();

let chatCacheDir = join(xdg.cache(), "futago", "chat");
let logFile = join(xdg.cache(), "futago", "log", "futago.log");

function getNow(): string {
  return datetime.format(new Date(), "yyyy-MM-ddTHH-mm-ss.SSS");
}

async function getLastLineNumber(denops: Denops, bufnr: number): Promise<number> {
  const lines = await fn.getbufline(denops, bufnr, 1, "$");
  return lines.length;
}

export async function main(denops: Denops): Promise<void> {
  debug = await vars.g.get(denops, "futago_debug", false);
  chatCacheDir = ensure(
    await fn.expand(
      denops,
      await vars.g.get(denops, "futago_chat_path", chatCacheDir),
    ),
    is.String,
  );
  await ensureDir(chatCacheDir);
  logFile = ensure(
    await fn.expand(denops, await vars.g.get(denops, "futago_log_file", logFile)),
    is.String,
  );
  await ensureFile(logFile);

  setup({
    handlers: {
      console: new handlers.ConsoleHandler("DEBUG"),
      file: new handlers.RotatingFileHandler("DEBUG", {
        filename: logFile,
        maxBytes: 1024 * 1024,
        maxBackupCount: 10,
      }),
    },
    loggers: {
      default: {
        level: "INFO",
        handlers: ["file"],
      },
      debug: {
        level: "DEBUG",
        handlers: ["console", "file"],
      },
    },
  });

  const logger = debug ? getLogger("debug") : getLogger();
  logger.debug({ debug, chatCacheDir, logFile });
  const fileHandler = logger.handlers[1] as FileHandler;
  if (fileHandler) {
    fileHandler.flush();
  }

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

      futagos.set(buf.bufnr, {
        futago,
        buf,
        lines: await fn.getbufline(denops, buf.bufnr, 1, "$"),
        path: "",
      });
    },

    async loadChat(bufnr: unknown): Promise<void> {
      assert(bufnr, is.Number);
      if (futagos.get(bufnr) != undefined) {
        return;
      }
      const lines = await fn.getbufline(denops, bufnr, 1, "$");

      const history: InputContent[] = [];
      lines.forEach((value, index, array) => {
        logger.debug(value);
        if (value.startsWith("You:") && array[index + 1] === "-------------") {
          let i = index + 2;
          let userParts = "";
          while (i < array.length && !array[i].startsWith("Gemini:")) {
            userParts += array[i] + "\n";
            i++;
          }
          history.push({
            role: "user",
            parts: userParts,
          });
        }
        if (value.startsWith("Gemini:") && array[index + 1] === "-------------") {
          let i = index + 2;
          let modelParts = "";
          while (i < array.length && !array[i].startsWith("You:")) {
            modelParts += array[i] + "\n";
            i++;
          }
          history.push({
            role: "model",
            parts: modelParts,
          });
        }
      });

      if (history[history.length - 1].role === "user") {
        history.pop();
      }

      const futago = new Futago();
      futago.startChat({ history });
      const bufname = await fn.bufname(denops, bufnr);
      futago.chatTitle = basename(bufname, extname(bufname));

      // Set temporary futago.
      futagos.set(bufnr, {
        futago,
        buf: {
          winid: 0,
          bufnr,
          winnr: 0,
          tabpagenr: 0,
        },
        lines: [],
        path: bufname,
      });

      const buf = await buffer.open(denops, bufname);

      await option.filetype.setBuffer(denops, buf.bufnr, "markdown");
      await option.buftype.setBuffer(denops, buf.bufnr, "acwrite");
      await option.buflisted.setBuffer(denops, buf.bufnr, true);
      await option.swapfile.setBuffer(denops, buf.bufnr, false);
      await option.wrap.setBuffer(denops, buf.bufnr, true);
      await option.modified.setBuffer(denops, buf.bufnr, false);
      await denops.cmd("normal! G");

      futagos.set(buf.bufnr, {
        futago,
        buf,
        lines: await fn.getbufline(denops, buf.bufnr, 1, "$"),
        path: bufname,
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

        if (futago.futago.chatTitle === "") {
          await futago.futago.createChatTitle(prompt.join("\n"));
          futago.path = join(chatCacheDir, `${futago.futago.chatTitle}.md`);
          logger.debug(`Chat title: ${futago.futago.chatTitle}`);
        }

        const bufLines = await fn.getbufline(denops, futago.buf.bufnr, 1, "$");

        futagos.set(futago.buf.bufnr, {
          futago: futago.futago,
          buf: futago.buf,
          lines: bufLines,
          path: futago.path,
        });

        await denops.cmd(`redraw!`);
        await denops.cmd("normal! G");

        // Save buffer to file.
        await Deno.writeTextFile(futago.path, bufLines.join("\n"));
      } catch (e) {
        logger.error(e);
      } finally {
        await option.modified.setBuffer(denops, bufnr, false);
        if (fileHandler) {
          fileHandler.flush();
        }
      }
    },

    async history(): Promise<void> {
      try {
        const chatFiles: string[] = [];
        for await (
          const entry of walk(chatCacheDir, {
            maxDepth: 1,
            includeDirs: false,
          })
        ) {
          chatFiles.push(entry.path);
        }
        await batch.batch(denops, async (denops) => {
          await fn.setqflist(denops, [], " ", {
            title: `Chat History`,
            efm: "%f",
            lines: chatFiles,
          });
        });
        await denops.cmd("botright copen");
      } catch (e) {
        await denops.cmd(`echom "Error ${e}"`);
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
      command! FutagoHistory call s:${denops.name}_notify('history', [])
    `,
  );

  await autocmd.group(denops, "futago_chat_buffer", (helper) => {
    helper.remove("*");
    helper.define(
      "BufWriteCmd",
      ["futago://chat/*", `${chatCacheDir}/*.md`],
      `call denops#notify("${denops.name}", "sendChatMessage", [bufnr()])`,
    );
    helper.define(
      "BufRead",
      `${chatCacheDir}/*.md`,
      `call denops#notify("${denops.name}", "loadChat", [bufnr()])`,
    );
  });
}
