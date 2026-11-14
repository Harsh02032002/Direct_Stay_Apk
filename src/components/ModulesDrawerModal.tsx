import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  CalendarCheck2,
  ReceiptText,
  BedDouble,
  Sparkles,
  Users,
  KeyRound,
  UtensilsCrossed,
  Boxes,
  Globe2,
  Wallet,
  FileBarChart2,
  ShieldCheck,
  Bell,
  Settings,
  X,
  ChevronRight,
  LogOut,
  Building2,
} from 'lucide-react-native';
import { AdminModuleId } from '../types/pms';
import { COLORS } from '../theme/colors';

export interface AdminModuleMeta {
  id: AdminModuleId;
  label: string;
  subtitle: string;
  section: 'CORE OPERATIONS' | 'SERVICES & STORE' | 'FINANCE & GOVERNANCE' | 'ACCOUNT & ALERTS';
  Icon: any;
}

export const ALL_ADMIN_MODULES: AdminModuleMeta[] = [
  {
    id: 'dashboard',
    label: 'PMS Overview',
    subtitle: 'Live KPIs, Occupancy & Quick Actions',
    section: 'CORE OPERATIONS',
    Icon: LayoutDashboard,
  },
  {
    id: 'frontDesk',
    label: 'Front Desk',
    subtitle: 'Advance Booking, Check-In, In-House & Checkout',
    section: 'CORE OPERATIONS',
    Icon: CalendarCheck2,
  },
  {
    id: 'invoice',
    label: 'Invoice System',
    subtitle: 'GST Locked Bills & + Separate Invoice',
    section: 'CORE OPERATIONS',
    Icon: ReceiptText,
  },
  {
    id: 'rooms',
    label: 'Room Management',
    subtitle: 'Rack Status, Categories, Amenities & + Add Room',
    section: 'CORE OPERATIONS',
    Icon: BedDouble,
  },
  {
    id: 'housekeeping',
    label: 'Housekeeping / Staff',
    subtitle: 'Cleaning Queue, Laundry & Lost & Found',
    section: 'SERVICES & STORE',
    Icon: Sparkles,
  },
  {
    id: 'staff',
    label: 'Staff Management (HRM)',
    subtitle: 'Staff Directory & Monthly Salary Payroll',
    section: 'SERVICES & STORE',
    Icon: Users,
  },
  {
    id: 'userList',
    label: 'User List',
    subtitle: 'Admin & Staff Login Credentials',
    section: 'SERVICES & STORE',
    Icon: KeyRound,
  },
  {
    id: 'pos',
    label: 'POS Terminal & Food',
    subtitle: 'KOT Billing, Menu Master & Room Posting',
    section: 'SERVICES & STORE',
    Icon: UtensilsCrossed,
  },
  {
    id: 'inventory',
    label: 'Inventory Store',
    subtitle: 'Stock IN/OUT, Reorder Alerts, PO & Vendors',
    section: 'SERVICES & STORE',
    Icon: Boxes,
  },
  {
    id: 'otaManager',
    label: 'OTA Channel Manager',
    subtitle: 'OTA Sync, Travel Agents & Commissions',
    section: 'SERVICES & STORE',
    Icon: Globe2,
  },
  {
    id: 'finance',
    label: 'Finance Hub',
    subtitle: 'Income, Expenses, Petty Cash, Vouchers & Closing',
    section: 'FINANCE & GOVERNANCE',
    Icon: Wallet,
  },
  {
    id: 'reports',
    label: 'Audits & Reports',
    subtitle: 'Daily Collection, Cash Book, GSTR-1 & C-Form',
    section: 'FINANCE & GOVERNANCE',
    Icon: FileBarChart2,
  },
  {
    id: 'auditLogs',
    label: 'Owner Audit Logs',
    subtitle: 'Activity & Security Audit Trail',
    section: 'FINANCE & GOVERNANCE',
    Icon: ShieldCheck,
  },
  {
    id: 'notifications',
    label: 'Notifications Center',
    subtitle: 'Checkout Dirty Room & Operational Alerts',
    section: 'ACCOUNT & ALERTS',
    Icon: Bell,
  },
  {
    id: 'profile',
    label: 'My Profile & Settings',
    subtitle: 'Hotel Details, GST % Slab & Invoice Prefix',
    section: 'ACCOUNT & ALERTS',
    Icon: Settings,
  },
];

const SECTIONS: Array<AdminModuleMeta['section']> = [
  'CORE OPERATIONS',
  'SERVICES & STORE',
  'FINANCE & GOVERNANCE',
  'ACCOUNT & ALERTS',
];

interface ModulesDrawerModalProps {
  visible: boolean;
  activeModule: AdminModuleId;
  hotelName: string;
  username: string;
  badges?: Partial<Record<AdminModuleId, number>>;
  onSelectModule: (id: AdminModuleId) => void;
  onClose: () => void;
  onLogout: () => void;
}

export const ModulesDrawerModal: React.FC<ModulesDrawerModalProps> = ({
  visible,
  activeModule,
  hotelName,
  username,
  badges = {},
  onSelectModule,
  onClose,
  onLogout,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.drawerPanel,
            {
              paddingTop: Math.max(insets.top, 14),
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}
        >
          {/* Drawer Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.brandRow}>
              <View style={styles.goldIconBox}>
                <Building2 size={18} color={COLORS.espresso} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.brandTitle} numberOfLines={1}>
                  {hotelName}
                </Text>
                <Text style={styles.brandSub} numberOfLines={1}>
                  ADMIN PANEL • {username.toUpperCase()}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={COLORS.goldBright} />
            </TouchableOpacity>
          </View>

          {/* Scrollable 15 Sidebar Modules */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.navList}
            showsVerticalScrollIndicator={false}
          >
            {SECTIONS.map((section) => {
              const items = ALL_ADMIN_MODULES.filter((m) => m.section === section);
              return (
                <View key={section} style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>{section}</Text>
                  {items.map((mod) => {
                    const isActive = activeModule === mod.id;
                    const IconComp = mod.Icon;
                    const badgeCount = badges[mod.id] || 0;
                    return (
                      <TouchableOpacity
                        key={mod.id}
                        activeOpacity={0.82}
                        onPress={() => {
                          onSelectModule(mod.id);
                          onClose();
                        }}
                        style={[styles.navItem, isActive && styles.navItemActive]}
                      >
                        <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                          <IconComp
                            size={17}
                            color={isActive ? COLORS.espresso : COLORS.goldBright}
                            strokeWidth={2.2}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.navTitle, isActive && styles.navTitleActive]}
                            numberOfLines={1}
                          >
                            {mod.label}
                          </Text>
                          <Text
                            style={[styles.navSub, isActive && styles.navSubActive]}
                            numberOfLines={1}
                          >
                            {mod.subtitle}
                          </Text>
                        </View>
                        {badgeCount > 0 && (
                          <View style={[styles.badgePill, isActive && styles.badgePillActive]}>
                            <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </Text>
                          </View>
                        )}
                        <ChevronRight
                          size={15}
                          color={isActive ? COLORS.espresso : '#8E8074'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer Sign Out */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                onClose();
                onLogout();
              }}
            >
              <LogOut size={16} color="#FDA4AF" />
              <Text style={styles.logoutText}>Sign Out from Admin Panel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tap outside right area to dismiss */}
        <Pressable style={styles.dismissArea} onPress={onClose} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 11, 9, 0.68)',
  },
  drawerPanel: {
    width: '84%',
    maxWidth: 340,
    backgroundColor: COLORS.espresso,
    borderRightWidth: 1,
    borderRightColor: 'rgba(196, 154, 58, 0.4)',
  },
  dismissArea: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 154, 58, 0.25)',
  },
  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  goldIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  brandSub: {
    color: COLORS.goldBright,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.espressoLight,
    borderWidth: 1,
    borderColor: COLORS.espressoBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 14,
  },
  sectionBlock: {
    gap: 5,
  },
  sectionLabel: {
    color: COLORS.goldBright,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingHorizontal: 8,
    marginBottom: 3,
    opacity: 0.9,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  navItemActive: {
    backgroundColor: COLORS.gold,
  },
  navIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(196, 154, 58, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconWrapActive: {
    backgroundColor: 'rgba(23, 18, 15, 0.14)',
  },
  navTitle: {
    color: '#F5EFE8',
    fontSize: 13,
    fontWeight: '700',
  },
  navTitleActive: {
    color: COLORS.espresso,
    fontWeight: '800',
  },
  navSub: {
    color: '#9C8F84',
    fontSize: 10,
    marginTop: 1,
  },
  navSubActive: {
    color: '#34271D',
    fontWeight: '600',
  },
  badgePill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePillActive: {
    backgroundColor: COLORS.espresso,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextActive: {
    color: COLORS.goldBright,
  },
  drawerFooter: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(196, 154, 58, 0.25)',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(225, 29, 72, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(253, 164, 175, 0.3)',
  },
  logoutText: {
    color: '#FDA4AF',
    fontSize: 12.5,
    fontWeight: '800',
  },
});
