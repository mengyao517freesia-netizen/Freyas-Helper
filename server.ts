import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const PORT = 3000;

// Lazy initialization helper for Gemini
let genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
      throw new Error("Gemini API Key is missing. Please add your key in the 'Secrets' panel (cog icon in top right).");
    }
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

app.post("/api/analyze", async (req, res) => {
  const { content, url, tone = "professional" } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  try {
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `你是一位 Moloco 广告运营和客户成功专家。
          
          输入的需求内容: "${content}"
          工单链接: "${url || "无"}"

          请分析并执行以下任务，返回一个 JSON 对象：
          
          1. steps (数组): 拆解为具体的 MCP (Ad Performance Management) 操作步骤。包含账户名、预算、优化目标、地理排除等。
          2. reply (字串): 生成一段专业的、技术性的客户回复（中文）。语气：${tone}。确认收到、动作总结、后续安排。
          3. slack (对象): 
             - content: 格式化的 Slack 汇报文本。
             - project_name: 提取的项目/账户名。
             - request_type: 提取的请求类型。

          JSON 结构示例:
          {
            "steps": ["步骤1", "步骤2"],
            "reply": "尊敬的客户...",
            "slack": {
              "content": "Hi team...",
              "project_name": "Project X",
              "request_type": "Campaign Update"
            }
          }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({ 
      error: "Analysis failed", 
      details: error.message || "Internal server error"
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
