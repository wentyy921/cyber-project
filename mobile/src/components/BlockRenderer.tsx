import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';

export default function BlockRenderer({ content }: { content: string }) {
  if (!content) return null;

  let parsedData;
  try {
    parsedData = JSON.parse(content);
  } catch (e) {
    return <Text style={styles.paragraph}>{content}</Text>;
  }

  if (!parsedData || !parsedData.blocks) return null;

  return (
    <View style={styles.container}>
      {parsedData.blocks.map((block: any, index: number) => {
        switch (block.type) {
          case 'header':
            const fontSize = block.data.level === 1 ? 26 : block.data.level === 2 ? 22 : 18;
            return (
              <Text key={index} style={[styles.header, { fontSize }]}>
                {block.data.text.replace(/&nbsp;/g, ' ')}
              </Text>
            );
          
          case 'paragraph':
            // Simple strip HTML tags for mobile
            const cleanText = block.data.text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
            return <Text key={index} style={styles.paragraph}>{cleanText}</Text>;
            
          case 'list':
            return (
              <View key={index} style={styles.listContainer}>
                {block.data.items.map((item: string, i: number) => (
                  <View key={i} style={styles.listItem}>
                    <Text style={styles.bullet}>{block.data.style === 'ordered' ? `${i + 1}.` : '•'}</Text>
                    <Text style={styles.listText}>{item.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            );

          case 'code':
            return (
              <View key={index} style={styles.codeContainer}>
                <Text style={styles.codeText}>{block.data.code}</Text>
              </View>
            );

          case 'image':
            return (
              <View key={index} style={styles.imageContainer}>
                <Image 
                  source={{ uri: block.data.file.url.startsWith('http') ? block.data.file.url : `http://10.0.2.2:8000${block.data.file.url}` }} 
                  style={styles.image} 
                  resizeMode="cover"
                />
                {block.data.caption ? <Text style={styles.caption}>{block.data.caption}</Text> : null}
              </View>
            );
            
          case 'quote':
            return (
              <View key={index} style={styles.quoteContainer}>
                <Text style={styles.quoteText}>{block.data.text}</Text>
                {block.data.caption ? <Text style={styles.quoteCaption}>— {block.data.caption}</Text> : null}
              </View>
            );

          default:
            return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  header: {
    color: '#f8fafc',
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    color: '#cbd5e1', // slate-300
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  listContainer: {
    marginBottom: 16,
    paddingLeft: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    width: 20,
  },
  listText: {
    color: '#cbd5e1',
    fontSize: 16,
    flex: 1,
    lineHeight: 24,
  },
  codeContainer: {
    backgroundColor: '#020617', // slate-950
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  codeText: {
    color: '#38bdf8',
    fontFamily: 'monospace',
    fontSize: 14,
  },
  imageContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  caption: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  quoteContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#38bdf8',
    paddingLeft: 16,
    marginBottom: 16,
  },
  quoteText: {
    color: '#e2e8f0',
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 26,
  },
  quoteCaption: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
  }
});
