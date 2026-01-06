import React, { useState, useRef, useEffect } from 'react';
import { Message, MessageType, ContentType, SpaceFile, Thread, InputReferenceImage } from '../types';
import { 
    Mic, Paperclip, Send, Globe, Cpu, Clock, Image as ImageIcon, 
    Plus, Link, FileText, CheckSquare, Search, Shuffle, AudioLines, Box,
    File, UploadCloud, Share2, MessageSquare, ArrowLeft, Sparkles, Check, Loader2,
    ChevronDown, Minus, X, Trash2, StickyNote,
    MessageCircleQuestion, Quote, Copy, Download, RotateCw, Zap
} from 'lucide-react';
import FileSaver from 'file-saver';

interface ChatInterfaceProps {
  spaceTitle: string;
  spaceDescription: string;
  threads: Thread[];
  activeThreadId: string | null;
  messages: Message[];
  files: SpaceFile[];
  onSendMessage: (text: string, mode: 'text' | 'image', attachments?: File[], model?: string) => void;
  onGenerateImage: (prompt: string, aspectRatio: string, quality: string, count: number, model: string, referenceImages?: InputReferenceImage[]) => void;
  onSelectThread: (threadId: string) => void;
  isGenerating: boolean;
  isImageStudioOpen: boolean;
  onAddFiles: (files: File[]) => void;
  onAddDriveFile?: () => void;
  onAddLink: () => void;
  onOpenContextPanel: () => void;
  onOpenInstructions: () => void;
  onUpdateDescription: (desc: string) => void;
  onUpdateTitle: (title: string) => void;
  onBackToDashboard: () => void;
  referenceImages?: InputReferenceImage[];
  onAddReferenceImages?: (files: File[]) => void;
  onRemoveReferenceImage?: (id: string) => void;
  externalPrompt?: string | null;
  onAddNoteFromSelection?: (text: string) => void;
  externalContext?: string | null;
  onRegenerate?: (messageId: string) => void;
}

const ASPECT_RATIOS = [
    { label: 'Auto', value: 'Auto', width: 14, height: 14, dashed: true },
    { label: '1:1', value: '1:1', width: 14, height: 14 },
    { label: '4:3', value: '4:3', width: 16, height: 12 },
    { label: '16:9', value: '16:9', width: 18, height: 10 },
    { label: '21:9', value: '21:9', width: 20, height: 8 },
    { label: '5:4', value: '5:4', width: 14, height: 11 },
    { label: '3:2', value: '3:2', width: 15, height: 10 },
    { label: '9:16', value: '9:16', width: 10, height: 18 },
];

const QUALITIES = [
    { label: '1K', value: '1K', desc: 'Fast · Quick Generation' },
    { label: '2K', value: '2K', desc: 'Balanced · Recommended' },
    { label: '4K', value: '4K', desc: 'Ultra · Highest Detail' },
];

const IMAGE_MODELS = [
    { label: 'Nano Banana Pro', value: 'gemini-3-pro-image-preview', color: 'bg-green-500' },
    { label: 'Nano Banana', value: 'gemini-2.5-flash-image', color: 'bg-yellow-400' },
];

const CHAT_MODELS = [
    { label: 'Gemini 3.0 Flash', value: 'gemini-3-flash-preview', icon: <Zap size={14} className="text-yellow-400" /> },
    { label: 'Gemini 3.0 Pro', value: 'gemini-3-pro-preview', icon: <Cpu size={14} className="text-blue-400" /> },
];

const CONTEXT_PATTERN = /\[인용된 컨텍스트\]:\n"([\s\S]*?)"\n\n\[사용자 질문\]:\n([\s\S]*)/;

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    spaceTitle,
    spaceDescription,
    threads,
    activeThreadId,
    messages,
    files, 
    onSendMessage,
    onGenerateImage,
    onSelectThread,
    isGenerating,
    isImageStudioOpen,
    onAddFiles,
    onAddDriveFile,
    onAddLink,
    onOpenContextPanel,
    onOpenInstructions,
    onUpdateDescription,
    onUpdateTitle,
    onBackToDashboard,
    referenceImages = [],
    onAddReferenceImages,
    onRemoveReferenceImage,
    externalPrompt,
    onAddNoteFromSelection,
    externalContext,
    onRegenerate
}) => {
  const [chatInput, setChatInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  
  // Chat Model Selector State
  const [selectedChatModel, setSelectedChatModel] = useState(CHAT_MODELS[0]);
  const [showChatModelMenu, setShowChatModelMenu] = useState(false);
  const chatModelMenuRef = useRef<HTMLDivElement>(null);

  const [attachedContext, setAttachedContext] = useState<string | null>(null);
  const [chatAttachments, setChatAttachments] = useState<{id: string, file: File, preview: string}[]>([]);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  
  const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0]);
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS.find(r => r.value === '9:16') || ASPECT_RATIOS[0]);
  const [selectedQuality, setSelectedQuality] = useState(QUALITIES[0]);
  const [imageCount, setImageCount] = useState(1);

  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const ratioMenuRef = useRef<HTMLDivElement>(null);
  const qualityMenuRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeThreadId]);

  useEffect(() => {
      if (externalPrompt) setImageInput(externalPrompt);
  }, [externalPrompt]);

  useEffect(() => {
      if (externalContext) setAttachedContext(externalContext);
  }, [externalContext]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) setIsFileMenuOpen(false);
          if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) setShowModelMenu(false);
          if (ratioMenuRef.current && !ratioMenuRef.current.contains(event.target as Node)) setShowRatioMenu(false);
          if (qualityMenuRef.current && !qualityMenuRef.current.contains(event.target as Node)) setShowQualityMenu(false);
          if (chatModelMenuRef.current && !chatModelMenuRef.current.contains(event.target as Node)) setShowChatModelMenu(false);
          
          if (selectionMenu && !(event.target as HTMLElement).closest('.selection-action-btn')) {
               setSelectionMenu(null);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionMenu]);

  useEffect(() => {
      const handleMouseUp = (e: MouseEvent) => {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed || !selection.toString().trim()) return; 
          const text = selection.toString().trim();
          setSelectionMenu({ x: e.clientX, y: e.clientY - 15, text: text });
      };
      const handleKeyUp = (e: KeyboardEvent) => {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed || !selection.toString().trim()) return; 
          const text = selection.toString().trim();
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
              setSelectionMenu({ x: rect.left + (rect.width / 2), y: rect.top - 10, text: text });
          }
      };
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('keyup', handleKeyUp);
      return () => {
          document.removeEventListener('mouseup', handleMouseUp);
          document.removeEventListener('keyup', handleKeyUp);
      };
  }, []);

  const handleQuickGenerate = (e: React.MouseEvent) => {
      e.stopPropagation(); e.preventDefault();
      if (selectionMenu) {
          onGenerateImage(selectionMenu.text, '1:1', '1K', 1, 'gemini-3-pro-image-preview', []);
          window.getSelection()?.removeAllRanges();
          setSelectionMenu(null);
      }
  };

  const handleQuickNote = (e: React.MouseEvent) => {
      e.stopPropagation(); e.preventDefault();
      if (selectionMenu && onAddNoteFromSelection) {
          onAddNoteFromSelection(selectionMenu.text);
          window.getSelection()?.removeAllRanges();
          setSelectionMenu(null);
      }
  };
  
  const handleQuickFollowUp = (e: React.MouseEvent) => {
      e.stopPropagation(); e.preventDefault();
      if (selectionMenu) {
          setAttachedContext(selectionMenu.text);
          window.getSelection()?.removeAllRanges();
          setSelectionMenu(null);
      }
  };

  const handleMessageAction = (action: 'download' | 'copy' | 'delete' | 'followup' | 'regenerate', msg: Message) => {
      if (action === 'download') {
          const blob = new Blob([msg.content], { type: 'text/plain;charset=utf-8' });
          const firstLine = msg.content.split('\n')[0].slice(0, 20).replace(/[^a-z0-9가-힣]/gi, '_');
          FileSaver.saveAs(blob, `${firstLine}.txt`);
      } else if (action === 'copy') {
          navigator.clipboard.writeText(msg.content);
          alert('복사되었습니다.');
      } else if (action === 'followup') {
          setAttachedContext(msg.content);
      } else if (action === 'regenerate') {
          if (onRegenerate) onRegenerate(msg.id);
      }
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [spaceDescription]);

  const currentInput = isImageStudioOpen ? imageInput : chatInput;
  const setInput = (value: string) => {
      if (isImageStudioOpen) setImageInput(value);
      else setChatInput(value);
  };

  const handleSend = () => {
    if (!currentInput.trim() && chatAttachments.length === 0 && !attachedContext) return;
    
    if (activeThreadId && isImageStudioOpen) {
        onGenerateImage(
            currentInput, selectedRatio.value, selectedQuality.value, imageCount, selectedModel.value, referenceImages 
        );
    } else {
        let finalMessage = currentInput;
        if (attachedContext) {
            finalMessage = `[인용된 컨텍스트]:\n"${attachedContext}"\n\n[사용자 질문]:\n${currentInput}`;
        }
        const attachmentsToSend = chatAttachments.map(a => a.file);
        
        // Pass selected Chat Model
        onSendMessage(finalMessage, 'text', attachmentsToSend, selectedChatModel.value);
        
        setChatInput(''); 
        setAttachedContext(null); 
        setChatAttachments([]); 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addChatAttachments = (files: File[]) => {
      const newAttachments = files.map(f => ({
          id: Date.now().toString() + Math.random(),
          file: f,
          preview: URL.createObjectURL(f)
      }));
      setChatAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeChatAttachment = (id: string) => {
      setChatAttachments(prev => prev.filter(item => item.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const fileArray = Array.from(e.target.files) as File[];
          if (activeThreadId && !isImageStudioOpen) addChatAttachments(fileArray);
          else if (isImageStudioOpen && onAddReferenceImages) {
              const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
              if (imageFiles.length > 0) onAddReferenceImages(imageFiles);
              else alert("이미지 파일만 첨부할 수 있습니다.");
          } else onAddFiles(fileArray);
          e.target.value = ''; 
          setIsFileMenuOpen(false);
      }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget as Node)) return; setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const fileArray = Array.from(e.dataTransfer.files) as File[];
          if (activeThreadId && !isImageStudioOpen) addChatAttachments(fileArray);
          else if (isImageStudioOpen && onAddReferenceImages) {
              const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
              if (imageFiles.length > 0) onAddReferenceImages(imageFiles);
          } else onAddFiles(fileArray);
      }
  };
  const handlePaste = (e: React.ClipboardEvent) => {
      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
          e.preventDefault();
          const fileArray = Array.from(e.clipboardData.files) as File[];
          if (activeThreadId && !isImageStudioOpen) addChatAttachments(fileArray);
          else if (isImageStudioOpen && onAddReferenceImages) {
              const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
              if (imageFiles.length > 0) onAddReferenceImages(imageFiles);
          } else onAddFiles(fileArray);
      }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();
  const triggerDriveUpload = () => {
      if(onAddDriveFile) onAddDriveFile();
      setIsFileMenuOpen(false);
      alert("Google Drive와 연결되었습니다! (시뮬레이션)");
  };

  const cleanDisplayContent = (content: string) => {
      return content.replace(/```(?:text)?\n?/g, '').replace(/```/g, '').replace(/^###\s*/gm, '').replace(/^\*\*\s*/gm, '').trim();
  };

  const LoadingText = () => {
      const [step, setStep] = useState(0);
      const steps = [
          "질문 분석 중...",
          "컨텍스트 확인 중...",
          "답변 작성 중..."
      ];

      useEffect(() => {
          const timer = setInterval(() => {
              setStep((prev) => (prev + 1) % steps.length);
          }, 1500);
          return () => clearInterval(timer);
      }, []);

      return <span className="animate-pulse">{steps[step]}</span>;
  };

  const renderMessageContent = (msg: Message) => {
      if (msg.contentType === ContentType.IMAGE) {
          return <div className="rounded-xl overflow-hidden border border-zinc-700 shadow-lg"><img src={msg.content} alt="Generated" className="max-w-full h-auto" /></div>;
      }

      if (msg.type === MessageType.USER) {
          const match = msg.content.match(CONTEXT_PATTERN);
          if (match) {
              return (
                  <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/80 bg-cyan-950/30 px-2 py-1 rounded-full mb-1 border border-cyan-900/50">
                          <MessageCircleQuestion size={10} /> <span>추가 질문 (컨텍스트 포함됨)</span>
                      </div>
                      <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap text-zinc-300">{match[2]}</div>
                  </div>
              );
          }
      }

      if (msg.type === MessageType.AI && msg.isStreaming && !msg.content) {
          return (
              <div className="flex items-center gap-3 text-zinc-400 py-2">
                  <div className="relative w-4 h-4">
                      <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <span className="text-sm font-medium bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      <LoadingText />
                  </span>
              </div>
          );
      }

      return (
         <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap text-zinc-300">
             {cleanDisplayContent(msg.content)}
             {msg.isStreaming && <span className="inline-block w-2 h-4 bg-cyan-500 ml-1 animate-pulse align-middle"/>}
         </div>
      );
  };

  const sourceCount = files.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-hidden relative">
        <input type="file" ref={fileInputRef} className="hidden" multiple accept={isImageStudioOpen ? "image/*" : undefined} onChange={handleFileChange} />
        
        {selectionMenu && (
            <div style={{ position: 'fixed', left: `${selectionMenu.x}px`, top: `${selectionMenu.y - 40}px`, transform: 'translateX(-50%)' }} className="z-50 flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                <button onClick={handleQuickGenerate} className="selection-action-btn bg-[#18181b] hover:bg-zinc-800 text-lime-400 border border-zinc-700 hover:border-lime-400/50 shadow-2xl rounded-full px-4 py-2 flex items-center gap-2 text-xs font-bold transition-all"><Sparkles size={14} fill="currentColor" /> 이미지 생성</button>
                <button onClick={handleQuickNote} className="selection-action-btn bg-[#18181b] hover:bg-zinc-800 text-purple-400 border border-zinc-700 hover:border-purple-400/50 shadow-2xl rounded-full px-4 py-2 flex items-center gap-2 text-xs font-bold transition-all"><StickyNote size={14} fill="currentColor" /> 메모 추가</button>
                <button onClick={handleQuickFollowUp} className="selection-action-btn bg-[#18181b] hover:bg-zinc-800 text-cyan-400 border border-zinc-700 hover:border-cyan-400/50 shadow-2xl rounded-full px-4 py-2 flex items-center gap-2 text-xs font-bold transition-all"><MessageCircleQuestion size={14} /> 추가 질문</button>
            </div>
        )}

        {!activeThreadId ? (
            // ==================================================================================
            // 1. DASHBOARD VIEW (NO CHANGES HERE AS REQUESTED)
            // ==================================================================================
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col items-center justify-center p-4 md:p-8 max-w-4xl mx-auto w-full min-h-full">
                
                <div className="w-full mb-8 space-y-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 mb-6 border border-zinc-700"><Box size={24} strokeWidth={1.5} /></div>
                    <input type="text" value={spaceTitle} onChange={(e) => onUpdateTitle(e.target.value)} className="w-full bg-transparent text-3xl md:text-4xl font-bold text-zinc-100 tracking-tight focus:outline-none placeholder:text-zinc-700 transition-all" placeholder="제목 없는 프로젝트" />
                    <textarea ref={textareaRef} value={spaceDescription} onChange={(e) => onUpdateDescription(e.target.value)} placeholder="이 공간이 무엇을 위한 것인지 및 사용하는 방법에 대한 설명 (최대 5000자)" maxLength={5000} rows={1} className="w-full bg-transparent text-zinc-500 text-lg focus:outline-none focus:text-zinc-300 placeholder:text-zinc-600 transition-colors resize-none overflow-y-auto max-h-96" style={{ minHeight: '1.75rem' }} />
                </div>
        
                <div className="w-full bg-[#18181b] rounded-2xl border border-zinc-800 shadow-2xl flex flex-col overflow-visible relative">
                    <div className="flex flex-wrap items-center gap-2 p-3 border-b border-zinc-800/50 bg-[#1e1e21] rounded-t-2xl relative z-10">
                        <div className="relative" ref={fileMenuRef}>
                            <button onClick={() => setIsFileMenuOpen(!isFileMenuOpen)} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isFileMenuOpen ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}`}><Plus size={14} /> 파일 추가</button>
                            {isFileMenuOpen && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button onClick={triggerFileUpload} className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"><File size={16} /> 로컬 파일</button>
                                    <button onClick={triggerDriveUpload} className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-3"><UploadCloud size={16} /> Google Drive</button>
                                </div>
                            )}
                        </div>
                        <button onClick={onAddLink} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"><Link size={14} /> 링크 추가</button>
                        <button onClick={onOpenInstructions} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"><FileText size={14} /> 지시 사항 추가</button>
                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 rounded-lg transition-colors"><CheckSquare size={14} /> 작업 추가</button>
                    </div>
        
                    <div className="relative p-5 min-h-[160px] bg-[#18181b] rounded-t-2xl">
                        {attachedContext && <div className="flex items-center gap-2 mb-3 bg-zinc-800/50 hover:bg-zinc-800 p-2 pl-3 rounded-lg border border-zinc-700 w-fit max-w-full group transition-all"><Quote size={12} className="text-cyan-400 shrink-0"/><span className="text-xs text-zinc-300 truncate max-w-[200px] md:max-w-[400px]">"{attachedContext}"에 대한 추가 질문</span><button onClick={() => setAttachedContext(null)} className="p-1 hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-zinc-300"><X size={12} /></button></div>}
                        {sourceCount > 0 && <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium mb-3"><FileText size={14} /> <span>검색 중 {sourceCount} 출처들</span></div>}
                        <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="새로운 공간에 대해 무엇이든 물어보세요." className="w-full h-full bg-transparent text-zinc-200 text-base resize-none focus:outline-none placeholder:text-zinc-600 leading-relaxed" />
                    </div>
        
                    <div className="flex items-center justify-between p-3 bg-[#1e1e21] rounded-b-2xl">
                        <div className="flex items-center gap-1">
                            <button className="p-2 text-cyan-500 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"><Search size={18} /></button>
                            <button className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/50 transition-colors"><Shuffle size={18} /></button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/50 transition-colors" title="웹 검색"><Globe size={18} className="text-cyan-500"/></button>
                            <button onClick={triggerFileUpload} className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/50"><Paperclip size={18} /></button>
                            <button className="p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800/50"><Mic size={18} /></button>
                            <button onClick={() => { handleSend(); }} disabled={!chatInput.trim() && !attachedContext} className={`p-2 rounded-xl transition-all shadow-lg ${(chatInput.trim() || attachedContext) ? 'bg-cyan-400 text-black hover:bg-cyan-300 shadow-cyan-500/20' : 'bg-[#2a2a2d] text-cyan-500/50 cursor-not-allowed'}`}><AudioLines size={20} /></button>
                        </div>
                    </div>
                </div>

                <div className="w-full mt-16 border-b-2 border-zinc-800/50 pb-2 mb-6"><button className="flex items-center gap-2 text-zinc-100 font-semibold text-lg"><Clock size={20} className="text-zinc-500" /> 내 스레드</button></div>
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
                    {threads.map(thread => (
                        <div key={thread.id} onClick={() => onSelectThread(thread.id)} className="bg-[#18181b] border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 cursor-pointer transition-all hover:bg-zinc-800/50 group">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-cyan-400 group-hover:bg-zinc-700 transition-colors"><MessageSquare size={18} /></div>
                                <div className="flex-1 min-w-0"><h4 className="text-zinc-200 font-medium truncate mb-1">{thread.title}</h4><p className="text-zinc-500 text-xs flex items-center gap-2"><Clock size={12} /> {new Date(thread.lastMessageAt).toLocaleString()}</p></div>
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            </div>
        ) : (
            // ==================================================================================
            // 2. ACTIVE THREAD VIEW (CHANGES APPLIED HERE)
            // ==================================================================================
            <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-zinc-800 flex items-center gap-3 md:hidden">
                    <button onClick={onBackToDashboard} className="text-zinc-400 hover:text-white"><ArrowLeft size={20} /></button>
                    <span className="text-zinc-100 font-medium truncate">{threads.find(t=>t.id===activeThreadId)?.title}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.type === MessageType.USER ? 'flex-row-reverse' : ''} group`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.type === MessageType.AI ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                {msg.type === MessageType.AI ? <Cpu size={16} /> : <span className="text-xs font-bold">ME</span>}
                            </div>
                            <div className={`flex flex-col max-w-[80%] ${msg.type === MessageType.USER ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-semibold text-zinc-300">{msg.type === MessageType.AI ? selectedChatModel.label : '나'}</span>
                                    <span className="text-xs text-zinc-600">{msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                {renderMessageContent(msg)}
                                <div className={`flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.type === MessageType.USER ? 'flex-row-reverse' : ''}`}>
                                    {msg.type === MessageType.AI && (
                                         <button onClick={() => handleMessageAction('regenerate', msg)} className="p-1.5 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded-md transition-colors" title="다시 생성"><RotateCw size={14} /></button>
                                    )}
                                    <button onClick={() => handleMessageAction('followup', msg)} className="p-1.5 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded-md transition-colors" title="추가 질문"><MessageCircleQuestion size={14} /></button>
                                    <button onClick={() => handleMessageAction('download', msg)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors" title=".txt로 저장"><Download size={14} /></button>
                                    <button onClick={() => handleMessageAction('copy', msg)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors" title="복사"><Copy size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 md:p-6 border-t border-zinc-800 bg-[#09090b] sticky bottom-0 z-10">
                    <div className={`relative flex flex-col bg-[#18181b] border transition-all duration-300 rounded-2xl overflow-visible ${isImageStudioOpen ? 'border-lime-400' : 'border-zinc-700 focus-within:border-zinc-600'} ${isDragging ? 'border-dashed border-2 border-cyan-400 bg-zinc-800' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                    
                    {isDragging && <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 rounded-2xl backdrop-blur-sm pointer-events-none"><span className="text-cyan-400 font-bold text-lg flex items-center gap-2"><Plus size={24} /> {isImageStudioOpen ? "이미지 드롭" : "파일 드롭"}</span></div>}

                    {isImageStudioOpen && (
                        <>
                             <div className="bg-lime-400/10 text-lime-400 text-xs px-4 py-1.5 font-bold flex items-center gap-2 border-b border-lime-400/20 rounded-t-2xl"><Sparkles size={12} fill="currentColor" /> IMAGE GENERATION MODE</div>
                             <div className="px-4 pt-3 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                                {referenceImages.map((img, index) => (<div key={img.id} className="relative group shrink-0 w-12 h-12"><div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-700 bg-black"><img src={img.previewUrl} alt={`Ref ${index + 1}`} className="w-full h-full object-cover" /></div><div className="absolute -top-1 -left-1 w-5 h-5 bg-lime-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center border border-[#18181b] z-10">{index + 1}</div><div className="absolute inset-0 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 z-20"><button onClick={() => onRemoveReferenceImage && onRemoveReferenceImage(img.id)} className="text-white hover:text-red-400 p-0.5" title="삭제"><X size={12} /></button></div></div>))}
                                {referenceImages.length < 7 && <button onClick={triggerFileUpload} className="w-12 h-12 rounded-full border border-dashed border-zinc-700 hover:border-lime-400 flex items-center justify-center text-zinc-600 hover:text-lime-400 transition-colors shrink-0"><Plus size={20} /></button>}
                             </div>
                        </>
                    )}

                    {!isImageStudioOpen && (
                        <div className="flex flex-col">
                            {attachedContext && <div className="px-4 pt-3"><div className="flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-800 p-2 pl-3 rounded-lg border border-zinc-700 w-fit max-w-full group transition-all"><Quote size={12} className="text-cyan-400 shrink-0"/><span className="text-xs text-zinc-300 truncate max-w-[200px] md:max-w-[400px]">"{attachedContext}"에 대한 추가 질문</span><button onClick={() => setAttachedContext(null)} className="p-1 hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-zinc-300"><X size={12} /></button></div></div>}
                            {chatAttachments.length > 0 && <div className={`px-4 ${attachedContext ? 'pt-2' : 'pt-3'} space-y-2`}><div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">{chatAttachments.map((att) => (<div key={att.id} className="relative group shrink-0">{att.file.type.startsWith('image/') ? <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 bg-black relative"><img src={att.preview} alt="attached" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" /></div> : <div className="w-16 h-16 rounded-lg border border-zinc-700 bg-zinc-800 flex flex-col items-center justify-center gap-1 p-1"><File size={20} className="text-zinc-400" /><span className="text-[9px] text-zinc-500 w-full truncate text-center">{att.file.name}</span></div>}<button onClick={() => removeChatAttachment(att.id)} className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-full p-1 border border-zinc-700 shadow-lg z-10"><X size={10} /></button></div>))}</div></div>}
                        </div>
                    )}

                    <textarea value={currentInput} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste} placeholder={isImageStudioOpen ? "무엇을 그려볼까요?" : "무엇이든 물어보세요."} className="w-full bg-transparent text-zinc-200 p-4 min-h-[60px] max-h-[200px] outline-none resize-none" />

                    <div className="flex items-center justify-between px-3 py-2 bg-[#18181b] rounded-b-2xl">
                         {isImageStudioOpen ? (
                             <div className="flex items-center justify-between w-full">
                                <div className="flex gap-2 items-center flex-wrap">
                                    <div className="relative" ref={modelMenuRef}>
                                        <button onClick={() => setShowModelMenu(!showModelMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2d] hover:bg-zinc-700 rounded-full text-xs text-zinc-200 font-medium transition-colors border border-zinc-700"><div className={`w-2 h-2 rounded-full ${selectedModel.color}`}></div>{selectedModel.label}<ChevronDown size={12} className="text-zinc-500 ml-1"/></button>
                                        {showModelMenu && ( <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1e1e21] border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50">{IMAGE_MODELS.map(model => (<button key={model.value} onClick={() => { setSelectedModel(model); setShowModelMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${model.color}`}></div>{model.label}{selectedModel.value === model.value && <Check size={12} className="ml-auto text-lime-400" />}</button>))}</div> )}
                                    </div>
                                    <div className="relative" ref={ratioMenuRef}>
                                        <button onClick={() => setShowRatioMenu(!showRatioMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2d] hover:bg-zinc-700 rounded-full text-xs text-zinc-200 font-medium transition-colors border border-zinc-700"><div className={`border border-zinc-400 ${selectedRatio.dashed ? 'border-dashed' : ''}`} style={{ width: `${selectedRatio.width}px`, height: `${selectedRatio.height}px` }}></div>{selectedRatio.label}</button>
                                        {showRatioMenu && ( <div className="absolute bottom-full left-0 mb-2 w-32 bg-[#1e1e21] border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50">{ASPECT_RATIOS.map(ratio => (<button key={ratio.value} onClick={() => { setSelectedRatio(ratio); setShowRatioMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center gap-3"><div className={`border border-zinc-500 ${ratio.dashed ? 'border-dashed' : ''}`} style={{ width: `${ratio.width}px`, height: `${ratio.height}px` }}></div><span className="flex-1">{ratio.label}</span>{selectedRatio.value === ratio.value && <Check size={12} className="text-lime-400" />}</button>))}</div> )}
                                    </div>
                                    <div className="relative" ref={qualityMenuRef}>
                                        <button onClick={() => setShowQualityMenu(!showQualityMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2d] hover:bg-zinc-700 rounded-full text-xs text-zinc-200 font-medium transition-colors border border-zinc-700"><Sparkles size={14} className="text-zinc-400" />{selectedQuality.label}</button>
                                        {showQualityMenu && ( <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1e1e21] border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50"><div className="px-3 py-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-800/50">Select quality</div>{QUALITIES.map(q => (<button key={q.value} onClick={() => { setSelectedQuality(q); setShowQualityMenu(false); }} className="w-full text-left px-3 py-2 hover:bg-zinc-700 group border-b border-zinc-800/50 last:border-0"><div className="flex items-center justify-between text-xs text-zinc-200 group-hover:text-white mb-0.5"><span className="font-bold">{q.label}</span>{selectedQuality.value === q.value && <Check size={12} className="text-lime-400" />}</div><div className="text-[10px] text-zinc-500 group-hover:text-zinc-400">{q.desc}</div></button>))}</div> )}
                                    </div>
                                    <div className="flex items-center bg-[#2a2a2d] rounded-full border border-zinc-700 px-1 py-0.5">
                                        <button onClick={() => setImageCount(Math.max(1, imageCount - 1))} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 disabled:opacity-30" disabled={imageCount <= 1}><Minus size={12} /></button><span className="text-xs text-zinc-200 font-medium w-6 text-center">{imageCount}/4</span><button onClick={() => setImageCount(Math.min(4, imageCount + 1))} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 disabled:opacity-30" disabled={imageCount >= 4}><Plus size={12} /></button>
                                    </div>
                                </div>
                                <button onClick={handleSend} disabled={!currentInput.trim()} className="bg-lime-400 hover:bg-lime-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1 shadow-[0_0_10px_rgba(163,230,53,0.3)]"><Sparkles size={14} fill="black" /></button>
                             </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-1 md:gap-2">
                                <button onClick={triggerFileUpload} className="p-2 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded-lg transition-colors" title="파일 첨부"><Paperclip size={18} /></button>
                                <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                                {/* Model Selector - Replaces Globe Button */}
                                <div className="relative" ref={chatModelMenuRef}>
                                    <button onClick={() => setShowChatModelMenu(!showChatModelMenu)} className="flex items-center gap-2 px-3 py-1.5 bg-[#2a2a2d] hover:bg-zinc-700 rounded-lg text-xs text-zinc-200 font-medium transition-colors border border-zinc-800">{selectedChatModel.icon} {selectedChatModel.label} <ChevronDown size={12} className="text-zinc-500"/></button>
                                    {showChatModelMenu && (
                                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#1e1e21] border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50">
                                            {CHAT_MODELS.map(model => (
                                                <button key={model.value} onClick={() => { setSelectedChatModel(model); setShowChatModelMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white flex items-center gap-2">{model.icon} {model.label}{selectedChatModel.value === model.value && <Check size={12} className="ml-auto text-cyan-400" />}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full"><Mic size={18} /></button>
                                    <button onClick={handleSend} disabled={(!currentInput.trim() && !attachedContext && chatAttachments.length === 0) || isGenerating} className={`p-2 rounded-xl transition-all ${ (currentInput.trim() || attachedContext || chatAttachments.length > 0) && !isGenerating ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>{isGenerating ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"/> : <Send size={18} />}</button>
                                </div>
                            </>
                        )}
                    </div>
                    </div>
                    <p className="text-center text-xs text-zinc-600 mt-3">Gemini 3.0 Pro는 실수를 할 수 있습니다. 중요한 정보는 확인하세요.</p>
                </div>
            </div>
        )}
    </div>
  );
};