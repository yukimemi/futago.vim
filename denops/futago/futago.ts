import { ensure, is } from "https://deno.land/x/unknownutil@v3.11.0/mod.ts";
import {
  ChatSession,
  GenerateContentStreamResult,
  GenerativeModel,
  GoogleGenerativeAI,
  StartChatParams,
} from "npm:@google/generative-ai@0.1.3";

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

  // public async *sendMessageStream(message: string) {
  //   if (!this.#chatSession) {
  //     this.startChat();
  //   }

  //   if (this.#chatSession == undefined) {
  //     throw new Error("Chat session is not started");
  //   }

  //   if (message === "") {
  //     return "";
  //   }

  //   const result = await this.#chatSession.sendMessageStream(message);
  //   let text = "";
  //   for await (const chunk of result.stream) {
  //     const chunkText = chunk.text();
  //     yield chunkText;
  //     text += chunkText;
  //   }
  //   return text;
  // }

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
