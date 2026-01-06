import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { Space, SpaceFile, Message, MessageType, ContentType, Thread, GeneratedImage, Note } from '../types';

/**
 * Formats current date as YYYYMMDDHHmm
 */
const getFormattedDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}`;
};

/**
 * Exports a Space to a .gonggan (zip) file
 */
export const exportSpace = async (space: Space): Promise<void> => {
  const zip = new JSZip();
  // Sanitize title for filename
  const safeTitle = space.title.replace(/[^a-z0-9가-힣]/gi, '_');

  // 1. Create Metadata JSON
  const metadata = {
    id: space.id,
    title: space.title,
    description: space.description,
    lastActive: space.lastActive.toISOString(),
    isPrivate: space.isPrivate,
    instructions: space.instructions,
    webSearchEnabled: space.webSearchEnabled,
    version: "2.3" // Incremented version for notepad support
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // 2. Save Threads & Messages
  const threadsData = space.threads.map(thread => ({
      ...thread,
      lastMessageAt: thread.lastMessageAt.toISOString(),
      messages: thread.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString()
      }))
  }));
  zip.file('threads.json', JSON.stringify(threadsData, null, 2));

  // 3. Save Files (Context Files)
  const filesFolder = zip.folder('files');
  const fileManifest: any[] = [];

  if (filesFolder) {
    for (const file of space.files) {
      fileManifest.push({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        addedAt: file.addedAt.toISOString(),
        mimeType: file.mimeType,
        url: file.url,
        hasContent: !!file.base64Data
      });

      if (file.base64Data && file.type !== 'link') {
        filesFolder.file(file.name, file.base64Data, { base64: true });
      }
    }
  }
  zip.file('files_manifest.json', JSON.stringify(fileManifest, null, 2));

  // 4. Save Generated Images (Gallery)
  const imagesFolder = zip.folder('images');
  const galleryData: any[] = [];

  if (imagesFolder && space.generatedImages && space.generatedImages.length > 0) {
      for (const img of space.generatedImages) {
          let fileName = null;
          
          // Only save if completed and has data
          if (img.status === 'completed' && img.url && img.url.startsWith('data:image')) {
              fileName = `img_${img.id}.png`;
              const base64Data = img.url.split(',')[1]; // Remove header
              imagesFolder.file(fileName, base64Data, { base64: true });
          }

          galleryData.push({
              id: img.id,
              prompt: img.prompt,
              aspectRatio: img.aspectRatio,
              quality: img.quality,
              createdAt: img.createdAt.toISOString(),
              status: img.status,
              fileName: fileName 
          });
      }
  }
  zip.file('gallery.json', JSON.stringify(galleryData, null, 2));

  // 5. Save Notes (Super Notepad)
  const notesData = space.notes ? space.notes.map(note => ({
      ...note,
      createdAt: note.createdAt.toISOString()
  })) : [];
  zip.file('notes.json', JSON.stringify(notesData, null, 2));

  // 5.1 Save Individual Note Files (User readable) in a folder
  const notesFolder = zip.folder('notes');
  if (notesFolder && space.notes) {
      space.notes.forEach(note => {
          // Create safe filename from first line of content
          const firstLine = note.content.split('\n')[0].trim();
          const safeName = firstLine.slice(0, 20).replace(/[^a-z0-9가-힣\s]/gi, '').trim().replace(/\s+/g, '_') || 'memo';
          const fileName = `${safeName}_${note.id.slice(-4)}.txt`;
          notesFolder.file(fileName, note.content);
      });
  }

  // 6. Generate Zip
  const content = await zip.generateAsync({ type: 'blob' });
  const filename = `${safeTitle}_${getFormattedDate()}.gonggan`;
  
  FileSaver.saveAs(content, filename);
};

/**
 * Imports a .gonggan file and reconstructs the Space
 */
export const importSpace = async (file: File): Promise<Space> => {
  const zip = await JSZip.loadAsync(file);
  
  // 1. Read Metadata
  const metadataFile = zip.file('metadata.json');
  if (!metadataFile) throw new Error("Invalid Gonggan file: missing metadata");
  const metadataStr = await metadataFile.async('string');
  const metadata = JSON.parse(metadataStr);

  // 2. Read Threads
  const threadsFile = zip.file('threads.json');
  const messagesFile = zip.file('messages.json'); // Legacy support
  let threads: Thread[] = [];

  if (threadsFile) {
      const threadsStr = await threadsFile.async('string');
      const parsedThreads = JSON.parse(threadsStr);
      threads = parsedThreads.map((t: any) => ({
          ...t,
          lastMessageAt: new Date(t.lastMessageAt),
          messages: t.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
          }))
      }));
  } else if (messagesFile) {
      // Legacy Migration
      const messagesStr = await messagesFile.async('string');
      const parsedMessages = JSON.parse(messagesStr);
      const messages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
      }));
      
      if (messages.length > 0) {
          threads.push({
              id: 'legacy-thread',
              title: '이전 대화',
              lastMessageAt: messages[messages.length - 1].timestamp,
              messages: messages
          });
      }
  }

  // 3. Read Files
  const manifestFile = zip.file('files_manifest.json');
  const files: SpaceFile[] = [];
  
  if (manifestFile) {
    const manifestStr = await manifestFile.async('string');
    const manifest = JSON.parse(manifestStr);
    const filesFolder = zip.folder('files');

    for (const item of manifest) {
      let base64Data: string | undefined = undefined;

      if (item.hasContent && item.type !== 'link' && filesFolder) {
         const f = filesFolder.file(item.name);
         if (f) {
           base64Data = await f.async('base64');
         }
      }

      files.push({
        id: item.id || Date.now().toString() + Math.random(),
        name: item.name,
        type: item.type,
        size: item.size,
        addedAt: new Date(item.addedAt),
        mimeType: item.mimeType,
        url: item.url,
        base64Data: base64Data
      });
    }
  }

  // 4. Read Generated Images (Gallery)
  const galleryFile = zip.file('gallery.json');
  const generatedImages: GeneratedImage[] = [];
  
  if (galleryFile) {
      const galleryStr = await galleryFile.async('string');
      const galleryData = JSON.parse(galleryStr);
      const imagesFolder = zip.folder('images');

      for (const item of galleryData) {
          let fullUrl = '';
          
          if (item.fileName && imagesFolder) {
              const imgFile = imagesFolder.file(item.fileName);
              if (imgFile) {
                  const base64 = await imgFile.async('base64');
                  fullUrl = `data:image/png;base64,${base64}`;
              }
          }

          generatedImages.push({
              id: item.id,
              prompt: item.prompt,
              aspectRatio: item.aspectRatio,
              quality: item.quality,
              createdAt: new Date(item.createdAt),
              status: item.status,
              url: fullUrl
          });
      }
  }

  // 5. Read Notes (Super Notepad)
  const notesFile = zip.file('notes.json');
  let notes: Note[] = [];
  if (notesFile) {
      const notesStr = await notesFile.async('string');
      const parsedNotes = JSON.parse(notesStr);
      notes = parsedNotes.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
      }));
  }

  // 6. Construct Space Object
  return {
    id: Date.now().toString(),
    title: metadata.title,
    description: metadata.description,
    lastActive: new Date(),
    isPrivate: metadata.isPrivate,
    files: files,
    threads: threads,
    generatedImages: generatedImages,
    notes: notes, // Restore notes
    instructions: metadata.instructions || "",
    webSearchEnabled: metadata.webSearchEnabled ?? true
  };
};