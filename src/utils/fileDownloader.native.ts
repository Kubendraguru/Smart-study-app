import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, Alert } from 'react-native';

/**
 * Mobile Native PDF downloader (React Native / Expo)
 */
export function sanitizePdfFileName(title?: string): string {
  if (!title) return `study_material_${Date.now()}.pdf`;
  const sanitized = title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}

export async function downloadPdf(url: string, title?: string): Promise<{ success: boolean; error?: string }> {
  if (!url) {
    return { success: false, error: 'No PDF URL provided' };
  }

  const fileName = sanitizePdfFileName(title);

  try {
    const localUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${fileName}`;
    const downloadRes = await FileSystem.downloadAsync(url, localUri);

    if (downloadRes.status === 200) {
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save ${title || 'PDF Document'}`,
          UTI: 'com.adobe.pdf',
        });
        return { success: true };
      }
    }

    await Linking.openURL(url);
    return { success: true };
  } catch (err: any) {
    console.warn('Native download error, fallback to Linking.openURL:', err);
    try {
      await Linking.openURL(url);
      return { success: true };
    } catch (finalErr: any) {
      Alert.alert('Download Error', 'Could not open or download the PDF.');
      return { success: false, error: finalErr?.message || 'Download failed' };
    }
  }
}
