import React, { useState, useRef, useEffect } from 'react';
import { Space, ViewMode, Message, MessageType, ContentType, SpaceFile, Thread, GeneratedImage, InputReferenceImage, Note } from './types';
import { SpaceList } from './components/SpaceList';
import { ChatInterface } from './components/ChatInterface';
import { ContextPanel } from './components/ContextPanel';
import { LinkModal, InstructionsModal } from './components/ActionModals';
import { SideToolbar } from './components/SideToolbar';
import { ImageStudio } from './components/ImageStudio';
import { SuperNotepad } from './components/SuperNotepad';
import { generateTextResponse, generateImageResponse, streamTextResponse, setGeminiApiKey, getGeminiApiKey } from './services/geminiService';
import { exportSpace, importSpace } from './services/storageService';
import { LayoutGrid, Share2, MoreHorizontal, ChevronRight, PanelRightOpen, Home, Download, FolderInput, Loader2, Key } from 'lucide-react';

const INITIAL_SPACES: Space[] = [
  {
    id: '1',
    title: '소설 제작 프로젝트',
    description: 'SF 장르 웹소설 등장인물 및 세계관 설정',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 22), 
    isPrivate: true,
    files: [
       { id: 'f1', name: '주요 등장인물 설정.pdf', type: 'pdf', addedAt: new Date() },
       { id: 'f2', name: '세계관 연표_Draft_v2.txt', type: 'txt', addedAt: new Date() },
    ],
    threads: [
        {
            id: 't1',
            title: '주인공 성격 설정 논의',
            lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 22),
            messages: [
                 {
                    id: 'm-welcome',
                    type: MessageType.AI,
                    contentType: ContentType.TEXT,
                    content: "안녕하세요! 소설 제작 프로젝트 공간입니다. 세계관 설정이나 캐릭터 구축에 대해 도와드릴까요?",
                    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22)
                 }
            ]
        }
    ],
    generatedImages: [],
    notes: [],
    instructions: "## 프로젝트 목적 요약\n이 프로젝트는 소설 인물을 대상으로 해부학적, 심리학적 구조를 기반으로 한 정밀 신체 데이터를 설계하고...",
    webSearchEnabled: true
  },
  {
    id: '2',
    title: '이미지 생성 프로젝트',
    description: '유튜브 썸네일 및 블로그 헤더 이미지 작업',
    lastActive: new Date('2026-01-03'),
    isPrivate: true,
    files: [],
    threads: [],
    generatedImages: [],
    notes: [],
    instructions: "",
    webSearchEnabled: true
  },
  {
    id: '3',
    title: '프리미어 프로 영상 편집가',
    description: '영상 소스 정리 및 대본 작성 보조',
    lastActive: new Date('2026-01-02'),
    isPrivate: true,
    files: [],
    threads: [],
    generatedImages: [],
    notes: [],
    instructions: "",
    webSearchEnabled: true
  }
];

const App: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>(INITIAL_SPACES);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New Tool State
  const [activeTool, setActiveTool] = useState<string | null>('CHAT');
  
  // API Key State
  const [apiKey, setApiKey] = useState(getGeminiApiKey());
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const apiKeyDropdownRef = useRef<HTMLDivElement>(null);

  // Derived state for tools
  const isImageStudioOpen = activeTool === 'IMAGE_STUDIO';
  const isNotepadOpen = activeTool === 'NOTEPAD';
  
  // We keep a local state for rendering, but we must sync it to spaces
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  // Image Studio Input State (Reference Images)
  const [referenceImages, setReferenceImages] = useState<InputReferenceImage[]>([]);
  // Prompt Copy State
  const [pastedPrompt, setPastedPrompt] = useState<string | null>(null);
  // Context Copy State (from Notepad)
  const [externalContext, setExternalContext] = useState<string | null>(null);
  
  // Notepad State (Auto-fill)
  const [pendingNoteContent, setPendingNoteContent] = useState<string | null>(null);

  // Storage States
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loadFileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalInitialTab, setLinkModalInitialTab] = useState<'file' | 'link'>('file');
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);

  const activeSpace = spaces.find(s => s.id === activeSpaceId);
  const activeThread = activeSpace?.threads.find(t => t.id === activeThreadId);

  // Derived state for Image Loading
  const isImageGenerating = generatedImages.some(img => img.status === 'generating');

  // --- API KEY HANDLING ---
  useEffect(() => {
      // Sync initial key
      setApiKey(getGeminiApiKey());
  }, []);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (apiKeyDropdownRef.current && !apiKeyDropdownRef.current.contains(event.target as Node)) {
              setIsApiKeyOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newKey = e.target.value;
      setApiKey(newKey);
      setGeminiApiKey(newKey);
  };
  // ------------------------

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only active if in DETAIL view
      if (viewMode === 'DETAIL') {
        // Cmd (Meta) or Ctrl
        if (e.metaKey || e.ctrlKey) {
          if (e.key === '1') {
            e.preventDefault();
            setActiveTool('CHAT');
          } else if (e.key === '2') {
            e.preventDefault();
            setActiveTool('IMAGE_STUDIO');
          } else if (e.key === '3') {
            e.preventDefault();
            setActiveTool('NOTEPAD');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);
  // --------------------------

  // Sync generatedImages & notes changes back to the active space in `spaces` array
  useEffect(() => {
    if (activeSpaceId) {
        setSpaces(prev => prev.map(s => {
            if (s.id === activeSpaceId) {
                let updated = false;
                let newSpace = { ...s };

                if (s.generatedImages !== generatedImages) {
                    newSpace.generatedImages = generatedImages;
                    updated = true;
                }
                if (s.notes !== notes) {
                    newSpace.notes = notes;
                    updated = true;
                }
                
                return updated ? newSpace : s;
            }
            return s;
        }));
    }
  }, [generatedImages, notes, activeSpaceId]);

  const handleCreateSpace = () => {
    const newSpace: Space = {
      id: Date.now().toString(),
      title: '새로운 공간',
      description: '',
      lastActive: new Date(),
      isPrivate: true,
      files: [],
      threads: [],
      generatedImages: [],
      notes: [],
      instructions: "",
      webSearchEnabled: true
    };
    setSpaces([newSpace, ...spaces]);
    setActiveSpaceId(newSpace.id);
    setActiveThreadId(null); // Go to Dashboard
    setViewMode('DETAIL');
    setIsContextPanelOpen(true); // Open panel for new space to encourage setup
    setGeneratedImages([]); // Clear images for new space
    setNotes([]);
    setReferenceImages([]);
  };

  const handleSelectSpace = (id: string) => {
    const space = spaces.find(s => s.id === id);
    if (space) {
        setActiveSpaceId(id);
        setActiveThreadId(null); // Reset thread selection to show Dashboard
        setViewMode('DETAIL');
        setIsContextPanelOpen(true);
        // Load the space's data into local state
        setGeneratedImages(space.generatedImages || []);
        setNotes(space.notes || []);
        setReferenceImages([]);
    }
  };

  const handleGoHome = () => {
    setViewMode('LIST');
    setActiveSpaceId(null);
    setActiveThreadId(null);
    setActiveTool('CHAT');
  };

  const handleToolSelect = (tool: string) => {
      // If clicking current tool again (except CHAT), toggle off to CHAT
      if (activeTool === tool && tool !== 'CHAT') {
          setActiveTool('CHAT');
      } else {
          setActiveTool(tool);
      }
  };

  const handleSelectThread = (threadId: string) => {
      setActiveThreadId(threadId);
  };

  const handleBackToDashboard = () => {
      setActiveThreadId(null);
  };

  // --- SAVE / LOAD HANDLERS ---
  const handleSaveSpace = async () => {
      const currentSpace = spaces.find(s => s.id === activeSpaceId);
      if (!currentSpace || isSaving) return;
      
      setIsSaving(true);
      try {
          await exportSpace(currentSpace);
      } catch (error) {
          console.error("Failed to save space:", error);
          alert("공간을 저장하는 도중 오류가 발생했습니다.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleTriggerLoad = () => {
      if (isLoading) return;
      loadFileInputRef.current?.click();
  };

  const handleLoadSpace = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          if (!file.name.endsWith('.gonggan')) {
              alert("올바른 .gonggan 파일이 아닙니다.");
              return;
          }

          setIsLoading(true);
          try {
              const importedSpace = await importSpace(file);
              setSpaces(prev => [importedSpace, ...prev]);
              setActiveSpaceId(importedSpace.id);
              setActiveThreadId(null);
              setViewMode('DETAIL');
              setIsContextPanelOpen(true);
              setGeneratedImages(importedSpace.generatedImages || []);
              setNotes(importedSpace.notes || []);
              setReferenceImages([]);
              
              alert("공간을 성공적으로 불러왔습니다!");
          } catch (error) {
              console.error("Failed to load space:", error);
              alert("파일을 불러오는 도중 오류가 발생했습니다.");
          } finally {
              setIsLoading(false);
              e.target.value = ''; // Reset input
          }
      }
  };
  // ---------------------------

  const handleUpdateInstructions = (text: string, webSearch?: boolean) => {
      if(!activeSpaceId) return;
      setSpaces(prev => prev.map(s => {
          if(s.id === activeSpaceId) {
              return { 
                  ...s, 
                  instructions: text,
                  webSearchEnabled: webSearch !== undefined ? webSearch : s.webSearchEnabled
              };
          }
          return s;
      }));
  };

  const handleUpdateDescription = (desc: string) => {
      if(!activeSpaceId) return;
      setSpaces(prev => prev.map(s => {
          if(s.id === activeSpaceId) {
              return { ...s, description: desc };
          }
          return s;
      }));
  };

  const handleUpdateTitle = (title: string) => {
      if(!activeSpaceId) return;
      setSpaces(prev => prev.map(s => {
          if(s.id === activeSpaceId) {
              return { ...s, title: title };
          }
          return s;
      }));
  };

  const handleAddFiles = async (files: File[]) => {
      if(!activeSpaceId) return;
      
      const newFiles = await Promise.all(files.map(file => new Promise<SpaceFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              const base64String = (e.target?.result as string).split(',')[1];
              const mimeType = file.type || 'application/octet-stream';
              
              let type: SpaceFile['type'] = 'txt';
              if (file.type.includes('pdf')) type = 'pdf';
              else if (file.type.includes('image')) type = 'image';
              else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'doc';

              const sizeInMB = file.size / (1024 * 1024);
              const sizeStr = sizeInMB < 1 
                ? `${(file.size / 1024).toFixed(0)} KB` 
                : `${sizeInMB.toFixed(1)} MB`;

              resolve({
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                  name: file.name,
                  type: type,
                  size: sizeStr,
                  addedAt: new Date(),
                  base64Data: base64String,
                  mimeType: mimeType
              });
          };
          reader.readAsDataURL(file);
      })));
      
      setSpaces(prev => prev.map(s => {
          if(s.id === activeSpaceId) {
              return { ...s, files: [...s.files, ...newFiles] };
          }
          return s;
      }));
  };

  const handleRemoveFile = (fileId: string) => {
      if(!activeSpaceId) return;
      setSpaces(prev => prev.map(s => {
          if(s.id === activeSpaceId) {
              return { ...s, files: s.files.filter(f => f.id !== fileId) };
          }
          return s;
      }));
  };

  const handleAddDriveFile = () => {
      // Stub
  };

  const handleAddLink = (url: string) => {
    if(!activeSpaceId) return;
    const newFile: SpaceFile = {
        id: Date.now().toString(),
        name: url,
        type: 'link',
        addedAt: new Date()
    };
    
    setSpaces(prev => prev.map(s => {
        if(s.id === activeSpaceId) {
            return { ...s, files: [...s.files, newFile] };
        }
        return s;
    }));
  };
  
  const handleOpenLinkModal = (tab: 'file' | 'link' = 'link') => {
      setLinkModalInitialTab(tab);
      setIsLinkModalOpen(true);
  };

  // --- Reference Image Handlers (Image Studio Input) ---
  const handleAddReferenceImages = (files: File[]) => {
      if (referenceImages.length + files.length > 7) {
          alert("최대 7장까지만 첨부할 수 있습니다.");
          return;
      }

      const newImages = files.map(file => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          file: file,
          previewUrl: URL.createObjectURL(file)
      }));

      setReferenceImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveReferenceImage = (id: string) => {
      setReferenceImages(prev => prev.filter(img => img.id !== id));
  };

  const handleImportGeneratedImage = async (img: GeneratedImage) => {
      if (referenceImages.length >= 7) {
          alert("이미지 슬롯이 가득 찼습니다.");
          return;
      }

      try {
          const response = await fetch(img.url);
          const blob = await response.blob();
          const file = new File([blob], `generated-${img.id}.png`, { type: 'image/png' });
          
          const newImage: InputReferenceImage = {
              id: Date.now().toString() + Math.random(),
              file: file,
              previewUrl: img.url // Reuse URL
          };
          setReferenceImages(prev => [...prev, newImage]);
      } catch (e) {
          console.error("Failed to import image:", e);
      }
  };

  const handleDeleteGeneratedImage = (id: string) => {
      setGeneratedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleCopyPrompt = (prompt: string) => {
      setPastedPrompt(prompt);
      // Reset after a short delay so effect triggers in child
      setTimeout(() => setPastedPrompt(null), 100);
  };

  // --- SUPER NOTEPAD HANDLERS ---
  const handleAddNote = (content: string) => {
      const newNote: Note = {
          id: Date.now().toString(),
          content: content,
          createdAt: new Date()
      };
      setNotes(prev => [...prev, newNote]);
  };

  const handleUpdateNote = (id: string, newContent: string) => {
      setNotes(prev => prev.map(n => 
        n.id === id ? { ...n, content: newContent } : n
      ));
  };

  const handleDeleteNote = (id: string) => {
      setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleAddNoteFromSelection = (text: string) => {
      setPendingNoteContent(text);
      setActiveTool('NOTEPAD');
  };
  
  const handleAttachNoteToChat = (content: string) => {
      setExternalContext(content);
      setActiveTool('CHAT');
      // Reset after delay to allow effect to run in ChatInterface
      setTimeout(() => setExternalContext(null), 100);
  };

  const handleConvertNoteToSpaceFile = (note: Note) => {
      if (!activeSpaceId) return;
      const fileName = `memo_${note.id.substr(-4)}.txt`;
      // Encode UTF-8 to Base64
      const utf8Bytes = new TextEncoder().encode(note.content);
      let binary = '';
      utf8Bytes.forEach(b => binary += String.fromCharCode(b));
      const base64Content = btoa(binary);

      const newFile: SpaceFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name: fileName,
          type: 'txt',
          size: `${(utf8Bytes.length / 1024).toFixed(1)} KB`,
          addedAt: new Date(),
          base64Data: base64Content,
          mimeType: 'text/plain'
      };

      setSpaces(prev => prev.map(s => {
          if (s.id === activeSpaceId) {
              return { ...s, files: [...s.files, newFile] };
          }
          return s;
      }));
      
      alert("메모가 파일로 추가되었습니다.");
  };

  // ---------------------------------------------------

  const handleGenerateImage = async (
    prompt: string,
    aspectRatio: string,
    quality: string,
    count: number,
    model: string,
    inputReferenceImages: InputReferenceImage[] = []
  ) => {
      if (!activeSpaceId) return;
      
      // DECOUPLED: Do NOT set isGenerating(true) here. 
      // isGenerating is for Chat loading. Image loading is tracked via generatedImages status.
      
      // Switch to Image Studio to show results
      if (activeTool !== 'IMAGE_STUDIO') setActiveTool('IMAGE_STUDIO');

      try {
          // 1. Process Reference Images to Base64 with MimeType
          const processedRefs = await Promise.all(inputReferenceImages.map(async (ref) => {
              return new Promise<{ data: string, mimeType: string }>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                      const result = e.target?.result as string;
                      // result format: "data:image/png;base64,..."
                      const [header, base64] = result.split(',');
                      const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
                      resolve({ data: base64, mimeType });
                  };
                  reader.readAsDataURL(ref.file);
              });
          }));

          // 2. Create Placeholders
          const newPlaceholders: GeneratedImage[] = Array.from({ length: count }).map(() => ({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              url: '',
              prompt: prompt,
              aspectRatio: aspectRatio,
              quality: quality,
              createdAt: new Date(),
              status: 'generating'
          }));

          setGeneratedImages(prev => [...newPlaceholders, ...prev]);

          // 3. Generate Images (Parallel)
          await Promise.all(newPlaceholders.map(async (placeholder) => {
              try {
                  const resultUrl = await generateImageResponse(
                      prompt,
                      aspectRatio,
                      quality,
                      model,
                      processedRefs
                  );

                  setGeneratedImages(prev => prev.map(img => {
                      if (img.id === placeholder.id) {
                          if (resultUrl) {
                              return { ...img, url: resultUrl, status: 'completed' };
                          } else {
                              return { ...img, status: 'failed' };
                          }
                      }
                      return img;
                  }));
              } catch (error) {
                  console.error("Single image generation failed", error);
                  setGeneratedImages(prev => prev.map(img => 
                      img.id === placeholder.id ? { ...img, status: 'failed' } : img
                  ));
              }
          }));

      } catch (error) {
          console.error("Bulk image generation failed", error);
          alert("이미지 생성 중 오류가 발생했습니다.");
      } 
      // Finally block removed because we are not toggling a global loading state
  };

  const handleCreateThread = async (initialMessage: string, mode: 'text' | 'image', attachments?: File[], model?: string) => {
      if (!activeSpace) return;
      
      const newThreadId = Date.now().toString();
      const title = mode === 'image' ? '이미지 생성' : (initialMessage.length > 20 ? initialMessage.slice(0, 20) + '...' : initialMessage);
      
      const newThread: Thread = {
          id: newThreadId,
          title: title,
          lastMessageAt: new Date(),
          messages: []
      };

      setSpaces(prev => prev.map(s => {
          if (s.id === activeSpace.id) {
              return { ...s, threads: [newThread, ...s.threads] };
          }
          return s;
      }));

      setActiveThreadId(newThreadId);
      await handleSendMessageInternal(activeSpace.id, newThreadId, initialMessage, mode, attachments, model, [newThread]);
  };

  const handleSendMessage = async (text: string, mode: 'text' | 'image', attachments?: File[], model?: string) => {
      if (!activeSpace) return;
      
      if (!activeThreadId) {
          await handleCreateThread(text, mode, attachments, model);
      } else {
          await handleSendMessageInternal(activeSpace.id, activeThreadId, text, mode, attachments, model);
      }
  };
  
  const handleRegenerate = async (messageId: string) => {
      if (!activeSpace || !activeThreadId) return;
      const thread = activeSpace.threads.find(t => t.id === activeThreadId);
      if (!thread) return;

      const messageIndex = thread.messages.findIndex(m => m.id === messageId);
      if (messageIndex <= 0) return; 

      const aiMessage = thread.messages[messageIndex];
      const userMessage = thread.messages[messageIndex - 1];

      if (aiMessage.type !== MessageType.AI) return;

      setIsGenerating(true);

      // 1. Reset Content to empty and set streaming flag
      const updatedMessages = [...thread.messages];
      updatedMessages[messageIndex] = { ...aiMessage, content: '', isStreaming: true };

      setSpaces(prev => prev.map(s => {
          if (s.id === activeSpace.id) {
              return {
                  ...s,
                  threads: s.threads.map(t => {
                      if (t.id === activeThreadId) {
                          return { ...t, messages: updatedMessages };
                      }
                      return t;
                  })
              };
          }
          return s;
      }));

      try {
          const history = updatedMessages.slice(0, messageIndex - 1);
          
          // Use STREAMING service
          let accumulatedText = "";
          let groundingMetadata = null;

          const stream = streamTextResponse(
              userMessage.content,
              activeSpace.files,
              activeSpace.instructions,
              activeSpace.webSearchEnabled,
              history,
              [],
              'gemini-3-flash-preview' // Default fallback for regenerate for now, or could store model in msg
          );

          for await (const chunk of stream) {
              accumulatedText += chunk.text;
              if (chunk.groundingMetadata) groundingMetadata = chunk.groundingMetadata;

              // Update state per chunk
              setSpaces(prev => prev.map(s => {
                  if (s.id === activeSpace.id) {
                      const currentThread = s.threads.find(t => t.id === activeThreadId);
                      if (currentThread) {
                          const msgs = [...currentThread.messages];
                          msgs[messageIndex] = { ...msgs[messageIndex], content: accumulatedText };
                          return { ...s, threads: s.threads.map(t => t.id === activeThreadId ? { ...t, messages: msgs } : t) };
                      }
                  }
                  return s;
              }));
          }

          // Append grounding if exists
          if (groundingMetadata && (groundingMetadata as any).groundingChunks) {
               const chunks = (groundingMetadata as any).groundingChunks;
               const links = chunks
                    .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
                    .map((chunk: any) => `- [${chunk.web.title}](${chunk.web.uri})`)
                    .join('\n');
                
                if (links) {
                    accumulatedText += `\n\n출처:\n${links}`;
                    // Final Update
                     setSpaces(prev => prev.map(s => {
                        if (s.id === activeSpace.id) {
                            const currentThread = s.threads.find(t => t.id === activeThreadId);
                            if (currentThread) {
                                const msgs = [...currentThread.messages];
                                msgs[messageIndex] = { ...msgs[messageIndex], content: accumulatedText };
                                return { ...s, threads: s.threads.map(t => t.id === activeThreadId ? { ...t, messages: msgs } : t) };
                            }
                        }
                        return s;
                    }));
                }
          }

          // Finalize (Stop blinking cursor)
          setSpaces(prev => prev.map(s => {
              if (s.id === activeSpace.id) {
                  const currentThread = s.threads.find(t => t.id === activeThreadId);
                  if (currentThread) {
                       const msgs = [...currentThread.messages];
                       msgs[messageIndex] = { ...msgs[messageIndex], isStreaming: false, timestamp: new Date() };
                       return { ...s, threads: s.threads.map(t => t.id === activeThreadId ? { ...t, messages: msgs } : t) };
                  }
              }
              return s;
          }));

      } catch (error) {
          console.error("Regeneration failed", error);
           setSpaces(prev => prev.map(s => {
              if (s.id === activeSpace.id) {
                  const currentThread = s.threads.find(t => t.id === activeThreadId);
                  if (currentThread) {
                       const msgs = [...currentThread.messages];
                       msgs[messageIndex] = { ...msgs[messageIndex], content: "재생성 중 오류가 발생했습니다.", isStreaming: false };
                       return { ...s, threads: s.threads.map(t => t.id === activeThreadId ? { ...t, messages: msgs } : t) };
                  }
              }
              return s;
          }));
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSendMessageInternal = async (
      spaceId: string, 
      threadId: string, 
      text: string, 
      mode: 'text' | 'image',
      attachments?: File[],
      model: string = 'gemini-3-flash-preview',
      overrideThreads?: Thread[]
  ) => {
    const targetSpace = spaces.find(s => s.id === spaceId);
    if (!targetSpace) return;

    let targetThread = overrideThreads 
        ? overrideThreads.find(t => t.id === threadId) 
        : targetSpace.threads.find(t => t.id === threadId);
        
    if (!targetThread) return;

    // Process temporary attachments to display or send
    let displayContent = text;
    if (attachments && attachments.length > 0) {
        // Just append a note to the user message content for now
        const fileNames = attachments.map(f => f.name).join(', ');
        if (text) displayContent += `\n[첨부 파일: ${fileNames}]`;
        else displayContent = `[첨부 파일: ${fileNames}]`;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      type: MessageType.USER,
      contentType: ContentType.TEXT,
      content: displayContent,
      timestamp: new Date()
    };

    const updatedMessages = [...targetThread.messages, userMsg];
    
    // Update state with User Message
    setSpaces(prev => prev.map(s => {
        if(s.id === spaceId) {
            return {
                ...s,
                lastActive: new Date(),
                threads: s.threads.map(t => {
                    if (t.id === threadId) {
                        return { ...t, messages: updatedMessages, lastMessageAt: new Date() };
                    }
                    return t;
                })
            };
        }
        return s;
    }));
    
    setIsGenerating(true);

    try {
        let aiContent = "";
        let contentType = ContentType.TEXT;

        // Process attachments into SpaceFiles (base64)
        let tempSpaceFiles: SpaceFile[] = [];
        if (attachments && attachments.length > 0) {
             tempSpaceFiles = await Promise.all(attachments.map(file => new Promise<SpaceFile>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const base64String = (e.target?.result as string).split(',')[1];
                    const mimeType = file.type || 'application/octet-stream';
                    
                    let type: SpaceFile['type'] = 'txt';
                    if (file.type.includes('pdf')) type = 'pdf';
                    else if (file.type.includes('image')) type = 'image';
                    else if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'doc';
    
                    resolve({
                        id: 'temp-' + Date.now() + Math.random(),
                        name: file.name,
                        type: type,
                        addedAt: new Date(),
                        base64Data: base64String,
                        mimeType: mimeType
                    });
                };
                reader.readAsDataURL(file);
            })));
        }

        if (mode === 'image') {
             // Image Generation is NOT streamed
             const imageBase64 = await generateImageResponse(text);
             if (imageBase64) {
                 aiContent = imageBase64;
                 contentType = ContentType.IMAGE;
             } else {
                 aiContent = "죄송합니다. 이미지를 생성하지 못했습니다.";
             }

             const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                type: MessageType.AI,
                contentType: contentType,
                content: aiContent,
                timestamp: new Date()
            };

            setSpaces(prev => prev.map(s => {
                if(s.id === spaceId) {
                    return {
                        ...s,
                        threads: s.threads.map(t => {
                            if (t.id === threadId) {
                                return { ...t, messages: [...updatedMessages, aiMsg], lastMessageAt: new Date() };
                            }
                            return t;
                        })
                    };
                }
                return s;
            }));

        } else {
            // STREAMING TEXT GENERATION
            // 1. Create Empty AI Message
             const aiMsgId = (Date.now() + 1).toString();
             const aiMsg: Message = {
                id: aiMsgId,
                type: MessageType.AI,
                contentType: ContentType.TEXT,
                content: "", // Start empty
                timestamp: new Date(),
                isStreaming: true
            };
            
            // Add Empty AI Message to State
            setSpaces(prev => prev.map(s => {
                if(s.id === spaceId) {
                    return {
                        ...s,
                        threads: s.threads.map(t => {
                            if (t.id === threadId) {
                                return { ...t, messages: [...updatedMessages, aiMsg], lastMessageAt: new Date() };
                            }
                            return t;
                        })
                    };
                }
                return s;
            }));

            // 2. Start Stream
            let accumulatedText = "";
            let groundingMetadata = null;

            const stream = streamTextResponse(
                text, 
                targetSpace.files, 
                targetSpace.instructions,
                targetSpace.webSearchEnabled,
                updatedMessages,
                tempSpaceFiles,
                model 
            );

            for await (const chunk of stream) {
                accumulatedText += chunk.text;
                if (chunk.groundingMetadata) groundingMetadata = chunk.groundingMetadata;

                // Update UI with new chunk
                setSpaces(prev => prev.map(s => {
                    if (s.id === spaceId) {
                        return {
                            ...s,
                            threads: s.threads.map(t => {
                                if (t.id === threadId) {
                                    const msgs = t.messages.map(m => 
                                        m.id === aiMsgId ? { ...m, content: accumulatedText } : m
                                    );
                                    return { ...t, messages: msgs };
                                }
                                return t;
                            })
                        };
                    }
                    return s;
                }));
            }

            // 3. Append Links if available (Post-stream)
             if (groundingMetadata && (groundingMetadata as any).groundingChunks) {
                const chunks = (groundingMetadata as any).groundingChunks;
                const links = chunks
                    .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
                    .map((chunk: any) => `- [${chunk.web.title}](${chunk.web.uri})`)
                    .join('\n');
                
                if (links) {
                    accumulatedText += `\n\n출처:\n${links}`;
                     setSpaces(prev => prev.map(s => {
                        if (s.id === spaceId) {
                            return {
                                ...s,
                                threads: s.threads.map(t => {
                                    if (t.id === threadId) {
                                        const msgs = t.messages.map(m => 
                                            m.id === aiMsgId ? { ...m, content: accumulatedText } : m
                                        );
                                        return { ...t, messages: msgs };
                                    }
                                    return t;
                                })
                            };
                        }
                        return s;
                    }));
                }
             }

            // 4. Mark Streaming as Done
            setSpaces(prev => prev.map(s => {
                if(s.id === spaceId) {
                    return {
                        ...s,
                        threads: s.threads.map(t => {
                            if (t.id === threadId) {
                                const msgs = t.messages.map(m => 
                                    m.id === aiMsgId ? { ...m, isStreaming: false } : m
                                );
                                return { ...t, messages: msgs, lastMessageAt: new Date() };
                            }
                            return t;
                        })
                    };
                }
                return s;
            }));
        }

    } catch (error) {
        console.error(error);
         // If error, update the AI message to show error
         setSpaces(prev => prev.map(s => {
            if(s.id === spaceId) {
                return {
                    ...s,
                    threads: s.threads.map(t => {
                        if (t.id === threadId) {
                            // Find the AI message we added, or add a new error one if it failed before adding
                            const msgs = [...t.messages];
                            const lastMsg = msgs[msgs.length - 1];
                            if (lastMsg.type === MessageType.AI && lastMsg.isStreaming) {
                                msgs[msgs.length - 1] = { ...lastMsg, content: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.", isStreaming: false };
                            } else {
                                msgs.push({
                                    id: (Date.now() + 1).toString(),
                                    type: MessageType.AI,
                                    contentType: ContentType.TEXT,
                                    content: "오류가 발생했습니다.",
                                    timestamp: new Date()
                                });
                            }
                            return { ...t, messages: msgs, lastMessageAt: new Date() };
                        }
                        return t;
                    })
                };
            }
            return s;
        }));
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b]">
      {/* 1. SIDEBAR - Only visible in DETAIL view AND inside a thread (active chat) */}
      {viewMode === 'DETAIL' && activeThreadId && (
        <SideToolbar 
           activeTool={activeTool}
           onSelectTool={handleToolSelect}
           onGoHome={handleGoHome}
           isChatLoading={isGenerating}
           isImageLoading={isImageGenerating}
        />
      )}

      {/* 2. PANELS (Expandable) - Only visible in DETAIL view */}
      {viewMode === 'DETAIL' && (
        <>
            {/* Image Studio */}
            <ImageStudio 
            isOpen={isImageStudioOpen} 
            onClose={() => { setActiveTool('CHAT'); }}
            images={generatedImages}
            onViewFullScreen={() => setIsContextPanelOpen(false)}
            onDeleteImage={handleDeleteGeneratedImage}
            onImportImage={handleImportGeneratedImage}
            onCopyPrompt={handleCopyPrompt}
            />

            {/* Super Notepad */}
            <SuperNotepad
                isOpen={isNotepadOpen}
                onClose={() => { setActiveTool('CHAT'); }}
                notes={notes}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onConvertNoteToSpaceFile={handleConvertNoteToSpaceFile}
                initialContent={pendingNoteContent}
                onClearInitialContent={() => setPendingNoteContent(null)}
                onAttachNoteToChat={handleAttachNoteToChat}
            />
        </>
      )}

      {/* 3. MAIN CONTENT (Flex Grow) */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Hidden Load Input */}
        <input 
            type="file" 
            ref={loadFileInputRef} 
            onChange={handleLoadSpace} 
            accept=".gonggan"
            className="hidden" 
        />

        {/* Top Header */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-[#09090b] z-10 shrink-0">
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
            {viewMode === 'DETAIL' && activeSpace ? (
                <>
                <button onClick={handleGoHome} className="hover:text-white transition-colors flex items-center gap-1">
                    <Home size={14} /> 공간
                </button>
                <ChevronRight size={14} />
                <button 
                    onClick={handleBackToDashboard}
                    className={`transition-colors ${activeThreadId ? 'hover:text-white' : 'text-zinc-100 font-medium'}`}
                >
                    {activeSpace.title}
                </button>
                {activeThread && (
                    <>
                        <ChevronRight size={14} />
                        <span className="text-zinc-100 font-medium truncate max-w-[200px]">{activeThread.title}</span>
                    </>
                )}
                </>
            ) : (
                <span className="font-semibold text-zinc-100">나의 공간</span>
            )}
            </div>

            <div className="flex items-center gap-2">
                {viewMode === 'DETAIL' && activeSpace && (
                    <>
                    <button 
                        onClick={handleTriggerLoad}
                        disabled={isLoading || isSaving}
                        className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
                        title="불러오기"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <FolderInput size={18} />}
                    </button>

                    <button 
                        onClick={handleSaveSpace}
                        disabled={isLoading || isSaving}
                        className="p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-colors disabled:opacity-50 mr-2"
                        title="저장하기"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </button>

                    <div className="w-px h-4 bg-zinc-800 mx-1" />
                    
                    <button 
                        onClick={() => setIsContextPanelOpen(!isContextPanelOpen)}
                        className={`p-2 rounded hover:bg-zinc-800 transition-colors ${isContextPanelOpen ? 'text-cyan-400' : 'text-zinc-400'}`}
                        title="패널 열기"
                    >
                            <PanelRightOpen size={18} />
                    </button>
                    </>
                )}
            
            <button className="p-2 rounded hover:bg-zinc-800 text-zinc-400 transition-colors">
                <Share2 size={18} />
            </button>
            
            {/* API Key Management UI */}
            <div className="relative" ref={apiKeyDropdownRef}>
                <button 
                    onClick={() => setIsApiKeyOpen(!isApiKeyOpen)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg transition-all ${apiKey ? 'bg-gradient-to-tr from-cyan-600 to-blue-500' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                    title="API Key 설정"
                >
                    <Key size={14} />
                </button>
                {isApiKeyOpen && (
                    <div className="absolute top-full right-0 mt-2 w-72 bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                        <label className="text-xs text-zinc-400 mb-2 block font-medium flex items-center justify-between">
                            Google Gemini API Key
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline text-[10px]">키 발급받기</a>
                        </label>
                        <input 
                            type="password" 
                            value={apiKey} 
                            onChange={handleApiKeyChange} 
                            className="w-full bg-[#27272a] border border-zinc-600 rounded p-2 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-zinc-600 mb-2"
                            placeholder="AI Studio API Key를 입력하세요"
                        />
                        <p className="text-[10px] text-zinc-500">
                            키는 브라우저에 안전하게 저장됩니다.
                        </p>
                    </div>
                )}
            </div>

            </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden relative">
            {viewMode === 'LIST' ? (
            <div className="flex-1 overflow-y-auto relative">
                <SpaceList 
                spaces={spaces} 
                onSelectSpace={handleSelectSpace} 
                onCreateSpace={handleCreateSpace}
                onLoadSpace={handleTriggerLoad}
                isLoading={isLoading}
                />
            </div>
            ) : (
            activeSpace && (
                <>
                <main className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
                    <ChatInterface 
                        spaceTitle={activeSpace.title}
                        spaceDescription={activeSpace.description}
                        threads={activeSpace.threads}
                        activeThreadId={activeThreadId}
                        messages={activeThread ? activeThread.messages : []} 
                        files={activeSpace.files} 
                        onSendMessage={handleSendMessage}
                        onGenerateImage={handleGenerateImage}
                        onSelectThread={handleSelectThread}
                        isGenerating={isGenerating}
                        isImageStudioOpen={isImageStudioOpen}
                        onAddFiles={handleAddFiles}
                        onAddDriveFile={handleAddDriveFile}
                        onAddLink={() => handleOpenLinkModal('link')}
                        onOpenContextPanel={() => setIsContextPanelOpen(true)}
                        onOpenInstructions={() => setIsInstructionsModalOpen(true)}
                        onUpdateDescription={handleUpdateDescription}
                        onUpdateTitle={handleUpdateTitle}
                        onBackToDashboard={handleBackToDashboard}
                        // New Props for Image Studio Input
                        referenceImages={referenceImages}
                        onAddReferenceImages={handleAddReferenceImages}
                        onRemoveReferenceImage={handleRemoveReferenceImage}
                        externalPrompt={pastedPrompt}
                        // New Props for Super Notepad
                        onAddNoteFromSelection={handleAddNoteFromSelection}
                        // New Props for Chat Logic
                        externalContext={externalContext}
                        onRegenerate={handleRegenerate}
                    />
                </main>

                <ContextPanel 
                    space={activeSpace}
                    isOpen={isContextPanelOpen}
                    onClose={() => setIsContextPanelOpen(false)}
                    onUpdateInstructions={(text) => handleUpdateInstructions(text)}
                    onAddFiles={handleAddFiles} 
                    onManageFiles={() => handleOpenLinkModal('file')} 
                    onManageLinks={() => handleOpenLinkModal('link')}
                />

                <LinkModal 
                    isOpen={isLinkModalOpen}
                    onClose={() => setIsLinkModalOpen(false)}
                    onAddLink={handleAddLink}
                    onAddFiles={handleAddFiles}
                    onRemoveFile={handleRemoveFile}
                    existingFiles={activeSpace.files}
                    initialTab={linkModalInitialTab}
                />

                <InstructionsModal
                    isOpen={isInstructionsModalOpen}
                    onClose={() => setIsInstructionsModalOpen(false)}
                    instructions={activeSpace.instructions}
                    onSave={handleUpdateInstructions}
                    webSearchEnabled={activeSpace.webSearchEnabled}
                />
                </>
            )
            )}
        </div>
      </div>
    </div>
  );
};

export default App;