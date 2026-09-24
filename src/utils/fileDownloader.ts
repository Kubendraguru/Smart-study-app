/**
 * Web-specific PDF downloader
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
    const response = await fetch(url);
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    return { success: true };
  } catch {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true };
  }
}
