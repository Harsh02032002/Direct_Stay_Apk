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
import { AdminModuleId } from '../types/pms';
import { ALL_ADMIN_MODULES } from '../components/ModulesDrawerModal';

interface DashboardScreenProps {
  onNavigateModule: (mod: AdminModuleId) => void;
}

function formatINR(val: number): string {
  return `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigateModule }) => {
  const { state, syncing, refreshLiveState, hotelProfile } = usePms();
  const todayStr = new Date().toISOString().slice(0, 10);

  const totalRooms = state.rooms.length;
  const occupiedCount = state.rooms.filter((r) => r.status === 'Occupied').length;
  const availableCount = state.rooms.filter(
    (r) => r.status === 'Available' || r.status === 'Clean'
  ).length;
  const dirtyCount = state.rooms.filter((r) => r.status === 'Dirty').length;
  const reservedCount = state.rooms.filter((r) => r.status === 'Reserved').length;
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;

  const todayArrivals = state.bookings.filter(
    (b) => b.checkInDate === todayStr && b.status !== 'Cancelled'
  );
  const todayDepartures = state.bookings.filter(
    (b) => b.checkOutDate === todayStr && b.status !== 'Cancelled'
  );

  const activeInvoices = state.invoices.filter(
    (inv) =>
      inv &&
      inv.documentType !== 'CreditNote' &&
      inv.invoiceType !== 'Credit Note' &&
      inv.invoiceStatus !== 'Superseded' &&
      !inv.supersededByCreditNoteId
  );

  const totalCollected = (() => {
    const invPaid = activeInvoices.reduce(
      (s, i) => s + (Number(i.paidAmount ?? i.advancePaid) || 0),
      0
    );
    const invoicedBkgIds = new Set(activeInvoices.map((i) => i.bookingId).filter(Boolean));
    const uninvoicedAdv = state.bookings
      .filter((b) => b.status !== 'Cancelled' && !invoicedBkgIds.has(b.id))
      .reduce((s, b) => s + (Number(b.amountPaid ?? b.advanceAmount) || 0), 0);
    return invPaid + uninvoicedAdv;
  })();

  const subscriptionDaysLeft = (() => {
    if (!hotelProfile?.subscriptionEndDate) return null;
    const end = new Date(hotelProfile.subscriptionEndDate);
    if (Number.isNaN(end.getTime())) return null;
    return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  })();
  const isMembershipExpired =
    hotelProfile?.subscriptionStatus === 'Expired' ||
    (subscriptionDaysLeft !== null && subscriptionDaysLeft < 0);
  const isMembershipExpiring =
    !isMembershipExpired && subscriptionDaysLeft !== null && subscriptionDaysLeft <= 30;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshLiveState} />}
    >
      {/* Hero Property Strip */}
      <View style={styles.heroCard}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.heroOverline}>LIVE PROPERTY OVERVIEW</Text>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {hotelProfile?.name || 'Hotel Admin Desk'}
          </Text>
          <Text style={styles.heroSub}>
            {occupiedCount}/{totalRooms} Occupied ({occupancyPct}%) • {availableCount} Ready Rooms
          </Text>
        </View>
        <View style={styles.occCircle}>
          <Text style={styles.occValue} numberOfLines={1}>
            {occupancyPct}%
          </Text>
          <Text style={styles.occLabel} numberOfLines={1}>
            OCCUPANCY
          </Text>
        </View>
      </View>

      {/* Expiring / Expired Membership Renew Now Alert Banner */}
      {(isMembershipExpired || isMembershipExpiring) && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateModule('profile')}
          style={{
            backgroundColor: isMembershipExpired ? COLORS.roseSoft : COLORS.amberSoft,
            borderWidth: 1,
            borderColor: isMembershipExpired ? COLORS.roseBorder : COLORS.amberBorder,
            borderRadius: 14,
            padding: 12,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: isMembershipExpired ? COLORS.rose : COLORS.amber,
              }}
            >
              {isMembershipExpired
                ? `Membership Expired (${Math.abs(subscriptionDaysLeft || 0)}d overdue)`
                : `Membership Expiring in ${subscriptionDaysLeft} day(s)`}
            </Text>
            <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
              Tap Renew Now for Direct UPI Pay &amp; 18% GST renewal. All hotel data is safe.
            </Text>
          </View>
          <View
            style={{
              backgroundColor: COLORS.espresso,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.goldBright }}>
              Renew Now →
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Front Desk Actions (Responsive Padded Pills — Never Clips!) */}
      <View style={styles.quickRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateModule('frontDesk')}
          style={[styles.quickBtn, { backgroundColor: COLORS.gold }]}
        >
          <CalendarPlus size={16} color={COLORS.espresso} />
          <Text
            style={[styles.quickBtnText, { color: COLORS.espresso }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            + Advance / Walk-In
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateModule('invoice')}
          style={[styles.quickBtn, { backgroundColor: COLORS.espresso }]}
        >
          <Sparkles size={16} color={COLORS.goldBright} />
          <Text
            style={[styles.quickBtnText, { color: COLORS.goldBright }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            GST & Separate Bills
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4 KPI Cards in Clean 2x2 Flex Rows */}
      <View style={styles.kpiRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateModule('frontDesk')}
          style={styles.kpiCard}
        >
          <View style={[styles.kpiIcon, { backgroundColor: COLORS.emeraldSoft }]}>
            <LogIn size={17} color={COLORS.emerald} />
          </View>
          <Text style={styles.kpiVal}>{todayArrivals.length}</Text>
          <Text style={styles.kpiLabel} numberOfLines={1}>
            Today's Arrivals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateModule('frontDesk')}
          style={styles.kpiCard}
        >
          <View style={[styles.kpiIcon, { backgroundColor: COLORS.amberSoft }]}>
            <LogOut size={17} color={COLORS.amber} />
          </View>
          <Text style={styles.kpiVal}>{todayDepartures.length}</Text>
          <Text style={styles.kpiLabel} numberOfLines={1}>
            Today's Checkouts
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.kpiRow}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateModule('rooms')}
          style={styles.kpiCard}
        >
          <View style={[styles.kpiIcon, { backgroundColor: COLORS.blueSoft }]}>
            <BedDouble size={17} color={COLORS.blue} />
          </View>
          <Text style={styles.kpiVal}>{availableCount}</Text>
          <Text style={styles.kpiLabel} numberOfLines={1}>
            Available ({dirtyCount} Dirty)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateModule('reports')}
          style={styles.kpiCard}
        >
          <View style={[styles.kpiIcon, { backgroundColor: COLORS.goldSoft }]}>
            <IndianRupee size={17} color={COLORS.goldDark} />
          </View>
          <Text style={styles.kpiVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {formatINR(totalCollected)}
          </Text>
          <Text style={styles.kpiLabel} numberOfLines={1}>
            Daily & Folio Collection
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Launch: All 15 Admin Sidebar Modules */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            All Admin Panel Modules (15)
          </Text>
        </View>
        <View style={styles.modulesGrid}>
          {ALL_ADMIN_MODULES.filter((m) => m.id !== 'dashboard').map((mod) => {
            const IconComp = mod.Icon;
            return (
              <TouchableOpacity
                key={mod.id}
                activeOpacity={0.82}
                onPress={() => onNavigateModule(mod.id)}
                style={styles.modTile}
              >
                <View style={styles.modIconBox}>
                  <IconComp size={16} color={COLORS.goldBright} strokeWidth={2.2} />
                </View>
                <Text style={styles.modTileText} numberOfLines={2}>
                  {mod.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Live Room Status Strip */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Live Room Rack Snapshot
          </Text>
          <TouchableOpacity onPress={() => onNavigateModule('rooms')} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>View All</Text>
            <ArrowUpRight size={13} color={COLORS.goldDark} />
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
          <Text style={styles.sectionTitle} numberOfLines={1}>
            Recent Bookings & Active Stays
          </Text>
          <TouchableOpacity onPress={() => onNavigateModule('frontDesk')} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>Manage</Text>
            <ArrowUpRight size={13} color={COLORS.goldDark} />
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
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.guestName} numberOfLines={1}>
                    {b.guestName || b.customerName}
                  </Text>
                  <Text style={styles.bookingMeta} numberOfLines={2}>
                    Rm {b.roomNumber} • {b.checkInDate} → {b.checkOutDate}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
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
  content: { padding: 14, paddingBottom: 28, gap: 12 },
  heroCard: {
    backgroundColor: COLORS.espresso,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196, 154, 58, 0.4)',
  },
  heroOverline: {
    fontSize: 9.5,
    fontWeight: '800',
    color: COLORS.goldBright,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 11.5,
    color: '#C9BCB0',
    fontWeight: '600',
  },
  occCircle: {
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(196, 154, 58, 0.16)',
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  occValue: { fontSize: 18, fontWeight: '900', color: COLORS.goldBright },
  occLabel: { fontSize: 8.5, fontWeight: '800', color: '#D6C9BE', marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickBtnText: { fontSize: 12, fontWeight: '800', flexShrink: 1 },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 13,
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
  kpiVal: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  kpiLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FAF6EE',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EADBC0',
    flexShrink: 0,
  },
  linkBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.goldDark },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modTile: {
    width: '31%',
    minHeight: 74,
    backgroundColor: '#FAF8F4',
    borderRadius: 13,
    padding: 9,
    borderWidth: 1,
    borderColor: '#EAE3D5',
    justifyContent: 'space-between',
  },
  modIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  modTileText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 13.5,
  },
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
  bookingMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  amountText: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  rowBadges: { flexDirection: 'row', gap: 5, marginTop: 4 },
  miniBadge: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  miniBadgeText: { fontSize: 10, fontWeight: '800' },
});
