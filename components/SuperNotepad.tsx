import React, { useState, useEffect } from 'react';
import { X, StickyNote, Plus, Download, FilePlus, Trash2, Calendar, Save, ArrowLeft, ArrowDownToLine, MessageSquarePlus, Sparkles } from 'lucide-react';
import { Note } from '../types';
import FileSaver from 'file-saver';

interface SuperNotepadProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onAddNote: (content: string) => void;
  onUpdateNote: (id: string, content: string) => void;
  onDeleteNote: (id: string) => void;
  onConvertNoteToSpaceFile: (note: Note) => void;
  initialContent?: string | null;
  onClearInitialContent: () => void;
  onAttachNoteToChat?: (content: string) => void; // New prop
}

type NotepadView = 'LIST' | 'EDITOR';

export const SuperNotepad: React.FC<SuperNotepadProps> = ({ 
    isOpen, 
    onClose, 
    notes,
    onAddNote,
    onUpdateNote,
    onDeleteNote,
    onConvertNoteToSpaceFile,
    initialContent,
    onClearInitialContent,
    onAttachNoteToChat
}) => {
  const [view, setView] = useState<NotepadView>(notes.length > 0 ? 'LIST' : 'EDITOR');
  const [inputText, setInputText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Sync view state with notes availability on mount or when notes change (only if empty)
  useEffect(() => {
      if (notes.length === 0 && view === 'LIST' && !initialContent) {
          setView('EDITOR');
      }
  }, [notes.length, initialContent]);

  // Handle Selection Mode Entry
  useEffect(() => {
      if (initialContent) {
          // Case: If there are NO existing notes, there is no choice to make.
          // Just append to the current draft directly and stay in Editor.
          if (notes.length === 0) {
             setInputText(prev => {
                 const separator = prev.trim() ? '\n\n' : '';
                 return prev + separator + initialContent;
             });
             setView('EDITOR');
             onClearInitialContent();
             return;
          }

          // Case: Notes exist. Enter Selection Mode (LIST view) to let user choose.
          setView('LIST');
          // Note: We do NOT clear inputText here. We keep it in the background 
          // in case user chooses "Create New Note", so we can append to their draft.
          setEditingNoteId(null);
      }
  }, [initialContent, notes.length]);

  const cleanText = (text: string) => {
      return text
          .replace(/###\s?/g, '')
          .replace(/\*\*/g, '')
          .trim();
  };

  const handleSave = () => {
      if (!inputText.trim()) return;

      const sanitizedContent = cleanText(inputText);

      if (editingNoteId) {
          onUpdateNote(editingNoteId, sanitizedContent);
      } else {
          onAddNote(sanitizedContent);
      }

      // Reset and go to list
      setInputText('');
      setEditingNoteId(null);
      onClearInitialContent(); // Ensure pending content is cleared
      setView('LIST');
  };

  const handleCancel = () => {
      // If we are cancelling a modification to an existing note, revert changes
      if (editingNoteId) {
          // Logic handled by just closing or checking isModified
      } 
      
      // If we were just drafting a new note and hit cancel... 
      // Current behavior: Clears text. 
      // But if we came from "Selection Mode Cancel", we might want different behavior?
      // For now, standard behavior:
      
      if (initialContent) {
          // If cancelling "Selection Mode" (pending content exists but not applied)
          onClearInitialContent();
          if (notes.length > 0) setView('LIST');
          else setView('EDITOR'); // Stay in editor if no notes, effectively cancelling the "add" action
          return;
      }

      // Normal Cancel
      setInputText('');
      setEditingNoteId(null);
      onClearInitialContent();
      
      if (notes.length > 0) {
          setView('LIST');
      } else {
          setView('EDITOR');
      }
  };

  const handleEditStart = (note: Note) => {
      // If in Selection Mode, Append instead of Edit
      if (initialContent) {
          handleAppendToExisting(note);
      } else {
          setEditingNoteId(note.id);
          setInputText(note.content);
          setView('EDITOR');
      }
  };

  // --- New Logic for Selection Mode ---

  const handleAppendToExisting = (note: Note) => {
      if (!initialContent) return;
      
      // 1. Combine Content
      const newText = `${note.content}\n\n${initialContent}`;
      
      // 2. DO NOT SAVE YET - Just open editor with new text
      
      // 3. Open in Editor
      setEditingNoteId(note.id);
      setInputText(newText);
      setView('EDITOR');
      
      // 4. Clear pending
      onClearInitialContent();
  };

  const handleCreateNewWithPending = () => {
      if (!initialContent) return;

      setEditingNoteId(null);
      
      // FIX: Append to existing draft text instead of overwriting
      setInputText(prev => {
          const separator = prev.trim() ? '\n\n' : '';
          return prev + separator + initialContent;
      });
      
      setView('EDITOR');
      
      // Clear pending immediately so we are now just "Writing a new note"
      onClearInitialContent();
  };

  const handleNewNoteStart = () => {
      if (initialContent) {
          handleCreateNewWithPending();
      } else {
          setEditingNoteId(null);
          setInputText('');
          setView('EDITOR');
      }
  };

  const handleDownload = (note: Note, e: React.MouseEvent) => {
      e.stopPropagation();
      const blob = new Blob([note.content], { type: 'text/plain;charset=utf-8' });
      const firstLine = note.content.split('\n')[0].slice(0, 20).replace(/[^a-z0-9가-힣]/gi, '_');
      FileSaver.saveAs(blob, `memo_${firstLine}.txt`);
  };

  const handleConvert = (note: Note, e: React.MouseEvent) => {
      e.stopPropagation();
      onConvertNoteToSpaceFile(note);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteNote(id);
  };
  
  const handleAttach = (note: Note, e: React.MouseEvent) => {
      e.stopPropagation();
      if (onAttachNoteToChat) {
          onAttachNoteToChat(note.content);
          onClose(); // Close notepad to show chat
      }
  };

  // Check if content is modified (to determine Cancel vs Back)
  const currentNote = editingNoteId ? notes.find(n => n.id === editingNoteId) : null;
  const isModified = editingNoteId 
      ? (currentNote && inputText !== currentNote.content) 
      : inputText.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div className={`w-[400px] xl:w-[25%] min-w-[320px] bg-[#101012] border-r border-zinc-800 flex flex-col h-full relative z-20 transition-all duration-300 shadow-2xl ${initialContent ? 'ring-2 ring-purple-500/50' : ''}`}>
      
      {/* Header */}
      <div className={`h-14 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 transition-colors ${initialContent ? 'bg-purple-900/20' : 'bg-[#101012]'}`}>
          <div className="flex items-center gap-2 text-zinc-100 font-bold">
              <span className={`w-6 h-6 rounded text-white flex items-center justify-center ${initialContent ? 'bg-purple-500 animate-pulse' : 'bg-purple-500'}`}>
                  {initialContent ? <MessageSquarePlus size={14} /> : <StickyNote size={14} strokeWidth={2.5} />}
              </span>
              {view === 'EDITOR' 
                ? (editingNoteId ? '메모 수정' : '새 메모 작성') 
                : (initialContent ? '추가할 메모 선택' : '슈퍼 메모장')
              }
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
              <X size={18} />
          </button>
      </div>

      {/* Selection Mode Banner */}
      {initialContent && view === 'LIST' && (
          <div className="bg-purple-500/10 border-b border-purple-500/20 p-3 px-4">
              <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">메모 추가 대기중</span>
                  <button onClick={onClearInitialContent} className="text-zinc-500 hover:text-white text-[10px] underline">취소</button>
              </div>
              <p className="text-zinc-300 text-sm line-clamp-2 italic border-l-2 border-purple-500 pl-2">
                  "{initialContent}"
              </p>
              <p className="text-zinc-500 text-xs mt-2 text-center">
                  아래 목록에서 메모를 선택하여 내용을 추가하거나<br/>하단 버튼으로 새 메모를 만드세요.
              </p>
          </div>
      )}

      <div className="flex-1 overflow-hidden relative">
          
          {/* VIEW: LIST */}
          {view === 'LIST' && (
              <div className="h-full flex flex-col animate-in slide-in-from-left duration-300">
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                      {notes.length === 0 && !initialContent && (
                           <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                               <p>작성된 메모가 없습니다.</p>
                           </div>
                      )}

                      {notes.map(note => (
                          <div 
                              key={note.id} 
                              onClick={() => handleEditStart(note)}
                              className={`
                                border rounded-xl p-4 group transition-all relative cursor-pointer
                                ${initialContent 
                                    ? 'bg-purple-900/10 border-purple-500/30 hover:bg-purple-900/30 hover:border-purple-400' 
                                    : 'bg-[#202023] border-zinc-800 hover:border-purple-500/50 hover:bg-[#252529]'}
                              `}
                          >
                              {initialContent && (
                                  <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 flex items-center justify-center backdrop-blur-[1px] rounded-xl transition-all z-10">
                                      <span className="bg-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-xl">
                                          <ArrowDownToLine size={14} /> 여기에 내용 추가
                                      </span>
                                  </div>
                              )}

                              <div className="text-zinc-300 text-sm font-medium leading-relaxed mb-3 line-clamp-4 whitespace-pre-wrap">
                                  {note.content}
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                                  <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                                      <Calendar size={10} />
                                      {note.createdAt.toLocaleString()}
                                  </span>
                                  
                                  {!initialContent && (
                                      <div className="flex items-center gap-1">
                                          <button 
                                              onClick={(e) => handleAttach(note, e)}
                                              className="p-1.5 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                              title="채팅 추가 질문으로 보내기"
                                          >
                                              <MessageSquarePlus size={14} />
                                          </button>
                                          <button 
                                              onClick={(e) => handleDownload(note, e)}
                                              className="p-1.5 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
                                              title=".txt로 저장"
                                          >
                                              <Download size={14} />
                                          </button>
                                          <button 
                                              onClick={(e) => handleConvert(note, e)}
                                              className="p-1.5 text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
                                              title="공간 파일로 추가"
                                          >
                                              <FilePlus size={14} />
                                          </button>
                                          <button 
                                              onClick={(e) => handleDelete(note.id, e)}
                                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                              title="삭제"
                                          >
                                              <Trash2 size={14} />
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
                  
                  {/* Floating Action Button for Add */}
                  <div className="p-4 border-t border-zinc-800 bg-[#101012]">
                      <button 
                          onClick={handleNewNoteStart}
                          className={`
                            w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all
                            ${initialContent 
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/20' 
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20'}
                          `}
                      >
                          {initialContent ? (
                              <>
                                <Sparkles size={18} /> ✨ 선택한 텍스트로 새 메모 만들기
                              </>
                          ) : (
                              <>
                                <Plus size={18} /> 새 메모 작성
                              </>
                          )}
                      </button>
                  </div>
              </div>
          )}

          {/* VIEW: EDITOR */}
          {view === 'EDITOR' && (
              <div className="h-full flex flex-col bg-[#161618] animate-in slide-in-from-bottom-10 duration-300">
                   <div className="flex-1 p-4">
                      <textarea 
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="여기에 메모를 입력하세요..."
                          className="w-full h-full bg-transparent border-none text-zinc-200 text-base focus:outline-none resize-none placeholder:text-zinc-600 custom-scrollbar leading-relaxed"
                          autoFocus
                      />
                   </div>
                   
                   <div className="p-4 border-t border-zinc-800 bg-[#101012] flex items-center justify-between gap-3">
                        <button 
                            onClick={handleCancel}
                            className={`flex-1 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${isModified ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                        >
                            {isModified ? <X size={16} /> : (notes.length > 0 ? <ArrowLeft size={16} /> : <X size={16} />)}
                            {isModified ? '취소' : (notes.length > 0 ? '목록으로' : '취소')}
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={!inputText.trim()}
                            className="flex-[2] py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white font-bold shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            {editingNoteId ? '수정 완료' : '메모 저장'}
                        </button>
                   </div>
              </div>
          )}
          
      </div>
    </div>
  );
};