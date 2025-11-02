// =============================================================================
// File        : main.ts
// Author      : yukimemi
// Last Change : 2025/11/02 11:28:53.
// =============================================================================

import * as fn from "@denops/std/function";
import * as helper from "@denops/std/helper";
import * as autocmd from "@denops/std/autocmd";
import * as vars from "@denops/std/variable";
import { deepMerge } from "@std/collections";
import type { Denops } from "@denops/std";
import { dir } from "@cross/dir";
import { ensureDir, ensureFile } from "@std/fs";
import { dirname, join } from "@std/path";
import { ConsoleHandler, FileHandler, getLogger, RotatingFileHandler, setup } from "@std/log";
import { GenerationConfig, SafetySetting } from "@google/generative-ai";
import { z } from "zod";

import { startChat, StartChatParamsSchema } from "./dispatcher/start_chat.ts";
import { loadChat } from "./dispatcher/load_chat.ts";
import { gitCommit, GitCommitParamsSchema } from "./dispatcher/git_commit.ts";
import {
  DEFAULT_AI_PROMPT,
  DEFAULT_GIT_MODEL,
  DEFAULT_HUMAN_PROMPT,
  DEFAULT_MODEL,
  DEFAULT_OPENER,
} from "./consts.ts";

import { Futago } from "./futago.ts";
import { sendChatMessage } from "./dispatcher/send_chat_message.ts";
import { openHistory } from "./dispatcher/open_history.ts";

let debug = false;
const futagos = new Map<number, Futago>();

let chatDir: string;
let logFile: string;
let historyDb: string;

let model = DEFAULT_MODEL;
let gitModel = DEFAULT_GIT_MODEL;
let safetySettings: SafetySetting[];
let generationConfig: GenerationConfig;
let humanPrompt = DEFAULT_HUMAN_PROMPT;
let aiPrompt = DEFAULT_AI_PROMPT;
let opener = DEFAULT_OPENER;
let db: Deno.Kv;

export async function main(denops: Denops): Promise<void> {
  debug = await vars.g.get(denops, "futago_debug", false);

  const userChatPathResult = z.string().nullable().safeParse(
    await vars.g.get(denops, "futago_chat_path", null),
  );
  if (userChatPathResult.success && userChatPathResult.data !== null) {
    chatDir = z.string().parse(await fn.expand(denops, userChatPathResult.data));
  } else {
    chatDir = z.string().parse(await fn.expand(denops, join(await dir("cache"), "futago", "chat")));
  }
  await ensureDir(chatDir);

  const userHistoryDbResult = z.string().nullable().safeParse(
    await vars.g.get(denops, "futago_history_db", null),
  );
  if (userHistoryDbResult.success && userHistoryDbResult.data !== null) {
    historyDb = z.string().parse(await fn.expand(denops, userHistoryDbResult.data));
  } else {
    historyDb = z.string().parse(
      await fn.expand(denops, join(await dir("cache"), "futago", "db", "history.db")),
    );
  }
  await ensureDir(dirname(historyDb));

  const userLogFileResult = z.string().nullable().safeParse(
    await vars.g.get(denops, "futago_log_file", null),
  );
  if (userLogFileResult.success && userLogFileResult.data !== null) {
    logFile = z.string().parse(await fn.expand(denops, userLogFileResult.data));
  } else {
    logFile = z.string().parse(
      await fn.expand(denops, join(await dir("cache"), "futago", "log", "futago.log")),
    );
  }
  await ensureFile(logFile);

  model = await vars.g.get(denops, "futago_model", model);
  gitModel = await vars.g.get(denops, "futago_git_model", gitModel);

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
    gitModel,
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
            { db, model: gitModel, safetySettings, generationConfig, debug },
            parsed.data,
          ),
        );
      } else {
        await gitCommit(denops, {
          model: gitModel,
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
