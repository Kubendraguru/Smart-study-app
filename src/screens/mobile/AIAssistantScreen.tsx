import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  Send,
  Sparkles,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Folder,
  Layers,
  CheckCircle2,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import {
  sendAiChatMessage,
  fetchSubjectWisePdfs,
  type AttachedMaterial,
  type SubjectWithUnits,
} from '@/service/ai';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  attachmentName?: string;
  attachmentType?: 'pdf' | 'image';
}

const QUICK_PROMPTS = [
  'Summarize in 3 key points',
  'Explain in simple terms',
  'What are the key exam topics?',
  'Give me 5 practice questions',
];

export default function AIAssistantScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-0',
      text: "Hello! I'm your AI Study Assistant. Ask me anything about your subjects, request summaries, or attach study materials (PDFs & screenshots) for targeted answers!",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [attachedMaterial, setAttachedMaterial] = useState<AttachedMaterial | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Attachment Options Modal
  const [showAttachOptions, setShowAttachOptions] = useState(false);

  // Course Materials Modal
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materials, setMaterials] = useState<SubjectWithUnits[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [collapsedSubjects, setCollapsedSubjects] = useState<Record<string, boolean>>({});

  const flatListRef = useRef<FlatList>(null);

  // Check if PDF passed via route navigation
  useEffect(() => {
    const routePdf = route.params?.attachedPdf;
    if (routePdf) {
      setAttachedMaterial({
        name: routePdf.title || 'Course Material PDF',
        type: 'pdf',
        storageUrl: routePdf.fileUrl,
      });
    }
  }, [route.params]);

  // Pick PDF from device
  const handlePickDocument = async () => {
    setShowAttachOptions(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachedMaterial({
          name: asset.name,
          type: 'pdf',
          size: asset.size,
          previewUrl: asset.uri,
        });
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Notice', 'Could not open document picker');
    }
  };

  // Pick Screenshot/Image from device
  const handlePickImage = async () => {
    setShowAttachOptions(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachedMaterial({
          name: asset.fileName || 'Screenshot.png',
          type: 'image',
          previewUrl: asset.uri,
          base64Data: asset.base64 || undefined,
          mimeType: asset.mimeType || 'image/png',
        });
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Notice', 'Could not open photo library');
    }
  };

  // Load Course Materials
  const handleOpenMaterialModal = async () => {
    setShowAttachOptions(false);
    setShowMaterialModal(true);
    setLoadingMaterials(true);
    const list = await fetchSubjectWisePdfs(user?.id);
    setMaterials(list);
    setLoadingMaterials(false);
  };

  const handleSelectCoursePdf = (pdf: any, subjectName: string) => {
    setAttachedMaterial({
      name: `${subjectName} - ${pdf.title}`,
      type: 'pdf',
      storageUrl: pdf.fileUrl,
    });
    setShowMaterialModal(false);
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: textToSend,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachmentName: attachedMaterial?.name,
      attachmentType: attachedMaterial?.type,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history for Edge Function
      const history = messages
        .filter((m) => m.id !== 'welcome-0')
        .map((m) => ({
          role: m.isUser ? ('user' as const) : ('model' as const),
          text: m.text,
        }));

      // Attachment payload
      let attachmentPayload = undefined;
      if (attachedMaterial) {
        attachmentPayload = {
          name: attachedMaterial.name,
          type: attachedMaterial.type,
          url: attachedMaterial.storageUrl,
          data: attachedMaterial.base64Data,
          mimeType: attachedMaterial.mimeType,
        };
      }

      const response = await sendAiChatMessage({
        message: textToSend,
        history,
        attachment: attachmentPayload,
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer || response.error || 'No response received.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: 'Unable to reach AI assistant. Please try again.',
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="AI Study Assistant" showBack />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageRow,
                item.isUser ? styles.messageRowUser : styles.messageRowAi,
              ]}
            >
              {!item.isUser && (
                <View style={styles.aiAvatar}>
                  <Sparkles size={16} color={theme.colors.primary} />
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  item.isUser ? styles.messageBubbleUser : styles.messageBubbleAi,
                ]}
              >
                {/* Attached File Pill inside message */}
                {item.attachmentName && (
                  <View
                    style={[
                      styles.msgAttachmentBadge,
                      item.isUser ? styles.msgAttachmentBadgeUser : styles.msgAttachmentBadgeAi,
                    ]}
                  >
                    {item.attachmentType === 'image' ? (
                      <ImageIcon size={12} color={item.isUser ? '#FFFFFF' : theme.colors.primary} />
                    ) : (
                      <FileText size={12} color={item.isUser ? '#FFFFFF' : theme.colors.danger} />
                    )}
                    <Text
                      style={[
                        styles.msgAttachmentText,
                        item.isUser ? styles.msgAttachmentTextUser : styles.msgAttachmentTextAi,
                      ]}
                      numberOfLines={1}
                    >
                      {item.attachmentName}
                    </Text>
                  </View>
                )}

                <Text
                  style={[
                    styles.messageText,
                    item.isUser ? styles.messageTextUser : styles.messageTextAi,
                  ]}
                >
                  {item.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    item.isUser ? styles.messageTimeUser : styles.messageTimeAi,
                  ]}
                >
                  {item.timestamp}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingRow}>
                <View style={styles.aiAvatar}>
                  <Sparkles size={16} color={theme.colors.primary} />
                </View>
                <View style={styles.aiThinkingBubble}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.thinkingText}>Thinking & analyzing...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Quick Prompts Bar */}
        <View style={styles.quickPromptsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptsScroll}>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickPromptPill}
                onPress={() => handleSend(prompt)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Active Attached Material Preview */}
        {attachedMaterial && (
          <View style={styles.activeAttachBar}>
            <View style={styles.activeAttachIcon}>
              {attachedMaterial.type === 'image' ? (
                <ImageIcon size={14} color={theme.colors.primary} />
              ) : (
                <FileText size={14} color={theme.colors.danger} />
              )}
            </View>
            <Text style={styles.activeAttachName} numberOfLines={1}>
              {attachedMaterial.name}
            </Text>
            <TouchableOpacity
              onPress={() => setAttachedMaterial(null)}
              style={styles.removeAttachBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Chat Input Bar */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={() => setShowAttachOptions(true)}
            activeOpacity={0.7}
          >
            <Paperclip size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder={
              attachedMaterial
                ? `Ask about ${attachedMaterial.name}...`
                : 'Ask AI a question or request a summary...'
            }
            placeholderTextColor={theme.colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxHeight={80}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || isLoading) && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.8}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Attachment Options Action Modal */}
      <Modal
        visible={showAttachOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowAttachOptions(false)}
        >
          <View style={styles.optionsSheet}>
            <Text style={styles.optionsSheetTitle}>Attach Study Material</Text>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleOpenMaterialModal}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIconBox, { backgroundColor: theme.colors.primaryLight }]}>
                <BookOpen size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionItemTitle}>Course Materials</Text>
                <Text style={styles.optionItemSub}>Choose from uploaded subject PDFs</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={handlePickDocument}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIconBox, { backgroundColor: theme.colors.dangerBg }]}>
                <FileText size={20} color={theme.colors.danger} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionItemTitle}>PDF from Device</Text>
                <Text style={styles.optionItemSub}>Upload any PDF from your phone</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <View style={[styles.optionIconBox, { backgroundColor: theme.colors.successBg }]}>
                <ImageIcon size={20} color={theme.colors.success} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionItemTitle}>Screenshot or Diagram</Text>
                <Text style={styles.optionItemSub}>Select an image from photos</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Course Materials Selection Modal */}
      <Modal
        visible={showMaterialModal}
        animationType="slide"
        onRequestClose={() => setShowMaterialModal(false)}
      >
        <SafeAreaView style={styles.safeArea}>
          <AppHeader
            title="Select Course Material"
            showBack
            onBackPress={() => setShowMaterialModal(false)}
          />

          {loadingMaterials ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading course PDFs...</Text>
            </View>
          ) : materials.length === 0 ? (
            <View style={styles.centerLoading}>
              <Text style={styles.emptyMaterialsText}>No materials found</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.materialsList} showsVerticalScrollIndicator={false}>
              {materials.map((subj) => (
                <View key={subj.subjectId} style={styles.materialSubjectCard}>
                  <Text style={styles.materialSubjTitle}>
                    {subj.subjectCode} · {subj.subjectName}
                  </Text>

                  {subj.units.map((unit) => (
                    <View key={unit.unitId} style={styles.materialUnitBox}>
                      <Text style={styles.materialUnitTitle}>
                        Unit {unit.unitNumber}: {unit.unitTitle}
                      </Text>

                      {unit.pdfs.map((pdf) => (
                        <TouchableOpacity
                          key={pdf.id}
                          style={styles.materialPdfItem}
                          onPress={() => handleSelectCoursePdf(pdf, subj.subjectName)}
                          activeOpacity={0.7}
                        >
                          <FileText size={16} color={theme.colors.danger} />
                          <Text style={styles.materialPdfItemTitle} numberOfLines={1}>
                            {pdf.title}
                          </Text>
                          <Text style={styles.materialAttachBadge}>Select</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
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
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 18,
    padding: 14,
  },
  messageBubbleUser: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleAi: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  msgAttachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    gap: 4,
  },
  msgAttachmentBadgeUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  msgAttachmentBadgeAi: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  msgAttachmentText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  msgAttachmentTextUser: {
    color: '#FFFFFF',
  },
  msgAttachmentTextAi: {
    color: theme.colors.text,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTextAi: {
    color: theme.colors.text,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeAi: {
    color: theme.colors.textMuted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  aiThinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  thinkingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  quickPromptsContainer: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    backgroundColor: '#FFFFFF',
  },
  quickPromptsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickPromptPill: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  quickPromptText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  activeAttachBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
  },
  activeAttachIcon: {
    marginRight: 6,
  },
  activeAttachName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  removeAttachBtn: {
    padding: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: theme.colors.text,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  optionsSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  optionsSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  optionItemSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  emptyMaterialsText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  materialsList: {
    padding: 16,
    paddingBottom: 32,
  },
  materialSubjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  materialSubjTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 12,
  },
  materialUnitBox: {
    marginBottom: 12,
    paddingLeft: 4,
  },
  materialUnitTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 6,
  },
  materialPdfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 8,
  },
  materialPdfItemTitle: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    fontWeight: '500',
  },
  materialAttachBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
