// =============================================================================
// File        : futago.ts
// Author      : yukimemi
// Last Change : 2024/01/13 12:31:52.
// =============================================================================

import * as datetime from "https://deno.land/std@0.211.0/datetime/mod.ts";
import sanitize from "https://esm.sh/sanitize-filename@1.6.3";
import {
  ChatSession,
  GenerateContentStreamResult,
  GenerationConfig,
  GenerativeModel,
  GoogleGenerativeAI,
  SafetySetting,
  StartChatParams,
} from "https://esm.sh/@google/generative-ai@0.1.3";

export class Futago {
  #genAI: GoogleGenerativeAI;
  #model: GenerativeModel;
  #chatSession: ChatSession | undefined;

  public chatTitle = "";

  public constructor(
    model: string = "gemini-pro",
    safetySettings?: SafetySetting[],
    generationConfig?: GenerationConfig,
  ) {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (apiKey == undefined) {
      throw new Error("Environment variable GEMINI_API_KEY is not defined");
    }
    this.#genAI = new GoogleGenerativeAI(apiKey);
    this.#model = this.#genAI.getGenerativeModel({ model, safetySettings, generationConfig });
  }

  public startChat(startChatParams?: StartChatParams): void {
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

  public async sendMessageStream(message: string): Promise<GenerateContentStreamResult> {
    if (!this.#chatSession) {
      this.startChat();
    }

    if (this.#chatSession == undefined) {
      throw new Error("Chat session is not started");
    }

    return await this.#chatSession.sendMessageStream(message);
  }
}
