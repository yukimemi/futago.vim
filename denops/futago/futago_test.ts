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
      assertStringIncludes(response, "私は");
    } finally {
      db.close();
    }
  },
});
