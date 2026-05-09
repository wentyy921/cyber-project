import React, { useEffect, useRef } from 'react';
import EditorJS from '@editorjs/editorjs';
import api from '../../services/api';
// @ts-ignore
import Header from '@editorjs/header';
// @ts-ignore
import ImageTool from '@editorjs/image';
// @ts-ignore
import List from '@editorjs/list';
// @ts-ignore
import Embed from '@editorjs/embed';
// @ts-ignore
import CodeTool from '@editorjs/code';
// @ts-ignore
import Quote from '@editorjs/quote';
// @ts-ignore
import InlineCode from '@editorjs/inline-code';
// @ts-ignore
import DragDrop from 'editorjs-drag-drop';

interface BlockEditorProps {
  initialData: string | object;
  onChange: (data: any) => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ initialData, onChange }) => {
  const editorRef = useRef<EditorJS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current && containerRef.current) {
      let parsedData = { blocks: [] };
      if (initialData) {
        try {
          parsedData = typeof initialData === 'string' ? JSON.parse(initialData) : initialData;
        } catch (e) {
          console.error("Failed to parse initial data for editor", e);
        }
      }

      const editor = new EditorJS({
        holder: containerRef.current,
        data: parsedData,
        placeholder: "Нажмите '+' слева или просто начните печатать...",
        tools: {
          header: {
            class: Header,
            inlineToolbar: true,
            config: {
              placeholder: 'Заголовок',
              levels: [2, 3, 4],
              defaultLevel: 2
            }
          },
          list: {
            class: List,
            inlineToolbar: true,
          },
          image: {
            class: ImageTool,
            config: {
              uploader: {
                uploadByFile(file: File) {
                  const formData = new FormData();
                  formData.append('image', file);
                  // using the api instance automatically attaches the correct token headers
                  return api.post('/teacher/upload_image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                  }).then(response => {
                    return {
                      success: 1,
                      file: { url: response.data.file.url }
                    };
                  }).catch(err => {
                    console.error('Image upload failed', err);
                    return { success: 0 };
                  });
                }
              }
            }
          },
          embed: {
            class: Embed,
            config: {
              services: {
                youtube: true,
                vimeo: true
              }
            }
          },
          code: CodeTool,
          quote: Quote,
          inlineCode: InlineCode
        },
        onChange: async () => {
          if (editorRef.current) {
            try {
              const data = await editorRef.current.save();
              onChange(data);
            } catch (e) {
              console.error("Saving failed: ", e);
            }
          }
        },
        onReady: () => {
          new DragDrop(editor);
        }
      });

      editorRef.current = editor;
    }

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []); // Run only once

  return (
    <div className="glass-panel overflow-hidden p-6 shadow-inner">
      <div 
        ref={containerRef} 
        className="prose prose-indigo prose-invert max-w-none min-h-[400px] cursor-text"
      />
    </div>
  );
};

export default BlockEditor;
