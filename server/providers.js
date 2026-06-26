export const providerTemplates = [
  {
    id: "gpt",
    name: "GPT",
    provider: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    enabled: true
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    provider: "openai-compatible",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V3",
    enabled: false
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    provider: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    enabled: false
  },
  {
    id: "grok",
    name: "Grok",
    provider: "openai-compatible",
    baseUrl: "https://api.x.ai/v1",
    model: "grok-3-mini",
    enabled: false
  },
  {
    id: "mimo",
    name: "MiMo",
    provider: "openai-compatible",
    baseUrl: "",
    model: "",
    enabled: false
  },
  {
    id: "gemini",
    name: "Gemini",
    provider: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-1.5-flash",
    enabled: false
  }
];

export function maskProvider(provider) {
  return {
    ...provider,
    apiKey: provider.apiKey ? "***" : ""
  };
}
