// =============================================================================
// File        : futago.ts
// Author      : yukimemi
// Last Change : 2024/03/02 15:55:51.
// =============================================================================

import * as datetime from "https://deno.land/std@0.219.1/datetime/mod.ts";
import xdg from "https://deno.land/x/xdg@v10.6.0/src/mod.deno.ts";
import sanitize from "https://esm.sh/sanitize-filename@1.6.3";
import {
  ChatSession,
  GenerationConfig,
  GenerativeModel,
  GoogleGenerativeAI,
  InputContent,
  SafetySetting,
  StartChatParams,
} from "https://esm.sh/@google/generative-ai@0.2.1";
import { getLogger } from "https://deno.land/std@0.219.1/log/mod.ts";
import { getDb, setDb } from "./db.ts";
import { Semaphore } from "https://deno.land/x/async@v2.1.0/semaphore.ts";
import { DEFAULT_AI_PROMPT, DEFAULT_HUMAN_PROMPT, DEFAULT_MODEL } from "./consts.ts";
import { join } from "https://deno.land/std@0.219.1/path/join.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export class Futago {
  #genAI: GoogleGenerativeAI;
  #model: GenerativeModel;
  #chatSession: ChatSession | undefined;
  #history: InputContent[] = [];

  public semaphore = new Semaphore(1);
  public chatTitle = "";
  public chatPath = "";

  public constructor(
    public bufnr: number,
    private model: string = DEFAULT_MODEL,
    private db: Deno.Kv,
    private chatDir: string = join(xdg.cache(), "futago", "chat"),
    public opts: {
      safetySettings?: SafetySetting[];
      generationConfig?: GenerationConfig;
      humanPrompt?: string;
      aiPrompt?: string;
      debug: boolean;
    } = {
      safetySettings: undefined,
      generationConfig: undefined,
      humanPrompt: DEFAULT_HUMAN_PROMPT,
      aiPrompt: DEFAULT_AI_PROMPT,
      debug: false,
    },
  ) {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (apiKey == undefined) {
      throw new Error("Environment variable GEMINI_API_KEY is not defined");
    }
    this.#genAI = new GoogleGenerativeAI(apiKey);
    this.#model = this.#genAI.getGenerativeModel({
      model: this.model,
      safetySettings: this.opts?.safetySettings,
      generationConfig: this.opts?.generationConfig,
    });
  }

  public startChat(startChatParams?: StartChatParams): void {
    if (startChatParams?.history?.length) {
      this.#history = startChatParams.history;
    }
    this.#chatSession = this.#model.startChat(startChatParams);
  }

  public async generateContent(prompt: string): Promise<string> {
    const result = await this.#model.generateContent(prompt);
    if (result.response) {
      return result.response.text();
    }
    throw new Error(`No response: ${prompt}`);
  }

  public async createChatTitle(message: string): Promise<void> {
    const prompt =
      `以下はチャットプロンプトです。このチャットプロンプトから始まるチャットのタイトルを作成してください。作成したタイトルはファイル名として保存します。後からわかりやすいようなファイル名になるようにタイトルを作成してください。タイトルに拡張子は不要です。\n\n${message}`;

    const result = await this.#model.generateContent(prompt);
    const response = result.response;
    this.chatTitle = datetime.format(new Date(), "yyyyMMdd-HHmmss") + "_" +
      sanitize(response.text());
    this.chatPath = join(this.chatDir, `${this.chatTitle}.md`);
  }

  public async *sendMessageStream(message: string) {
    try {
      const logger = this.opts?.debug ? getLogger("debug") : getLogger();
      if (!this.#chatSession) {
        this.startChat();
      }

      if (this.#chatSession == undefined) {
        throw new Error("Chat session is not started");
      }

      if (this.chatTitle === "") {
        await this.createChatTitle(message);
        logger.debug(`Chat title: ${this.chatTitle}`);
      }

      this.#history.push({ role: "user", parts: message });
      const result = await this.#chatSession.sendMessageStream(message);
      logger.debug({ result });

      let text = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        yield chunkText;
        text += chunkText;
      }

      this.#history.push({ role: "model", parts: text });

      const lastData = await getDb(this.db, this.chatTitle);
      logger.debug(lastData);
      if (lastData) {
        const history = lastData.history;
        if (history[history.length - 1].role === "user") {
          history.pop();
        }
        this.#history = history.concat(this.#history);
      }
      await setDb(this.db, this.chatTitle, {
        model: this.model,
        generationConfig: this.opts.generationConfig,
        safetySettings: this.opts.safetySettings,
        humanPrompt: z.string().parse(this.opts.humanPrompt),
        aiPrompt: z.string().parse(this.opts.aiPrompt),
        history: this.#history,
      });
    } catch (e) {
      console.error(`futago.ts`, e);
    }
  }
}
