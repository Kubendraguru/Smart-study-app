import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  BrainCircuit,
  FileText,
  Image as ImageIcon,
  UploadCloud,
  X,
  Paperclip,
  Trash2,
  BookOpen,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Folder,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/context/AuthContext';
import {
  sendAiChatMessage,
  fetchSubjectWisePdfs,
  convertFileToBase64,
  convertUrlToBase64,
  type AttachedMaterial,
  type SubjectWithUnits,
  type PdfMaterialItem,
  type UnitWithPdfs,
} from '@/service/ai';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  attachmentName?: string;
  attachmentType?: 'pdf' | 'image';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderFormattedText(text: string) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Bullet point
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-blue-500 font-bold">•</span>
              <span className="flex-1">{renderInlineFormatting(content)}</span>
            </div>
          );
        }

        // Numbered list
        const matchNum = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (matchNum) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-blue-600 font-semibold min-w-[1.2rem]">{matchNum[1]}.</span>
              <span className="flex-1">{renderInlineFormatting(matchNum[2])}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

function renderInlineFormatting(str: string) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function AIAssistantScreen() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-0',
      text: "Hello! I'm your AI Study Assistant. Ask me anything about your subjects, request summaries, or attach study materials (PDFs & screenshots) for targeted answers!",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [attachedMaterial, setAttachedMaterial] = useState<AttachedMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [configNotice, setConfigNotice] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Material selection modal state
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [subjectWiseMaterials, setSubjectWiseMaterials] = useState<SubjectWithUnits[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Check if PDF passed via route state (e.g. from PdfViewerScreen)
  useEffect(() => {
    const state = location.state as {
      attachedPdf?: { id: string; title: string; fileUrl: string };
    } | null;

    if (state?.attachedPdf) {
      setAttachedMaterial({
        name: state.attachedPdf.title || 'Study Material PDF',
        type: 'pdf',
        storageUrl: state.attachedPdf.fileUrl,
      });

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, attachedMaterial]);

  // Load enrolled materials for picker modal
  const handleOpenMaterialModal = async () => {
    setShowMaterialModal(true);
    setLoadingMaterials(true);
    const list = await fetchSubjectWisePdfs(user?.id);
    setSubjectWiseMaterials(list);
    setLoadingMaterials(false);
  };

  const toggleSubjectCollapse = (subjectId: string) => {
    setCollapsedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  const handleSelectEnrolledPdf = (
    pdf: PdfMaterialItem,
    subject: SubjectWithUnits,
    unit: UnitWithPdfs
  ) => {
    setShowMaterialModal(false);
    setAttachedMaterial({
      name: `${pdf.title} (${subject.subjectName} - ${unit.unitTitle})`,
      type: 'pdf',
      storageUrl: pdf.fileUrl,
    });
  };

  const handleLocalFileSelect = async (file?: File) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || file.name.toLowerCase().match(/\.(png|jpg|jpeg)$/);

    if (!isPdf && !isImage) {
      alert('Please upload a PDF document or an image screenshot (PNG, JPG).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('File size exceeds 20MB limit. Please upload a smaller section or screenshot.');
      return;
    }

    const type = isPdf ? 'pdf' : 'image';
    const previewUrl = type === 'image' ? URL.createObjectURL(file) : undefined;

    setAttachedMaterial({
      name: file.name,
      size: file.size,
      type,
      previewUrl,
      file,
    });
  };

  const removeAttachedMaterial = () => {
    if (attachedMaterial?.previewUrl) {
      URL.revokeObjectURL(attachedMaterial.previewUrl);
    }
    setAttachedMaterial(null);
  };

  const handleClearConversation = () => {
    if (messages.length <= 1) return;
    if (window.confirm('Clear conversation history?')) {
      removeAttachedMaterial();
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          text: "Conversation cleared. Ask me anything or attach study materials to get started!",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setConfigNotice(null);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend && !attachedMaterial) return;

    const userMsgId = `user-${Date.now()}`;
    const newMsg: Message = {
      id: userMsgId,
      text: textToSend || `Please analyze this attached ${attachedMaterial?.type?.toUpperCase()}.`,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachmentName: attachedMaterial?.name,
      attachmentType: attachedMaterial?.type,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);
    setConfigNotice(null);

    let attachmentPayload: {
      name: string;
      type: 'pdf' | 'image';
      data?: string;
      mimeType?: string;
      url?: string;
    } | undefined = undefined;

    if (attachedMaterial) {
      try {
        if (attachedMaterial.file) {
          const { base64, mimeType } = await convertFileToBase64(attachedMaterial.file);
          attachmentPayload = {
            name: attachedMaterial.name,
            type: attachedMaterial.type,
            data: base64,
            mimeType,
          };
        } else if (attachedMaterial.storageUrl) {
          const converted = await convertUrlToBase64(attachedMaterial.storageUrl);
          if (converted) {
            attachmentPayload = {
              name: attachedMaterial.name,
              type: attachedMaterial.type,
              data: converted.base64,
              mimeType: converted.mimeType,
              url: attachedMaterial.storageUrl,
            };
          }
        }
      } catch (e) {
        console.warn('Could not encode attached file for AI:', e);
      }
    }

    const history = messages
      .filter((m) => m.id !== 'welcome-0')
      .map((m) => ({
        role: (m.isUser ? 'user' : 'model') as 'user' | 'model',
        text: m.text,
      }));

    const response = await sendAiChatMessage({
      message: newMsg.text,
      history,
      attachment: attachmentPayload,
    });

    setIsLoading(false);

    if (response.success && response.answer) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          text: response.answer!,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else {
      if (response.isConfigMissing) {
        setConfigNotice(response.error || 'AI Assistant backend is being configured.');
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            text:
              response.error ||
              'Unable to get an answer at this moment. Please verify your connection and try again.',
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleLocalFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  // Filter subjects, units, and PDFs based on search query
  const filteredSubjects = subjectWiseMaterials
    .map((subj) => {
      const q = materialSearch.trim().toLowerCase();
      if (!q) return subj;

      const subjectMatches = `${subj.subjectName} ${subj.subjectCode}`.toLowerCase().includes(q);

      const matchingUnits = subj.units
        .map((u) => {
          const unitMatches = u.unitTitle.toLowerCase().includes(q);
          const matchingPdfs = u.pdfs.filter(
            (p) => subjectMatches || unitMatches || p.title.toLowerCase().includes(q)
          );
          return { ...u, pdfs: matchingPdfs };
        })
        .filter((u) => u.pdfs.length > 0);

      return { ...subj, units: matchingUnits };
    })
    .filter((subj) => subj.units.length > 0);

  const suggestedPrompts = attachedMaterial
    ? [
        'Summarize this material in 3 key points',
        'Explain the most difficult concept simply',
        'List 5 expected university exam questions',
        'Highlight important formulas or definitions',
      ]
    : [
        'Explain normalization in DBMS',
        'What is a Turing machine?',
        'Difference between TCP and UDP',
        'How does virtual memory work?',
      ];

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`min-h-screen bg-gray-50 flex flex-col transition-colors ${
        isDragOver ? 'ring-4 ring-blue-500/30' : ''
      }`}
    >
      <AppHeader
        title="AI Study Assistant"
        showBack
        rightAction={
          <div className="flex items-center gap-1.5">
            {messages.length > 1 && (
              <button
                onClick={handleClearConversation}
                className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                title="Clear Conversation"
              >
                <Trash2 size={17} />
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
        }
      />

      <div className="flex-1 max-w-md mx-auto w-full flex flex-col min-h-0">
        {/* Backend Configuration Notice Banner */}
        {configNotice && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-950 mb-0.5">AI Service Notice</p>
              <p className="text-amber-800 leading-relaxed">{configNotice}</p>
            </div>
            <button
              onClick={() => setConfigNotice(null)}
              className="text-amber-600 hover:text-amber-800 p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Attached Material Pill / Bar */}
        {attachedMaterial && (
          <div className="px-4 pt-3">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-3 border border-blue-100 shadow-sm shadow-blue-500/5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {attachedMaterial.type === 'image' && attachedMaterial.previewUrl ? (
                  <img
                    src={attachedMaterial.previewUrl}
                    alt={attachedMaterial.name}
                    className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-red-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {attachedMaterial.type}
                    </span>
                    <h4 className="text-xs font-semibold text-gray-900 truncate">
                      {attachedMaterial.name}
                    </h4>
                  </div>
                  {attachedMaterial.size && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatFileSize(attachedMaterial.size)}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={removeAttachedMaterial}
                className="w-7 h-7 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                title="Remove attachment"
              >
                <X size={14} />
              </button>
            </motion.div>
          </div>
        )}

        {/* Quick Attach Material Header Bar (when none attached) */}
        {!attachedMaterial && (
          <div className="px-4 pt-3 flex items-center gap-2">
            <button
              onClick={handleOpenMaterialModal}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50/50 transition-all shadow-xs"
            >
              <BookOpen size={14} className="text-blue-600" />
              <span>Select Study PDF</span>
            </button>
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="flex items-center gap-1 py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:border-red-400 hover:bg-red-50/50 transition-all shadow-xs"
              title="Upload PDF"
            >
              <FileText size={14} className="text-red-500" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-1 py-2 px-3 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50/50 transition-all shadow-xs"
              title="Upload Screenshot"
            >
              <ImageIcon size={14} className="text-blue-500" />
              <span>Image</span>
            </button>
          </div>
        )}

        {/* Hidden File Inputs */}
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            handleLocalFileSelect(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            handleLocalFileSelect(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        {/* Chat Messages List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 ${msg.isUser ? 'flex-row-reverse' : ''}`}
              >
                {!msg.isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-xs shadow-blue-500/20">
                    <BrainCircuit size={16} className="text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs ${
                    msg.isUser
                      ? 'bg-blue-600 text-white rounded-tr-xs shadow-blue-600/20'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-xs shadow-gray-200/50'
                  }`}
                >
                  {/* Attached material indicator on user message */}
                  {msg.isUser && msg.attachmentName && (
                    <div className="mb-2 pb-1.5 border-b border-blue-400/40 flex items-center gap-1.5 text-xs text-blue-100">
                      {msg.attachmentType === 'pdf' ? (
                        <FileText size={13} className="text-red-200" />
                      ) : (
                        <ImageIcon size={13} className="text-blue-200" />
                      )}
                      <span className="truncate max-w-[200px]">{msg.attachmentName}</span>
                    </div>
                  )}

                  {msg.isUser ? <p>{msg.text}</p> : renderFormattedText(msg.text)}

                  <div
                    className={`text-[10px] mt-1 text-right ${
                      msg.isUser ? 'text-blue-200' : 'text-gray-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking / Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2.5 items-end"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <BrainCircuit size={16} className="text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-500 font-medium">AI is thinking...</span>
              </div>
            </motion.div>
          )}

          {/* Suggested Prompts Pill Row (when fewer than 3 messages) */}
          {messages.length <= 2 && !isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2">
              <p className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                {attachedMaterial ? 'Suggested questions for this material:' : 'Suggested topics:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="text-left px-3 py-2 bg-white rounded-xl text-xs font-medium text-blue-600 border border-gray-200 shadow-2xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="px-4 py-3 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLocalFileSelect()}
              title="Attach Material"
              className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors flex-shrink-0"
              onClickCapture={(e) => {
                e.stopPropagation();
                handleOpenMaterialModal();
              }}
            >
              <Paperclip size={18} />
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
              placeholder={
                attachedMaterial
                  ? `Ask about ${attachedMaterial.name}...`
                  : 'Ask any academic question...'
              }
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => handleSend()}
              disabled={(!input.trim() && !attachedMaterial) || isLoading}
              className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-700 transition-colors flex-shrink-0 shadow-xs shadow-blue-600/30"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Enrolled Materials Selection Modal (Subject-Wise & Unit-Wise) */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Select Study Material</h3>
                <p className="text-xs text-gray-500">Teacher uploaded PDFs organized subject & unit wise</p>
              </div>
              <button
                onClick={() => setShowMaterialModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 border-b border-gray-100 bg-gray-50/50">
              <input
                type="text"
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                placeholder="Search subject, unit, or PDF name..."
                className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loadingMaterials ? (
                <div className="py-14 text-center text-xs text-gray-400">
                  <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
                  Loading study materials...
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <FileText size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-700">No PDFs found</p>
                  <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
                    {materialSearch
                      ? 'No materials match your search query.'
                      : 'Ask your teacher to upload PDFs in the Teacher Portal or upload a local file below.'}
                  </p>
                </div>
              ) : (
                filteredSubjects.map((subj) => {
                  const isCollapsed = Boolean(collapsedSubjects[subj.subjectId]);
                  const totalPdfs = subj.units.reduce((acc, u) => acc + u.pdfs.length, 0);

                  return (
                    <div
                      key={subj.subjectId}
                      className="bg-gray-50/70 border border-gray-200/80 rounded-2xl overflow-hidden transition-all shadow-xs"
                    >
                      {/* Subject Header Card */}
                      <button
                        onClick={() => toggleSubjectCollapse(subj.subjectId)}
                        className="w-full p-3 bg-white flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Folder size={16} className="text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">
                              {subj.subjectName}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                              {subj.subjectCode && <span>{subj.subjectCode.toUpperCase()}</span>}
                              {subj.semester && (
                                <>
                                  <span>·</span>
                                  <span>Sem {subj.semester}</span>
                                </>
                              )}
                              <span>·</span>
                              <span className="text-blue-600 font-semibold">{totalPdfs} PDF{totalPdfs !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0 text-gray-400">
                          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {/* Units & PDFs List */}
                      {!isCollapsed && (
                        <div className="p-2 space-y-2 border-t border-gray-100">
                          {subj.units.map((unit) => (
                            <div
                              key={unit.unitId}
                              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                            >
                              <div className="px-3 py-1.5 bg-gray-50/60 border-b border-gray-100 flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
                                <Layers size={12} className="text-gray-400" />
                                <span className="truncate">Unit {unit.unitNumber}: {unit.unitTitle}</span>
                              </div>

                              <div className="p-1.5 space-y-1">
                                {unit.pdfs.map((pdf) => (
                                  <button
                                    key={pdf.id}
                                    onClick={() => handleSelectEnrolledPdf(pdf, subj, unit)}
                                    className="w-full text-left p-2 rounded-lg hover:bg-blue-50/70 border border-transparent hover:border-blue-200 transition-all flex items-center justify-between gap-2.5 group"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                        <FileText size={15} className="text-red-500" />
                                      </div>
                                      <span className="text-xs font-medium text-gray-800 truncate group-hover:text-blue-600">
                                        {pdf.title}
                                      </span>
                                    </div>

                                    <span className="text-[11px] font-bold text-blue-600 px-2 py-0.5 rounded-md bg-blue-50 group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                                      Select
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Upload from Device footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => {
                  setShowMaterialModal(false);
                  pdfInputRef.current?.click();
                }}
                className="flex-1 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <UploadCloud size={14} className="text-red-500" />
                Upload PDF
              </button>
              <button
                onClick={() => {
                  setShowMaterialModal(false);
                  imageInputRef.current?.click();
                }}
                className="flex-1 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <ImageIcon size={14} className="text-blue-500" />
                Upload Image
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
