import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Layers, BookOpen, ChevronRight, Search, ArrowLeft } from 'lucide-react';
import BlockRenderer from '../../components/BlockRenderer';

interface Category {
  id: number;
  name: string;
  description: string;
}

interface Article {
  id: number;
  category_id: number;
  title: string;
  content: string;
  is_published: number;
}

const KnowledgeBase = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
    // Fetch all published articles to allow global search, or just fetch per category.
    // For simplicity, we'll fetch categories first.
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/knowledge/categories');
      setCategories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchArticles = async (catId: number) => {
    try {
      const res = await api.get(`/knowledge/articles?category_id=${catId}`);
      setArticles(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    fetchArticles(cat.id);
    setSelectedArticle(null);
  };

  if (selectedArticle) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in pb-12">
        <button 
          onClick={() => setSelectedArticle(null)}
          className="inline-flex items-center text-indigo-400 hover:text-indigo-300 mb-6 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" />
          Назад к списку статей
        </button>
        
        <div className="glass-panel overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600/30 to-purple-600/30 p-8 border-b border-white/10">
            <div className="text-indigo-300 text-sm font-semibold mb-2 uppercase tracking-wider">
              {selectedCategory?.name}
            </div>
            <h1 className="text-3xl font-bold text-white">{selectedArticle.title}</h1>
          </div>
          <div className="p-8">
            <BlockRenderer data={selectedArticle.content} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-12">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="text-indigo-400" /> База знаний
          </h1>
          <p className="text-gray-400 mt-2">Дополнительные материалы, руководства и ответы на частые вопросы.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Поиск по статьям..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Categories Sidebar */}
        <div className="md:col-span-4 space-y-4">
          <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2 mb-4">
            <Layers size={18} /> Категории
          </h2>
          {categories.length === 0 ? (
            <div className="text-gray-500">Нет доступных категорий</div>
          ) : categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleSelectCategory(cat)}
              className={`w-full text-left p-4 rounded-xl transition-all ${selectedCategory?.id === cat.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'glass-panel hover:bg-white/10 text-gray-300'}`}
            >
              <div className="font-bold">{cat.name}</div>
              {cat.description && <div className={`text-sm mt-1 truncate ${selectedCategory?.id === cat.id ? 'text-indigo-200' : 'text-gray-500'}`}>{cat.description}</div>}
            </button>
          ))}
        </div>

        {/* Articles List */}
        <div className="md:col-span-8">
          {!selectedCategory ? (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-center">
              <BookOpen size={48} className="text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-gray-400">Выберите категорию</h3>
              <p className="text-gray-500 mt-2">Чтобы увидеть список доступных статей, выберите один из разделов слева.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                Статьи: {selectedCategory.name}
              </h2>
              {articles.length === 0 ? (
                <div className="text-gray-500 text-center py-8">В этом разделе пока нет материалов</div>
              ) : (
                articles
                  .filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(art => (
                  <button 
                    key={art.id}
                    onClick={() => setSelectedArticle(art)}
                    className="w-full text-left p-5 glass-panel hover:bg-white/10 hover:-translate-y-1 transition-all group flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors">{art.title}</h3>
                    </div>
                    <ChevronRight className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
