// =============================================================================
// File        : main.ts
// Author      : yukimemi
// Last Change : 2024/01/20 13:49:02.
// =============================================================================

import * as batch from "https://deno.land/x/denops_std@v5.3.0/batch/mod.ts";
import * as buffer from "https://deno.land/x/denops_std@v5.3.0/buffer/mod.ts";
import * as datetime from "https://deno.land/std@0.212.0/datetime/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.3.0/function/mod.ts";
import * as helper from "https://deno.land/x/denops_std@v5.3.0/helper/mod.ts";
import * as option from "https://deno.land/x/denops_std@v5.3.0/option/mod.ts";
import * as autocmd from "https://deno.land/x/denops_std@v5.3.0/autocmd/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v5.3.0/variable/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v5.3.0/mod.ts";
import xdg from "https://deno.land/x/xdg@v10.6.0/src/mod.deno.ts";
import { walk } from "https://deno.land/std@0.212.0/fs/walk.ts";
import { assert, ensure, is } from "https://deno.land/x/unknownutil@v3.14.1/mod.ts";
import { ensureDir, ensureFile } from "https://deno.land/std@0.212.0/fs/mod.ts";
import { basename, dirname, extname, join } from "https://deno.land/std@0.212.0/path/mod.ts";
import {
  ConsoleHandler,
  FileHandler,
  getLogger,
  RotatingFileHandler,
  setup,
} from "https://deno.land/std@0.212.0/log/mod.ts";
import {
  GenerationConfig,
  InputContent,
  SafetySetting,
} from "https://esm.sh/@google/generative-ai@0.1.3";

import { Futago } from "./futago.ts";

let debug = false;
const futagos = new Map<number, {
  futago: Futago;
  buf: buffer.OpenResult;
  lines: string[];
  path: string;
}>();

let chatCacheDir = join(xdg.cache(), "futago", "chat");
let logFile = join(xdg.cache(), "futago", "log", "futago.log");
let historyDb = join(xdg.cache(), "futago", "db", "history.db");
let model = "gemini-pro";
let safetySettings: SafetySetting[];
let generationConfig: GenerationConfig;
let db: Deno.Kv;

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
  historyDb = ensure(
    await fn.expand(denops, await vars.g.get(denops, "futago_history_db", historyDb)),
    is.String,
  );
  await ensureDir(dirname(historyDb));
  model = await vars.g.get(denops, "futago_model", model);
  safetySettings = await vars.g.get(
    denops,
    "futago_safety_settings",
    safetySettings,
  ) as SafetySetting[];
  generationConfig = await vars.g.get(
    denops,
    "futago_generation_config",
    generationConfig,
  ) as GenerationConfig;

  await ensureDir(chatCacheDir);
  logFile = ensure(
    await fn.expand(denops, await vars.g.get(denops, "futago_log_file", logFile)),
    is.String,
  );
  await ensureFile(logFile);

  setup({
    handlers: {
      console: new ConsoleHandler("DEBUG"),
      file: new RotatingFileHandler("DEBUG", {
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
  logger.debug({
    debug,
    chatCacheDir,
    model,
    safetySettings,
    generationConfig,
    logFile,
    historyDb,
  });
  const fileHandler = logger.handlers[1] as FileHandler;
  if (fileHandler) {
    fileHandler.flush();
  }
  db = await Deno.openKv(historyDb);

  denops.dispatcher = {
    async startChat(opener?: unknown, history?: unknown): Promise<void> {
      const futago = new Futago(model, db, safetySettings, generationConfig);
      if (opener != undefined) {
        assert(opener, is.String);
      }
      if (history != undefined) {
        const h = history as InputContent[];
        futago.startChat({ history: h });
      } else {
        futago.startChat();
      }

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

      const futago = new Futago(model, db, safetySettings, generationConfig);
      const bufname = await fn.bufname(denops, bufnr);
      futago.chatTitle = basename(bufname, extname(bufname));
      const history = await futago.getHistory();
      futago.startChat({ history });

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

      await batch.batch(denops, async () => {
        await option.filetype.setBuffer(denops, buf.bufnr, "markdown");
        await option.buftype.setBuffer(denops, buf.bufnr, "acwrite");
        await option.buflisted.setBuffer(denops, buf.bufnr, true);
        await option.swapfile.setBuffer(denops, buf.bufnr, false);
        await option.wrap.setBuffer(denops, buf.bufnr, true);
        await option.modified.setBuffer(denops, buf.bufnr, false);
      });

      await denops.cmd(`redraw!`);
      const lastLine = await getLastLineNumber(denops, buf.bufnr);
      await fn.setpos(denops, ".", [buf.bufnr, lastLine, 0, 0]);

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

        // prompt empty check.
        if (
          prompt.every((line) =>
            line.trim() === ""
          )
        ) {
          return;
        }

        await fn.appendbufline(
          denops,
          futago.buf.bufnr,
          await getLastLineNumber(denops, futago.buf.bufnr),
          ["", `Gemini: ${getNow()}`, "-------------", ""],
        );

        const lastNum = await getLastLineNumber(denops, futago.buf.bufnr);
        let stop = false;
        const cb = async () => {
          if (stop) {
            return;
          }
          const lastLine = await fn.getbufline(denops, futago.buf.bufnr, lastNum);
          await fn.setbufline(denops, futago.buf.bufnr, lastNum, [
            lastLine + ".",
          ]);
          setTimeout(cb, 500);
        };
        cb();

        const result = futago.futago.sendMessageStream(prompt.join("\n"));

        for await (const chunk of result) {
          if (!stop) {
            stop = true;
            await fn.setbufline(denops, futago.buf.bufnr, lastNum, [""]);
          }
          logger.debug(chunk);
          const lines = chunk.split(/\r?\n/);
          const lastLineNum = await getLastLineNumber(denops, futago.buf.bufnr);
          const lastLine = await fn.getbufline(denops, futago.buf.bufnr, lastLineNum);
          await fn.setbufline(denops, futago.buf.bufnr, lastLineNum, [
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

        if (futago.path === "") {
          futago.path = join(chatCacheDir, `${futago.futago.chatTitle}.md`);
          logger.debug(`Chat path: ${futago.path}`);
        }

        const bufLines = await fn.getbufline(denops, futago.buf.bufnr, 1, "$");

        futagos.set(futago.buf.bufnr, {
          futago: futago.futago,
          buf: futago.buf,
          lines: bufLines,
          path: futago.path,
        });

        await denops.cmd(`redraw!`);
        const lastLine = await getLastLineNumber(denops, futago.buf.bufnr);
        await fn.setpos(denops, ".", [futago.buf.bufnr, lastLine, 0, 0]);

        // Save buffer to file.
        await Deno.writeTextFile(futago.path, bufLines.join("\n"));
      } catch (e) {
        console.error(`main.ts`, e);
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
        chatFiles.sort().reverse();
        await batch.batch(denops, async (denops) => {
          await fn.setqflist(denops, [], " ", {
            title: `Chat History`,
            efm: "%f",
            lines: chatFiles,
          });
        });
        await denops.cmd("botright copen");
      } catch (e) {
        console.error(`main.ts`, e);
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

  const chatCachePattern = `${chatCacheDir.replace(/\\/g, "/")}/*.md`;

  await autocmd.group(denops, "futago_chat_buffer", (helper) => {
    helper.remove("*");
    helper.define(
      "BufWriteCmd",
      ["futago://chat/*", chatCachePattern],
      `call denops#notify("${denops.name}", "sendChatMessage", [bufnr()])`,
    );
    helper.define(
      "BufRead",
      chatCachePattern,
      `call denops#notify("${denops.name}", "loadChat", [bufnr()])`,
    );
  });
}
