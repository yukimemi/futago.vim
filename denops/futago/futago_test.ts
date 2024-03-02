// =============================================================================
// File        : futago_test.ts
// Author      : yukimemi
// Last Change : 2024/03/02 14:53:45.
// =============================================================================

import { Futago } from "./futago.ts";
import { assertStringIncludes } from "https://deno.land/std@0.217.0/assert/assert_string_includes.ts";

Deno.test({
  name: "Test sendMessageStream()",
  fn: async () => {
    const db = await Deno.openKv();
    try {
      const futago = new Futago(
        0,
        "gemini-pro",
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
