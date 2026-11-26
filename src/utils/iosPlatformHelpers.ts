import { Alert, Linking, Platform } from 'react-native';

export const DEFAULT_DIRECTSTAY_WHATSAPP = '917978563771';

/**
 * iOS Hermes/JavaScriptCore rejects space-separated timestamps like "2026-11-26 10:30".
 * Always normalize to ISO-8601 ("2026-11-26T10:30") before constructing Date.
 */
export function parseIsoDateSafe(raw?: string | null): Date | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(trimmed)
    ? trimmed.replace(/\s+/, 'T')
    : trimmed;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysRemainingSafe(endDate?: string | null): number | null {
  const end = parseIsoDateSafe(endDate);
  if (!end) return null;
  const now = new Date();
  const endMid = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.ceil((endMid - nowMid) / (1000 * 60 * 60 * 24));
}

export function normalizeWhatsappDigits(phone?: string | null): string {
  const digits = String(phone || DEFAULT_DIRECTSTAY_WHATSAPP).replace(/\D/g, '');
  if (!digits) return DEFAULT_DIRECTSTAY_WHATSAPP;
  return digits.length === 10 ? `91${digits}` : digits;
}

/**
 * Opens WhatsApp reliably on both iOS and Android:
 * - On iOS: checks native `whatsapp://` scheme first (configured in Info.plist LSApplicationQueriesSchemes),
 *   falling back cleanly to Safari `https://wa.me/...`.
 */
export async function openWhatsAppSafe(phone?: string | null, message?: string): Promise<void> {
  const digits = normalizeWhatsappDigits(phone);
  const encodedMsg = encodeURIComponent(
    message || 'Hello DirectStay Support, I need assistance with DirectStay Hotel PMS.'
  );
  const nativeUrl = `whatsapp://send?phone=${digits}&text=${encodedMsg}`;
  const webUrl = `https://wa.me/${digits}?text=${encodedMsg}`;

  try {
    if (Platform.OS === 'ios') {
      const canNative = await Linking.canOpenURL(nativeUrl);
      if (canNative) {
        await Linking.openURL(nativeUrl);
        return;
      }
    }
    await Linking.openURL(webUrl);
  } catch {
    Alert.alert(
      'WhatsApp Support',
      `Please message or call DirectStay Support at +${digits}.`
    );
  }
}

/**
 * Opens a UPI payment app safely on Android and iOS:
 * - Android supports standard `upi://pay?...` intent chooser.
 * - iOS registers app-specific schemes (`gpay://`, `tez://`, `phonepe://`, `paytmmp://`, `bhim://`, `upi://`).
 *   Checks installed apps cleanly and falls back with exact UPI ID & payable amount if none installed.
 */
export async function openUpiPaymentSafe(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}): Promise<void> {
  const query = `pa=${encodeURIComponent(params.upiId)}&pn=${encodeURIComponent(
    params.payeeName
  )}&am=${params.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(params.note.slice(0, 60))}`;

  const candidates =
    Platform.OS === 'ios'
      ? [
          `upi://pay?${query}`,
          `gpay://upi/pay?${query}`,
          `tez://upi/pay?${query}`,
          `phonepe://pay?${query}`,
          `paytmmp://pay?${query}`,
          `bhim://upi/pay?${query}`,
        ]
      : [`upi://pay?${query}`];

  for (const url of candidates) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // Try next UPI scheme
    }
  }

  Alert.alert(
    'Direct UPI Payment Details',
    `Pay ₹${params.amount.toLocaleString('en-IN')} using any UPI app (GPay / PhonePe / Paytm):\n\nUPI ID: ${params.upiId}\nMerchant: ${params.payeeName}\n\nAfter completing payment, enter your 12-digit UTR below for billing verification.`
  );
}

export async function openExternalUrlSafe(url: string, fallbackTitle = 'Open Link'): Promise<void> {
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // Fallback alert below
  }
  Alert.alert(fallbackTitle, url);
}
