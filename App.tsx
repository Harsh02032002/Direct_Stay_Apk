import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Building2, LogOut, RefreshCw } from 'lucide-react-native';
import { PmsProvider, usePms } from './src/context/PmsContext';
import { AdminLoginScreen } from './src/screens/AdminLoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FrontDeskScreen } from './src/screens/FrontDeskScreen';
import { RoomsScreen } from './src/screens/RoomsScreen';
import { InvoicesScreen } from './src/screens/InvoicesScreen';
import { OperationsScreen } from './src/screens/OperationsScreen';
import { AdminBottomTab, BottomTabBar } from './src/components/BottomTabBar';
import { COLORS } from './src/theme/colors';

const AdminMobileShell: React.FC = () => {
  const {
    session,
    bootstrapping,
    syncing,
    lastSyncedAt,
    hotelProfile,
    state,
    setAuthenticatedSession,
    refreshLiveState,
    logout,
  } = usePms();

  const [activeTab, setActiveTab] = useState<AdminBottomTab>('dashboard');

  if (bootstrapping) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.goldBright} />
        <Text style={styles.splashText}>Loading DirectStay Admin Desk...</Text>
      </View>
    );
  }

  if (!session) {
    return <AdminLoginScreen onLoginSuccess={setAuthenticatedSession} />;
  }

  const dirtyRoomsCount = state.rooms.filter((r) => r.status === 'Dirty').length;
  const unpaidInvoicesCount = state.invoices.filter((i) => !i.isPaid).length;

  return (
    <SafeAreaView style={styles.safeRoot}>
      {/* Luxury Espresso Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandLeft}>
          <View style={styles.logoBadge}>
            <Building2 size={17} color={COLORS.espresso} strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hotelTitle} numberOfLines={1}>
              {hotelProfile?.name || 'DirectStay Admin'}
            </Text>
            <Text style={styles.syncSubtitle}>
              {syncing
                ? 'Syncing live with directstay.online...'
                : lastSyncedAt
                ? `Live • Synced ${lastSyncedAt} • ${session.username}`
                : `Live Admin • ${session.username}`}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={refreshLiveState} style={styles.iconBtn}>
            <RefreshCw size={17} color={COLORS.goldBright} />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.iconBtn}>
            <LogOut size={17} color="#FDA4AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Screen Content */}
      <View style={styles.body}>
        {activeTab === 'dashboard' && <DashboardScreen onNavigateTab={setActiveTab} />}
        {activeTab === 'frontDesk' && <FrontDeskScreen />}
        {activeTab === 'rooms' && <RoomsScreen />}
        {activeTab === 'invoices' && <InvoicesScreen />}
        {activeTab === 'operations' && <OperationsScreen />}
      </View>

      {/* Bottom Navigation Bar (`nav bar bottom mei`) */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        dirtyCount={dirtyRoomsCount}
        unpaidCount={unpaidInvoicesCount}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <PmsProvider>
      <StatusBar style="light" backgroundColor={COLORS.espresso} />
      <AdminMobileShell />
    </PmsProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splashText: {
    color: COLORS.goldBright,
    fontSize: 13,
    fontWeight: '700',
  },
  safeRoot: {
    flex: 1,
    backgroundColor: COLORS.espresso,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight || 0 : 0,
  },
  topHeader: {
    backgroundColor: COLORS.espresso,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 154, 58, 0.35)',
  },
  brandLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotelTitle: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  syncSubtitle: {
    color: '#B8ABA0',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.espressoLight,
    borderWidth: 1,
    borderColor: COLORS.espressoBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
