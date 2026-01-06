import React from 'react';
import { Space } from '../types';
import { Lock, Clock, Plus, Folder, FolderInput, Loader2 } from 'lucide-react';

interface SpaceListProps {
  spaces: Space[];
  onSelectSpace: (spaceId: string) => void;
  onCreateSpace: () => void;
  onLoadSpace: () => void;
  isLoading: boolean;
}

export const SpaceList: React.FC<SpaceListProps> = ({ spaces, onSelectSpace, onCreateSpace, onLoadSpace, isLoading }) => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">내 공간</h1>
        <div className="flex gap-3">
            <button 
                 onClick={onLoadSpace}
                 disabled={isLoading}
                 className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
                 {isLoading ? <Loader2 size={18} className="animate-spin" /> : <FolderInput size={18} />}
                 공간 불러오기
            </button>
            <button 
            onClick={onCreateSpace}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
            <Plus size={18} />
            새로운 공간
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {spaces.map((space) => (
          <div 
            key={space.id}
            onClick={() => onSelectSpace(space.id)}
            className="group bg-[#18181b] border border-zinc-800 hover:border-zinc-600 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-900/10"
          >
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-500 group-hover:text-cyan-400 group-hover:bg-zinc-700 transition-colors">
              <Folder size={24} />
            </div>
            
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">{space.title}</h3>
            
            <div className="flex items-center gap-4 text-xs text-zinc-500 mt-4">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(space.lastActive).toLocaleDateString()}
              </span>
              {space.isPrivate && (
                <span className="flex items-center gap-1">
                  <Lock size={12} />
                  비공개
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};