import React, { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Download, Loader2, Sparkles, AlertCircle, ZoomIn, ZoomOut, Move, Import, Trash2, Copy, FileInput } from 'lucide-react';
import { GeneratedImage } from '../types';
import FileSaver from 'file-saver';

interface ImageStudioProps {
  isOpen: boolean;
  onClose: () => void;
  images: GeneratedImage[];
  onViewFullScreen?: () => void;
  onDeleteImage?: (id: string) => void;
  onImportImage?: (img: GeneratedImage) => void;
  onCopyPrompt?: (prompt: string) => void;
}

export const ImageStudio: React.FC<ImageStudioProps> = ({ 
    isOpen, 
    onClose, 
    images, 
    onViewFullScreen,
    onDeleteImage,
    onImportImage,
    onCopyPrompt
}) => {
  const [fullScreenImage, setFullScreenImage] = useState<GeneratedImage | null>(null);
  
  // Zoom & Pan State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              if (fullScreenImage) setFullScreenImage(null);
          }
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
  }, [fullScreenImage]);

  // Reset zoom/pan when opening a new image
  useEffect(() => {
      if (fullScreenImage) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
      }
  }, [fullScreenImage]);

  const handleDownload = (img: GeneratedImage, e: React.MouseEvent) => {
      e.stopPropagation();
      if (img.status === 'completed' && img.url) {
        FileSaver.saveAs(img.url, `gonggan-image-${img.id}.png`);
      }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Delete requested for:', id); // Debug
      onDeleteImage?.(id);
  };

  const handleImport = (img: GeneratedImage, e: React.MouseEvent) => {
      e.stopPropagation();
      onImportImage?.(img);
  };

  const handleCopy = (prompt: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onCopyPrompt?.(prompt);
  };

  // --- Zoom & Pan Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      // Calculate new zoom level
      const zoomSensitivity = 0.001;
      // Subtract deltaY to make scrolling up zoom in
      const delta = -e.deltaY * zoomSensitivity * 2; 
      const newZoom = Math.min(Math.max(0.1, zoom + delta), 5); // Limit zoom between 0.1x and 5x
      
      setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      hasMoved.current = false;
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
          e.preventDefault();
          const dx = e.clientX - dragStart.current.x;
          const dy = e.clientY - dragStart.current.y;
          // Threshold to detect actual drag vs slightly moving click
          if (Math.abs(dx - pan.x) > 2 || Math.abs(dy - pan.y) > 2) {
             hasMoved.current = true;
          }
          setPan({ x: dx, y: dy });
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  const handleFullScreenOpen = (img: GeneratedImage) => {
      setFullScreenImage(img);
      onViewFullScreen?.();
  };

  if (!isOpen) return null;

  return (
    <div className="w-[400px] xl:w-[25%] min-w-[320px] bg-[#101012] border-r border-zinc-800 flex flex-col h-full relative z-20 transition-all duration-300 shadow-2xl">
      
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-[#101012]">
          <div className="flex items-center gap-2 text-zinc-100 font-bold">
              <span className="w-6 h-6 rounded bg-lime-400 text-black flex items-center justify-center">
                  <ImageIcon size={14} strokeWidth={2.5} />
              </span>
              이미지 스튜디오
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
              <X size={18} />
          </button>
      </div>

      {/* Gallery (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {images.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-6">
                  <div className="w-24 h-24 rounded-full bg-zinc-900 border-2 border-dashed border-zinc-800 flex items-center justify-center">
                      <ImageIcon size={32} className="opacity-30" />
                  </div>
                  <div className="text-center px-6">
                      <p className="text-zinc-400 font-medium mb-1">이미지 갤러리</p>
                      <p className="text-xs text-zinc-600 leading-relaxed">
                          스레드 채팅창에서 프롬프트를 입력하여<br/>
                          새로운 이미지를 생성해보세요.
                      </p>
                  </div>
              </div>
          ) : (
              <div className="grid grid-cols-2 gap-3">
                  {images.map(img => (
                      <div 
                        key={img.id} 
                        className="group relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-black"
                      >
                          {/* 1. Clickable Layer for Full Screen (Behind buttons) */}
                          <div 
                             className="absolute inset-0 z-0 cursor-pointer"
                             onClick={() => img.status === 'completed' && handleFullScreenOpen(img)}
                          />

                          {/* 2. Content Layer */}
                          <div className="absolute inset-0 pointer-events-none">
                              {img.status === 'completed' ? (
                                 <img src={img.url} alt={img.prompt} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                              ) : img.status === 'failed' ? (
                                 <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/50">
                                     <AlertCircle className="text-red-500 mb-2" size={24} />
                                     <span className="text-xs text-zinc-500">Failed</span>
                                 </div>
                              ) : (
                                 // Generating State
                                 <div className="w-full h-full bg-zinc-900 flex flex-col relative">
                                     <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                                         <Sparkles size={10} className="text-lime-400" />
                                         <span className="text-[10px] text-lime-400 font-semibold tracking-wide">Generating...</span>
                                     </div>
                                     <div className="flex-1 flex items-center justify-center">
                                          {/* Bouncing Dots Animation */}
                                          <div className="flex space-x-1.5">
                                              <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                              <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                              <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce"></div>
                                          </div>
                                     </div>
                                 </div>
                              )}
                          </div>

                          {/* 3. Interaction Overlay (Top Layer) */}
                          <div className="absolute inset-0 z-10 pointer-events-none">
                              {/* Failed Image Delete Overlay */}
                              {img.status === 'failed' && (
                                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-auto">
                                     <button 
                                         type="button"
                                         onClick={(e) => handleDelete(img.id, e)}
                                         className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full transition-colors backdrop-blur-sm cursor-pointer"
                                         title="삭제"
                                     >
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                              )}

                              {/* Completed Image Actions Overlay */}
                              {img.status === 'completed' && (
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                    {/* Top Actions */}
                                    <div className="flex justify-end pointer-events-auto">
                                        <button 
                                            type="button"
                                            onClick={(e) => handleImport(img, e)}
                                            className="bg-black/50 hover:bg-zinc-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1 backdrop-blur-sm transition-colors border border-white/10"
                                        >
                                            <FileInput size={12} /> Import
                                        </button>
                                    </div>
                                    
                                    {/* Bottom Actions */}
                                    <div className="pointer-events-auto">
                                        <p className="text-[10px] text-zinc-300 line-clamp-2 mb-2 select-none">{img.prompt}</p>
                                        <div className="flex items-center gap-1">
                                            <button 
                                                type="button"
                                                onClick={(e) => handleCopy(img.prompt, e)}
                                                className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs backdrop-blur-sm flex items-center justify-center transition-colors"
                                                title="프롬프트 복사"
                                            >
                                                <Copy size={12} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleDownload(img, e)}
                                                className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs backdrop-blur-sm flex items-center justify-center transition-colors"
                                                title="다운로드"
                                            >
                                                <Download size={12} />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleDelete(img.id, e)}
                                                className="py-1.5 px-2 bg-white/10 hover:bg-red-500/50 text-white rounded text-xs backdrop-blur-sm flex items-center justify-center transition-colors hover:text-red-200 z-50"
                                                title="삭제"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Full Screen Modal */}
      {/* Changed z-index from z-[60] to z-[100] to ensure it covers ContextPanel (z-20) */}
      {fullScreenImage && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center overflow-hidden" 
            onWheel={handleWheel}
            onClick={() => {
                // Close only if not dragged
                if (!hasMoved.current) setFullScreenImage(null);
            }}
          >
              {/* Close Button */}
              <button 
                  onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
                  className="absolute top-6 right-6 z-[110] w-12 h-12 rounded-full bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700 flex items-center justify-center backdrop-blur-md transition-colors"
              >
                  <X size={24} />
              </button>

              {/* Viewport for Image (Handles Drag/Zoom) */}
              <div 
                 className={`w-full h-full flex items-center justify-center ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                 onMouseDown={handleMouseDown}
                 onMouseMove={handleMouseMove}
                 onMouseUp={handleMouseUp}
                 onMouseLeave={handleMouseUp}
              >
                  <img 
                    src={fullScreenImage.url} 
                    alt={fullScreenImage.prompt} 
                    draggable={false}
                    className="max-w-none transition-transform duration-75 ease-linear select-none"
                    onClick={(e) => e.stopPropagation()} 
                    style={{ 
                        // Apply pan translation first (independent of zoom for natural dragging), then zoom
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        maxHeight: '85vh',
                        maxWidth: '85vw',
                        objectFit: 'contain'
                    }} 
                  />
              </div>

              {/* Controls Overlay */}
              <div 
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[110] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="flex items-center gap-4 bg-zinc-900/80 px-6 py-3 rounded-full border border-zinc-800 backdrop-blur shadow-2xl">
                      <p className="text-sm text-zinc-300 max-w-xs md:max-w-md truncate select-none">{fullScreenImage.prompt}</p>
                      <div className="h-4 w-px bg-zinc-700"></div>
                      <span className="text-xs text-zinc-500 font-mono select-none">{fullScreenImage.aspectRatio} · {fullScreenImage.quality}</span>
                      <button 
                        onClick={(e) => handleDownload(fullScreenImage, e)}
                        className="ml-2 text-zinc-400 hover:text-white transition-colors"
                        title="다운로드"
                      >
                          <Download size={18} />
                      </button>
                  </div>

                  {/* Zoom Controls Indicator */}
                  <div className="flex items-center gap-4 bg-black/50 px-4 py-2 rounded-full border border-white/10 backdrop-blur text-xs text-zinc-400">
                      <button onClick={(e) => { e.stopPropagation(); setZoom(Math.max(0.1, zoom - 0.2)); }} className="hover:text-white p-1"><ZoomOut size={14} /></button>
                      <span className="font-mono min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                      <button onClick={(e) => { e.stopPropagation(); setZoom(Math.min(5, zoom + 0.2)); }} className="hover:text-white p-1"><ZoomIn size={14} /></button>
                      <div className="w-px h-3 bg-white/20 mx-1"></div>
                      <span className="flex items-center gap-1"><Move size={12}/> Drag to pan</span>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};