import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  ArrowUpRight,
  BedDouble,
  CalendarPlus,
  IndianRupee,
  LogIn,
  LogOut,
  Sparkles,
} from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { AdminBottomTab } from '../components/BottomTabBar';

interface DashboardScreenProps {
  onNavigateTab: (tab: AdminBottomTab) => void;
}

function formatINR(val: number): string {
  return `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateTab }) => {
  const { state, syncing, refreshLiveState, hotelProfile } = usePms();
  const todayStr = new Date().toISOString().slice(0, 10);

  const totalRooms = state.rooms.length;
  const occupiedCount = state.rooms.filter((r) => r.status === 'Occupied').length;
  const availableCount = state.rooms.filter((r) => r.status === 'Available' || r.status === 'Clean').length;
  const dirtyCount = state.rooms.filter((r) => r.status === 'Dirty').length;
  const reservedCount = state.rooms.filter((r) => r.status === 'Reserved').length;
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

  const todayArrivals = state.bookings.filter(
    (b) => b.checkInDate === todayStr && b.status !== 'Cancelled'
  );
  const todayDepartures = state.bookings.filter(
    (b) => b.checkOutDate === todayStr && b.status !== 'Cancelled'
  );

  const totalCollected = state.bookings
    .filter((b) => b.status !== 'Cancelled')
    .reduce((s, b) => s + (Number(b.amountPaid ?? b.advanceAmount) || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshLiveState} />}
    >
      {/* Hero Property Strip */}
      <View style={styles.heroCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroOverline}>LIVE PROPERTY OVERVIEW</Text>
          <Text style={styles.heroTitle}>{hotelProfile?.name || 'Hotel Admin Desk'}</Text>
          <Text style={styles.heroSub}>
            {occupiedCount}/{totalRooms} Occupied ({occupancyPct}%) • {availableCount} Ready Rooms
          </Text>
        </View>
        <View style={styles.occCircle}>
          <Text style={styles.occValue}>{occupancyPct}%</Text>
          <Text style={styles.occLabel}>OCCUPANCY</Text>
        </View>
      </View>

      {/* Quick Front Desk Actions */}
      <View style={styles.quickRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateTab('frontDesk')}
          style={[styles.quickBtn, { backgroundColor: COLORS.gold }]}
        >
          <CalendarPlus size={18} color={COLORS.espresso} />
          <Text style={[styles.quickBtnText, { color: COLORS.espresso }]}>
            + Advance / Walk-In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateTab('invoices')}
          style={[styles.quickBtn, { backgroundColor: COLORS.espresso }]}
        >
          <Sparkles size={18} color={COLORS.goldBright} />
          <Text style={[styles.quickBtnText, { color: COLORS.goldBright }]}>
            GST & Separate Bills
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4 KPI Cards */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={[styles.kpiIcon, { backgroundColor: COLORS.emeraldSoft }]}>
            <LogIn size={17} color={COLORS.emerald} />
          </View>
          <Text style={styles.kpiVal}>{todayArrivals.length}</Text>
          <Text style={styles.kpiLabel}>Today's Arrivals</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.kpiIcon, { backgroundColor: COLORS.amberSoft }]}>
            <LogOut size={17} color={COLORS.amber} />
          </View>
          <Text style={styles.kpiVal}>{todayDepartures.length}</Text>
          <Text style={styles.kpiLabel}>Today's Checkouts</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.kpiIcon, { backgroundColor: COLORS.blueSoft }]}>
            <BedDouble size={17} color={COLORS.blue} />
          </View>
          <Text style={styles.kpiVal}>{availableCount}</Text>
          <Text style={styles.kpiLabel}>Available ({dirtyCount} Dirty)</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={[styles.kpiIcon, { backgroundColor: COLORS.goldSoft }]}>
            <IndianRupee size={17} color={COLORS.goldDark} />
          </View>
          <Text style={styles.kpiVal}>{formatINR(totalCollected)}</Text>
          <Text style={styles.kpiLabel}>Folio Collections</Text>
        </View>
      </View>

      {/* Live Room Status Strip */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Room Rack Snapshot</Text>
          <TouchableOpacity onPress={() => onNavigateTab('rooms')} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>View All</Text>
            <ArrowUpRight size={14} color={COLORS.goldDark} />
          </TouchableOpacity>
        </View>
        <View style={styles.statusPillsRow}>
          <View style={[styles.statusPill, { backgroundColor: COLORS.emeraldSoft }]}>
            <Text style={[styles.statusPillText, { color: COLORS.emerald }]}>
              Available: {availableCount}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: COLORS.roseSoft }]}>
            <Text style={[styles.statusPillText, { color: COLORS.rose }]}>
              Occupied: {occupiedCount}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: COLORS.blueSoft }]}>
            <Text style={[styles.statusPillText, { color: COLORS.blue }]}>
              Reserved: {reservedCount}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: COLORS.amberSoft }]}>
            <Text style={[styles.statusPillText, { color: COLORS.amber }]}>
              Dirty: {dirtyCount}
            </Text>
          </View>
        </View>
      </View>

      {/* Recent Reservations & Stays */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bookings & Active Stays</Text>
          <TouchableOpacity onPress={() => onNavigateTab('frontDesk')} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>Manage</Text>
            <ArrowUpRight size={14} color={COLORS.goldDark} />
          </TouchableOpacity>
        </View>

        {state.bookings.length === 0 ? (
          <Text style={styles.emptyText}>No bookings recorded yet. Pull down to refresh.</Text>
        ) : (
          state.bookings.slice(0, 6).map((b) => {
            const isNoGst =
              b.isWithoutGst === true ||
              b.gstInvoice === false ||
              (b.gstRate !== undefined && Number(b.gstRate) <= 0);
            return (
              <View key={b.id} style={styles.bookingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestName}>{b.guestName || b.customerName}</Text>
                  <Text style={styles.bookingMeta}>
                    Rm {b.roomNumber} • {b.checkInDate} → {b.checkOutDate}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amountText}>
                    {formatINR(b.totalPayable || b.bookingAmount || 0)}
                  </Text>
                  <View style={styles.rowBadges}>
                    <View
                      style={[
                        styles.miniBadge,
                        {
                          backgroundColor: isNoGst ? COLORS.amberSoft : COLORS.emeraldSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.miniBadgeText,
                          { color: isNoGst ? COLORS.amber : COLORS.emerald },
                        ]}
                      >
                        {isNoGst ? 'No GST' : `GST ${b.gstRate || 5}%`}
                      </Text>
                    </View>
                    <View style={[styles.miniBadge, { backgroundColor: '#F1F5F9' }]}>
                      <Text style={[styles.miniBadgeText, { color: COLORS.textSecondary }]}>
                        {b.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 14, paddingBottom: 28, gap: 14 },
  heroCard: {
    backgroundColor: COLORS.espresso,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 58, 0.4)',
  },
  heroOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.goldBright,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 12,
    color: '#C9BCB0',
    fontWeight: '600',
  },
  occCircle: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: 'rgba(196, 154, 58, 0.16)',
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  occValue: { fontSize: 18, fontWeight: '900', color: COLORS.goldBright },
  occLabel: { fontSize: 8.5, fontWeight: '800', color: '#D6C9BE', marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  quickBtnText: { fontSize: 12.5, fontWeight: '800' },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48.2%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiVal: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary },
  kpiLabel: { fontSize: 11.5, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  linkBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.goldDark },
  statusPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statusPillText: { fontSize: 11.5, fontWeight: '800' },
  emptyText: { fontSize: 12.5, color: COLORS.textMuted, paddingVertical: 12 },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  guestName: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  bookingMeta: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  amountText: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  rowBadges: { flexDirection: 'row', gap: 5, marginTop: 4 },
  miniBadge: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  miniBadgeText: { fontSize: 10, fontWeight: '800' },
});
