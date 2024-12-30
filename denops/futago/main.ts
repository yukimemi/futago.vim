// =============================================================================
// File        : main.ts
// Author      : yukimemi
// Last Change : 2024/12/30 15:39:42.
// =============================================================================

import * as fn from "jsr:@denops/std@7.4.0/function";
import * as helper from "jsr:@denops/std@7.4.0/helper";
import * as autocmd from "jsr:@denops/std@7.4.0/autocmd";
import * as vars from "jsr:@denops/std@7.4.0/variable";
import { deepMerge } from "jsr:@std/collections@1.0.9";
import type { Denops } from "jsr:@denops/std@7.4.0";
import { dir } from "jsr:@cross/dir@1.1.0";
import { ensureDir, ensureFile } from "jsr:@std/fs@1.0.8";
import { dirname, join } from "jsr:@std/path@1.0.8";
import {
  ConsoleHandler,
  FileHandler,
  getLogger,
  RotatingFileHandler,
  setup,
} from "jsr:@std/log@0.224.12";
import { GenerationConfig, SafetySetting } from "npm:@google/generative-ai@0.21.0";
import { z } from "npm:zod@3.24.1";

import { startChat, StartChatParamsSchema } from "./dispatcher/start_chat.ts";
import { loadChat } from "./dispatcher/load_chat.ts";
import { gitCommit, GitCommitParamsSchema } from "./dispatcher/git_commit.ts";
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

let chatDir = join(await dir("cache"), "futago", "chat");
let logFile = join(await dir("cache"), "futago", "log", "futago.log");
let historyDb = join(await dir("cache"), "futago", "db", "history.db");
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
            {
              model,
              db,
              chatDir,
              opener,
              safetySettings,
              generationConfig,
              humanPrompt,
              aiPrompt,
              debug,
            },
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
      futagos.set(futago.bufnr, futago);
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

    async gitCommit(params: unknown): Promise<void> {
      const parsed = GitCommitParamsSchema.omit({ db: true }).safeParse(params);
      if (parsed.success) {
        await gitCommit(
          denops,
          deepMerge(
            { db, model, safetySettings, generationConfig, debug },
            parsed.data,
          ),
        );
      } else {
        await gitCommit(denops, {
          model,
          db,
          safetySettings,
          generationConfig,
          debug,
        });
      }
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
      "futago://chat/*",
      `call denops#notify("${denops.name}", "sendChatMessage", [bufnr()])`,
    );
    helper.define(
      "BufRead",
      chatCachePattern,
      `call denops#notify("${denops.name}", "loadChat", [bufnr()])`,
    );
  });
}
