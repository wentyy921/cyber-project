import React, { createContext, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy } from 'lucide-react';

interface TrophyItem {
  id: string;
  title: string;
  description: string;
  image: string;
}

export const TROPHIES: Record<string, TrophyItem> = {
  first_step: {
    id: 'first_step',
    title: 'Первый шаг',
    description: 'Изучена первая лекция',
    image: '/assets/trophies/first_step.png'
  },
  perfect_score: {
    id: 'perfect_score',
    title: 'Идеальный балл',
    description: 'Набрано 100% в экзамене',
    image: '/assets/trophies/perfect_score.png'
  },
  fast_learner: {
    id: 'fast_learner',
    title: 'Быстрый ум',
    description: 'Экзамен сдан быстро и без нарушений',
    image: '/assets/trophies/fast_learner.png'
  }
};

interface TrophyContextType {
  unlockedTrophies: string[];
  unlockTrophy: (id: string) => void;
}

const TrophyContext = createContext<TrophyContextType | undefined>(undefined);

export const TrophyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unlockedTrophies, setUnlockedTrophies] = useState<string[]>([]);
  const [activeToast, setActiveToast] = useState<TrophyItem | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lms_trophies');
    if (saved) {
      try {
        setUnlockedTrophies(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing trophies", e);
      }
    }
  }, []);

  const unlockTrophy = (id: string) => {
    if (unlockedTrophies.includes(id)) return; // Already unlocked

    const newTrophies = [...unlockedTrophies, id];
    setUnlockedTrophies(newTrophies);
    localStorage.setItem('lms_trophies', JSON.stringify(newTrophies));

    // Show toast
    if (TROPHIES[id]) {
      setActiveToast(TROPHIES[id]);
      setTimeout(() => {
        setActiveToast(null);
      }, 5000);
    }
  };

  return (
    <TrophyContext.Provider value={{ unlockedTrophies, unlockTrophy }}>
      {children}
      
      {/* Toast Notification Portal */}
      {activeToast && createPortal(
        <div className="fixed bottom-6 right-6 z-[100] animate-slide-up bg-gray-900 border border-gray-700 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-500 blur-md opacity-50 rounded-full animate-pulse" />
            <img src={activeToast.image} alt="Trophy" className="w-16 h-16 rounded-full border-2 border-yellow-500/50 object-cover relative z-10" />
          </div>
          <div>
            <div className="text-xs text-yellow-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Trophy size={12} />
              Достижение разблокировано
            </div>
            <h4 className="text-lg font-bold">{activeToast.title}</h4>
            <p className="text-sm text-gray-400">{activeToast.description}</p>
          </div>
        </div>,
        document.body
      )}
    </TrophyContext.Provider>
  );
};

export const useTrophies = () => {
  const context = useContext(TrophyContext);
  if (context === undefined) {
    throw new Error('useTrophies must be used within a TrophyProvider');
  }
  return context;
};
