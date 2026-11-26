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
import { Building2, Lock, User, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { LIVE_API_BASE_URL, loginHotelAdminApi } from '../api/directStayApi';
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
