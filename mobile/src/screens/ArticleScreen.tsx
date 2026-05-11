import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import api from '../services/api';
import BlockRenderer from '../components/BlockRenderer';

export default function ArticleScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { articleId, title } = route.params;

  const [article, setArticle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await api.get(`/knowledge/articles/${articleId}`);
        setArticle(res.data);
      } catch (e) {
        console.error("Failed to fetch article", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticle();
  }, [articleId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color="#f8fafc" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.title}>{article?.title}</Text>
          <Text style={styles.category}>{article?.category}</Text>
          
          <BlockRenderer content={article?.content} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  category: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
  }
});
