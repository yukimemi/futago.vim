// =============================================================================
// File        : futago_test.ts
// Author      : yukimemi
// Last Change : 2024/01/08 02:58:11.
// =============================================================================

import { Futago } from "./futago.ts";
import { assertStringIncludes } from "https://deno.land/std@0.212.0/assert/assert_string_includes.ts";

Deno.test({
  name: "Test sendMessageStream()",
  fn: async () => {
    const futago = new Futago();
    futago.startChat();
    const result = await futago.sendMessageStream("こんにちは！君の名は？");
    let response = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      console.log(chunkText);
      response += chunkText;
    }
    assertStringIncludes(response, "私は");
  },
});
