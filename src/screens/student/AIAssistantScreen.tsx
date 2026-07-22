import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, BrainCircuit } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import PageContainer from '@/components/layout/PageContainer';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

const suggestedPrompts = [
  'Explain normalization in DBMS',
  'What is a Turing machine?',
  'Difference between TCP and UDP',
  'How does virtual memory work?',
];

const dummyResponses: Record<string, string> = {
  default: "I'm your AI Study Assistant! I can help you understand concepts, solve problems, and prepare for exams. Try asking me about any topic from your subjects.",
};

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: "Hi! I'm your AI Study Assistant. Ask me anything about your subjects!", isUser: false },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const message = text || input.trim();
    if (!message) return;

    setMessages((prev) => [...prev, { id: Date.now(), text: message, isUser: true }]);
    setInput('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: dummyResponses.default,
          isUser: false,
        },
      ]);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <AppHeader
        title="AI Study Assistant"
        showBack
        rightAction={
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
        }
      />
      <div className="flex-1 max-w-md mx-auto w-full flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 ${msg.isUser ? 'flex-row-reverse' : ''}`}
              >
                {!msg.isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <BrainCircuit size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.isUser
                      ? 'bg-blue-600 text-white rounded-tr-md'
                      : 'bg-white text-gray-700 shadow-sm shadow-gray-200/60 border border-gray-100 rounded-tl-md'
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {messages.length <= 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4">
              <p className="text-xs font-medium text-gray-400 mb-3">Suggested questions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="px-3 py-2 bg-white rounded-xl text-xs font-medium text-blue-600 border border-gray-100 shadow-sm shadow-gray-200/60 hover:bg-blue-50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="px-4 py-3 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              <Send size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
