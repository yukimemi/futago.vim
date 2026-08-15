// =============================================================================
// File        : futago_test.ts
// Author      : yukimemi
// Last Change : 2025/11/02 11:29:38.
// =============================================================================

import { Futago } from "./futago.ts";
import { assertStringIncludes } from "@std/assert";

import { DEFAULT_MODEL } from "./consts.ts";

Deno.test({
  name: "Test sendMessageStream()",
  // Live Gemini API call. Skip when no credential is available so
  // credential-less runs (PR CI, fresh checkouts) stay green instead of
  // failing on a missing environment variable. Runs for real wherever
  // GEMINI_API_KEY is set (deno.yml passes the repo secret).
  ignore: Deno.env.get("GEMINI_API_KEY") == undefined,
  fn: async () => {
    const db = await Deno.openKv();
    try {
      const futago = new Futago(
        0,
        DEFAULT_MODEL,
        db,
        "",
      );
      futago.startChat();
      const result = futago.sendMessageStream("こんにちは！君の名は？");
      let response = "";
      for await (const chunk of result) {
        console.log(chunk);
        response += chunk;
      }
      assertStringIncludes(response, "私");
    } finally {
      db.close();
    }
  },
});
