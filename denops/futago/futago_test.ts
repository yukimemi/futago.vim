// =============================================================================
// File        : futago_test.ts
// Author      : yukimemi
// Last Change : 2024/11/02 18:44:13.
// =============================================================================

import { Futago } from "./futago.ts";
import { assertStringIncludes } from "jsr:@std/assert@1.0.11";

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
