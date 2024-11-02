// =============================================================================
// File        : send_chat_message.ts
// Author      : yukimemi
// Last Change : 2024/11/02 19:08:44.
// =============================================================================

import * as fn from "jsr:@denops/std@7.3.0/function";
import * as option from "jsr:@denops/std@7.3.0/option";
import { Futago } from "../futago.ts";
import { getNow } from "../util.ts";
import type { Denops } from "jsr:@denops/std@7.3.0";
import { z } from "npm:zod@3.23.8";
import { Semaphore } from "jsr:@lambdalisue/async@2.1.1";
import { SEPARATOR } from "../consts.ts";
import { getLastLineNumber } from "../util.ts";

export const SendChatMessageParamsSchema = z.object({
  futago: z.instanceof(Futago),
});

export type SendChatMessageParams = z.infer<typeof SendChatMessageParamsSchema>;

export async function sendChatMessage(
  denops: Denops,
  params: SendChatMessageParams,
): Promise<void> {
  const { futago } = params;
  try {
    await futago.semaphore.lock(async () => {
      const lines = await fn.getbufline(denops, futago.bufnr, 1, "$");
      const startLineIndex = lines.findLastIndex((_, index, obj) =>
        obj[index].startsWith(z.string().parse(futago.opts.humanPrompt)) &&
        obj[index + 1] === SEPARATOR
      ) + 2;

      const prompt = lines.slice(startLineIndex);

      // prompt empty check.
      if (
        prompt.every((line) =>
          line.trim() === ""
        )
      ) {
        return;
      }

      await fn.appendbufline(
        denops,
        futago.bufnr,
        await getLastLineNumber(denops, futago.bufnr),
        ["", `${futago.opts.aiPrompt}: ${getNow()}`, SEPARATOR, ""],
      );

      const lastNum = await getLastLineNumber(denops, futago.bufnr);
      const semaphore = new Semaphore(1);
      let stop = false;
      const cb = async () => {
        await semaphore.lock(async () => {
          if (stop) {
            return;
          }
          const lastLine = await fn.getbufline(denops, futago.bufnr, lastNum);
          await fn.setbufline(denops, futago.bufnr, lastNum, [
            lastLine + ".",
          ]);
        });
        setTimeout(cb, 500);
      };
      cb();

      const result = futago.sendMessageStream(prompt.join("\n"));

      for await (const chunk of result) {
        if (!stop) {
          await semaphore.lock(async () => {
            stop = true;
            await fn.setbufline(denops, futago.bufnr, lastNum, [""]);
          });
        }
        const lines = chunk.split(/\r?\n/);
        const lastLineNum = await getLastLineNumber(denops, futago.bufnr);
        const lastLine = await fn.getbufline(denops, futago.bufnr, lastLineNum);
        await fn.setbufline(denops, futago.bufnr, lastLineNum, [
          lastLine + lines[0],
          ...lines.slice(1),
        ]);
      }
      await fn.appendbufline(
        denops,
        futago.bufnr,
        await getLastLineNumber(denops, futago.bufnr),
        ["", `${futago.opts.humanPrompt}: ${getNow()}`, SEPARATOR, ""],
      );

      const bufLines = await fn.getbufline(denops, futago.bufnr, 1, "$");

      await denops.cmd(`redraw!`);
      const currentBufnr = await fn.bufnr(denops);
      if (currentBufnr === futago.bufnr) {
        await denops.cmd("normal! G");
      }

      // Save buffer to file.
      await Deno.writeTextFile(futago.chatPath, bufLines.join("\n"));
    });
  } catch (e) {
    console.error(`send_chat_message.ts`, e);
  } finally {
    await option.modified.setBuffer(denops, futago.bufnr, false);
  }
}
