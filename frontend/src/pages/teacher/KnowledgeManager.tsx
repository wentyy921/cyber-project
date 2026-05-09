import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit2, Trash2, Layers, BookOpen, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import BlockEditor from '../../components/teacher/BlockEditor';

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

const KnowledgeManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [isPublished, setIsPublished] = useState(1);
  const [fullWidth, setFullWidth] = useState(false);

  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const fetchCategories = async () => {
    const res = await api.get('/knowledge/categories');
    setCategories(res.data);
  };

  const fetchArticles = async (catId: number) => {
    const res = await api.get(`/knowledge/articles/all?category_id=${catId}`);
    setArticles(res.data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSelectCategory = (cat: Category) => {
    setSelectedCategory(cat);
    fetchArticles(cat.id);
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    await api.post('/knowledge/categories', { name: newCatName, description: newCatDesc });
    setShowCatModal(false);
    setNewCatName('');
    setNewCatDesc('');
    fetchCategories();
  };

  const handleCreateArticle = () => {
    if (!selectedCategory) return;
    setEditingArticle({ id: 0, category_id: selectedCategory.id, title: 'Новая статья', content: '', is_published: 1 });
    setArticleTitle('Новая статья');
    setArticleContent('');
    setIsPublished(1);
  };

  const handleEditArticle = (art: Article) => {
    setEditingArticle(art);
    setArticleTitle(art.title);
    setArticleContent(art.content);
    setIsPublished(art.is_published);
  };

  const handleSaveArticle = async () => {
    if (!editingArticle) return;
    const payload = {
      category_id: editingArticle.category_id,
      title: articleTitle,
      content: articleContent,
      is_published: isPublished
    };
    
    if (editingArticle.id === 0) {
      await api.post('/knowledge/articles', payload);
    } else {
      await api.put(`/knowledge/articles/${editingArticle.id}`, payload);
    }
    
    setEditingArticle(null);
    if (selectedCategory) fetchArticles(selectedCategory.id);
  };

  const handleDeleteArticle = async (id: number) => {
    if (!confirm('Удалить статью?')) return;
    await api.delete(`/knowledge/articles/${id}`);
    if (selectedCategory) fetchArticles(selectedCategory.id);
  };

  if (editingArticle) {
    return (
      <div className="animate-fade-in flex flex-col h-full relative">
        <div className="flex justify-between items-center mb-6 glass-panel p-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setEditingArticle(null)} className="p-2 glass-button text-gray-400">
              <ArrowLeft size={20} />
            </button>
            <input 
              type="text" 
              value={articleTitle} 
              onChange={e => setArticleTitle(e.target.value)} 
              className="text-xl font-bold bg-transparent text-white border-b border-indigo-500 focus:outline-none focus:border-indigo-400 px-2 py-1 w-64"
              placeholder="Заголовок статьи"
            />
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setFullWidth(!fullWidth)} className="glass-button px-4 py-2 text-sm text-gray-300">
              {fullWidth ? 'По центру' : 'На всю ширину'}
            </button>
            <button 
              onClick={() => setIsPublished(isPublished ? 0 : 1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-medium border ${isPublished ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
            >
              {isPublished ? <Eye size={18} /> : <EyeOff size={18} />}
              {isPublished ? 'Опубликовано' : 'Скрыто'}
            </button>
            <button onClick={handleSaveArticle} className="flex items-center gap-2 glass-button-primary px-6 py-2">
              <Save size={18} /> Сохранить
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto w-full flex justify-center pb-12">
          <div className={`w-full px-4 transition-all duration-300 ${fullWidth ? 'max-w-full editor-full-width' : 'max-w-4xl'}`}>
            <div className="glass-panel overflow-hidden">
              <BlockEditor 
                initialData={articleContent} 
                onChange={(data) => setArticleContent(JSON.stringify(data))} 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex gap-6 h-full">
      {/* Categories Sidebar */}
      <div className="w-1/3 glass-panel p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Layers size={20} className="text-indigo-400" /> Категории</h2>
          <button onClick={() => setShowCatModal(true)} className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors">
            <Plus size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {categories.length === 0 ? (
             <div className="text-center text-gray-400 mt-10">Нет категорий</div>
          ) : categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => handleSelectCategory(cat)}
              className={`w-full text-left p-4 rounded-xl transition-all ${selectedCategory?.id === cat.id ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300' : 'hover:bg-white/5 text-gray-300 border border-transparent'}`}
            >
              <div className="font-bold">{cat.name}</div>
              {cat.description && <div className="text-xs opacity-70 mt-1 truncate">{cat.description}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Area */}
      <div className="w-2/3 glass-panel p-6 flex flex-col">
        {!selectedCategory ? (
          <div className="flex-1 flex flex-col justify-center items-center text-gray-500">
            <BookOpen size={48} className="mb-4 opacity-50" />
            <p>Выберите категорию для просмотра статей</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedCategory.name}</h2>
                <p className="text-gray-400 text-sm">{selectedCategory.description}</p>
              </div>
              <button onClick={handleCreateArticle} className="flex items-center gap-2 px-4 py-2 glass-button-primary">
                <Plus size={18} /> Новая статья
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4">
              {articles.length === 0 ? (
                <div className="text-center text-gray-400 mt-10">В этой категории пока нет статей</div>
              ) : articles.map(art => (
                <div key={art.id} className="p-5 glass-card border border-white/5 flex justify-between items-center group">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">{art.title}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${art.is_published ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'}`}>
                        {art.is_published ? 'Опубликовано' : 'Скрыто'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditArticle(art)} className="p-2 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 rounded-lg">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDeleteArticle(art.id)} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showCatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Новая категория</h3>
            <input 
              type="text" 
              placeholder="Название категории" 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)} 
              className="w-full glass-input p-3 rounded-xl text-white mb-4"
            />
            <textarea 
              placeholder="Описание (опционально)" 
              value={newCatDesc} 
              onChange={e => setNewCatDesc(e.target.value)} 
              className="w-full glass-input p-3 rounded-xl text-white mb-6 resize-none"
              rows={3}
            />
            <div className="flex gap-4">
              <button onClick={() => setShowCatModal(false)} className="flex-1 glass-button py-2">Отмена</button>
              <button onClick={handleCreateCategory} className="flex-1 glass-button-primary py-2 disabled:opacity-50" disabled={!newCatName.trim()}>Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeManager;
