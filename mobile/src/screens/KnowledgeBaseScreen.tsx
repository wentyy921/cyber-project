import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { BookOpen, Search, ChevronRight } from 'lucide-react-native';

export default function KnowledgeBaseScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<number | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const fetchData = async () => {
    try {
      const [catRes, artRes] = await Promise.all([
        api.get('/knowledge/categories'),
        api.get('/knowledge/articles')
      ]);
      setCategories(catRes.data);
      setArticles(artRes.data);
      applyFilters(artRes.data, searchQuery, activeCategoryId);
    } catch (error) {
      console.error("Failed to fetch knowledge base", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [searchQuery, activeCategoryId]);

  const applyFilters = (allArticles: any[], query: string, categoryId: number | 'all') => {
    let filtered = allArticles;
    
    if (categoryId !== 'all') {
      filtered = filtered.filter(a => a.category_id === categoryId);
    }
    
    if (query) {
      const lower = query.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(lower) || 
        (a.category && a.category.toLowerCase().includes(lower))
      );
    }
    
    setFilteredArticles(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(articles, text, activeCategoryId);
  };

  const handleCategorySelect = (id: number | 'all') => {
    setActiveCategoryId(id);
    applyFilters(articles, searchQuery, id);
  };

  const renderCategory = (item: any | 'all') => {
    const isAll = item === 'all';
    const id = isAll ? 'all' : item.id;
    const name = isAll ? 'Все' : item.name;
    const isActive = activeCategoryId === id;
    
    return (
      <TouchableOpacity 
        key={id}
        style={[styles.categoryTab, isActive && styles.categoryTabActive]}
        onPress={() => handleCategorySelect(id)}
      >
        <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('Article', { articleId: item.id, title: item.title })}
    >
      <View style={styles.iconContainer}>
        <BookOpen color="#6366f1" size={24} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.articleTitle}>{item.title}</Text>
        <Text style={styles.articleCategory}>{item.category || 'Без категории'}</Text>
      </View>
      <ChevronRight color="#475569" size={20} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>База Знаний</Text>
      <Text style={styles.subHeader}>Дополнительные материалы, руководства и ответы на частые вопросы.</Text>
      
      <View style={styles.searchContainer}>
        <Search color="#94a3b8" size={20} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Поиск по статьям..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {renderCategory('all')}
          {categories.map(c => renderCategory(c))}
        </ScrollView>
      </View>
      
      {isLoading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredArticles}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Статьи не найдены.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  subHeader: {
    fontSize: 14,
    color: '#94a3b8',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    marginLeft: 10,
    fontSize: 16,
  },
  categoriesContainer: {
    height: 40,
    marginBottom: 16,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
  },
  categoryTabActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  categoryTabText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTabTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  articleCategory: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 40,
  }
});
