import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import {
  Sparkles,
  Share2,
  AlertCircle,
  ExternalLink,
  Download,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { recordPdfView } from '@/service/tracking';
import { supabase } from '@/lib/supabase';
import { useArrearMotivation } from '@/hooks/useArrearMotivation';
import ArrearMotivationToast from '@/components/mobile/ArrearMotivationToast';
import { downloadPdf } from '@/utils/fileDownloader';

export default function PdfViewerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, role } = useAuth();

  const { pdfId, title, fileUrl, subjectName, subjectId } = route.params || {};

  const [resolvedSubjectId, setResolvedSubjectId] = useState<string | undefined>(subjectId);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [viewRecorded, setViewRecorded] = useState(false);

  // Resolve subjectId from pdfId if not explicitly passed
  useEffect(() => {
    if (!resolvedSubjectId && pdfId) {
      supabase
        .from('materials')
        .select('units(subject_id)')
        .eq('id', pdfId)
        .single()
        .then(({ data }) => {
          const sId = (data?.units as any)?.subject_id;
          if (sId) setResolvedSubjectId(sId);
        })
        .catch(() => {});
    }
  }, [pdfId, resolvedSubjectId]);

  // Arrear study motivation during PDF reading
  const { isToastVisible, currentMessage, dismissToast } = useArrearMotivation({
    subjectId: resolvedSubjectId || subjectId,
    isStudyActive: !loading && !loadError,
  });

  // Track student PDF view once loaded
  const handleRecordView = () => {
    if (!user || role === 'teacher' || !pdfId || viewRecorded) return;
    setViewRecorded(true);
    recordPdfView(pdfId, user.id);
  };

  const handleDownload = async () => {
    if (!fileUrl || downloading) return;
    setDownloading(true);
    try {
      const res = await downloadPdf(fileUrl, title || 'Study_Material');
      if (!res.success) {
        Alert.alert('Download Issue', res.error || 'Could not download the PDF.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!fileUrl) return;
    try {
      await Share.share({
        message: `Study material: ${title || 'PDF Document'}\n${fileUrl}`,
        url: fileUrl,
        title: title || 'Study Material PDF',
      });
    } catch {
      // Ignored
    }
  };

  const handleAskAi = () => {
    navigation.navigate('AIAssistant', {
      attachedPdf: {
        id: pdfId,
        title: title || 'PDF Document',
        fileUrl,
      },
    });
  };

  // On Android, use Google Docs Viewer embedded URL for seamless inline rendering of PDFs in WebView
  const targetUrl =
    Platform.OS === 'android'
      ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`
      : fileUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={title || 'PDF Viewer'}
        showBack
        rightAction={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.aiHeaderBtn}
              onPress={handleAskAi}
              activeOpacity={0.7}
            >
              <Sparkles size={16} color={theme.colors.primary} />
              <Text style={styles.aiHeaderBtnText}>Ask AI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.downloadHeaderBtn}
              onPress={handleDownload}
              disabled={downloading}
              activeOpacity={0.7}
              title="Download PDF"
            >
              {downloading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Download size={18} color={theme.colors.primary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Share2 size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.container}>
        {/* PDF Document Container */}
        {fileUrl ? (
          <View style={styles.webViewContainer}>
            <WebView
              source={{ uri: targetUrl }}
              style={styles.webView}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Opening study document...</Text>
                </View>
              )}
              onLoadEnd={() => {
                setLoading(false);
                handleRecordView();
              }}
              onError={() => {
                setLoading(false);
                setLoadError(true);
              }}
              scalesPageToFit={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />

            {loadError && (
              <View style={styles.errorOverlay}>
                <AlertCircle size={36} color={theme.colors.danger} />
                <Text style={styles.errorTitle}>Could not preview PDF inline</Text>
                <Text style={styles.errorSub}>
                  You can download or open the PDF directly on your device.
                </Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={handleDownload}
                  activeOpacity={0.8}
                >
                  <Download size={16} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Download PDF Directly</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom floating download action */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={styles.downloadMainBtn}
                onPress={handleDownload}
                disabled={downloading}
                activeOpacity={0.8}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Download size={18} color="#FFFFFF" />
                )}
                <Text style={styles.downloadMainBtnText}>
                  {downloading ? 'Downloading...' : 'Download & Save PDF'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.errorOverlay}>
            <AlertCircle size={36} color={theme.colors.danger} />
            <Text style={styles.errorTitle}>Invalid PDF URL</Text>
            <Text style={styles.errorSub}>The requested document link could not be loaded.</Text>
          </View>
        )}
      </View>

      <ArrearMotivationToast
        visible={isToastVisible}
        message={currentMessage}
        onDismiss={dismissToast}
        position="bottom"
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  aiHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  errorSub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  downloadHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  downloadMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  downloadMainBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
