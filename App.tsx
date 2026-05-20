import React, { useState } from "react";
import { 
  Clipboard, 
  Send, 
  CheckCircle2, 
  Slack, 
  MessageSquare, 
  Split, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  Loader2,
  Copy,
  Mail,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SlackData {
  content: string;
  project_name: string;
  request_type: string;
}

interface AnalysisResult {
  steps: string[];
  reply: string;
  slack: SlackData;
}

export default function App() {
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [tone, setTone] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<"steps" | "reply" | "slack">("steps");
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, url, tone }),
      });
      const data = await response.json();
      setResult(data);
      setActiveTab("steps");
    } catch (error) {
      alert("解析失败，请检查 API 配置");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 顶部导航 */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Zap className="text-white w-5 h-5 fill-current" />
          </div>
          <span className="text-lg font-bold tracking-tight">Moloco 运营工作台</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
          <span className="hidden md:inline">智能解析 · 提单生成 · 客户回复</span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧输入区 */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">需求内容</label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="粘贴原始需求，例如：给 Account_A 在美国增加 500 预算..."
                className="w-full h-64 p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm leading-relaxed"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">工单链接 (可选)</label>
              <input 
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://zendesk.com/..."
                className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>

            <div className="flex gap-2">
              {['professional', 'friendly'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    tone === t ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {t === 'professional' ? '专业模式' : '亲切模式'}
                </button>
              ))}
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={loading || !content}
              className="w-full py-4 bg-gray-900 hover:bg-black disabled:bg-gray-200 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
              {loading ? "AI 正在分析..." : "立即解析需求"}
            </button>
          </div>
        </div>

        {/* 右侧输出区 */}
        <div className="lg:col-span-7 h-fit sticky top-24">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
            {result ? (
              <>
                <div className="flex border-b border-gray-100 p-2">
                  {[
                    { id: "steps", label: "操作清单", icon: Split },
                    { id: "reply", label: "回复文案", icon: Mail },
                    { id: "slack", label: "Slack 提单", icon: Slack },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === tab.id ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 p-6 overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {activeTab === "steps" && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        {result.steps.map((step, i) => (
                          <div key={i} className="flex gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 items-start">
                            <span className="bg-white border border-gray-200 text-[10px] font-black w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                            <p className="text-sm text-gray-700 font-medium">{step}</p>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === "reply" && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 text-sm text-blue-900 leading-relaxed whitespace-pre-wrap font-medium">
                          {result.reply}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "slack" && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                         <div className="bg-gray-900 rounded-xl p-5 font-mono text-[13px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                           {result.slack.content}
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                  <button 
                    onClick={() => copyToClipboard(
                      activeTab === "steps" ? result.steps.join("\n") : 
                      activeTab === "reply" ? result.reply : result.slack.content
                    )}
                    className="w-full py-3 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "已复制到剪贴板" : "复制当前内容"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-10">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                   <MessageSquare className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-sm font-bold tracking-tight">输入需求以开始分析</p>
                <p className="text-xs mt-1">AI 将自动生成操作步骤、回复和 Slack 消息</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}