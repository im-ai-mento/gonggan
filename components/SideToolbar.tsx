import React from 'react';
import { Home, Image as ImageIcon, MessageSquare, Settings, Box, Loader2, StickyNote } from 'lucide-react';

interface SideToolbarProps {
  activeTool: string | null;
  onSelectTool: (tool: string) => void;
  onGoHome: () => void;
  isChatLoading: boolean;
  isImageLoading: boolean;
}

export const SideToolbar: React.FC<SideToolbarProps> = ({ 
    activeTool, 
    onSelectTool, 
    onGoHome,
    isChatLoading,
    isImageLoading
}) => {
  return (
    <div className="w-14 bg-[#09090b] border-r border-zinc-800 flex flex-col items-center py-4 gap-4 z-30">
      {/* Home / Logo Area */}
      <button 
        onClick={onGoHome}
        className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center text-zinc-200 hover:text-white mb-4 shadow-lg hover:shadow-cyan-900/20 transition-all"
        title="홈"
      >
        <Box size={20} strokeWidth={2} />
      </button>

      <div className="w-8 h-px bg-zinc-800 mb-2"></div>

      {/* Tools */}
      <div className="flex flex-col gap-2 w-full px-2">
          <ToolButton 
             icon={<MessageSquare size={20} />} 
             label="채팅" 
             isActive={activeTool === 'CHAT'} 
             isLoading={isChatLoading}
             onClick={() => onSelectTool('CHAT')} 
          />
          <ToolButton 
             icon={<ImageIcon size={20} />} 
             label="이미지 스튜디오" 
             isActive={activeTool === 'IMAGE_STUDIO'} 
             isLoading={isImageLoading}
             onClick={() => onSelectTool('IMAGE_STUDIO')}
             activeColor="text-lime-400 bg-lime-400/10 border-lime-400/50"
          />
          <ToolButton 
             icon={<StickyNote size={20} />} 
             label="슈퍼 메모장" 
             isActive={activeTool === 'NOTEPAD'} 
             isLoading={false}
             onClick={() => onSelectTool('NOTEPAD')}
             activeColor="text-purple-400 bg-purple-400/10 border-purple-400/50"
          />
      </div>

      <div className="flex-1"></div>

      {/* Bottom Actions */}
      <ToolButton 
         icon={<Settings size={20} />} 
         label="설정" 
         isActive={activeTool === 'SETTINGS'} 
         isLoading={false}
         onClick={() => onSelectTool('SETTINGS')} 
      />
    </div>
  );
};

const ToolButton: React.FC<{ 
    icon: React.ReactNode, 
    label: string, 
    isActive: boolean, 
    isLoading: boolean,
    onClick: () => void,
    activeColor?: string
}> = ({ icon, label, isActive, isLoading, onClick, activeColor }) => {
    return (
        <button 
            onClick={onClick}
            className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative
                ${isActive 
                    ? (activeColor || 'text-cyan-400 bg-cyan-950/30 border border-cyan-900/50') 
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}
            `}
            title={label}
        >
            {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
            ) : (
                icon
            )}
            
            {/* Tooltip on hover */}
            <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-800 text-zinc-200 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-zinc-700">
                {label} {isLoading && "(작업 중...)"}
            </div>
        </button>
    );
}