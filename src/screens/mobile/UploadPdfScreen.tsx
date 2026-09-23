import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  ChevronDown,
  X,
  AlertCircle,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type Subject = {
  id: string;
  subject_name: string;
  subject_code: string;
};

type Unit = {
  id: string;
  unit_number: number;
  unit_title: string;
};

export default function UploadPdfScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [fileAsset, setFileAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Modals for Subject & Unit selection
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    setLoadingSubjects(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, subject_name, subject_code')
        .order('subject_name', { ascending: true });

      if (error) throw error;
      setSubjects(data ?? []);
    } catch (err: any) {
      console.error('Error loading subjects:', err);
      Alert.alert('Error', 'Could not load subjects');
    } finally {
      setLoadingSubjects(false);
    }
  }

  useEffect(() => {
    if (!subjectId) {
      setUnits([]);
      setUnitId('');
      return;
    }
    loadUnits(subjectId);
  }, [subjectId]);

  async function loadUnits(selectedSubjectId: string) {
    setLoadingUnits(true);
    setUnits([]);
    setUnitId('');

    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, unit_number, unit_title')
        .eq('subject_id', selectedSubjectId)
        .order('unit_number', { ascending: true });

      if (error) throw error;
      setUnits(data ?? []);
    } catch (err: any) {
      console.error('Error loading units:', err);
    } finally {
      setLoadingUnits(false);
    }
  }

  const handlePickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFileAsset(asset);
        if (!title.trim()) {
          // Pre-populate title with readable filename (remove .pdf)
          setTitle(asset.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err) {
      console.error('Error picking file:', err);
      Alert.alert('Error', 'Failed to pick PDF file');
    }
  };

  const handleUpload = async () => {
    if (!user) {
      Alert.alert('Auth Required', 'You must be logged in to upload materials');
      return;
    }

    if (!subjectId) {
      Alert.alert('Missing Field', 'Please select a subject');
      return;
    }

    if (!unitId) {
      Alert.alert('Missing Field', 'Please select a unit');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Missing Field', 'Please enter a title for the material');
      return;
    }

    if (!fileAsset) {
      Alert.alert('Missing File', 'Please select a PDF document');
      return;
    }

    setUploading(true);

    try {
      const safeName = fileAsset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${subjectId}/${unitId}/${Date.now()}-${safeName}`;

      // Convert URI to Blob for upload
      const response = await fetch(fileAsset.uri);
      const blob = await response.blob();

      // 1. Upload to Supabase Storage Bucket
      const { error: uploadErr } = await supabase.storage
        .from('pdfs')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      // 2. Retrieve public URL
      const { data: urlData } = supabase.storage.from('pdfs').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // 3. Save into materials table
      const { error: dbErr } = await supabase.from('materials').insert({
        unit_id: unitId,
        title: title.trim(),
        material_type: 'pdf',
        file_url: publicUrl,
      });

      if (dbErr) throw dbErr;

      Alert.alert('Success', 'PDF material uploaded successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err: any) {
      console.error('Upload failed:', err);
      Alert.alert('Upload Error', err.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const selectedUnit = units.find((u) => u.id === unitId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Upload PDF Material" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Subject Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Select Subject</Text>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowSubjectModal(true)}
            activeOpacity={0.7}
          >
            <Text style={selectedSubject ? styles.dropdownTextActive : styles.dropdownTextPlaceholder}>
              {selectedSubject
                ? `${selectedSubject.subject_code} - ${selectedSubject.subject_name}`
                : loadingSubjects
                ? 'Loading subjects...'
                : 'Choose a subject...'}
            </Text>
            <ChevronDown size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Unit Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Select Unit</Text>
          <TouchableOpacity
            style={[styles.dropdownBtn, !subjectId && styles.dropdownDisabled]}
            onPress={() => subjectId && setShowUnitModal(true)}
            disabled={!subjectId}
            activeOpacity={0.7}
          >
            <Text style={selectedUnit ? styles.dropdownTextActive : styles.dropdownTextPlaceholder}>
              {selectedUnit
                ? `Unit ${selectedUnit.unit_number}: ${selectedUnit.unit_title}`
                : !subjectId
                ? 'Select a subject first'
                : loadingUnits
                ? 'Loading units...'
                : 'Choose a unit...'}
            </Text>
            <ChevronDown size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* PDF Title Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Material Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Unit 1 Lecture Notes & Problems"
            placeholderTextColor={theme.colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* PDF File Picker Box */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>PDF Document</Text>
          {fileAsset ? (
            <View style={styles.selectedFileBox}>
              <View style={styles.selectedFileIcon}>
                <FileText size={24} color={theme.colors.danger} />
              </View>
              <View style={styles.selectedFileInfo}>
                <Text style={styles.selectedFileName} numberOfLines={1}>
                  {fileAsset.name}
                </Text>
                <Text style={styles.selectedFileSize}>
                  {fileAsset.size ? `${(fileAsset.size / (1024 * 1024)).toFixed(1)} MB` : 'PDF'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFileAsset(null)} style={styles.removeFileBtn}>
                <X size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.dropZone} onPress={handlePickPdf} activeOpacity={0.8}>
              <View style={styles.dropZoneIcon}>
                <UploadCloud size={28} color={theme.colors.primary} />
              </View>
              <Text style={styles.dropZoneTitle}>Tap to select PDF file</Text>
              <Text style={styles.dropZoneSub}>Max file size: 50 MB</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Upload Button */}
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.uploadBtnText}>Uploading PDF...</Text>
            </View>
          ) : (
            <Text style={styles.uploadBtnText}>Upload to Study Hub</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Subject Picker Modal */}
      <Modal visible={showSubjectModal} animationType="slide" onRequestClose={() => setShowSubjectModal(false)}>
        <SafeAreaView style={styles.safeArea}>
          <AppHeader title="Select Subject" showBack onBackPress={() => setShowSubjectModal(false)} />
          <ScrollView contentContainerStyle={styles.modalList}>
            {subjects.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.modalItem}
                onPress={() => {
                  setSubjectId(s.id);
                  setShowSubjectModal(false);
                }}
              >
                <View style={styles.modalItemTextWrapper}>
                  <Text style={styles.modalItemCode}>{s.subject_code}</Text>
                  <Text style={styles.modalItemTitle}>{s.subject_name}</Text>
                </View>
                {subjectId === s.id && <CheckCircle2 size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Unit Picker Modal */}
      <Modal visible={showUnitModal} animationType="slide" onRequestClose={() => setShowUnitModal(false)}>
        <SafeAreaView style={styles.safeArea}>
          <AppHeader title="Select Unit" showBack onBackPress={() => setShowUnitModal(false)} />
          <ScrollView contentContainerStyle={styles.modalList}>
            {units.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={styles.modalItem}
                onPress={() => {
                  setUnitId(u.id);
                  setShowUnitModal(false);
                }}
              >
                <View style={styles.modalItemTextWrapper}>
                  <Text style={styles.modalItemCode}>Unit {u.unit_number}</Text>
                  <Text style={styles.modalItemTitle}>{u.unit_title}</Text>
                </View>
                {unitId === u.id && <CheckCircle2 size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    paddingBottom: 32,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  dropdownDisabled: {
    opacity: 0.5,
  },
  dropdownTextPlaceholder: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  dropdownTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: theme.colors.text,
  },
  dropZone: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dropZoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  dropZoneSub: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  selectedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  selectedFileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedFileInfo: {
    flex: 1,
    marginRight: 8,
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  selectedFileSize: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 6,
  },
  uploadBtn: {
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  uploadBtnDisabled: {
    opacity: 0.6,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalList: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  modalItemTextWrapper: {
    flex: 1,
    marginRight: 10,
  },
  modalItemCode: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
