import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Search, Calendar } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

export type QuickDateFilter = 'today' | 'upcoming' | 'month' | 'all';

interface DateFilterBarProps {
  activeFilter: QuickDateFilter;
  onChangeFilter: (f: QuickDateFilter) => void;
  searchQuery?: string;
  onChangeSearch?: (q: string) => void;
  searchPlaceholder?: string;
  showUpcoming?: boolean;
}

export function matchesQuickDateFilter(
  dateStr: string | undefined,
  filter: QuickDateFilter
): boolean {
  if (filter === 'all') return true;
  if (!dateStr) return false;
  const clean = String(dateStr).slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  if (filter === 'today') return clean === todayStr;
  if (filter === 'upcoming') return clean >= todayStr;
  if (filter === 'month') return clean.slice(0, 7) === todayStr.slice(0, 7);
  return true;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  activeFilter,
  onChangeFilter,
  searchQuery,
  onChangeSearch,
  searchPlaceholder = 'Search guest, room, ID...',
  showUpcoming = false,
}) => {
  const options: Array<{ id: QuickDateFilter; label: string }> = [
    { id: 'today', label: 'Today' },
    ...(showUpcoming ? [{ id: 'upcoming' as QuickDateFilter, label: 'Upcoming' }] : []),
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Records' },
  ];

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <View style={styles.filterTag}>
          <Calendar size={12} color={COLORS.goldDark} />
          <Text style={styles.filterTagText}>Filter:</Text>
        </View>
        {options.map((opt) => {
          const active = activeFilter === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => onChangeFilter(opt.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {onChangeSearch && (
        <View style={styles.searchBox}>
          <Search size={14} color={COLORS.textMuted} />
          <TextInput
            value={searchQuery || ''}
            onChangeText={onChangeSearch}
            placeholder={searchPlaceholder}
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 2,
  },
  filterTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F5F2EC',
    borderWidth: 1,
    borderColor: '#E5DEC9',
  },
  chipActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.goldDark,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.espresso,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: '#F8F6F2',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
});
