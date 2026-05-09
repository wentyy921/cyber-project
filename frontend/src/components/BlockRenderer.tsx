import React from 'react';

interface BlockRendererProps {
  data: string;
}

const BlockRenderer: React.FC<BlockRendererProps> = ({ data }) => {
  if (!data) return <p>Контент отсутствует.</p>;

  let parsedData;
  try {
    parsedData = JSON.parse(data);
  } catch (e) {
    // If it's not JSON, it's probably old HTML content
    return (
      <div 
        className="prose prose-indigo max-w-none text-gray-300 leading-relaxed" 
        dangerouslySetInnerHTML={{ __html: data }} 
      />
    );
  }

  if (!parsedData || !parsedData.blocks || !Array.isArray(parsedData.blocks)) {
    return <p>Неверный формат контента.</p>;
  }

  const renderBlock = (block: any, index: number) => {
    switch (block.type) {
      case 'header':
        const HeaderTag = `h${block.data.level}` as any;
        return (
          <HeaderTag 
            key={index} 
            className="font-bold text-white mt-8 mb-4"
            dangerouslySetInnerHTML={{ __html: block.data.text }}
          />
        );
        
      case 'paragraph':
        return (
          <p 
            key={index} 
            className="text-gray-300 leading-relaxed mb-4 text-lg"
            dangerouslySetInnerHTML={{ __html: block.data.text }}
          />
        );
        
      case 'list':
        const ListTag = block.data.style === 'ordered' ? 'ol' : 'ul';
        const listClasses = block.data.style === 'ordered' 
          ? "list-decimal list-inside space-y-2 mb-6 text-gray-300 text-lg"
          : "list-disc list-inside space-y-2 mb-6 text-gray-300 text-lg";
        
        return (
          <ListTag key={index} className={listClasses}>
            {block.data.items.map((item: string, i: number) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ListTag>
        );
        
      case 'image':
        return (
          <figure key={index} className="my-8">
            <img 
              src={block.data.file.url} 
              alt={block.data.caption || 'Иллюстрация лекции'} 
              className={`rounded-2xl shadow-md max-w-full h-auto mx-auto ${block.data.withBorder ? 'border-2 border-gray-200 dark:border-gray-700' : ''}`}
            />
            {block.data.caption && (
              <figcaption className="text-center text-sm text-gray-500 mt-3" dangerouslySetInnerHTML={{ __html: block.data.caption }} />
            )}
          </figure>
        );
        
      case 'code':
        return (
          <div key={index} className="my-6 relative group">
            <div className="absolute top-0 right-0 bg-gray-800 text-xs text-gray-400 px-3 py-1 rounded-bl-lg rounded-tr-xl font-mono">
              code
            </div>
            <pre className="bg-gray-900 text-gray-100 p-5 rounded-xl overflow-x-auto font-mono text-sm shadow-inner border border-gray-800">
              <code>{block.data.code}</code>
            </pre>
          </div>
        );
        
      case 'quote':
        return (
          <blockquote key={index} className="border-l-4 border-indigo-500 bg-indigo-500/10 p-6 rounded-r-xl my-6">
            <p className="text-xl italic text-gray-200" dangerouslySetInnerHTML={{ __html: block.data.text }} />
            {block.data.caption && (
              <footer className="text-indigo-600 dark:text-indigo-400 font-semibold mt-3">— <span dangerouslySetInnerHTML={{ __html: block.data.caption }} /></footer>
            )}
          </blockquote>
        );
        
      case 'embed':
        return (
          <div key={index} className="my-8 rounded-2xl overflow-hidden shadow-lg bg-white/5">
            <div className="aspect-w-16 aspect-h-9 relative" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={block.data.embed}
                className="absolute top-0 left-0 w-full h-full"
                allowFullScreen
                frameBorder="0"
                title="Embedded Content"
              ></iframe>
            </div>
            {block.data.caption && (
              <p className="text-center text-sm text-gray-500 py-3 bg-white dark:bg-gray-900" dangerouslySetInnerHTML={{ __html: block.data.caption }} />
            )}
          </div>
        );

      default:
        console.warn('Unknown block type:', block.type);
        return null;
    }
  };

  return (
    <div className="lecture-content">
      {parsedData.blocks.map((block: any, index: number) => renderBlock(block, index))}
    </div>
  );
};

export default BlockRenderer;
