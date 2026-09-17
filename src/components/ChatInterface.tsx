import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Plus, 
  Mic, 
  MicOff, 
  RotateCw, 
  Copy, 
  Share2, 
  Volume2, 
  VolumeX, 
  ExternalLink, 
  Globe, 
  Sparkles, 
  Lightbulb, 
  ChevronRight, 
  Check, 
  Brain, 
  ChevronDown, 
  ChevronUp,
  FileText,
  DollarSign,
  Code,
  Users,
  Image as ImageIcon,
  Paperclip,
  X,
  Eye
} from 'lucide-react';
import { marked } from 'marked';
import { ChatMessage, SourceItem, FileAttachment, UserProfile } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isDeepSearch: boolean, isAiMode?: boolean, attachments?: FileAttachment[]) => Promise<void>;
  isLoading: boolean;
  activeReasoningSteps: string[];
  onNewSession: () => void;
  selectedModel: string;
  user?: UserProfile | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  activeReasoningSteps,
  onNewSession,
  selectedModel,
  user,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  
  // Attachments and multimodal preview
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; title: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, activeReasoningSteps]);

  // Voice speech synthesis (UzSpeech)
  const handleUzSpeech = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Brauzeringizda ovozli o'qish (Web Speech) qo'llab-quvvatlanmaydi.");
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_\[\]()]/g, '').slice(0, 500);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'uz-UZ';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setSpeakingId(null);
    };
    utterance.onerror = () => {
      setSpeakingId(null);
    };

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  // Copy message
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Share message
  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'UZUNITED AI javobi',
          text: text.slice(0, 300) + '...',
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(text);
      alert("Havola va matn nusxalandi!");
    }
  };

  // Speech Recognition (Microphone)
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Brauzeringizda ovozli yozish qo'llab-quvvatlanmaydi. Chrome yoki Edge dan foydalaning.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'uz-UZ';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
        inputRef.current?.focus();
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Process uploaded files/images
  const processFiles = async (files: FileList | File[]) => {
    const newAttachments: FileAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith('image/');

      if (isImg) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          id: `att-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type: file.type,
          mimeType: file.type,
          size: file.size,
          dataUrl,
          base64Data: dataUrl,
          isImage: true,
        });
      } else {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const isTextBased = ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'sql', 'sh'].includes(ext) || file.type.includes('text') || file.type.includes('json');

        if (isTextBased) {
          const textContent = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsText(file);
          });

          newAttachments.push({
            id: `att-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            type: file.type || ext.toUpperCase(),
            mimeType: file.type || 'text/plain',
            size: file.size,
            textContent,
            isImage: false,
          });
        } else {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });

          newAttachments.push({
            id: `att-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            type: file.type || ext.toUpperCase(),
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl,
            base64Data: dataUrl,
            isImage: false,
          });
        }
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    const text = input.trim();
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    onSendMessage(text, false, true, currentAttachments);
  };

  const toggleReasoning = (msgId: string) => {
    setExpandedReasoning(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const quickPrompts = [
    { label: "📸 Rasm tahlili", icon: ImageIcon, isImageTrigger: true, prompt: "Ushbu rasmni tahlil qilib bering." },
    { label: "📄 Fayl/Kod tahlili", icon: FileText, isFileTrigger: true, prompt: "Ushbu faylni tekshirib bering." },
    { label: "Seni kim yaratgan?", icon: Users, prompt: "Seni kim yaratgan?" },
    { label: "Biznes reja", icon: FileText, prompt: "O'zbekistonda yangi startap ochish bosqichlari qanday?" },
    { label: "Investitsiya jalb qilish", icon: DollarSign, prompt: "O'zbekistonda IT loyihalarga investitsiya jalb qilish tartibi qanday?" },
    { label: "Kod tekshirish", icon: Code, prompt: "Python da zamonaviy funksiya yozib ber." },
    { label: "Koinot & Fan", icon: Sparkles, prompt: "Koinot qanday paydo bo'lgan? Qisqa va lo'nda tushuntirib ber." },
  ];

  // Helper to format timestamp like "11:42"
  const formatTime = (isoString?: string) => {
    if (!isoString) return "11:42";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "11:42";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div 
      className={`flex-1 flex flex-col h-full bg-[#f8fafc] text-slate-900 relative ${isDragging ? 'ring-4 ring-blue-500/30' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file inputs for direct Gallery and Files */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.doc,.docx,.txt,.csv,.json,.py,.js,.ts,.tsx,.jsx,.html,.css,.sql,.md"
        multiple
        className="hidden"
      />

      {/* Drag & drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-40 bg-blue-600/10 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-blue-500 rounded-2xl m-3 pointer-events-none">
          <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center gap-3 text-blue-600 font-bold text-sm">
            <ImageIcon className="w-6 h-6" />
            <span>Rasm yoki faylni shu yerga tashlang!</span>
          </div>
        </div>
      )}

      {/* Full image preview modal */}
      {previewModalImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 bg-slate-800/90 text-white text-xs font-semibold">
              <span className="truncate max-w-md">{previewModalImage.title}</span>
              <button 
                onClick={() => setPreviewModalImage(null)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img 
              src={previewModalImage.url} 
              alt={previewModalImage.title} 
              className="max-h-[80vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* User Personalized Memory Banner if user is logged in */}
      {user?.firstName && (
        <div className="w-full max-w-3xl mx-auto px-4 pt-2">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-teal-50 border border-blue-200/80 rounded-2xl px-3.5 py-1.5 flex items-center justify-between shadow-2xs text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-semibold text-blue-700">
                Assalomu alaykum, {user.firstName}!
              </span>
              <span className="hidden sm:inline text-slate-500">
                • AI sizning ismingiz bilan murojaat qiladi va qiziqishlaringizni eslab qoladi
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-5 max-w-3xl mx-auto w-full">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isExpanded = expandedReasoning[msg.id] ?? false;

          if (isUser) {
            return (
              <div key={msg.id} className="flex flex-col items-end group space-y-1.5">
                {/* User Message Attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-end max-w-[85%] sm:max-w-[75%]">
                    {msg.attachments.map((att) => (
                      <div key={att.id} className="relative group/att">
                        {att.isImage && att.dataUrl ? (
                          <div 
                            onClick={() => setPreviewModalImage({ url: att.dataUrl!, title: att.name })}
                            className="relative cursor-pointer rounded-xl overflow-hidden border border-slate-300 shadow-xs hover:shadow-md transition-all group-hover/att:ring-2 group-hover/att:ring-blue-500 max-w-[200px] bg-slate-900"
                          >
                            <img 
                              src={att.dataUrl} 
                              alt={att.name} 
                              className="h-28 w-auto object-cover" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                              <Eye className="w-4 h-4 mr-1" /> Ko'rish
                            </div>
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1 truncate px-1.5">
                              {att.name}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs text-xs font-medium text-slate-800">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="flex flex-col text-left max-w-[150px]">
                              <span className="truncate font-semibold">{att.name}</span>
                              <span className="text-[10px] text-slate-400">{formatFileSize(att.size)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* User Message Bubble matching screenshot */}
                <div className="bg-[#182234] text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] text-sm sm:text-base leading-relaxed shadow-sm">
                  {msg.content}
                </div>
                {/* Timestamp */}
                <span className="text-[11px] text-slate-400 mr-1 font-medium select-none">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            );
          }

          // Assistant Message matching screenshot
          return (
            <div key={msg.id} className="flex items-start gap-3 w-full">
              {/* UZUNITED AI Avatar with 'U' gradient logo */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 p-0.5 shadow-sm shrink-0 mt-0.5">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <span className="font-black text-sm bg-gradient-to-tr from-blue-600 to-pink-500 bg-clip-text text-transparent">
                    U
                  </span>
                </div>
              </div>

              {/* Content Column */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Header line: UZUNITED AI + Rasmiy javob badge + Refresh icon */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-blue-950 tracking-tight">
                      UZUNITED AI
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-semibold">
                      Rasmiy javob
                    </span>
                  </div>

                  {/* Refresh / Regenerate button */}
                  <button
                    onClick={() => {
                      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                      if (lastUserMsg) {
                        onSendMessage(lastUserMsg.content, false, true);
                      }
                    }}
                    title="Qaytadan javob olish"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                {/* Reasoning Accordion if available */}
                {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                  <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                    <button
                      onClick={() => toggleReasoning(msg.id)}
                      className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Brain className="w-3.5 h-3.5 text-blue-600" />
                        <span>AI Tahlil bosqichlari ({msg.reasoningSteps.length})</span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {isExpanded && (
                      <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[11px] space-y-1 text-slate-700 font-mono">
                        {msg.reasoningSteps.map((st, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold">›</span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Body with Clean Typography */}
                <div 
                  className="prose prose-slate prose-sm sm:prose-base max-w-none text-slate-800 leading-relaxed [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ol]:space-y-2 [&>ol]:my-3 [&>ul]:space-y-1.5 [&>pre]:bg-slate-900 [&>pre]:text-slate-100 [&>pre]:p-3.5 [&>pre]:rounded-2xl [&>code]:bg-slate-100 [&>code]:text-blue-700 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded"
                  dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
                />

                {/* Web Sources if retrieved */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>Foydalanilgan manbalar:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.sources.map((s) => (
                        <a
                          key={s.id}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col p-2.5 bg-white border border-slate-200 hover:border-blue-300 rounded-xl transition-all shadow-xs group"
                        >
                          <div className="flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700 truncate">
                            <span className="truncate">[{s.id}] {s.title}</span>
                            <ExternalLink className="w-3 h-3 ml-1 shrink-0 opacity-60" />
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                            {s.snippet}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 font-mono">{s.domain}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons Row matching screenshot: Nusxa, Ulashish, UzSpeech */}
                <div className="flex items-center gap-2 pt-1">
                  {/* Nusxa (Copy) */}
                  <button
                    id={`btn-copy-${msg.id}`}
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Nusxalandi</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Nusxa</span>
                      </>
                    )}
                  </button>

                  {/* Ulashish (Share) */}
                  <button
                    id={`btn-share-${msg.id}`}
                    onClick={() => handleShare(msg.content)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Ulashish</span>
                  </button>

                  {/* UzSpeech (Voice Audio) */}
                  <button
                    id={`btn-uzspeech-${msg.id}`}
                    onClick={() => handleUzSpeech(msg.id, msg.content)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
                      speakingId === msg.id
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400/40'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100/80 border border-blue-200'
                    }`}
                  >
                    {speakingId === msg.id ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                        <span>To'xtatish</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>UzSpeech</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          );
        })}

        {/* Loading Indicator: Compact 3 round dots • • • typing animation */}
        {isLoading && (
          <div className="flex items-start gap-3 w-full animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-500 p-0.5 shadow-xs shrink-0 mt-0.5">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <span className="font-black text-xs bg-gradient-to-tr from-blue-600 to-pink-500 bg-clip-text text-transparent">
                  U
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 px-4 py-3 rounded-2xl rounded-tl-sm shadow-xs flex items-center gap-1.5 h-11">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full typing-dot-1"></span>
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full typing-dot-2"></span>
              <span className="w-2.5 h-2.5 bg-pink-500 rounded-full typing-dot-3"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Area: Quick Prompts + Pill Input */}
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 pb-4 pt-1">
        
        {/* Horizontally scrollable quick prompts matching screenshot */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          {quickPrompts.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                id={`btn-quick-prompt-${idx}`}
                onClick={() => {
                  if ((item as any).isImageTrigger) {
                    imageInputRef.current?.click();
                  } else if ((item as any).isFileTrigger) {
                    fileInputRef.current?.click();
                  } else {
                    setInput(item.prompt);
                    inputRef.current?.focus();
                  }
                }}
                className="whitespace-nowrap px-3.5 py-1.5 bg-slate-200/70 hover:bg-slate-300/70 text-slate-800 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 shrink-0 select-none active:scale-95"
              >
                <Icon className="w-3.5 h-3.5 text-slate-600" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Attachments Chips (Preview before sending) */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 mb-1.5 scrollbar-none no-scrollbar">
            {attachments.map((att) => (
              <div 
                key={att.id}
                className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl p-1.5 pr-2.5 shadow-2xs text-xs shrink-0"
              >
                {att.isImage && att.dataUrl ? (
                  <img 
                    src={att.dataUrl} 
                    alt={att.name} 
                    className="w-8 h-8 rounded-lg object-cover border border-slate-100" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                )}
                <div className="flex flex-col max-w-[120px] sm:max-w-[160px]">
                  <span className="font-semibold text-slate-800 truncate">{att.name}</span>
                  <span className="text-[10px] text-slate-400">{formatFileSize(att.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                  title="O'chirish"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Pill Container matching screenshot */}
        <form onSubmit={handleSubmit} className="relative mt-1">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200/90 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.05)] px-2.5 sm:px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            
            {/* Direct Gallery Image Button (so user can pick directly from gallery!) */}
            <button
              type="button"
              id="btn-direct-gallery"
              onClick={() => imageInputRef.current?.click()}
              title="Galereyadan rasm tanlash"
              className="w-8 h-8 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors shrink-0"
            >
              <ImageIcon className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Direct File Button */}
            <button
              type="button"
              id="btn-direct-file"
              onClick={() => fileInputRef.current?.click()}
              title="Fayl yoki hujjat yuklash"
              className="w-8 h-8 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors shrink-0"
            >
              <Paperclip className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Input field */}
            <input
              ref={inputRef}
              id="input-main-chat"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder={attachments.length > 0 ? "Fayl/rasm bo'yicha savolingizni yozing..." : "Xabar yozing yoki rasm/fayl tashlang..."}
              disabled={isLoading}
              className="flex-1 bg-transparent text-slate-900 placeholder-slate-400 text-sm sm:text-base px-1 py-1 focus:outline-none disabled:opacity-50 min-w-0"
            />

            {/* Microphone icon */}
            <button
              type="button"
              id="btn-voice-mic"
              onClick={toggleListening}
              title={isListening ? "Eshitilmoqda..." : "Ovoz bilan aytish"}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse ring-2 ring-red-300'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 stroke-[2]" />}
            </button>

            {/* Purple Circular Send Button with Upward Arrow */}
            <button
              type="submit"
              id="btn-send-message"
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:pointer-events-none shadow-sm active:scale-95 shrink-0"
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
