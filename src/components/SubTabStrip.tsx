import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

export interface SubTabItem {
  id: string;
  label: string;
  count?: number;
  Icon?: any;
}

interface SubTabStripProps {
  tabs: SubTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const SubTabStrip: React.FC<SubTabStripProps> = ({ tabs, activeId, onSelect }) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const IconComp = tab.Icon;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.82}
              onPress={() => onSelect(tab.id)}
              style={[styles.pill, isActive && styles.pillActive]}
            >
              {IconComp ? (
                <IconComp
                  size={14}
                  color={isActive ? COLORS.goldBright : COLORS.textSecondary}
                  strokeWidth={isActive ? 2.4 : 2}
                />
              ) : null}
              <Text style={[styles.pillText, isActive && styles.pillTextActive]} numberOfLines={1}>
                {tab.label}
              </Text>
              {typeof tab.count === 'number' && (
                <View style={[styles.countChip, isActive && styles.countChipActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F6F3EE',
    borderWidth: 1,
    borderColor: '#E8E1D5',
    flexShrink: 0,
  },
  pillActive: {
    backgroundColor: COLORS.espresso,
    borderColor: COLORS.gold,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.goldBright,
    fontWeight: '800',
  },
  countChip: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#E5DEC9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countChipActive: {
    backgroundColor: 'rgba(196, 154, 58, 0.25)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.espresso,
  },
  countTextActive: {
    color: COLORS.goldBright,
  },
});
