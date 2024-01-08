// =============================================================================
// File        : futago.ts
// Author      : yukimemi
// Last Change : 2024/01/08 09:51:00.
// =============================================================================

import { ensure, is } from "https://deno.land/x/unknownutil@v3.13.0/mod.ts";
import {
  ChatSession,
  GenerateContentStreamResult,
  GenerativeModel,
  GoogleGenerativeAI,
  StartChatParams,
} from "https://esm.sh/@google/generative-ai@0.1.3";

export class Futago {
  #genAI: GoogleGenerativeAI;
  #model: GenerativeModel;
  #chatSession: ChatSession | undefined;

  public constructor(model: string = "gemini-pro") {
    const apiKey = ensure(Deno.env.get("GEMINI_API_KEY"), is.String);
    this.#genAI = new GoogleGenerativeAI(apiKey);
    this.#model = this.#genAI.getGenerativeModel({ model });
  }

  public startChat(startChatParams: StartChatParams = {}): void {
    this.#chatSession = this.#model.startChat(startChatParams);
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
