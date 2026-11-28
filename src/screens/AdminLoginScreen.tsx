import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Building2, Lock, User, Eye, EyeOff, ShieldCheck, AlertTriangle, Mail, KeyRound, ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import {
  LIVE_API_BASE_URL,
  loginHotelAdminApi,
  requestForgotPasswordOtpApi,
  verifyForgotPasswordOtpApi,
} from '../api/directStayApi';
import { AdminSession } from '../types/pms';
import { openWhatsAppSafe } from '../utils/iosPlatformHelpers';

interface AdminLoginScreenProps {
  onLoginSuccess: (session: AdminSession) => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onLoginSuccess }) => {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blockInfo, setBlockInfo] = useState<{ type: string; hotelName?: string } | null>(null);

  // Forgot Password via 6-Digit Email OTP
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [fpIdentifier, setFpIdentifier] = useState('');
  const [fpMaskedEmail, setFpMaskedEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPass, setFpNewPass] = useState('');
  const [fpConfirmPass, setFpConfirmPass] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpFeedback, setFpFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const handleRequestOtp = async () => {
    setFpFeedback(null);
    if (!fpIdentifier.trim()) {
      setFpFeedback({ ok: false, text: 'Enter your Hotel Admin or Staff Login Username.' });
      return;
    }
    setFpLoading(true);
    const res = await requestForgotPasswordOtpApi(fpIdentifier, LIVE_API_BASE_URL);
    setFpLoading(false);
    if (!res.ok) {
      setFpFeedback({ ok: false, text: res.error || 'Could not send OTP.' });
      return;
    }
    setFpMaskedEmail(res.maskedEmail || '');
    setFpOtp('');
    setForgotStep('verify');
    setFpFeedback({
      ok: true,
      text: res.message || `6-digit OTP sent to ${res.maskedEmail}. Check Inbox or Spam.`,
    });
  };

  const handleVerifyReset = async () => {
    setFpFeedback(null);
    if (fpOtp.trim().length !== 6) {
      setFpFeedback({ ok: false, text: 'Enter the 6-digit OTP from your email.' });
      return;
    }
    if (fpNewPass.trim().length < 6) {
      setFpFeedback({ ok: false, text: 'New password must be at least 6 characters.' });
      return;
    }
    if (fpNewPass.trim() !== fpConfirmPass.trim()) {
      setFpFeedback({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    setFpLoading(true);
    const res = await verifyForgotPasswordOtpApi(fpIdentifier, fpOtp, fpNewPass, LIVE_API_BASE_URL);
    setFpLoading(false);
    if (!res.ok) {
      setFpFeedback({ ok: false, text: res.error || 'OTP verification failed.' });
      return;
    }
    setFpFeedback({ ok: true, text: res.message || 'Password updated! Sign in with your new password.' });
    setUsername(fpIdentifier.trim());
    setPassword('');
    setFpOtp('');
    setFpNewPass('');
    setFpConfirmPass('');
    setForgotStep('request');
  };

  const handleSignIn = async () => {
    setErrorMsg(null);
    setBlockInfo(null);
    setLoading(true);
    const res = await loginHotelAdminApi(username, password, LIVE_API_BASE_URL);
    setLoading(false);

    if (res.blockType) {
      setBlockInfo({
        type: res.blockType,
        hotelName: res.blockedHotel?.name || 'Your Property',
      });
      return;
    }

    if (!res.ok || !res.session) {
      setErrorMsg(res.error || 'Authentication failed.');
      return;
    }

    onLoginSuccess(res.session);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top + 16, 40),
            paddingBottom: Math.max(insets.bottom + 24, 36),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Luxury Crest & Badge (Matches DirectStay /admin Web Portal) */}
        <View style={styles.brandBox}>
          <View style={styles.iconCrest}>
            <Building2 size={30} color={COLORS.espresso} strokeWidth={2.3} />
          </View>
          <View style={styles.portalBadge}>
            <ShieldCheck size={12} color={COLORS.goldDark} />
            <Text style={styles.portalBadgeText}>PROPERTY OPERATIONS DESK • /ADMIN</Text>
          </View>
          <Text style={styles.title}>DirectStay Admin</Text>
          <Text style={styles.subtitle}>
            Front Desk, Reservations, Check-In/Out, Rooms, GST Billing & Operations
          </Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          {blockInfo ? (
            <View style={styles.blockedBox}>
              <AlertTriangle size={26} color={COLORS.amber} />
              <Text style={styles.blockedTitle}>
                Account {blockInfo.type}: {blockInfo.hotelName}
              </Text>
              <Text style={styles.blockedSub}>
                All your hotel data is safely preserved. Renew or activate your membership on directstay.online or contact our WhatsApp billing desk (+91 7978563771).
              </Text>
              <TouchableOpacity
                onPress={() =>
                  openWhatsAppSafe(
                    '917978563771',
                    `Hello DirectStay Billing Team, my property "${blockInfo.hotelName}" is showing "${blockInfo.type}". Please help with renewal.`
                  )
                }
                style={[styles.signInBtn, { backgroundColor: '#16A34A', width: '100%', marginTop: 4 }]}
              >
                <Text style={[styles.signInBtnText, { color: '#FFFFFF' }]}>
                  WhatsApp Billing Support (+91 7978563771)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setBlockInfo(null)}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : forgotMode ? (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Mail size={18} color={COLORS.goldDark} />
                <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.textPrimary }}>
                  Forgot Password (Email OTP)
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 14, lineHeight: 17 }}>
                {forgotStep === 'request'
                  ? 'Enter your Login Username only. A 6-digit OTP will be sent strictly to the registered email saved on your account.'
                  : `Enter the 6-digit OTP sent to your registered email (${fpMaskedEmail || 'on file'}) and set a new password.`}
              </Text>

              {fpFeedback ? (
                <View
                  style={[
                    styles.errorBanner,
                    fpFeedback.ok && {
                      backgroundColor: '#ECFDF5',
                      borderColor: '#A7F3D0',
                    },
                  ]}
                >
                  <Text style={[styles.errorText, fpFeedback.ok && { color: '#065F46' }]}>
                    {fpFeedback.text}
                  </Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>LOGIN USERNAME</Text>
                <View style={styles.inputRow}>
                  <User size={17} color={COLORS.goldDark} />
                  <TextInput
                    value={fpIdentifier}
                    onChangeText={setFpIdentifier}
                    editable={forgotStep === 'request'}
                    placeholder="Enter Hotel Admin or Staff Username"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, forgotStep === 'verify' && { opacity: 0.65 }]}
                  />
                </View>
                <Text style={{ fontSize: 11, color: COLORS.goldDark, marginTop: 6, fontWeight: '600' }}>
                  🔒 OTP goes ONLY to your registered account email — custom email entry is disabled.
                </Text>
              </View>

              {forgotStep === 'verify' && (
                <>
                  <View style={styles.fieldGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <Text style={[styles.label, { marginBottom: 0 }]}>6-DIGIT EMAIL OTP</Text>
                      <TouchableOpacity disabled={fpLoading} onPress={handleRequestOtp}>
                        <Text style={{ fontSize: 11.5, fontWeight: '800', color: COLORS.goldDark }}>
                          Resend OTP
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputRow}>
                      <KeyRound size={17} color={COLORS.goldDark} />
                      <TextInput
                        value={fpOtp}
                        onChangeText={(t) => setFpOtp(t.replace(/\D/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor={COLORS.textMuted}
                        style={[styles.input, { letterSpacing: 6, fontWeight: '800' }]}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>NEW PASSWORD (MIN 6 CHARS)</Text>
                    <View style={styles.inputRow}>
                      <Lock size={17} color={COLORS.goldDark} />
                      <TextInput
                        value={fpNewPass}
                        onChangeText={setFpNewPass}
                        secureTextEntry
                        placeholder="Enter new password"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
                    <View style={styles.inputRow}>
                      <Lock size={17} color={COLORS.goldDark} />
                      <TextInput
                        value={fpConfirmPass}
                        onChangeText={setFpConfirmPass}
                        secureTextEntry
                        placeholder="Repeat new password"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        style={styles.input}
                      />
                    </View>
                  </View>
                </>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={fpLoading}
                onPress={forgotStep === 'request' ? handleRequestOtp : handleVerifyReset}
                style={[styles.signInBtn, fpLoading && { opacity: 0.7 }]}
              >
                {fpLoading ? (
                  <ActivityIndicator color={COLORS.espresso} />
                ) : (
                  <Text style={styles.signInBtnText}>
                    {forgotStep === 'request' ? 'Send 6-Digit Email OTP' : 'Verify OTP & Reset Password'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (forgotStep === 'verify') {
                    setForgotStep('request');
                    setFpOtp('');
                    setFpFeedback(null);
                  } else {
                    setForgotMode(false);
                    setFpFeedback(null);
                  }
                }}
                style={[styles.secondaryBtn, { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }]}
              >
                <ArrowLeft size={14} color={COLORS.espresso} />
                <Text style={styles.secondaryBtnText}>
                  {forgotStep === 'verify' ? 'Change Account ID' : 'Back to Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {errorMsg ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>ADMIN / STAFF USERNAME OR EMAIL</Text>
                <View style={styles.inputRow}>
                  <User size={17} color={COLORS.goldDark} />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter Hotel Admin or Staff ID"
                    placeholderTextColor={COLORS.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="username"
                    autoComplete="username"
                    returnKeyType="next"
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputRow}>
                  <Lock size={17} color={COLORS.goldDark} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    textContentType="password"
                    autoComplete="password"
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    style={styles.input}
                  />
                  <TouchableOpacity onPress={() => setShowPass((p) => !p)}>
                    {showPass ? (
                      <EyeOff size={18} color="#9C8F84" />
                    ) : (
                      <Eye size={18} color="#9C8F84" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={loading}
                onPress={handleSignIn}
                style={[styles.signInBtn, loading && { opacity: 0.7 }]}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.espresso} />
                ) : (
                  <Text style={styles.signInBtnText}>Sign In to Hotel Admin Desk</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setForgotMode(true);
                  setForgotStep('request');
                  setFpIdentifier(username.trim());
                  setFpFeedback(null);
                  setErrorMsg(null);
                }}
                style={{ marginTop: 12, alignItems: 'center', paddingVertical: 6 }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: COLORS.goldDark }}>
                  Forgot Password? Reset via Email OTP →
                </Text>
              </TouchableOpacity>

              <Text style={styles.liveNote}>
                Connected to Live Cloud API • directstay.online
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCrest: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  portalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FAF0D7',
    borderWidth: 1,
    borderColor: COLORS.gold,
    marginBottom: 10,
  },
  portalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorBanner: {
    backgroundColor: COLORS.roseSoft,
    borderColor: COLORS.roseBorder,
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    color: COLORS.rose,
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.goldDark,
    marginBottom: 7,
    letterSpacing: 0.6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  signInBtn: {
    backgroundColor: COLORS.gold,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.goldDark,
  },
  signInBtnText: {
    color: COLORS.espresso,
    fontSize: 14.5,
    fontWeight: '800',
  },
  liveNote: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  blockedBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  blockedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.amber,
    textAlign: 'center',
  },
  blockedSub: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  secondaryBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: '#FAF0D7',
  },
  secondaryBtnText: {
    color: COLORS.espresso,
    fontWeight: '700',
    fontSize: 12.5,
  },
});
