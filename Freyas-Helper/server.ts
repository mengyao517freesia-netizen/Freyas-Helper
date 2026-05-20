import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

  // Helper to handle AI generation
  async function generateGeminiContent(prompt: string) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    try {
      const response = await ai.models.generateContent({ 
        model: "gemini-3.5-flash",
        contents: prompt 
      });
      const text = response.text;
      if (!text) return "AI generated an empty response. Please try again.";
      return text;
    } catch (err: any) {
      console.error("Gemini API Error Detail:", err);
      if (err.message?.includes("429")) {
        throw new Error("API 调用频率过高（Quota Exceeded）。Gemini 免费版限制较多。请稍等 30 秒后再试。");
      }
      throw err;
    }
  }

  // ==========================================
  // 💡 LOCAL OFFLINE HEURISTIC RULE ENGINE (FALLBACK)
  // ==========================================
  
  function localBreakdown(request: string): string {
    const lines = request.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    
    // Extract all urls first
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls: string[] = [];
    request.replace(urlRegex, (match) => {
      urls.push(match);
      return match;
    });

    const uploadRemove: string[] = [];
    const buildStop: string[] = [];
    const cpAdgroup: string[] = [];
    const trackLink: string[] = [];
    const others: string[] = [];

    // Categorize based on keywords
    for (const line of lines) {
      const lower = line.toLowerCase();
      
      // Check keyword groups
      if (/(上传|移除|素材|图片|视频|创意|creative|upload|remove|delete|image|video)/.test(lower)) {
        uploadRemove.push(line);
      } else if (/(新建|关停|创建|暂停|campaign|new|pause|stop|create)/.test(lower)) {
        buildStop.push(line);
      } else if (/(复制|素材组|adgroup|adset|copy|duplicate)/.test(lower)) {
        cpAdgroup.push(line);
      } else if (/(绑定|tracking|link|链接|track|监测|attribution|adjust|appsflyer)/.test(lower)) {
        trackLink.push(line);
      } else {
        others.push(line);
      }
    }

    // Format with numbers
    let output = "### 📋 广告需求执行步骤 (本地离线分析 - 非Gemini托管)\n\n";

    if (uploadRemove.length > 0) {
      output += "#### 【上传/移除素材】\n";
      uploadRemove.forEach((item, index) => {
        output += `${index + 1}. ${item}\n`;
      });
      output += "\n";
    }
    if (buildStop.length > 0) {
      output += "#### 【新建/关停Campaign】\n";
      buildStop.forEach((item, index) => {
        output += `${index + 1}. ${item}\n`;
      });
      output += "\n";
    }
    if (cpAdgroup.length > 0) {
      output += "#### 【复制素材组】\n";
      cpAdgroup.forEach((item, index) => {
        output += `${index + 1}. ${item}\n`;
      });
      output += "\n";
    }
    if (trackLink.length > 0) {
      output += "#### 【绑定Tracking Link】\n";
      trackLink.forEach((item, index) => {
        output += `${index + 1}. ${item}\n`;
      });
      output += "\n";
    }
    
    if (others.length > 0 || output === "### 📋 广告需求执行步骤 (本地离线分析 - 非Gemini托管)\n\n") {
      output += "#### 【其他操作】\n";
      const finalOthers = others.length > 0 ? others : [request];
      finalOthers.forEach((item, index) => {
        output += `${index + 1}. ${item}\n`;
      });
      output += "\n";
    }

    if (urls.length > 0) {
      output += "#### 🔗 提取保留链接\n";
      urls.forEach((url, index) => {
        output += `- 链接 ${index + 1}: ${url}\n`;
      });
      output += "\n";
    }

    output += "#### 💡 待澄清/建议确认\n";
    output += "1. 请确认素材移除操作是**直接删除**还是**暂停**运行？\n";
    output += "2. 复制素材组时，是备份在**原 Campaign** 下还是需要跨 Campaign 复制？\n";
    output += "3. 是否需要针对新建或调整的广告设置特定的 **Targeting** (如受众、地区、语言等)？\n";
    output += "4. 预算及出价逻辑是否保持和同系列线上其他组一致？\n";

    return output;
  }

  function localSlackParser(rawContent: string): string {
    const lower = rawContent.toLowerCase();
    
    // Source detection
    let source = "Wechat";
    if (lower.includes("feishu") || lower.includes("飞书") || lower.includes("lark") || (!lower.includes("wechat") && !lower.includes("微信") && !lower.includes("wecom"))) {
      if (lower.includes("feishu") || lower.includes("飞书") || lower.includes("lark")) {
        source = "Feishu";
      } else {
        source = "Wechat";
      }
    }

    // WP Account detection
    const knownAccounts = [
      "CENTURY_GAMES", "MICROFUN", "GATHERONE", "BITOOL",
      "AVIAGAMES", "STARFISH", "STARPARTY", "AURORA_PIXEL", "JUNEPLAY", "NORHEN"
    ];
    let matchedWP = "";
    for (const acc of knownAccounts) {
      if (lower.includes(acc.toLowerCase())) {
        matchedWP = acc;
        break;
      }
    }
    
    if (!matchedWP) {
      const goZqMatch = rawContent.match(/GATHERONE[-_ ]+GO[-_]ZQ[-_\w]+/i) || rawContent.match(/GO[-_]ZQ[-_\w]+/i);
      if (goZqMatch) {
         matchedWP = goZqMatch[0].toUpperCase();
      }
    }

    const wpRegex = /(?:wp|WP)[\s\-_:<>]?([A-Za-z0-9_\-]+)/;
    const wpMatch = rawContent.match(wpRegex);
    const wpAccount = matchedWP || (wpMatch ? wpMatch[1].toUpperCase() : "AURORA_PIXEL");

    // Group mapping: top-2 / top-3
    const wpUpper = wpAccount.toUpperCase();
    const isTop3 = 
      wpUpper.includes("CENTURY") || 
      wpUpper.includes("MICROFUN") || 
      wpUpper.includes("GATHERONE") || 
      wpUpper.includes("GO-ZQ") || 
      wpUpper.includes("ZQ") || 
      wpUpper.includes("WONDERFUL") ||
      wpUpper.includes("HURELAX") ||
      wpUpper.includes("BITOOL") ||
      lower.includes("century") ||
      lower.includes("microfun") ||
      lower.includes("gatherone") ||
      lower.includes("go-zq") ||
      lower.includes("wonderful") ||
      lower.includes("hurelax") ||
      lower.includes("bitool");

    const group = isTop3 ? "gaming_top_3" : "gaming_top_2";

    // Request Type
    let taskType = "Campaign Optimization / Creative Update";
    const auroraRegex = /\[AURORA_PIXEL\]-([^\s\n]+)/i;
    const auroraMatch = rawContent.match(auroraRegex);
    if (auroraMatch) {
      let rawTask = auroraMatch[1];
      // Remove any daily dates (e.g., 20260519, 2026-05-19, or any 8 digit / YYYYMMDD style dates)
      rawTask = rawTask.replace(/\d{8}/g, "");
      rawTask = rawTask.replace(/\d{4}-?\d{2}-?\d{2}-?/g, "");
      // Remove leading or trailing dashes/underscores
      rawTask = rawTask.replace(/^[-_]+|[-_]+$/g, "");
      rawTask = rawTask.replace(/^-+|-+$/g, "");
      if (rawTask) {
        taskType = rawTask;
      }
    } else {
      const taskMatch = rawContent.match(/(?:cr_upload|cr_remove|campaign paused|campaign_new|adgroup_copy)/i);
      if (taskMatch) {
        taskType = taskMatch[0];
      } else if (lower.includes("remove") || lower.includes("paused") || lower.includes("off")) {
        taskType = "CR_Remove/Campaign Paused";
      } else if (lower.includes("new") || lower.includes("create")) {
        taskType = "Campaign_New";
      } else if (lower.includes("copy") || lower.includes("duplicate")) {
        taskType = "AdGroup_Copy";
      } else if (lower.includes("upload")) {
        taskType = "Cr_upload";
      }
    }

    // URL detection
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const urlMatch = rawContent.match(urlRegex);
    const url = urlMatch ? urlMatch[1] : "Empty";

    // DDL detection
    let ddlLine = "Expected to be finished in 15 mins";
    if (/(?:15|30|45|60)\s*(?:mins|min|分钟)/.test(lower)) {
      const minsMatch = lower.match(/(\d+)\s*(?:mins|min|分钟)/);
      if (minsMatch) {
        ddlLine = `Expected to be finished in ${minsMatch[1]} mins`;
      }
    } else if (lower.includes("1 hr") || lower.includes("1hr") || lower.includes("1 hour") || lower.includes("一小时") || lower.includes("1小时")) {
      ddlLine = "Expected to be finished in 1 hr.";
    } else {
      const ddlMatch = rawContent.match(/(?:ddl|时效|截止)[\s\-_:<>]?([^\s\n]+)/i);
      if (ddlMatch) {
         ddlLine = `Expected to be finished/DDL: ${ddlMatch[1]}`;
      }
    }

    return `Hello ${group},
· WP: <${wpAccount}>
· Request in thread: ${source}-${taskType}
· Ticket with details: ${url}
· ${ddlLine}`;
  }

  function localReply(context: string, tone: string): string {
    const cleanContext = context.trim();
    if (tone === "friendly") {
      return `收到！老板辛苦了！工作流已加急为您排单，这就去为您处理！💪 
我们马上对以下内容进行确认并执行部署，完毕后第一时间给您同步哈，请放心亲亲！笔芯～❤️\n\n背景涉及：${cleanContext}`;
    }
    if (tone === "concise") {
      return `已收到需求并开始处理。\n解析背景：${cleanContext}`;
    }
    if (tone === "apologetic") {
      return `真的万分抱歉！给您的投放工作带来不便了。我们感到非常愧疚，技术团队已经接入，正全力跟进。我们正在进行应急预案的处理，请您稍等。`;
    }
    if (tone === "english") {
      return `Understood. We have safely received your request and queued it for execution. We will keep you updated once the changes are fully live. Thank you for your support!\nDetails: ${cleanContext}`;
    }
    return `您好，我们已接收到您的工作流需求。目前项目团队已安排专项排班处理该队列。\n我们将跟进以下核心事项，确保投放配置准确无误，处理完毕后将在此告知您：${cleanContext}`;
  }

  function localSalesReply(context: string): string {
    return `好哒，收到收到！我们这边已经核对完客户提交的广告配置需求了，已经在后台新建排期，大概15分钟内全部配置上，请放心哈！
  
另外顺便同步一个小细节：后续为了更好地做数据优化提升 ROAS 的产出，建议可以积极反向引导一下客户：
1. 建议引导客户加开对应子账户的【数据分析/报告展示】权限，以便我们实时观测高转化渠道数据。
2. 可以向客户建议，在现有的 Campaign 组之外，再配合测试一两组全新的相似素材组，这样在算法学习期能拿到更大敞口的展现增量～

我们这边上线后第一时间群里通知！`;
  }

  // API Routes
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.post("/api/breakdown", async (req, res) => {
    try {
      const { request } = req.body;
      if (!request) return res.status(400).json({ error: "内容不能为空" });
      
      if (!process.env.GEMINI_API_KEY) {
        console.log("No GEMINI_API_KEY. Using offline engine fallback.");
        return res.json({ breakdown: localBreakdown(request) });
      }

      const prompt = `
        你是资深 UA(User Acquisition) 运营助理。
        任务：将口语化的广告需求拆解成可执行的步骤，并保留任何链接（如 Google Drive Link）。
        
        要求：
        1. 使用中文输出。
        2. 必须按照以下分类列出步骤（如果没有则跳过该分类）：
           - 【上传/移除素材】
           - 【新建/关停Campaign】
           - 【复制素材组】
           - 【绑定Tracking Link】
           - 【其他操作】
        3. 每项后面附加 1, 2, 3 编号。
        4. **关键：** 必须在步骤中原样保留需求中的 Google Drive 链接或其他 URL。
        5. 在最后增加“💡 待澄清/建议确认”板块，针对“备份组还是新建组”、“移除是删除还是暂停”、“是否需要Targeting”等提出问题。
        
        用户需求："${request}"
      `;
      try {
        const text = await generateGeminiContent(prompt);
        res.json({ breakdown: text });
      } catch (geminiError: any) {
        console.warn("Gemini Service Exception, falling back to offline rule parser:", geminiError.message);
        res.json({ breakdown: localBreakdown(request) });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reply", async (req, res) => {
    try {
      const { context, tone } = req.body;
      if (!context) return res.status(400).json({ error: "内容不能为空" });

      if (!process.env.GEMINI_API_KEY) {
        console.log("No GEMINI_API_KEY. Using offline reply fallback.");
        return res.json({ reply: localReply(context, tone) });
      }

      const tonePrompts: Record<string, string> = {
        "professional": "专业/正式：沉稳有礼。",
        "friendly": "亲切牛马：态度极其卑微且效率极高，常用‘收到！这就办’、‘辛苦了’、‘没问题亲亲’。",
        "concise": "简洁/直接：无废话。",
        "apologetic": "致歉/安抚：诚恳道歉。",
        "english": "Professional English: Clear and helpful."
      };

      const prompt = `
        你是一位 UA 运营助理。起草回复。
        风格：${tonePrompts[tone] || tonePrompts["professional"]}
        要求：直接输出回复正文，不要有前导语。
        背景内容："${context}"
      `;
      try {
        const text = await generateGeminiContent(prompt);
        res.json({ reply: text });
      } catch (geminiError: any) {
        console.warn("Gemini Reply Exception, falling back to offline reply generator:", geminiError.message);
        res.json({ reply: localReply(context, tone) });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sales-reply", async (req, res) => {
    try {
      const { context } = req.body;
      if (!context) return res.status(400).json({ error: "内容不能为空" });

      if (!process.env.GEMINI_API_KEY) {
        console.log("No GEMINI_API_KEY. Using offline sales fallback.");
        return res.json({ reply: localSalesReply(context) });
      }

      const prompt = `
        你是一位资深 AdOps 处理专家。现在有客户的需求涉及：${context}。
        
        任务：生成一段同步给 Sales/客户经理 的汇报文案。
        要求：
        1. 告知 Sales 需求已接收并正在执行。
        2. 针对“权限”、“数据优化”、“ROAS”、“指标波动”等点，给 Sales 建议如何反向引导客户（如：引导客户加开权限、建议尝试 X 素材、解释数据延迟等）。
        3. 语气利落。
        
        直接输出内容。
      `;
      try {
        const text = await generateGeminiContent(prompt);
        res.json({ reply: text });
      } catch (geminiError: any) {
        console.warn("Gemini Sales Exception, falling back to offline sales generator:", geminiError.message);
        res.json({ reply: localSalesReply(context) });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/slack", async (req, res) => {
    try {
      const { rawContent } = req.body;
      if (!rawContent) return res.status(400).json({ error: "内容不能为空" });

      if (!process.env.GEMINI_API_KEY) {
        console.log("No GEMINI_API_KEY. Using offline Slack fallback.");
        return res.json({ formatted: localSlackParser(rawContent) });
      }

      const prompt = `
        你是一个 UA 运营专家，专门负责从 Slack 消息或 Zendesk 工单中提取关键投放信息。
        
        提取字段及格式要求：
        1. WP 账户：识别提到的账户名称或 ID。
        2. Group 识别：根据 WP 账户或上下文内容识别属于哪个组 (gaming_top_2 或 gaming_top_3)。
           分组映射规则：
           - gaming_top_3 的 WP 账户列表：
             CENTURY_GAMES, MICROFUN, GATHERONE, GO-ZQ-Wonderful-1126, GO-ZQ-HURELAX-0718, GO-ZQ-wonderful-0715, BITOOL，或者任何含有 GATHERONE / GO-ZQ / ZQ 字眼的账户。
           - gaming_top_2 的 WP 账户列表：
             AVIAGAMES, Starfish, Starparty, AURORA_PIXEL, JUNEPLAY, Norhen。
           如果未能在内容中明确匹配，默认识为 gaming_top_2。
        3. Request Type (即 Request in thread 后面的部分)：
           - 必须严格采用格式：<Source>-<TaskType>
           - <Source>：只能识别为 "Wechat" 或 "Feishu" (根据内容中的来源、沟通渠道或群名等上下文判断)。
           - <TaskType>：识别提取 \`[AURORA_PIXEL]-\` 后面的任务内容 (例如 \`[AURORA_PIXEL]-20260519-CR_Remove/Campaign Paused\`，提取为 \`CR_Remove/Campaign Paused\`，如果是 Cr_upload，则提取为 \`Cr_upload\`)。注意：**必须彻底去除任何日期或时间戳（例如 20260519、YYYYMMDD 等格式），不要包含任何日期**。
           - 示例最终合成结果应该类似：\`Wechat-CR_Remove/Campaign Paused\` 或 \`Feishu-CR_Remove/Campaign Paused\`。
        4. URL：保留 any link。
        5. DDL 时效：(如果是具体时间则输出 YYYYMMDD-HH:mm，如果是相对时间如 15分钟则输出 15 mins，一小时输出 1 hr.)

        最后按此模板输出内容（必须严格使用圆点“· ”作为项目符号，不要有任何多余的 markdown 前缀或说明，直接输出该文本模板）：
        Hello [gaming_top_2 或 gaming_top_3],
        · WP: <[WP账户]>
        · Request in thread: [Request Type]
        · Ticket with details: [URL or Empty]
        · [DDL Line - 如果是具体时间显示 DDL: XXX, 如果是分钟/小时等显示 Expected to be finished in XXX]
        
        原始内容：
        "${rawContent}"
      `;
      try {
        const text = await generateGeminiContent(prompt);
        res.json({ formatted: text });
      } catch (geminiError: any) {
        console.warn("Gemini Slack exception, falling back to offline Slack parser:", geminiError.message);
        res.json({ formatted: localSlackParser(rawContent) });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite/Static Middleware
  async function startAppDevServer() {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://0.0.0.0:${PORT}`);
    });
  }

  if (!process.env.VERCEL) {
    startAppDevServer().catch(err => {
      console.error("Failed to start server:", err);
    });
  }

  export default app;
