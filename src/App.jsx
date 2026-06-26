import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const defaultProviders = [
  {
    id: "gpt",
    name: "GPT",
    provider: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    apiKey: "",
    enabled: true
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    provider: "openai-compatible",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V3",
    apiKey: "",
    enabled: false
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    provider: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    apiKey: "",
    enabled: false
  },
  {
    id: "grok",
    name: "Grok",
    provider: "openai-compatible",
    baseUrl: "https://api.x.ai/v1",
    model: "grok-3-mini",
    apiKey: "",
    enabled: false
  },
  {
    id: "mimo",
    name: "MiMo",
    provider: "openai-compatible",
    baseUrl: "",
    model: "",
    apiKey: "",
    enabled: false
  },
  {
    id: "gemini",
    name: "Gemini",
    provider: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-1.5-flash",
    apiKey: "",
    enabled: false
  }
];

const initialConversation = {
  id: crypto.randomUUID(),
  title: "新的交叉验证对话",
  messages: [
    {
      role: "assistant",
      content:
        "我是 xjDAO AI。你可以在设置中配置多个模型 API，然后让我同时调用它们回答，并做交叉验证。终于，问答也开始内卷了。"
    }
  ]
};

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function estimateTokens(text = "") {
  return Math.ceil(String(text).length / 1.8);
}

function pickBestAnswer(successes) {
  return successes
    .map((item) => ({ ...item, score: item.content.length - item.latencyMs / 2000 }))
    .sort((a, b) => b.score - a.score)[0];
}

function buildSynthesis(results) {
  const successes = results.filter((item) => item.ok && item.content?.trim());
  const failures = results.filter((item) => !item.ok);

  if (successes.length === 0) {
    return [
      "## 交叉验证失败",
      "所有已启用模型都没有成功返回答案。",
      "",
      "### 失败原因",
      ...failures.map((item) => `- ${item.name}: ${item.error || "未知错误"}`)
    ].join("\n");
  }

  const best = pickBestAnswer(successes);
  const modelSummary = successes
    .map((item) => `- ${item.name}: 成功，耗时 ${item.latencyMs}ms，估算 ${estimateTokens(item.content)} tokens`)
    .join("\n");
  const failureSummary = failures.length
    ? failures.map((item) => `- ${item.name}: ${item.error || "未知错误"}`).join("\n")
    : "- 无";

  const answerBlocks = successes
    .map((item) => `### ${item.name} 原始回答\n\n${item.content}`)
    .join("\n\n---\n\n");

  return [
    "## xjDAO 交叉验证综合答案",
    "",
    `本次共有 ${successes.length} 个模型成功返回，${failures.length} 个模型失败。当前 MVP 使用规则评分选择信息量较高、响应完整度较好的答案作为主答案，并保留所有模型原文，方便人工复核。人类终于承认单一答案不太可靠了，可喜可贺。`,
    "",
    "### 推荐综合答案",
    "",
    best.content,
    "",
    "### 模型状态",
    modelSummary,
    "",
    "### 失败模型",
    failureSummary,
    "",
    "### 原始回答对照",
    "",
    answerBlocks
  ].join("\n");
}

function Message({ message }) {
  return (
    <div className={`message ${message.role}`}>
      <div className="avatar">{message.role === "user" ? "你" : "AI"}</div>
      <div className="bubble">
        {message.content.split("\n").map((line, index) => {
          if (line.startsWith("## ")) return <h2 key={index}>{line.replace("## ", "")}</h2>;
          if (line.startsWith("### ")) return <h3 key={index}>{line.replace("### ", "")}</h3>;
          if (line.startsWith("- ")) return <p className="bullet" key={index}>{line}</p>;
          if (line === "---") return <hr key={index} />;
          return <p key={index}>{line || "\u00A0"}</p>;
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => loadLocal("xjdao.theme", "dark"));
  const [providers, setProviders] = useState(() => loadLocal("xjdao.providers", defaultProviders));
  const [conversations, setConversations] = useState(() => loadLocal("xjdao.conversations", [initialConversation]));
  const [activeConversationId, setActiveConversationId] = useState(() => loadLocal("xjdao.activeConversationId", initialConversation.id));
  const [input, setInput] = useState("");
  const [view, setView] = useState("chat");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("parallel");

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || conversations[0],
    [conversations, activeConversationId]
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveLocal("xjdao.theme", theme);
  }, [theme]);

  useEffect(() => saveLocal("xjdao.providers", providers), [providers]);
  useEffect(() => saveLocal("xjdao.conversations", conversations), [conversations]);
  useEffect(() => saveLocal("xjdao.activeConversationId", activeConversationId), [activeConversationId]);

  function updateActiveConversation(updater) {
    setConversations((items) =>
      items.map((item) => (item.id === activeConversation.id ? updater(item) : item))
    );
  }

  function createConversation() {
    const next = {
      id: crypto.randomUUID(),
      title: "新的对话",
      messages: [
        {
          role: "assistant",
          content: "新对话已创建。请开始你的提问，然后我们一起观赏六个模型互相打架。"
        }
      ]
    };
    setConversations((items) => [next, ...items]);
    setActiveConversationId(next.id);
    setView("chat");
  }

  function updateProvider(id, patch) {
    setProviders((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function submitQuestion(event) {
    event?.preventDefault();
    const question = input.trim();
    if (!question || busy) return;

    const enabledProviders = providers.filter((item) => item.enabled);
    if (enabledProviders.length === 0) {
      alert("请先在设置中至少启用一个模型。是的，AI 应用没有模型就像咖啡店没有咖啡。离谱但常见。");
      return;
    }

    const userMessage = { role: "user", content: question };
    const history = [...activeConversation.messages, userMessage]
      .filter((item) => ["user", "assistant"].includes(item.role))
      .slice(-12)
      .map(({ role, content }) => ({ role, content }));

    setInput("");
    setBusy(true);

    updateActiveConversation((item) => ({
      ...item,
      title: item.title === "新的对话" || item.title === "新的交叉验证对话" ? question.slice(0, 20) : item.title,
      messages: [...item.messages, userMessage, { role: "assistant", content: "正在并行请求模型并做交叉验证……" }]
    }));

    try {
      const activeProviders = mode === "single" ? enabledProviders.slice(0, 1) : enabledProviders;
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, providers: activeProviders })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "请求失败");

      const synthesis = buildSynthesis(data.results);
      updateActiveConversation((item) => ({
        ...item,
        messages: item.messages.map((message, index) =>
          index === item.messages.length - 1 ? { role: "assistant", content: synthesis } : message
        )
      }));
    } catch (error) {
      updateActiveConversation((item) => ({
        ...item,
        messages: item.messages.map((message, index) =>
          index === item.messages.length - 1
            ? { role: "assistant", content: `请求失败：${error.message}` }
            : message
        )
      }));
    } finally {
      setBusy(false);
    }
  }

  const enabledCount = providers.filter((item) => item.enabled).length;

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">xj</div>
          <div>
            <strong>xjDAO AI</strong>
            <span>多模型交叉验证助手</span>
          </div>
        </div>

        <button className="newChat" onClick={createConversation}>+ 新建对话</button>

        <nav className="conversationList">
          {conversations.map((item) => (
            <button
              key={item.id}
              className={item.id === activeConversation.id && view === "chat" ? "active" : ""}
              onClick={() => {
                setActiveConversationId(item.id);
                setView("chat");
              }}
            >
              {item.title}
            </button>
          ))}
        </nav>

        <div className="sideActions">
          <button onClick={() => setView("settings")}>模型设置</button>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "亮色" : "暗色"}</button>
        </div>
      </aside>

      <main className="mainPanel">
        {view === "chat" ? (
          <>
            <header className="topbar">
              <div>
                <h1>{activeConversation.title}</h1>
                <p>已启用 {enabledCount} 个模型，当前模式：{mode === "parallel" ? "并行交叉验证" : "单模型"}</p>
              </div>
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
                <option value="parallel">多模型并行</option>
                <option value="single">单模型</option>
              </select>
            </header>

            <section className="chatArea">
              {activeConversation.messages.map((message, index) => (
                <Message message={message} key={`${message.role}-${index}`} />
              ))}
            </section>

            <form className="composer" onSubmit={submitQuestion}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="输入问题，按 Ctrl + Enter 发送"
                onKeyDown={(event) => {
                  if (event.ctrlKey && event.key === "Enter") submitQuestion(event);
                }}
              />
              <button disabled={busy || !input.trim()}>{busy ? "验证中" : "发送"}</button>
            </form>
          </>
        ) : (
          <section className="settingsPanel">
            <header className="settingsHeader">
              <h1>模型 API 设置</h1>
              <p>配置你的六个模型通道。API Key 当前保存在浏览器本地，生产环境请改成服务端加密保存。</p>
            </header>

            <div className="providerGrid">
              {providers.map((provider) => (
                <article className="providerCard" key={provider.id}>
                  <div className="providerTitle">
                    <h2>{provider.name}</h2>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={provider.enabled}
                        onChange={(event) => updateProvider(provider.id, { enabled: event.target.checked })}
                      />
                      <span>启用</span>
                    </label>
                  </div>

                  <label>
                    Base URL
                    <input
                      value={provider.baseUrl}
                      onChange={(event) => updateProvider(provider.id, { baseUrl: event.target.value })}
                      placeholder="https://api.example.com/v1"
                    />
                  </label>

                  <label>
                    模型名称
                    <input
                      value={provider.model}
                      onChange={(event) => updateProvider(provider.id, { model: event.target.value })}
                      placeholder="model-name"
                    />
                  </label>

                  <label>
                    API Key
                    <input
                      type="password"
                      value={provider.apiKey}
                      onChange={(event) => updateProvider(provider.id, { apiKey: event.target.value })}
                      placeholder="sk-..."
                    />
                  </label>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
