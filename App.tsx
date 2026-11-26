import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, Bell, RefreshCw, LogOut, MessageCircle } from 'lucide-react-native';
import { PmsProvider, usePms } from './src/context/PmsContext';
import { AdminLoginScreen } from './src/screens/AdminLoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FrontDeskScreen } from './src/screens/FrontDeskScreen';
import { RoomsScreen } from './src/screens/RoomsScreen';
import { InvoicesScreen } from './src/screens/InvoicesScreen';
import { ServiceStoreModulesScreen } from './src/screens/ServiceStoreModulesScreen';
import { FinanceGovernanceModulesScreen } from './src/screens/FinanceGovernanceModulesScreen';
import { BottomTabBar } from './src/components/BottomTabBar';
import { ALL_ADMIN_MODULES, ModulesDrawerModal } from './src/components/ModulesDrawerModal';
import { AdminModuleId } from './src/types/pms';
import { COLORS } from './src/theme/colors';

const AdminMobileShell: React.FC = () => {
  const insets = useSafeAreaInsets();
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

  const [activeModule, setActiveModule] = useState<AdminModuleId>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

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
  const unreadNotifCount = state.notifications.filter((n) => !n.read).length;
  const totalBellAlerts = unreadNotifCount + dirtyRoomsCount;

  const activeMeta = ALL_ADMIN_MODULES.find((m) => m.id === activeModule);
  const moduleBadges: Partial<Record<AdminModuleId, number>> = {
    rooms: dirtyRoomsCount,
    housekeeping: dirtyRoomsCount,
    invoice: unpaidInvoicesCount,
    notifications: totalBellAlerts,
    frontDesk: state.bookings.filter(
      (b) => !b.isCheckedIn && !b.isCompleted && b.status !== 'Cancelled'
    ).length,
  };

  return (
    <View style={[styles.safeRoot, { paddingTop: insets.top }]}>
      {/* Luxury Espresso Top Header with Left ☰ Menu Line & Right 🔔 Notification Bell */}
      <View style={styles.topHeader}>
        <View style={styles.brandLeft}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDrawerOpen(true)}
            style={styles.menuBtn}
          >
            <Menu size={19} color={COLORS.espresso} strokeWidth={2.6} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.hotelTitle} numberOfLines={1}>
              {hotelProfile?.name || 'DirectStay Admin'}
            </Text>
            <Text style={styles.syncSubtitle} numberOfLines={1}>
              {syncing
                ? 'Syncing live with directstay.online...'
                : lastSyncedAt
                ? `${activeMeta?.label || 'Admin'} • Synced ${lastSyncedAt}`
                : `${activeMeta?.label || 'Admin'} • ${session.username}`}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {/* DirectStay Live WhatsApp Support (+91 7978563771) */}
          <TouchableOpacity
            onPress={() => {
              const rawPhone = String(
                state.systemWebsite?.whatsappNumber || state.systemWebsite?.supportPhone || '917978563771'
              ).replace(/\D/g, '');
              const digits = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone || '917978563771';
              const msg = `Hello DirectStay Support, I need help from DirectStay Mobile App (${hotelProfile?.name || session.hotelId}).`;
              Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`).catch(() => {});
            }}
            style={[styles.iconBtn, { backgroundColor: '#16A34A' }]}
          >
            <MessageCircle size={16} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Top Notification Bell (Instant Checkout -> Dirty Room Alert for Housekeeping!) */}
          <TouchableOpacity
            onPress={() => setActiveModule('notifications')}
            style={styles.iconBtn}
          >
            <Bell size={17} color={COLORS.goldBright} />
            {totalBellAlerts > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {totalBellAlerts > 99 ? '99+' : totalBellAlerts}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={refreshLiveState} style={styles.iconBtn}>
            <RefreshCw size={16} color={COLORS.goldBright} />
          </TouchableOpacity>

          <TouchableOpacity onPress={logout} style={styles.iconBtn}>
            <LogOut size={16} color="#FDA4AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Screen Content (All 15 /admin Sidebar Modules!) */}
      <View style={styles.body}>
        {activeModule === 'dashboard' && (
          <DashboardScreen onNavigateModule={setActiveModule} />
        )}
        {activeModule === 'frontDesk' && <FrontDeskScreen />}
        {activeModule === 'rooms' && <RoomsScreen />}
        {activeModule === 'invoice' && <InvoicesScreen />}
        {(activeModule === 'housekeeping' ||
          activeModule === 'pos' ||
          activeModule === 'inventory' ||
          activeModule === 'otaManager') && (
          <ServiceStoreModulesScreen moduleId={activeModule} />
        )}
        {(activeModule === 'staff' ||
          activeModule === 'userList' ||
          activeModule === 'finance' ||
          activeModule === 'reports' ||
          activeModule === 'auditLogs' ||
          activeModule === 'notifications' ||
          activeModule === 'profile') && (
          <FinanceGovernanceModulesScreen moduleId={activeModule} />
        )}
      </View>

      {/* Bottom Navigation Bar with Safe Area Inset */}
      <BottomTabBar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        onOpenDrawer={() => setDrawerOpen(true)}
        dirtyCount={dirtyRoomsCount}
        unpaidCount={unpaidInvoicesCount}
        alertCount={totalBellAlerts}
      />

      {/* Left-Side ☰ Menu Drawer with All 15 /admin Sidebar Modules */}
      <ModulesDrawerModal
        visible={drawerOpen}
        activeModule={activeModule}
        hotelName={hotelProfile?.name || 'DirectStay Admin'}
        username={session.username}
        badges={moduleBadges}
        onSelectModule={setActiveModule}
        onClose={() => setDrawerOpen(false)}
        onLogout={logout}
      />
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PmsProvider>
        <StatusBar style="light" backgroundColor={COLORS.espresso} />
        <AdminMobileShell />
      </PmsProvider>
    </SafeAreaProvider>
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
  },
  topHeader: {
    backgroundColor: COLORS.espresso,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    gap: 7,
    flexShrink: 0,
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
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -5,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
