import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface TrophyItem {
  id: string;
  title: string;
  description: string;
  image: string; // Since we don't have local assets synced, we'll just use icons/text in UI, or a placeholder
}

export const TROPHIES: Record<string, TrophyItem> = {
  first_step: {
    id: 'first_step',
    title: 'Первый шаг',
    description: 'Изучена первая лекция',
    image: 'first_step'
  },
  perfect_score: {
    id: 'perfect_score',
    title: 'Идеальный балл',
    description: 'Набрано 100% в экзамене',
    image: 'perfect_score'
  },
  fast_learner: {
    id: 'fast_learner',
    title: 'Быстрый ум',
    description: 'Экзамен сдан быстро и без нарушений',
    image: 'fast_learner'
  }
};

interface TrophyContextType {
  unlockedTrophies: string[];
  unlockTrophy: (id: string) => void;
}

const TrophyContext = createContext<TrophyContextType | undefined>(undefined);

export const TrophyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unlockedTrophies, setUnlockedTrophies] = useState<string[]>([]);

  useEffect(() => {
    const loadTrophies = async () => {
      try {
        const saved = await SecureStore.getItemAsync('lms_trophies');
        if (saved) {
          setUnlockedTrophies(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Error loading trophies", e);
      }
    };
    loadTrophies();
  }, []);

  const unlockTrophy = async (id: string) => {
    if (unlockedTrophies.includes(id)) return; // Already unlocked

    const newTrophies = [...unlockedTrophies, id];
    setUnlockedTrophies(newTrophies);
    try {
      await SecureStore.setItemAsync('lms_trophies', JSON.stringify(newTrophies));
      // In a real app, we might trigger a toast/alert here
    } catch (e) {
      console.error("Error saving trophies", e);
    }
  };

  return (
    <TrophyContext.Provider value={{ unlockedTrophies, unlockTrophy }}>
      {children}
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
