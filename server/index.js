import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { providerTemplates, maskProvider } from "./providers.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8787);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function normalizeChatCompletionsUrl(baseUrl = "") {
  const clean = String(baseUrl).trim().replace(/\/$/, "");
  if (!clean) return "";
  if (clean.endsWith("/chat/completions")) return clean;
  return `${clean}/chat/completions`;
}

function validateProviderConfig(provider) {
  if (!provider?.enabled) return "模型未启用";
  if (!provider?.apiKey) return "缺少 API Key";
  if (!provider?.baseUrl) return "缺少 Base URL";
  if (!provider?.model) return "缺少模型名称";
  return null;
}

async function callOpenAICompatible(provider, messages) {
  const startedAt = Date.now();
  const validationError = validateProviderConfig(provider);

  if (validationError) {
    return {
      id: provider.id,
      name: provider.name,
      ok: false,
      error: validationError,
      latencyMs: Date.now() - startedAt
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(normalizeChatCompletionsUrl(provider.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: 0.3,
        stream: false
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        id: provider.id,
        name: provider.name,
        ok: false,
        error: data?.error?.message || data?.message || `HTTP ${response.status}`,
        latencyMs: Date.now() - startedAt
      };
    }

    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || "";

    return {
      id: provider.id,
      name: provider.name,
      ok: true,
      content,
      usage: data?.usage || null,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      id: provider.id,
      name: provider.name,
      ok: false,
      error: error.name === "AbortError" ? "请求超时" : error.message,
      latencyMs: Date.now() - startedAt
    };
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "xjDAO AI",
    providers: providerTemplates.map(maskProvider)
  });
});

app.post("/api/chat", async (req, res) => {
  const { messages = [], providers = [] } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: "messages 不能为空" });
  }

  const enabledProviders = providers.filter((item) => item?.enabled);

  if (enabledProviders.length === 0) {
    return res.status(400).json({ ok: false, error: "请至少启用一个模型" });
  }

  const results = await Promise.all(
    enabledProviders.map((provider) => callOpenAICompatible(provider, messages))
  );

  res.json({ ok: true, results });
});

if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`xjDAO AI server running on http://localhost:${PORT}`);
});
