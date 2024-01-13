// =============================================================================
// File        : futago.ts
// Author      : yukimemi
// Last Change : 2024/01/14 00:53:40.
// =============================================================================

import * as datetime from "https://deno.land/std@0.212.0/datetime/mod.ts";
import sanitize from "https://esm.sh/sanitize-filename@1.6.3";
import {
  ChatSession,
  GenerationConfig,
  GenerativeModel,
  GoogleGenerativeAI,
  InputContent,
  SafetySetting,
  StartChatParams,
} from "https://esm.sh/@google/generative-ai@0.1.3";
import { getLogger } from "https://deno.land/std@0.212.0/log/mod.ts";

export class Futago {
  #debug: boolean;
  #db: Deno.Kv;
  #genAI: GoogleGenerativeAI;
  #model: GenerativeModel;
  #chatSession: ChatSession | undefined;
  #history: InputContent[] = [];

  public chatTitle = "";
  public chatPath = "";

  public constructor(
    model: string = "gemini-pro",
    db: Deno.Kv,
    safetySettings?: SafetySetting[],
    generationConfig?: GenerationConfig,
    debug: boolean = false,
  ) {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (apiKey == undefined) {
      throw new Error("Environment variable GEMINI_API_KEY is not defined");
    }
    this.#debug = debug;
    this.#db = db;
    this.#genAI = new GoogleGenerativeAI(apiKey);
    this.#model = this.#genAI.getGenerativeModel({ model, safetySettings, generationConfig });
  }

  public startChat(startChatParams?: StartChatParams): void {
    if (startChatParams?.history?.length) {
      this.#history = startChatParams.history;
    }
    this.#chatSession = this.#model.startChat(startChatParams);
  }

  public async createChatTitle(message: string): Promise<void> {
    const prompt =
      `以下はチャットプロンプトです。このチャットプロンプトから始まるチャットのタイトルを作成してください。作成したタイトルはファイル名として保存します。後からわかりやすいようなファイル名になるようにタイトルを作成してください。タイトルに拡張子は不要です。\n\n${message}`;

    const result = await this.#model.generateContent(prompt);
    const response = result.response;
    this.chatTitle = datetime.format(new Date(), "yyyyMMdd-HHmmss") + "_" +
      sanitize(response.text());
  }

  public async getHistory(): Promise<InputContent[]> {
    const lastHistory = await this.#db.get([this.chatTitle]);
    if (lastHistory.value) {
      return lastHistory.value;
    } else {
      return [];
    }
  }

  public async setHistory(history: InputContent[]) {
    await this.#db.set([this.chatTitle], history);
  }

  public async *sendMessageStream(message: string) {
    const logger = this.#debug ? getLogger("debug") : getLogger();
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

    const lastHistory = await this.getHistory();
    logger.debug(lastHistory);
    if (lastHistory.length > 0) {
      if (lastHistory[lastHistory.length - 1].role === "user") {
        lastHistory.pop();
      }
      this.#history = lastHistory.concat(this.#history);
    }
    await this.setHistory(this.#history);
  }
}
