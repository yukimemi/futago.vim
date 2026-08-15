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
  // credential-less runs (CI, fresh checkouts) stay green instead of
  // failing on a missing environment variable.
  //
  // No workflow supplies GEMINI_API_KEY any more: the old deno.yml that
  // passed the repo secret was removed when CI moved to the kata-managed
  // ci.yml, which is shared across every denops plugin and so cannot carry
  // a repo-specific secret. This case therefore runs only locally, with
  // GEMINI_API_KEY exported. Export it before touching sendMessageStream.
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
