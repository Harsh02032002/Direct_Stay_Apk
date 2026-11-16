import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Search, Calendar, X } from 'lucide-react-native';
import { COLORS } from '../theme/colors';

export type QuickDateFilter = 'all' | 'today' | 'yesterday' | 'upcoming' | 'month' | 'custom';

interface DateFilterBarProps {
  activeFilter: QuickDateFilter;
  onChangeFilter: (f: QuickDateFilter) => void;
  fromDate?: string;
  toDate?: string;
  onChangeFromDate?: (d: string) => void;
  onChangeToDate?: (d: string) => void;
  searchQuery?: string;
  onChangeSearch?: (q: string) => void;
  searchPlaceholder?: string;
  showUpcoming?: boolean;
}

function toLocalIsoDate(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeFilterDate(raw?: string): string {
  if (!raw) return '';
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return toLocalIsoDate(parsed);
  return s.slice(0, 10);
}

export function matchesQuickDateFilter(
  dateStr: string | undefined,
  filter: QuickDateFilter,
  fromDate?: string,
  toDate?: string
): boolean {
  if (filter === 'all') return true;
  if (!dateStr) return false;
  const clean = normalizeFilterDate(dateStr);
  if (!clean) return false;

  const now = new Date();
  const todayStr = toLocalIsoDate(now);
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = toLocalIsoDate(yest);

  if (filter === 'today') return clean === todayStr;
  if (filter === 'yesterday') return clean === yesterdayStr;
  if (filter === 'upcoming') return clean >= todayStr;
  if (filter === 'month') return clean.slice(0, 7) === todayStr.slice(0, 7);
  if (filter === 'custom') {
    const f = normalizeFilterDate(fromDate);
    const t = normalizeFilterDate(toDate);
    if (f && clean < f) return false;
    if (t && clean > t) return false;
    return true;
  }
  return true;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  activeFilter,
  onChangeFilter,
  fromDate,
  toDate,
  onChangeFromDate,
  onChangeToDate,
  searchQuery,
  onChangeSearch,
  searchPlaceholder = 'Search guest, room, ID...',
  showUpcoming = false,
}) => {
  const supportsCustomRange = Boolean(onChangeFromDate || onChangeToDate);

  const options: Array<{ id: QuickDateFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    ...(showUpcoming ? [{ id: 'upcoming' as QuickDateFilter, label: 'Upcoming' }] : []),
    { id: 'month', label: 'This Month' },
    ...(supportsCustomRange ? [{ id: 'custom' as QuickDateFilter, label: 'From → To' }] : []),
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
          <Text style={styles.filterTagText}>Date:</Text>
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

      {supportsCustomRange && activeFilter === 'custom' && (
        <View style={styles.rangeRow}>
          <View style={styles.rangeField}>
            <Text style={styles.rangeLabel}>From</Text>
            <TextInput
              value={fromDate || ''}
              onChangeText={(val) => onChangeFromDate?.(val)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              style={styles.rangeInput}
            />
          </View>
          <Text style={styles.rangeArrow}>→</Text>
          <View style={styles.rangeField}>
            <Text style={styles.rangeLabel}>To</Text>
            <TextInput
              value={toDate || ''}
              onChangeText={(val) => onChangeToDate?.(val)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              style={styles.rangeInput}
            />
          </View>
          {Boolean(fromDate || toDate) && (
            <TouchableOpacity
              onPress={() => {
                onChangeFromDate?.('');
                onChangeToDate?.('');
              }}
              style={styles.clearRangeBtn}
            >
              <X size={13} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

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
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rangeField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#E5DEC9',
  },
  rangeLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.goldDark,
  },
  rangeInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  rangeArrow: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  clearRangeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
