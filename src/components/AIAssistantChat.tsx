import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  X,
  Send,
  Loader2,
  RotateCcw,
  TrendingUp,
  Shield,
  HelpCircle,
  ChevronDown,
  MessageSquare
} from 'lucide-react';
import { OptionLeg, MarketEnvironment, PositionMetrics } from '../types/options';

interface AIAssistantChatProps {
  environment: MarketEnvironment;
  legs: OptionLeg[];
  metrics: PositionMetrics;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

const STARTER_PROMPTS = [
  'Explain my strategy risk',
  'How to adjust if NIFTY drops 200 pts?',
  'Explain Delta in simple Hindi/English',
  'Is my Theta decay positive?'
];

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  environment,
  legs,
  metrics
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContextDetails, setShowContextDetails] = useState(false);

  const activeLegs = legs.filter(l => l.enabled);

  const initialGreeting = `Namaste! 🙏 I am your **TradeLab AI Options Mentor**.

I have your active strategy context loaded (**${environment.symbol} @ ₹${environment.spotPrice.toLocaleString()}**, ${activeLegs.length} active legs).

Ask me anything about:
- **Strategy analysis & payoff behavior**
- **Adjustment rules** if the market trends up or down
- **Greeks breakdown** (Delta, Theta, Gamma, Vega) in simple Hindi or English!`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      role: 'model',
      text: initialGreeting,
      timestamp: Date.now()
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  // Construct Strategy Context payload for AI
  const getStrategyContext = () => {
    return {
      symbol: environment.symbol,
      spotPrice: environment.spotPrice,
      changePercent: environment.changePercent,
      globalIV: environment.globalIV,
      legs: activeLegs.map(l => ({
        id: l.id,
        action: l.action,
        type: l.type,
        strike: l.strike,
        expiry: l.expiry,
        lots: l.lots,
        lotSize: l.lotSize,
        entryPrice: l.entryPrice
      })),
      maxProfit: metrics.maxProfit,
      maxLoss: metrics.maxLoss,
      breakevens: metrics.breakevens,
      pop: metrics.probabilityOfProfit,
      netDelta: metrics.netDelta,
      netTheta: metrics.netTheta,
      netVega: metrics.netVega,
      netDebitCredit: metrics.netDebitCredit
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history for API
      const historyPayload = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/ai-mentor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          strategyContext: getStrategyContext()
        })
      });

      const data = await res.json();
      const replyText = data.reply || 'Could not fetch mentor advice. Please try again.';

      const modelMessage: ChatMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        text: replyText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (err) {
      console.error('Failed to chat with AI mentor:', err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'model',
        text: 'Sorry, there was a temporary connection error. Please try asking again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        role: 'model',
        text: initialGreeting,
        timestamp: Date.now()
      }
    ]);
  };

  // Simple Markdown formatter for clean rendering
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bullet points
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      // Handle bold **text**
      const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

      const content = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed my-0.5">
            {content}
          </li>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-xs leading-relaxed my-0.5">
          {content}
        </p>
      );
    });
  };

  return (
    <>
      {/* 1. FLOATING 'AI ASSISTANT' BUTTON (Bottom right corner) */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        {!isOpen ? (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5"
            aria-label="Open AI Assistant"
          >
            {/* Pulsing indicator */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>

            <Bot size={18} className="text-white" />
            <span className="text-xs font-bold tracking-tight">AI Mentor</span>

            <span className="hidden sm:inline-block text-[10px] bg-blue-500/80 px-2 py-0.5 rounded-full font-mono">
              Ask AI
            </span>
          </button>
        ) : null}
      </div>

      {/* 2. CHAT WINDOW (Clean, modern Sensibull/Zerodha card) */}
      {isOpen && (
        <div className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-50 w-[360px] sm:w-[420px] max-w-[calc(100vw-1.5rem)] h-[560px] max-h-[82vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 font-sans">
          {/* Header */}
          <div className="bg-white border-b border-slate-100 p-3.5 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Bot size={19} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    TradeLab AI Mentor
                  </h3>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold shrink-0">
                    Gemini
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Options & Greeks Mentor (Hindi/English)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                title="Restart Chat"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                title="Close AI Assistant"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Active Strategy Context Bar */}
          <div className="bg-slate-50 border-b border-slate-100 px-3 py-2 text-[11px] text-slate-600 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-slate-900">{environment.symbol}</span>
                <span className="text-slate-400">@</span>
                <span className="font-semibold text-slate-800">
                  ₹{environment.spotPrice.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-sans">
                  ({activeLegs.length} Leg{activeLegs.length > 1 ? 's' : ''})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowContextDetails(prev => !prev)}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
              >
                <span>{showContextDetails ? 'Hide' : 'Context'}</span>
                <ChevronDown
                  size={11}
                  className={`transition-transform duration-200 ${
                    showContextDetails ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {showContextDetails && (
              <div className="mt-1 pt-1.5 border-t border-slate-200/60 grid grid-cols-2 gap-1 text-[10px] font-mono animate-in fade-in duration-150">
                <div>
                  <span className="text-slate-400">Max Profit:</span>{' '}
                  <span className="font-semibold text-emerald-600">
                    {typeof metrics.maxProfit === 'number'
                      ? `₹${Math.round(metrics.maxProfit).toLocaleString()}`
                      : metrics.maxProfit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Max Loss:</span>{' '}
                  <span className="font-semibold text-rose-600">
                    {typeof metrics.maxLoss === 'number'
                      ? `₹${Math.round(metrics.maxLoss).toLocaleString()}`
                      : metrics.maxLoss}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">POP:</span>{' '}
                  <span className="font-semibold text-blue-600">{metrics.probabilityOfProfit}%</span>
                </div>
                <div>
                  <span className="text-slate-400">Net Delta:</span>{' '}
                  <span className="font-semibold text-slate-800">{metrics.netDelta.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 bg-slate-50/40">
            {messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="prose prose-xs max-w-none text-slate-800">
                        {renderFormattedText(msg.text)}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              );
            })}

            {/* Typing Loader */}
            {isLoading && (
              <div className="flex items-start gap-2 max-w-[80%]">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
                  <Loader2 size={13} className="text-blue-600 animate-spin" />
                  <span className="text-[11px] text-slate-500 font-medium">
                    Analyzing strategy context...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Starter Quick Pills */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {STARTER_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-full whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about adjustments, Greeks, or risk..."
              disabled={isLoading}
              className="flex-1 bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-transparent focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-white" />
              ) : (
                <Send size={13} className="text-white ml-0.5" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
};
