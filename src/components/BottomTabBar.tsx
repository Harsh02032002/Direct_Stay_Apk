import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  CalendarCheck2,
  BedDouble,
  ReceiptText,
  Grid,
} from 'lucide-react-native';
import { AdminModuleId } from '../types/pms';
import { COLORS } from '../theme/colors';

export type AdminBottomTab = 'dashboard' | 'frontDesk' | 'rooms' | 'invoice' | 'allModules';

interface BottomTabBarProps {
  activeModule: AdminModuleId;
  onSelectModule: (mod: AdminModuleId) => void;
  onOpenDrawer: () => void;
  dirtyCount?: number;
  unpaidCount?: number;
  alertCount?: number;
}

const TABS: Array<{
  key: AdminBottomTab;
  label: string;
  Icon: any;
}> = [
  { key: 'dashboard', label: 'Overview', Icon: LayoutDashboard },
  { key: 'frontDesk', label: 'Front Desk', Icon: CalendarCheck2 },
  { key: 'rooms', label: 'Rooms', Icon: BedDouble },
  { key: 'invoice', label: 'Invoices', Icon: ReceiptText },
  { key: 'allModules', label: 'All Modules', Icon: Grid },
];

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeModule,
  onSelectModule,
  onOpenDrawer,
  dirtyCount = 0,
  unpaidCount = 0,
  alertCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const isSecondaryModule = !['dashboard', 'frontDesk', 'rooms', 'invoice'].includes(activeModule);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.goldTopHairline} />
      <View style={styles.row}>
        {TABS.map(({ key, label, Icon }) => {
          const isActive = key === 'allModules' ? isSecondaryModule : activeModule === key;
          const badge =
            key === 'rooms' && dirtyCount > 0
              ? dirtyCount
              : key === 'invoice' && unpaidCount > 0
              ? unpaidCount
              : key === 'allModules' && alertCount > 0
              ? alertCount
              : 0;

          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.8}
              onPress={() => {
                if (key === 'allModules') {
                  onOpenDrawer();
                } else {
                  onSelectModule(key);
                }
              }}
              style={styles.tabBtn}
            >
              {isActive && <View style={styles.activePillIndicator} />}
              <View style={styles.iconBox}>
                <Icon
                  size={20}
                  color={isActive ? COLORS.goldBright : '#9C8F84'}
                  strokeWidth={isActive ? 2.4 : 1.9}
                />
                {badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.label, isActive && styles.labelActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.espresso,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 16,
  },
  goldTopHairline: {
    height: 1.5,
    backgroundColor: COLORS.gold,
    opacity: 0.55,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    position: 'relative',
  },
  activePillIndicator: {
    position: 'absolute',
    top: -8,
    width: 28,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: COLORS.goldBright,
  },
  iconBox: {
    position: 'relative',
    marginBottom: 3,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: COLORS.rose,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#9C8F84',
  },
  labelActive: {
    color: COLORS.goldBright,
    fontWeight: '800',
  },
});
