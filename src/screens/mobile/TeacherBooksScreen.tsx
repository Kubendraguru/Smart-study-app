import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BookOpen,
  Plus,
  Trash2,
  ExternalLink,
  X,
  Check,
  Book as BookIcon,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { getBooks, addBook, deleteBook } from '@/service/books';
import { getSubjects } from '@/service/subject';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/types';

export default function TeacherBooksScreen() {
  const navigation = useNavigation<any>();

  const [books, setBooks] = useState<Book[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [edition, setEdition] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [purchaseLink, setPurchaseLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [bks, subjs] = await Promise.all([
        getBooks(),
        getSubjects(),
      ]);
      setBooks(bks);
      setSubjects(subjs);
      if (subjs.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subjs[0].id);
      }
    } catch (err) {
      console.error('Error loading books:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load units when selected subject changes in modal
  useEffect(() => {
    async function loadUnits() {
      if (!selectedSubjectId) {
        setUnits([]);
        setSelectedUnitId('');
        return;
      }
      try {
        const { data } = await supabase
          .from('units')
          .select('*')
          .eq('subject_id', selectedSubjectId)
          .order('unit_number', { ascending: true });
        setUnits(data || []);
        if (data && data.length > 0) {
          setSelectedUnitId(data[0].id);
        } else {
          setSelectedUnitId('');
        }
      } catch (err) {
        console.error('Error loading units:', err);
      }
    }
    loadUnits();
  }, [selectedSubjectId]);

  const handleCreate = async () => {
    if (!title.trim() || !selectedSubjectId) {
      Alert.alert('Required Fields', 'Please fill in Book Title and Select Subject.');
      return;
    }

    setSubmitting(true);
    try {
      await addBook({
        title: title.trim(),
        subjectId: selectedSubjectId,
        unitId: selectedUnitId || null,
        author: author.trim() || undefined,
        edition: edition.trim() || undefined,
        description: description.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
        purchaseLink: purchaseLink.trim() || undefined,
      });

      setModalVisible(false);
      setTitle('');
      setAuthor('');
      setEdition('');
      setDescription('');
      setFileUrl('');
      setPurchaseLink('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add textbook.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, bookTitle: string) => {
    Alert.alert('Delete Book', `Are you sure you want to remove "${bookTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBook(id);
            setBooks((prev) => prev.filter((b) => b.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete book.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Manage Textbooks & Notes" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Add Reference Book</Text>
        </TouchableOpacity>

        {/* Books List */}
        <Text style={styles.sectionTitle}>Curated Books ({books.length})</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading textbooks...</Text>
          </View>
        ) : books.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <BookOpen size={36} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Textbooks Added</Text>
            <Text style={styles.emptySub}>
              Recommend standard textbooks and reference resources to guide your students.
            </Text>
          </View>
        ) : (
          books.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.bookIconBox}>
                  <BookOpen size={20} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.author && <Text style={styles.cardAuthor}>by {item.author}</Text>}
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item.id, item.title)}
                >
                  <Trash2 size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>

              {item.edition && <Text style={styles.cardEdition}>Edition: {item.edition}</Text>}
              {item.description && (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {item.file_url && (
                <View style={styles.cardFooter}>
                  <ExternalLink size={13} color={theme.colors.primary} />
                  <Text style={styles.linkText} numberOfLines={1}>
                    {item.file_url}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Reference Book</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {/* Subject */}
              <Text style={styles.inputLabel}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {subjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, selectedSubjectId === s.id && styles.chipActive]}
                    onPress={() => setSelectedSubjectId(s.id)}
                  >
                    <Text style={[styles.chipText, selectedSubjectId === s.id && styles.chipTextActive]}>
                      {s.subject_code}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Unit */}
              <Text style={styles.inputLabel}>Unit (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !selectedUnitId && styles.chipActive]}
                  onPress={() => setSelectedUnitId('')}
                >
                  <Text style={[styles.chipText, !selectedUnitId && styles.chipTextActive]}>
                    Entire Subject
                  </Text>
                </TouchableOpacity>
                {units.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.chip, selectedUnitId === u.id && styles.chipActive]}
                    onPress={() => setSelectedUnitId(u.id)}
                  >
                    <Text style={[styles.chipText, selectedUnitId === u.id && styles.chipTextActive]}>
                      Unit {u.unit_number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <Text style={styles.inputLabel}>Book Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Computer Networks: A Top-Down Approach"
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              {/* Author & Edition */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.inputLabel}>Author(s)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Kurose & Ross"
                    placeholderTextColor={theme.colors.textMuted}
                    value={author}
                    onChangeText={setAuthor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Edition</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., 8th Ed."
                    placeholderTextColor={theme.colors.textMuted}
                    value={edition}
                    onChangeText={setEdition}
                  />
                </View>
              </View>

              {/* Description */}
              <Text style={styles.inputLabel}>Book Description / Notes</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="Key chapters or syllabus alignment notes..."
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              {/* Reference URL / PDF link */}
              <Text style={styles.inputLabel}>Resource URL / Link (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://..."
                placeholderTextColor={theme.colors.textMuted}
                value={fileUrl}
                onChangeText={setFileUrl}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.submitModalBtn, submitting && { opacity: 0.7 }]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Add Book</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  bookIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  cardAuthor: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  cardEdition: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: 8,
  },
  linkText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  deleteBtn: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  submitModalBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitModalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
