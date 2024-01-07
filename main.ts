import { ensure, is } from "https://deno.land/x/unknownutil@v3.11.0/mod.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(
  ensure(Deno.env.get("GEMINI_API_KEY"), is.String),
);

async function run() {
  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = "あなたの名前はなんですか？";

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log(text);
}

run();
