import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

function openWebPrintDialog(html: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const popup = window.open('', '_blank', 'width=900,height=1050');
  if (popup && popup.document) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    setTimeout(() => {
      try {
        popup.focus();
        popup.print();
      } catch {
        // User can still print manually from the opened preview tab
      }
    }, 300);
    return;
  }

  // Fallback when browser blocks popups: hidden iframe print
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1500);
      }
    }, 300);
  }
}

/**
 * Prints or saves HTML as PDF across Web (`localhost:8081` / browser) and Native Android / iOS APK.
 */
export async function printHtml(html: string, title?: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      openWebPrintDialog(html);
      return;
    }
    await Print.printAsync({ html });
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('did not complete')) {
      return;
    }
    Alert.alert(title || 'Print Error', msg || 'Unable to open print preview.');
  }
}

/**
 * Generates a PDF file from HTML and opens the native Share / Save sheet (WhatsApp, Email, Files) on Android/iOS,
 * or opens the browser Print / Save-as-PDF dialog on Web.
 */
export async function sharePdfFromHtml(html: string, dialogTitle = 'Share PDF'): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      openWebPrintDialog(html);
      return;
    }
    const { uri } = await Print.printToFileAsync({ html });
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ html });
    }
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('cancel')) {
      return;
    }
    Alert.alert('PDF Share Error', msg || 'Unable to generate or share PDF.');
  }
}

export const mobilePrint = {
  printHtml,
  sharePdfFromHtml,
};
