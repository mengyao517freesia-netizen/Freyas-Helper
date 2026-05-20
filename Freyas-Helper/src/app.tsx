/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  ClipboardList, 
  MessageSquare, 
  Slack, 
  Send, 
  RefreshCcw, 
  CheckCircle2, 
  ChevronRight,
  Loader2,
  Copy,
  ListChecks,
  Ticket,
  Settings,
  Users,
  Search,
  Shield,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"breakdown" | "reply" | "slack" | "search">("breakdown");

  const [wpSearchQuery, setWpSearchQuery] = useState("");

  const wpDatabase = [
    { name: "CENTURY_GAMES", group: "gaming_top_3", desc: "Century Games 账户" },
    { name: "MICROFUN", group: "gaming_top_3", desc: "Microfun 账户" },
    { name: "GATHERONE - GO-ZQ-Wonderful-1126（jade麻将产品）", aliases: ["gatherone", "go-zq", "wonderful", "1126", "jade", "麻将"], group: "gaming_top_3", desc: "Gatherone 麻将产品" },
    { name: "GATHERONE - GO-ZQ-HURELAX-0718（mahjong blast: wonders）", aliases: ["gatherone", "go-zq", "hurelax", "0718", "mahjong", "blast", "wonders"], group: "gaming_top_3", desc: "Gatherone Wonders" },
    { name: "GATHERONE - GO-ZQ-wonderful-0715（block crush）", aliases: ["gatherone", "go-zq", "wonderful", "0715", "block", "crush"], group: "gaming_top_3", desc: "Gatherone Block Crush" },
    { name: "BITOOL", group: "gaming_top_3", desc: "BiTool 账户" },
    { name: "AVIAGAMES", group: "gaming_top_2", desc: "AviaGames 账户" },
    { name: "Starfish", aliases: ["starfish", "海星"], group: "gaming_top_2", desc: "Starfish 账户" },
    { name: "Starparty", aliases: ["starparty", "星际创意"], group: "gaming_top_2", desc: "Starparty 账户" },
    { name: "AURORA_PIXEL", aliases: ["aurora", "pixel", "极光"], group: "gaming_top_2", desc: "Aurora Pixel 核心账户" },
    { name: "JUNEPLAY", group: "gaming_top_2", desc: "Juneplay 账户" },
    { name: "Norhen", aliases: ["norhen", "北境"], group: "gaming_top_2", desc: "Norhen 账户" }
  ];

  const [breakdownInput, setBreakdownInput] = useState('后台有一批带有"战车"关键词的素材，辛苦帮忙下架一下，链接参考：https://drive.google.com/drive/folders/123456789。然后重新复制一批配置 CPP 的在头部 Campaign 测试一下~');
  const [breakdownResult, setBreakdownResult] = useState("");
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState("");

  const [replyContext, setReplyContext] = useState("");
  const [replyTone, setReplyTone] = useState("professional");
  const [replyResult, setReplyResult] = useState("");
  const [salesResult, setSalesResult] = useState("");
  const [isReplyLoading, setIsReplyLoading] = useState(false);
  const [isSalesLoading, setIsSalesLoading] = useState(false);
  const [replyError, setReplyError] = useState("");

  const [slackInput, setSlackInput] = useState("");
  const [slackResult, setSlackResult] = useState("");
  const [isSlackLoading, setIsSlackLoading] = useState(false);
  const [slackError, setSlackError] = useState("");

  const SALES_KEYWORDS = ["数据分析", "广告优化", "权限", "analysis", "optimize", "permission", "roas", "data", "报告", "授权"];

  const TONES = [
    { value: "professional", label: "专业 / 正式" },
    { value: "friendly", label: "亲切 / 牛马" },
    { value: "concise", label: "简洁 / 直接" },
    { value: "apologetic", label: "致歉 / 安抚" },
    { value: "english", label: "English" },
  ];

  const handleBreakdown = async () => {
    if (!breakdownInput) return;
    setIsBreakdownLoading(true);
    setBreakdownError("");
    try {
      const res = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: breakdownInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setBreakdownResult(data.breakdown);
    } catch (err: any) {
      setBreakdownError(err.message);
    } finally {
      setIsBreakdownLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyContext) return;
    setIsReplyLoading(true);
    setReplyError("");
    setReplyResult("");
    setSalesResult("");
    
    // Check if sales reply is needed
    const needsSales = SALES_KEYWORDS.some(kw => replyContext.toLowerCase().includes(kw));

    try {
      // 1. Regular Customer Reply
      const customerRes = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: replyContext, tone: replyTone }),
      });
      const customerData = await customerRes.json();
      if (!customerRes.ok) throw new Error(customerData.error || "Generation failed");
      setReplyResult(customerData.reply);

      // 2. Sales Reply if triggered
      if (needsSales) {
        setIsSalesLoading(true);
        const salesRes = await fetch("/api/sales-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: replyContext }),
        });
        const salesData = await salesRes.json();
        if (salesRes.ok) setSalesResult(salesData.reply);
      }
    } catch (err: any) {
      setReplyError(err.message);
    } finally {
      setIsReplyLoading(false);
      setIsSalesLoading(false);
    }
  };

  const handleSlack = async () => {
    if (!slackInput) return;
    setIsSlackLoading(true);
    setSlackError("");
    try {
      const res = await fetch("/api/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawContent: slackInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed");
      setSlackResult(data.formatted);
    } catch (err: any) {
      setSlackError(err.message);
    } finally {
      setIsSlackLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert("已复制到剪贴板");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold shadow-md">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-tight tracking-tighter text-indigo-600">AD-OPS</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Freya's Helper</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             AI Instance: Online
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl w-full px-6 py-8 flex-1">
        {/* Navigation Tabs */}
        <div className="mb-8 bg-slate-200/50 p-1 rounded-xl flex gap-1">
          <button 
            onClick={() => setActiveTab("breakdown")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
              activeTab === "breakdown" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
            )}
          >
            <ClipboardList className="w-4 h-4" /> A. 拆解需求
          </button>
          <button 
            onClick={() => setActiveTab("reply")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
              activeTab === "reply" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
            )}
          >
            <MessageSquare className="w-4 h-4" /> B. 回复需求
          </button>
          <button 
            onClick={() => setActiveTab("slack")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
              activeTab === "slack" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
            )}
          >
            <Slack className="w-4 h-4" /> C. Slack 工单
          </button>
          <button 
            onClick={() => setActiveTab("search")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
              activeTab === "search" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
            )}
          >
            <Search className="w-4 h-4" /> D. WP 评级查询
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "breakdown" && (
            <motion.div
              key="breakdown"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800">拆解需求为工作流</h3>
                  <p className="text-xs text-slate-400">把口语化的需求自动拆成编号清晰的执行步骤</p>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">原始需求内容</label>
                  <textarea
                    value={breakdownInput}
                    onChange={(e) => setBreakdownInput(e.target.value)}
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none text-sm leading-relaxed"
                    placeholder="粘贴需求内容..."
                  />
                </div>
                <button 
                  onClick={handleBreakdown}
                  disabled={isBreakdownLoading || !breakdownInput}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black disabled:opacity-50 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                >
                  {isBreakdownLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
                  执行智能拆解
                </button>

                {breakdownError && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg">{breakdownError}</div>}

                {breakdownResult && (
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Actionable Tasks & Links</span>
                      <button onClick={() => copyToClipboard(breakdownResult)} className="text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-colors">
                        <Copy className="w-3.5 h-3.5" /> 复制概览
                      </button>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-inner">
                      <div className="markdown-body prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed font-medium">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{breakdownResult}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "reply" && (
            <motion.div
              key="reply"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">生成回复草稿</h3>
                <p className="text-xs text-slate-400">支持多语气切换，提供针对性回复建议</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">需求背景 / 反馈上下文</label>
                  <textarea
                    value={replyContext}
                    onChange={(e) => setReplyContext(e.target.value)}
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none text-sm leading-relaxed"
                    placeholder="客户说了什么？你想回什么要点？"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">设定语气风格</label>
                    <select 
                      value={replyTone}
                      onChange={(e) => setReplyTone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white transition-all outline-none"
                    >
                      {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleReply}
                      disabled={isReplyLoading || !replyContext}
                      className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg font-bold hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isReplyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      智能生成回复
                    </button>
                    {replyResult && (
                       <button onClick={handleReply} className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                          <RefreshCcw className={cn("w-4 h-4", isReplyLoading && "animate-spin")} />
                       </button>
                    )}
                  </div>
                </div>

                {replyError && <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg">{replyError}</div>}

                {(replyResult || salesResult || isSalesLoading) && (
                   <div className={cn("pt-6 border-t border-slate-100 gap-6", (replyResult && (salesResult || isSalesLoading)) ? "grid grid-cols-1 lg:grid-cols-2" : "flex flex-col space-y-6")}>
                    {/* Customer Reply Section */}
                    {replyResult && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Customer Reply Draft</span>
                          <button onClick={() => copyToClipboard(replyResult)} className="text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg flex items-center gap-1.5 text-xs font-bold">
                            <Copy className="w-3.5 h-3.5" /> 复制文案
                          </button>
                        </div>
                        <div className="bg-emerald-50/30 p-5 rounded-xl border border-emerald-100/50">
                          <p className="text-sm leading-relaxed text-slate-700 italic font-medium whitespace-pre-wrap">
                            {replyResult}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Sales Dialogue Section */}
                    {(salesResult || isSalesLoading) && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                              <Users className="w-3 h-3" /> Sales 对话 (自动触发)
                            </span>
                            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-bold border border-amber-100">命中深度需求关键词</span>
                          </div>
                          {salesResult && (
                            <button onClick={() => copyToClipboard(salesResult)} className="text-amber-600 p-2 hover:bg-amber-50 rounded-lg flex items-center gap-1.5 text-xs font-bold">
                              <Copy className="w-3.5 h-3.5" /> 复制内容
                            </button>
                          )}
                        </div>
                        <div className="bg-amber-50/20 p-5 rounded-xl border border-amber-200/40 relative">
                          {isSalesLoading ? (
                            <div className="flex items-center gap-2 text-amber-500 text-xs font-medium py-4">
                              <Loader2 className="w-4 h-4 animate-spin" /> 正在生成销售同步文案...
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed text-slate-600 font-medium whitespace-pre-wrap">
                              {salesResult}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "slack" && (
            <motion.div
              key="slack"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Slack 消息快速生成</h3>
                <p className="text-xs text-slate-400">智能提取核心信息，自动填充标准化模板</p>
              </div>
              <div className="p-6 space-y-6">
                 <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">粘贴 Zendesk/Ticket 原始内容</label>
                  <textarea
                    value={slackInput}
                    onChange={(e) => setSlackInput(e.target.value)}
                    className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all resize-none text-sm leading-relaxed"
                    placeholder="Ctrl+A → Ctrl+C 整个工单页面内容，粘贴在此..."
                  />
                  <p className="text-[10px] text-slate-400">AI 将自动识别 Group、WP 账户、Request 类型和 DDL</p>
                </div>

                <button 
                  onClick={handleSlack}
                  disabled={isSlackLoading || !slackInput}
                  className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                   {isSlackLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                   识别并生成消息
                </button>

                   {isSlackLoading ? (
                     <div className="h-full flex items-center justify-center text-slate-300 text-[11px] italic text-center p-8">
                       <Loader2 className="w-6 h-6 animate-spin text-slate-200 mb-2 block mx-auto" />
                       正在提取内容...
                     </div>
                   ) : slackError ? (
                     <div className="p-3 text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg">{slackError}</div>
                   ) : slackResult ? (
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Slack Template</span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 font-bold">可直接修改</span>
                      </div>
                      <button onClick={() => copyToClipboard(slackResult)} className="text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg flex items-center gap-1.5 text-xs font-bold">
                        <Copy className="w-3.5 h-3.5" /> 复制消息
                      </button>
                    </div>
                    <textarea 
                      value={slackResult}
                      onChange={(e) => setSlackResult(e.target.value)}
                      className="w-full min-h-[160px] bg-slate-900 text-slate-100 p-5 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-800 focus:ring-2 focus:ring-purple-500/30 outline-none transition-all resize-y"
                    />
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}

          {activeTab === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-500" /> WP 评级 & Group 智能查询
                  </h3>
                  <p className="text-xs text-slate-400">快速检索 WP 账号属于 gaming_top_2 还是 gaming_top_3</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Search Input Box */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={wpSearchQuery}
                    onChange={(e) => setWpSearchQuery(e.target.value)}
                    placeholder="输入 WP 账号名或关键词检索（例如: aurora, go-zq, wonderful, microfun...）"
                    className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                  {wpSearchQuery && (
                    <button
                      onClick={() => setWpSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors text-xs font-semibold"
                    >
                      清除
                    </button>
                  )}
                </div>

                {/* Display matched result if query is entered */}
                {wpSearchQuery.trim() !== "" ? (() => {
                  const query = wpSearchQuery.trim().toLowerCase();
                  const matched = wpDatabase.filter(item => 
                    item.name.toLowerCase().includes(query) || 
                    (item.aliases && item.aliases.some(alias => alias.toLowerCase().includes(query)))
                  );

                  return (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> 智能匹配结果 ({matched.length})
                        </span>
                      </div>

                      {matched.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm italic py-8">
                          未找到匹配项目。请检查拼写或尝试其他关键词。
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {matched.map((item, idx) => (
                            <div 
                              key={idx}
                              className={cn(
                                "p-4 rounded-xl border flex flex-col justify-between transition-all hover:shadow-sm",
                                item.group === "gaming_top_3" 
                                  ? "bg-emerald-50/45 border-emerald-100/80" 
                                  : "bg-indigo-50/45 border-indigo-100/80"
                              )}
                            >
                              <div>
                                <div className="flex justify-between items-start gap-2 mb-2">
                                  <span className={cn(
                                    "px-2 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                                    item.group === "gaming_top_3"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  )}>
                                    {item.group === "gaming_top_3" ? "gaming_top_3 (最高优先级)" : "gaming_top_2 (高优先级)"}
                                  </span>
                                  <button 
                                    onClick={() => copyToClipboard(item.name)} 
                                    className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
                                    title="复制账号名称"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm whitespace-pre-wrap">{item.name}</h4>
                                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })() : null}

                {/* Directory Panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* gaming_top_3 panel */}
                  <div className="border border-emerald-100 rounded-xl bg-emerald-50/10 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-100/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="font-bold text-emerald-900 text-sm">gaming_top_3 账号库</h4>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/50 px-2 py-0.5 rounded-full">
                        6 个账户序列
                      </span>
                    </div>

                    <div className="space-y-2">
                      {wpDatabase.filter(item => item.group === "gaming_top_3").map((item, idx) => (
                        <div 
                          key={idx}
                          className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-sm transition-all group"
                        >
                          <div className="truncate pr-2">
                            <span className="text-xs font-bold text-slate-700 block truncate" title={item.name}>
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{item.desc}</span>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(item.name)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-50 rounded text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center animate-fade-in"
                            title="复制账号名"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* gaming_top_2 panel */}
                  <div className="border border-indigo-100 rounded-xl bg-indigo-50/10 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-indigo-100/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                        <h4 className="font-bold text-indigo-900 text-sm">gaming_top_2 账号库</h4>
                      </div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/50 px-2 py-0.5 rounded-full">
                        6 个账户序列
                      </span>
                    </div>

                    <div className="space-y-2">
                      {wpDatabase.filter(item => item.group === "gaming_top_2").map((item, idx) => (
                        <div 
                          key={idx}
                          className="flex justify-between items-center p-2.5 rounded-lg bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all group"
                        >
                          <div className="truncate pr-2">
                            <span className="text-xs font-bold text-slate-700 block truncate" title={item.name}>
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{item.desc}</span>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(item.name)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-50 rounded text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center animate-fade-in"
                            title="复制账号名"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Classification tips card */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-3">
                  <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-semibold text-slate-700">AdOps 分组归置规则提醒</h5>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      1. gaming_top_3 分组包括世纪华通 (CENTURY_GAMES)、MICROFUN、GATHERONE 的 GO-ZQ 系列（Jade麻将、Mahjong Wonders、Block Crush）及 BITOOL 账号序列。在生成 Slack 格式时会自动判定。<br/>
                      2. gaming_top_2 包括 AVIAGAMES, Starfish, Starparty, AURORA_PIXEL, JUNEPLAY 以及 Norhen。默认其他不属于 top 3 的将被判定归入 top 2。<br/>
                      3. 点击上述任一列表右侧的复制图标即可一键提取准确的 WP 标记名以匹配 Zendesk。
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mx-auto max-w-5xl w-full px-6 py-6 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[11px] text-slate-400 font-medium font-sans">© 2026 AD-OPS | INTELLIGENT WORKFLOW LAYER</p>
        <div className="flex gap-4">
          <span className="text-[10px] text-slate-400">Security Check: Passed</span>
          <span className="text-[10px] text-slate-400">Model: Gemini 2.0 Flash</span>
        </div>
      </footer>
    </div>
  );
}
