import React, { useRef } from 'react';
import { Space, SpaceFile } from '../types';
import { X, FileText, Link as LinkIcon, Edit3, Plus, Search, File } from 'lucide-react';

interface ContextPanelProps {
  space: Space;
  isOpen: boolean;
  onClose: () => void;
  onUpdateInstructions: (text: string) => void;
  onAddFiles: (files: File[]) => void;
  onManageFiles: () => void;
  onManageLinks: () => void; // New prop
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ 
  space, 
  isOpen, 
  onClose,
  onUpdateInstructions,
  onAddFiles,
  onManageFiles,
  onManageLinks
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
      e.target.value = ''; // Reset
    }
  };

  return (
    <div className="w-80 h-full border-l border-zinc-800 bg-[#0c0c0e] flex flex-col shadow-xl z-20 absolute right-0 top-0 bottom-0 md:relative">
      
      {/* Hidden File Input (still kept if needed for other places, but mainly we use the modal now for the plus button) */}
      <input 
         type="file" 
         ref={fileInputRef} 
         className="hidden" 
         multiple
         onChange={handleFileChange} 
      />

      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-zinc-800/50">
        <div className="text-zinc-100 font-medium text-sm">
          맥락
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Instructions (지침) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">지침</span>
            <button className="text-zinc-500 hover:text-cyan-400">
              <Edit3 size={14} />
            </button>
          </div>
          <p className="text-zinc-600 text-xs leading-relaxed">
            {space.instructions ? space.instructions.slice(0, 100) + (space.instructions.length > 100 ? '...' : '') : "검색 결과의 형식, 범위 및 관련성을 추가하기 위한 지침을 추가하세요."}
          </p>
        </div>

        {/* Files (파일) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">
                파일 ({space.files.filter(f => f.type !== 'link').length})
            </span>
            <button 
                onClick={onManageFiles}
                className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div className="space-y-3">
            {space.files.filter(f => f.type !== 'link').map(file => (
              <div key={file.id} className="group flex items-center gap-3">
                <div className="text-zinc-500">
                  <File size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-400 truncate">{file.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Links (링크) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">
                링크
            </span>
            <button 
                onClick={onManageLinks}
                className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {space.files.filter(f => f.type === 'link').length > 0 ? (
             <div className="space-y-3">
                 {space.files.filter(f => f.type === 'link').map(file => (
                  <div key={file.id} className="group flex items-center gap-3">
                    <div className="text-zinc-500">
                      <LinkIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-400 truncate underline decoration-zinc-700">{file.name}</p>
                    </div>
                  </div>
                ))}
             </div>
          ) : (
             <p className="text-zinc-600 text-xs">모든 검색에서 출처로 사용할 URL을 추가하세요.</p>
          )}
        </div>

      </div>
    </div>
  );
};