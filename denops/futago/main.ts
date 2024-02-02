// =============================================================================
// File        : main.ts
// Author      : yukimemi
// Last Change : 2024/01/28 13:13:15.
// =============================================================================

import * as fn from "https://deno.land/x/denops_std@v5.3.0/function/mod.ts";
import * as helper from "https://deno.land/x/denops_std@v5.3.0/helper/mod.ts";
import * as autocmd from "https://deno.land/x/denops_std@v5.3.0/autocmd/mod.ts";
import * as vars from "https://deno.land/x/denops_std@v5.3.0/variable/mod.ts";
import { deepMerge } from "https://deno.land/std@0.214.0/collections/deep_merge.ts";
import type { Denops } from "https://deno.land/x/denops_std@v5.3.0/mod.ts";
import xdg from "https://deno.land/x/xdg@v10.6.0/src/mod.deno.ts";
import { ensureDir, ensureFile } from "https://deno.land/std@0.214.0/fs/mod.ts";
import { dirname, join } from "https://deno.land/std@0.214.0/path/mod.ts";
import {
  ConsoleHandler,
  FileHandler,
  getLogger,
  RotatingFileHandler,
  setup,
} from "https://deno.land/std@0.214.0/log/mod.ts";
import { GenerationConfig, SafetySetting } from "https://esm.sh/@google/generative-ai@0.2.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { startChat, StartChatParamsSchema } from "./dispatcher/start_chat.ts";
import { loadChat } from "./dispatcher/load_chat.ts";
import {
  DEFAULT_AI_PROMPT,
  DEFAULT_HUMAN_PROMPT,
  DEFAULT_MODEL,
  DEFAULT_OPENER,
} from "./consts.ts";

import { Futago } from "./futago.ts";
import { sendChatMessage } from "./dispatcher/send_chat_message.ts";
import { openHistory } from "./dispatcher/open_history.ts";

let debug = false;
const futagos = new Map<number, Futago>();

let chatDir = join(xdg.cache(), "futago", "chat");
let logFile = join(xdg.cache(), "futago", "log", "futago.log");
let historyDb = join(xdg.cache(), "futago", "db", "history.db");
let model = DEFAULT_MODEL;
let safetySettings: SafetySetting[];
let generationConfig: GenerationConfig;
let humanPrompt = DEFAULT_HUMAN_PROMPT;
let aiPrompt = DEFAULT_AI_PROMPT;
let opener = DEFAULT_OPENER;
let db: Deno.Kv;

export async function main(denops: Denops): Promise<void> {
  debug = await vars.g.get(denops, "futago_debug", false);
  chatDir = z.string().parse(
    await fn.expand(
      denops,
      await vars.g.get(denops, "futago_chat_path", chatDir),
    ),
  );
  historyDb = z.string().parse(
    await fn.expand(denops, await vars.g.get(denops, "futago_history_db", historyDb)),
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
  aiPrompt = await vars.g.get(denops, "futago_ai_prompt", aiPrompt);
  humanPrompt = await vars.g.get(denops, "futago_human_prompt", humanPrompt);
  opener = await vars.g.get(denops, "futago_opener", opener);

  await ensureDir(chatDir);
  logFile = z.string().parse(
    await fn.expand(denops, await vars.g.get(denops, "futago_log_file", logFile)),
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
    chatDir,
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
    async startChat(params: unknown): Promise<void> {
      const parsed = StartChatParamsSchema.omit({ db: true, chatDir: true }).safeParse(
        params,
      );
      const futago = parsed.success
        ? await startChat(
          denops,
          deepMerge(
            { db, chatDir, opener, safetySettings, generationConfig, humanPrompt, aiPrompt, debug },
            parsed.data,
          ),
        )
        : await startChat(denops, {
          model,
          db,
          chatDir,
          opener,
          safetySettings,
          generationConfig,
          humanPrompt,
          aiPrompt,
          debug,
        });
      futagos.set(futago.bufnr, futago);
    },

    async loadChat(params: unknown): Promise<void> {
      const bufnr = z.number().parse(params);
      if (futagos.get(bufnr) != undefined) {
        return;
      }
      const futago = await loadChat(denops, { bufnr, db, chatDir, debug });
      futagos.set(bufnr, futago);
    },

    async sendChatMessage(params: unknown): Promise<void> {
      const bufnr = z.number().parse(params);
      const futago = futagos.get(bufnr);
      if (futago == undefined) {
        throw new Error(`Buffer not found: ${bufnr}`);
      }
      await sendChatMessage(denops, { futago });
    },

    async openHistory(): Promise<void> {
      await openHistory(denops, { chatDir });
    },
  };

  await helper.execute(
    denops,
    `
      function! s:${denops.name}_notify(method, params) abort
        call denops#plugin#wait_async('${denops.name}', function('denops#notify', ['${denops.name}', a:method, a:params]))
      endfunction
    `,
  );

  const chatCachePattern = `${chatDir.replace(/\\/g, "/")}/*.md`;

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
