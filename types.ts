
export enum MessageType {
  USER = 'USER',
  AI = 'AI',
}

export enum ContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
}

export interface Message {
  id: string;
  type: MessageType;
  contentType: ContentType;
  content: string; // Text content or Base64 Image URL
  timestamp: Date;
  isStreaming?: boolean;
}

export interface Thread {
  id: string;
  title: string;
  lastMessageAt: Date;
  messages: Message[];
}

export interface SpaceFile {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'image' | 'txt' | 'link';
  size?: string;
  url?: string; // For links
  addedAt: Date;
  base64Data?: string;
  mimeType?: string;
}

export interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    aspectRatio: string;
    quality: string;
    createdAt: Date;
    status: 'generating' | 'completed' | 'failed';
}

export interface Note {
    id: string;
    content: string;
    createdAt: Date;
}

// New type for temporary reference images in Image Studio input
export interface InputReferenceImage {
    id: string;
    file: File;
    previewUrl: string;
}

export interface Space {
  id: string;
  title: string;
  description: string;
  lastActive: Date;
  isPrivate: boolean;
  files: SpaceFile[];
  threads: Thread[]; // Changed from messages to threads
  generatedImages: GeneratedImage[]; // New field to persist gallery images
  notes: Note[]; // New field for Super Notepad
  instructions: string;
  webSearchEnabled: boolean;
}

export type ViewMode = 'LIST' | 'DETAIL';