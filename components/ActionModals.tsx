import React, { useState, useRef, useEffect } from 'react';
import { 
    X, Globe, FileText, Link as LinkIcon, Plus, Search, ChevronDown, CheckCircle2, File,
    MoreVertical, Trash2, Eye, Download, Save, ArrowLeft, Maximize2
} from 'lucide-react';
import { SpaceFile } from '../types';
import FileSaver from 'file-saver';

interface LinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLink: (url: string) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (fileId: string) => void;
  existingFiles: SpaceFile[];
  initialTab?: 'file' | 'link';
}

export const LinkModal: React.FC<LinkModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddLink, 
  onAddFiles,
  onRemoveFile,
  existingFiles,
  initialTab = 'file' 
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'link'>(initialTab);
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // File Action States
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<SpaceFile | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Text Editor States
  const [isTextEditorMode, setIsTextEditorMode] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsTextEditorMode(false);
      setOpenMenuId(null);
      setPreviewFile(null);
    }
  }, [isOpen, initialTab]);

  // Handle PDF Blob URL creation and cleanup
  useEffect(() => {
    let objectUrl: string | null = null;

    if (previewFile?.type === 'pdf' && previewFile.base64Data) {
        try {
            const byteCharacters = atob(previewFile.base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            objectUrl = URL.createObjectURL(blob);
            setPdfPreviewUrl(objectUrl);
        } catch (e) {
            console.error("Failed to create PDF blob:", e);
        }
    } else {
        setPdfPreviewUrl(null);
    }

    return () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    };
  }, [previewFile]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setOpenMenuId(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle ESC for Preview
  useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              if (previewFile) setPreviewFile(null);
          }
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
  }, [previewFile]);

  if (!isOpen) return null;

  const handleAddLinkAction = () => {
    if (url.trim()) {
      onAddLink(url);
      setUrl('');
      // Do not close modal to allow multiple links
    }
  };
  
  const handleAddFileClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files.length > 0) {
          onAddFiles(Array.from(e.target.files));
          e.target.value = ''; // Reset
      }
  };

  const handleSaveTextFile = () => {
      if (!textTitle.trim()) {
          alert("제목을 입력해주세요.");
          return;
      }
      
      const fileName = textTitle.endsWith('.txt') ? textTitle : `${textTitle}.txt`;
      const blob = new Blob([textContent], { type: 'text/plain' });
      const file = new window.File([blob], fileName, { type: 'text/plain' });
      
      onAddFiles([file]);
      
      // Reset and go back
      setIsTextEditorMode(false);
      setTextTitle('');
      setTextContent('');
  };

  const handleDownloadFile = (file: SpaceFile) => {
      if (file.base64Data) {
          // Decode Base64
          const byteCharacters = atob(file.base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: file.mimeType || 'application/octet-stream' });
          FileSaver.saveAs(blob, file.name);
      }
      setOpenMenuId(null);
  };

  const handleDeleteFile = (fileId: string) => {
      onRemoveFile(fileId);
      setOpenMenuId(null);
  };

  const filteredFiles = existingFiles.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDER PREVIEW MODAL ---
  const renderPreview = () => {
      if (!previewFile) return null;
      
      let content = null;
      if (previewFile.base64Data) {
          if (previewFile.type === 'image') {
              content = <img src={`data:${previewFile.mimeType};base64,${previewFile.base64Data}`} alt={previewFile.name} className="max-w-full max-h-[80vh] object-contain" />;
          } else if (previewFile.type === 'txt') {
               // Decode for display
               const decoded = decodeURIComponent(escape(atob(previewFile.base64Data)));
               content = <pre className="text-zinc-300 whitespace-pre-wrap font-mono text-sm overflow-auto max-h-[80vh] p-4 bg-zinc-900 rounded-lg">{decoded}</pre>;
          } else if (previewFile.type === 'pdf' && pdfPreviewUrl) {
               // PDF Display using iframe
               content = (
                   <iframe 
                       src={pdfPreviewUrl} 
                       className="w-full h-[80vh] bg-zinc-800 rounded-lg border border-zinc-700"
                       title={previewFile.name}
                   />
               );
          } else {
              content = (
                  <div className="text-center text-zinc-400">
                      <p className="mb-4">이 파일 형식은 미리보기를 지원하지 않습니다.</p>
                      <button onClick={() => handleDownloadFile(previewFile)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg">다운로드</button>
                  </div>
              );
          }
      }

      return (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm">
              <button 
                  onClick={() => setPreviewFile(null)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2"
              >
                  <X size={32} />
              </button>
              <div className="w-full max-w-5xl flex flex-col items-center h-full justify-center">
                   <h2 className="text-xl font-bold text-white mb-6 shrink-0">{previewFile.name}</h2>
                   <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
                       {content}
                   </div>
                   <p className="mt-4 text-zinc-500 text-sm shrink-0">ESC를 눌러 닫기</p>
              </div>
          </div>
      );
  };

  // --- RENDER TEXT EDITOR ---
  if (isTextEditorMode) {
      return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#18181b] w-[700px] max-w-[95%] rounded-xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[600px]">
                <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsTextEditorMode(false)} className="text-zinc-400 hover:text-white mr-2">
                            <ArrowLeft size={20} />
                        </button>
                        <span className="text-zinc-100 font-semibold text-lg">텍스트 추가</span>
                    </div>
                </div>
                
                <div className="flex-1 p-6 flex flex-col gap-4">
                    <input 
                        type="text" 
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder="제목 (예: 아이디어 메모.txt)"
                        className="bg-[#27272a] border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 text-lg font-medium"
                    />
                    <textarea 
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="여기에 내용을 입력하세요..."
                        className="flex-1 bg-[#27272a] border border-zinc-700 rounded-lg p-4 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                    />
                </div>

                <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-[#1e1e21]">
                    <button 
                        onClick={() => setIsTextEditorMode(false)}
                        className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
                    >
                        취소
                    </button>
                    <button 
                        onClick={handleSaveTextFile}
                        className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Save size={16} /> 저장하기
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- MAIN MODAL UI ---
  return (
    <>
    {renderPreview()}
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#18181b] w-[700px] max-w-[95%] rounded-xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col h-[600px]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-100 font-semibold text-lg">
            <div className="p-1"><div className="grid grid-cols-2 gap-0.5 w-4 h-4"><div className="bg-white rounded-[1px]"></div><div className="bg-white/30 rounded-[1px]"></div><div className="bg-white/30 rounded-[1px]"></div><div className="bg-white rounded-[1px]"></div></div></div>
            출처
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 px-4">
           <button 
             onClick={() => setActiveTab('file')}
             className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'file' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
           >
             파일
           </button>
           <button 
             onClick={() => setActiveTab('link')}
             className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'link' ? 'border-white text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
           >
             링크
           </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {activeTab === 'link' ? (
            <div className="p-6 space-y-6">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddLinkAction();
                        }}
                        placeholder="당신의 도메인 추가 (예: example.com)"
                        className="flex-1 bg-[#27272a] border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 focus:outline-none focus:border-cyan-500 placeholder:text-zinc-600"
                    />
                    <button 
                        onClick={handleAddLinkAction}
                        disabled={!url.trim()}
                        className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/50 disabled:text-black/50 text-black font-semibold px-4 py-2 rounded-lg whitespace-nowrap transition-colors"
                    >
                        + 링크 추가
                    </button>
                </div>

                <div className="border-t border-zinc-800 pt-6">
                    <div className="flex justify-between text-xs text-zinc-500 mb-4 font-semibold uppercase tracking-wider">
                        <span>Domain</span>
                        <span>Added by</span>
                    </div>
                    
                    {existingFiles.filter(f => f.type === 'link').length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-600 space-y-2">
                             <p>스페이스에 링크 추가</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                             {existingFiles.filter(f => f.type === 'link').map(file => (
                                 <div key={file.id} className="flex justify-between items-center py-2 text-sm group">
                                     <span className="text-zinc-300 flex items-center gap-2"><Globe size={14}/> {file.name}</span>
                                     <div className="flex items-center gap-4">
                                         <span className="text-zinc-600">나</span>
                                         <button onClick={() => handleDeleteFile(file.id)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <Trash2 size={14} />
                                         </button>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    )}
                </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
                {/* Hidden File Input for the Modal */}
                <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   multiple
                   onChange={handleFileChange} 
                />

                {/* File Tab Toolbar */}
                <div className="p-4 flex gap-3 border-b border-zinc-800">
                     <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="파일 검색"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#27272a] border border-zinc-700 text-zinc-200 text-sm rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:border-zinc-500"
                        />
                     </div>
                     <button 
                        onClick={() => setIsTextEditorMode(true)}
                        className="px-3 py-2 bg-[#27272a] border border-zinc-700 rounded-lg text-zinc-300 text-sm flex items-center gap-2 hover:bg-zinc-700 transition-colors"
                     >
                        <Plus size={14} /> 텍스트 추가
                     </button>
                     <button 
                        onClick={handleAddFileClick}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium text-sm rounded-lg flex items-center gap-2 transition-colors"
                     >
                        <Plus size={16} /> 파일 추가
                     </button>
                </div>

                {/* File List Table */}
                <div className="flex-1 overflow-y-auto">
                    {filteredFiles.filter(f => f.type !== 'link').length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 pb-20">
                            <p>동기화한 파일은 여기에 있습니다.</p>
                        </div>
                    ) : (
                        <div className="w-full pb-20">
                             {/* Table Header */}
                             <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase">
                                 <div className="col-span-1">출처</div>
                                 <div className="col-span-6">이름</div>
                                 <div className="col-span-3 text-right">날짜</div>
                                 <div className="col-span-2 text-right">옵션</div>
                             </div>
                             
                             {/* Table Body */}
                             <div>
                                 {filteredFiles.filter(f => f.type !== 'link').map(file => (
                                     <div key={file.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors items-center text-sm relative">
                                         <div className="col-span-1 text-zinc-400">
                                             {file.type === 'pdf' ? <FileText size={18} /> : <File size={18} />}
                                         </div>
                                         <div className="col-span-6 text-zinc-200 truncate font-medium">
                                             {file.name}
                                         </div>
                                         <div className="col-span-3 text-right text-zinc-500 text-xs">
                                             {new Date(file.addedAt).toLocaleDateString()}
                                         </div>
                                         <div className="col-span-2 flex justify-end relative">
                                             <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === file.id ? null : file.id);
                                                }}
                                                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                                             >
                                                <MoreVertical size={16} />
                                             </button>

                                             {/* Dropdown Menu */}
                                             {openMenuId === file.id && (
                                                <div ref={menuRef} className="absolute top-8 right-0 w-32 bg-[#18181b] border border-zinc-700 rounded-lg shadow-xl z-10 overflow-hidden">
                                                    <button 
                                                        onClick={() => {
                                                            setPreviewFile(file);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                                                    >
                                                        <Eye size={14} /> 보기
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDownloadFile(file)}
                                                        className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                                                    >
                                                        <Download size={14} /> 다운로드
                                                    </button>
                                                    <div className="h-px bg-zinc-700 my-1"></div>
                                                    <button 
                                                        onClick={() => handleDeleteFile(file.id)}
                                                        className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-zinc-800 hover:text-red-300 flex items-center gap-2"
                                                    >
                                                        <Trash2 size={14} /> 제거
                                                    </button>
                                                </div>
                                             )}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructions: string;
  onSave: (text: string, webSearch: boolean) => void;
  webSearchEnabled: boolean;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({
  isOpen,
  onClose,
  instructions,
  onSave,
  webSearchEnabled
}) => {
  const [text, setText] = useState(instructions);
  const [isWebSearch, setIsWebSearch] = useState(webSearchEnabled);

  useEffect(() => {
      if (isOpen) {
          setText(instructions);
          setIsWebSearch(webSearchEnabled);
      }
  }, [isOpen, instructions, webSearchEnabled]);

  if (!isOpen) return null;

  const handleSave = () => {
      onSave(text, isWebSearch);
      onClose();
  };

  return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#18181b] w-[600px] max-w-[95%] rounded-xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-100 font-semibold text-lg">
                      <FileText size={20} className="text-zinc-400" />
                      지시 사항 및 설정
                  </div>
                  <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                      <X size={20} />
                  </button>
              </div>
              
              <div className="p-6 space-y-6 bg-[#18181b]">
                  <div>
                       <label className="block text-sm font-medium text-zinc-400 mb-2">시스템 지침 (Persona)</label>
                       <textarea 
                           value={text}
                           onChange={(e) => setText(e.target.value)}
                           placeholder="AI가 어떻게 행동해야 하는지, 어떤 어조를 사용해야 하는지 지시하세요."
                           className="w-full h-48 bg-[#27272a] border border-zinc-700 rounded-lg p-4 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                       />
                       <p className="text-xs text-zinc-600 mt-2">이 지침은 모든 대화에 적용되어 일관된 답변을 유도합니다.</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#27272a] rounded-lg border border-zinc-700/50">
                      <div className="flex items-center gap-3">
                           <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                               <Globe size={20} />
                           </div>
                           <div>
                               <p className="text-zinc-200 font-medium text-sm">Google 검색 허용</p>
                               <p className="text-zinc-500 text-xs">최신 정보를 위해 웹 검색을 사용합니다.</p>
                           </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isWebSearch}
                          onChange={(e) => setIsWebSearch(e.target.checked)}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                      </label>
                  </div>
              </div>

              <div className="p-4 border-t border-zinc-800 flex justify-end gap-3 bg-[#1e1e21]">
                  <button 
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors"
                  >
                      취소
                  </button>
                  <button 
                      onClick={handleSave}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-cyan-900/20"
                  >
                      <Save size={16} /> 저장하기
                  </button>
              </div>
          </div>
      </div>
  );
};