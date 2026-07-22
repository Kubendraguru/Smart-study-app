import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Sparkles, BrainCircuit, FileText, Image as ImageIcon,
  UploadCloud, X, Paperclip,
} from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

interface UploadedFile {
  name: string;
  size: number;
  type: 'pdf' | 'image';
  previewUrl?: string;
}

const suggestedPrompts = [
  'Explain normalization in DBMS',
  'What is a Turing machine?',
  'Difference between TCP and UDP',
  'How does virtual memory work?',
];

const dummyResponses: Record<string, string> = {
  default:
    "I'm your AI Study Assistant! I can help you understand concepts, solve problems, and prepare for exams. Try asking me about any topic from your subjects.",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeLabel(file: File): 'pdf' | 'image' {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'image';
}

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, text: "Hi! I'm your AI Study Assistant. Ask me anything about your subjects!", isUser: false },
  ]);
  const [input, setInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, uploadedFile]);

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    const type = getFileTypeLabel(file);
    const uploaded: UploadedFile = {
      name: file.name,
      size: file.size,
      type,
      previewUrl: type === 'image' ? URL.createObjectURL(file) : undefined,
    };
    setUploadedFile(uploaded);
  };

  const handlePdfSelect = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const isValid =
      file.type === 'application/pdf' ||
      file.type.startsWith('image/') ||
      file.name.toLowerCase().match(/\.(pdf|png|jpg|jpeg)$/);
    if (isValid) handleFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = () => {
    if (uploadedFile?.previewUrl) URL.revokeObjectURL(uploadedFile.previewUrl);
    setUploadedFile(null);
  };

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
        {/* Upload Section */}
        <div className="px-4 pt-4">
          {!uploadedFile ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`rounded-2xl border-2 border-dashed transition-all duration-300 ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="p-5 text-center">
                <motion.div
                  animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                  className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3"
                >
                  <UploadCloud size={28} className="text-blue-500" />
                </motion.div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Upload Study Material</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Upload a PDF or study screenshot and ask your question.
                </p>

                <div className="flex gap-2.5">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => pdfInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-50 text-red-600 text-xs font-semibold rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    <FileText size={15} />
                    Upload PDF
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => imageInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 text-blue-600 text-xs font-semibold rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
                  >
                    <ImageIcon size={15} />
                    Upload Image
                  </motion.button>
                </div>

                <p className="text-[10px] text-gray-400 mt-3 hidden sm:block">
                  or drag & drop a file here
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl p-4 shadow-sm shadow-gray-200/60 border border-gray-100"
            >
              <div className="flex items-center gap-3">
                {uploadedFile.type === 'image' && uploadedFile.previewUrl ? (
                  <img
                    src={uploadedFile.previewUrl}
                    alt={uploadedFile.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={22} className="text-red-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{uploadedFile.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{formatFileSize(uploadedFile.size)}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs font-medium text-gray-600 uppercase">
                      {uploadedFile.type === 'pdf' ? 'PDF' : 'Image'}
                    </span>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={removeFile}
                  className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handlePdfSelect}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            className="hidden"
            onChange={handleImageSelect}
          />
        </div>

        {/* Chat Messages */}
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

        {/* Chat Input */}
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
