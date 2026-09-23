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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import {
  Sparkles,
  Share2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react-native';
import { theme } from '@/theme';
import AppHeader from '@/components/mobile/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { recordPdfView } from '@/service/tracking';

export default function PdfViewerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, role } = useAuth();

  const { pdfId, title, fileUrl, subjectName } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [viewRecorded, setViewRecorded] = useState(false);

  // Track student PDF view once loaded
  const handleRecordView = () => {
    if (!user || role === 'teacher' || !pdfId || viewRecorded) return;
    setViewRecorded(true);
    recordPdfView(pdfId, user.id);
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
                  Please ensure your device is connected to the internet.
                </Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={handleShare}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={16} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Open / Share Link</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.errorOverlay}>
            <AlertCircle size={36} color={theme.colors.danger} />
            <Text style={styles.errorTitle}>Invalid PDF URL</Text>
            <Text style={styles.errorSub}>The requested document link could not be loaded.</Text>
          </View>
        )}
      </View>
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
