import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminSession, Invoice, PmsStateSnapshot } from '../types/pms';

// Live DirectStay Production Backend (1:1 same APIs used by https://directstay.online/admin)
export const LIVE_API_BASE_URL = 'https://directstay.online';
const SESSION_STORAGE_KEY = 'directstay_admin_mobile_session_v1';

export async function getStoredAdminSession(): Promise<AdminSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.token || !parsed?.hotelId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveAdminSession(session: AdminSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearAdminSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

function buildAuthHeaders(session: AdminSession, includeJsonContentType = true): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'x-session-token': session.token,
    'x-user-role': 'Admin',
    'x-hotel-id': session.hotelId,
    'x-user-name': session.username || 'Admin',
  };
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export interface LoginApiResult {
  ok: boolean;
  session?: AdminSession;
  blockType?: 'Pending' | 'Expired' | 'Suspended' | string;
  blockedHotel?: any;
  error?: string;
}

export async function loginHotelAdminApi(
  usernameInput: string,
  passwordInput: string,
  apiBaseUrl: string = LIVE_API_BASE_URL
): Promise<LoginApiResult> {
  const cleanUser = usernameInput.trim();
  const cleanPass = passwordInput.trim();
  if (!cleanUser || !cleanPass) {
    return { ok: false, error: 'Please enter both username/email and password.' };
  }

  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username: cleanUser,
        password: cleanPass,
        portalMode: 'admin',
      }),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return { ok: false, error: 'Unexpected server response from DirectStay API.' };
    }

    if (res.status === 403 && data?.blockType) {
      return {
        ok: false,
        blockType: data.blockType,
        blockedHotel: data.blockedHotel,
        error: data.error || `Property account is currently ${data.blockType}.`,
      };
    }

    if (!res.ok || !data?.success || !data?.token) {
      return {
        ok: false,
        error: data?.error || 'Invalid Hotel Admin or Staff credentials.',
      };
    }

    if (String(data.role).toLowerCase() === 'superadmin') {
      return {
        ok: false,
        error:
          'Super Admin credentials must use the web Super Admin Hub. Sign in with a Hotel Admin or Staff account.',
      };
    }

    const session: AdminSession = {
      token: data.token,
      role: 'Admin',
      rawRole: data.rawRole || data.role || 'Admin',
      hotelId: data.hotelId || data.hotel?.id || 'hotel-1',
      username: data.username || cleanUser,
      hotel: data.hotel || null,
      staff: data.staff || null,
    };

    await saveAdminSession(session);
    return { ok: true, session };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Network error connecting to https://directstay.online',
    };
  }
}

export async function logoutHotelAdminApi(
  session: AdminSession | null,
  apiBaseUrl: string = LIVE_API_BASE_URL
): Promise<void> {
  if (session?.token) {
    try {
      await fetch(`${apiBaseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: buildAuthHeaders(session),
      });
    } catch {
      // Ignore network errors during logout
    }
  }
  await clearAdminSession();
}

export async function fetchLiveHotelStateApi(
  session: AdminSession,
  apiBaseUrl: string = LIVE_API_BASE_URL
): Promise<{ ok: boolean; data?: PmsStateSnapshot; unauthorized?: boolean; error?: string }> {
  try {
    const url = `${apiBaseUrl}/api/db/state?hotelId=${encodeURIComponent(session.hotelId)}&_t=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: buildAuthHeaders(session, false),
    });

    if (res.status === 401) {
      return { ok: false, unauthorized: true, error: 'Session expired. Please sign in again.' };
    }

    const json = await res.json();
    const raw = json?.data || json || {};
    const hid = session.hotelId;
    const byHotel = <T extends { hotelId?: string }>(arr: any): T[] =>
      Array.isArray(arr)
        ? arr.filter((item) => item && (!item.hotelId || item.hotelId === hid))
        : [];

    const snapshot: PmsStateSnapshot = {
      hotels: Array.isArray(raw.hotels) ? raw.hotels : [],
      rooms: byHotel(raw.rooms),
      bookings: byHotel(raw.bookings),
      checkins: byHotel(raw.checkins),
      invoices: byHotel(raw.invoices),
      posItems: byHotel(raw.posItems),
      posCategories: byHotel(raw.posCategories),
      posOrders: byHotel(raw.posOrders),
      posAdvanceBookings: byHotel(raw.posAdvanceBookings),
      cleaningLogs: byHotel(raw.cleaningLogs),
      laundryOrders: byHotel(raw.laundryOrders),
      lostAndFound: byHotel(raw.lostAndFound || raw.lostAndFoundItems),
      inventoryProducts: byHotel(raw.inventoryProducts),
      inventoryPurchases: byHotel(raw.inventoryPurchases),
      vendors: byHotel(raw.vendors || raw.inventorySuppliers),
      otaChannels: byHotel(raw.otaChannels),
      travelAgents: byHotel(raw.travelAgents),
      expenses: byHotel(raw.expenses),
      pettyCash: byHotel(raw.pettyCash),
      cashBankAccounts: byHotel(raw.cashBankAccounts),
      vouchers: byHotel(raw.vouchers || raw.financeVouchers),
      ownerPayments: byHotel(raw.ownerPayments),
      reimbursements: byHotel(raw.reimbursements),
      dailyClosings: byHotel(raw.dailyClosings),
      waterBottles: byHotel(raw.waterBottles),
      staff: byHotel(raw.staff),
      auditLogs: byHotel(raw.auditLogs),
      notifications: byHotel(raw.notifications),
      packages: Array.isArray(raw.packages) ? raw.packages : [],
      systemWebsite: raw.systemWebsite || null,
    };

    return { ok: true, data: snapshot };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to load live hotel data.' };
  }
}

export async function syncLiveHotelDataApi(
  session: AdminSession,
  partialData: Partial<PmsStateSnapshot> & Record<string, any>,
  apiBaseUrl: string = LIVE_API_BASE_URL
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/db/sync`, {
      method: 'POST',
      headers: {
        ...buildAuthHeaders(session),
        'x-target-hotel-id': session.hotelId,
      },
      body: JSON.stringify({ data: partialData }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      return { ok: false, error: json?.error || `Sync failed (${res.status})` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network sync error' };
  }
}

export async function allocateLiveGrcApi(
  session: AdminSession,
  payload: { checkinId?: string; bookingId?: string; prefix?: string },
  apiBaseUrl: string = LIVE_API_BASE_URL
): Promise<{ ok: boolean; grcNumber?: string; error?: string }> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/grc/allocate`, {
      method: 'POST',
      headers: {
        ...buildAuthHeaders(session),
        'x-target-hotel-id': session.hotelId,
      },
      body: JSON.stringify({
        hotelId: session.hotelId,
        checkinId: payload.checkinId,
        bookingId: payload.bookingId,
        prefix: payload.prefix || 'GRC',
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.success && typeof json.grcNumber === 'string' && json.grcNumber.trim()) {
      return { ok: true, grcNumber: json.grcNumber.trim() };
    }
    return { ok: false, error: json?.error || 'Could not allocate atomic GRC number' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error allocating GRC' };
  }
}

export async function submitRenewalRequestApi(
  session: AdminSession,
  payload: Record<string, any>,
  apiBaseUrl: string = LIVE_API_BASE_URL
): Promise<{ ok: boolean; renewalRequest?: any; error?: string }> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/hotels/renewal-request`, {
      method: 'POST',
      headers: buildAuthHeaders(session),
      body: JSON.stringify({
        ...payload,
        hotelId: session.hotelId,
        requestedBy: payload.requestedBy || session.username || 'Hotel Admin',
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      return { ok: false, error: json?.error || 'Failed to submit renewal payment reference' };
    }
    return { ok: true, renewalRequest: json.renewalRequest };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error submitting renewal' };
  }
}

export async function generateLiveInvoiceApi(
  session: AdminSession,
  payload: Record<string, any>,
  apiBaseUrl: string = LIVE_API_BASE_URL
): Promise<{ ok: boolean; invoice?: Invoice; error?: string }> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/invoices/generate`, {
      method: 'POST',
      headers: buildAuthHeaders(session),
      body: JSON.stringify({
        ...payload,
        hotelId: session.hotelId,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
      return {
        ok: false,
        error: json?.error || json?.blockedReason || 'Invoice generation failed',
      };
    }
    return { ok: true, invoice: json.invoice };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error generating invoice' };
  }
}

// =========================================================================
// FORGOT PASSWORD VIA 6-DIGIT EMAIL OTP (SHARED WITH WEB PORTAL)
// =========================================================================

export async function requestForgotPasswordOtpApi(
  identifier: string,
  apiBaseUrl: string = LIVE_API_BASE_URL
): Promise<{ ok: boolean; maskedEmail?: string; expiresInMinutes?: number; message?: string; error?: string }> {
  const clean = identifier.trim();
  if (!clean) {
    return { ok: false, error: 'Please enter your Login Username.' };
  }
  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/forgot-password/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: clean, identifier: clean, portalMode: 'mobile' }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      const msg =
        json?.error ||
        (res.status === 404
          ? 'Forgot Password API is not deployed on server yet (404). Please update & restart the live VPS server.'
          : `Could not send OTP (${res.status})`);
      return { ok: false, error: msg };
    }
    return {
      ok: true,
      maskedEmail: json.maskedEmail,
      expiresInMinutes: json.expiresInMinutes,
      message: json.message,
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error requesting password reset OTP' };
  }
}

export async function verifyForgotPasswordOtpApi(
  identifier: string,
  otp: string,
  newPassword: string,
  apiBaseUrl: string = LIVE_API_BASE_URL
): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/forgot-password/verify-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword: newPassword.trim(),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return { ok: false, error: json?.error || `Password reset failed (${res.status})` };
    }
    return { ok: true, message: json.message };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error verifying OTP' };
  }
}

// =========================================================================
// AUTOMATED TRANSACTIONAL EMAIL DISPATCH (MATCHING WEB /ADMIN PORTAL)
// =========================================================================

const EMAIL_VALID_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isValidEmail = (e?: string | null): boolean => EMAIL_VALID_RE.test(String(e || '').trim());

async function postAuthedEmail(
  session: AdminSession,
  path: string,
  payload: Record<string, any>,
  apiBaseUrl: string = LIVE_API_BASE_URL
): Promise<{ ok: boolean; delivered: boolean; error?: string }> {
  try {
    const res = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: {
        ...buildAuthHeaders(session),
        'x-target-hotel-id': session.hotelId,
      },
      body: JSON.stringify({ hotelId: session.hotelId, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    const result = json?.result || json;
    if (!res.ok || json?.success === false) {
      return { ok: false, delivered: false, error: json?.error || result?.reason || `HTTP ${res.status}` };
    }
    const delivered = Boolean(json?.delivered ?? result?.delivered);
    const failed = result?.status === 'failed' || result?.status === 'skipped_unconfigured';
    return { ok: !failed, delivered, error: failed ? result?.reason : undefined };
  } catch (err: any) {
    return { ok: false, delivered: false, error: err?.message || 'Email network error' };
  }
}

export const sendBookingEmailApi = (session: AdminSession, payload: Record<string, any>) =>
  postAuthedEmail(session, '/api/bookings/send-email', payload);

export const sendCheckInWelcomeEmailApi = (session: AdminSession, payload: Record<string, any>) =>
  postAuthedEmail(session, '/api/email/checkin-welcome', payload);

export const sendGuestInvoiceEmailApi = (session: AdminSession, payload: Record<string, any>) =>
  postAuthedEmail(session, '/api/email/dispatch-invoice', payload);

export const sendCheckoutThankYouEmailApi = (session: AdminSession, payload: Record<string, any>) =>
  postAuthedEmail(session, '/api/email/checkout-thankyou', payload);

export const sendStaffCredentialsEmailApi = (session: AdminSession, payload: Record<string, any>) =>
  postAuthedEmail(session, '/api/email/staff-credentials', payload);

export const sendSalaryPayslipEmailApi = (session: AdminSession, payload: Record<string, any>) =>
  postAuthedEmail(session, '/api/email/salary-payslip', payload);

export const sendNightAuditSummaryEmailApi = (session: AdminSession, payload: Record<string, any>) =>
  postAuthedEmail(session, '/api/email/night-audit', payload);
