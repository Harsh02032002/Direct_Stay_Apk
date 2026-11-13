import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import { BedDouble } from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { Room, RoomStatus } from '../types/pms';

const STATUS_FILTERS: Array<'All' | RoomStatus> = [
  'All',
  'Available',
  'Occupied',
  'Reserved',
  'Dirty',
  'Blocked',
];

function statusColors(status: RoomStatus) {
  switch (status) {
    case 'Available':
    case 'Clean':
      return { bg: COLORS.emeraldSoft, text: COLORS.emerald, border: COLORS.emeraldBorder };
    case 'Occupied':
      return { bg: COLORS.roseSoft, text: COLORS.rose, border: COLORS.roseBorder };
    case 'Reserved':
      return { bg: COLORS.blueSoft, text: COLORS.blue, border: COLORS.blueBorder };
    case 'Dirty':
      return { bg: COLORS.amberSoft, text: COLORS.amber, border: COLORS.amberBorder };
    default:
      return { bg: '#F1F5F9', text: COLORS.textSecondary, border: COLORS.border };
  }
}

export const RoomsScreen: React.FC = () => {
  const { state, updateRoomStatusOrRate } = usePms();
  const [filter, setFilter] = useState<'All' | RoomStatus>('All');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [editRate, setEditRate] = useState('');
  const [editStatus, setEditStatus] = useState<RoomStatus>('Available');

  const filteredRooms = state.rooms.filter((r) =>
    filter === 'All' ? true : r.status === filter
  );

  const openRoomEditor = (rm: Room) => {
    setSelectedRoom(rm);
    setEditRate(String(rm.rate || 2000));
    setEditStatus(rm.status);
  };

  return (
    <View style={styles.root}>
      {/* Filter Bar */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {STATUS_FILTERS.map((st) => {
              const active = filter === st;
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => setFilter(st)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>{st}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Room Rack Grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {filteredRooms.map((rm) => {
          const palette = statusColors(rm.status);
          const activeStay = state.bookings.find(
            (b) =>
              b.roomNumber === rm.number &&
              (b.isCheckedIn || b.status === 'Checked In') &&
              !b.isCompleted
          );
          return (
            <TouchableOpacity
              key={rm.id}
              activeOpacity={0.85}
              onPress={() => openRoomEditor(rm)}
              style={[styles.roomCard, { borderColor: palette.border }]}
            >
              <View style={styles.roomHeader}>
                <View style={styles.roomNumBadge}>
                  <BedDouble size={14} color={COLORS.goldBright} />
                  <Text style={styles.roomNumText}>{rm.number}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: palette.bg }]}>
                  <Text style={[styles.statusTagText, { color: palette.text }]}>{rm.status}</Text>
                </View>
              </View>
              <Text style={styles.catText}>{rm.category || 'Standard'}</Text>
              <Text style={styles.rateText}>₹{Number(rm.rate || 0).toLocaleString('en-IN')}/night</Text>
              {activeStay ? (
                <Text style={styles.guestTag} numberOfLines={1}>
                  Guest: {activeStay.guestName}
                </Text>
              ) : (
                <Text style={styles.readyTag}>Tap to update status / tariff</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Room Quick Update Modal */}
      <Modal visible={Boolean(selectedRoom)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedRoom && (
              <>
                <Text style={styles.modalTitle}>
                  Room {selectedRoom.number} ({selectedRoom.category})
                </Text>
                <Text style={styles.label}>Room Status</Text>
                <View style={styles.statusChoices}>
                  {(['Available', 'Occupied', 'Reserved', 'Dirty', 'Blocked'] as RoomStatus[]).map(
                    (st) => (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setEditStatus(st)}
                        style={[
                          styles.choiceChip,
                          editStatus === st && {
                            backgroundColor: COLORS.espresso,
                            borderColor: COLORS.gold,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceChipText,
                            editStatus === st && { color: COLORS.goldBright },
                          ]}
                        >
                          {st}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>

                <Text style={styles.label}>Nightly Tariff (₹)</Text>
                <TextInput
                  value={editRate}
                  onChangeText={setEditRate}
                  keyboardType="numeric"
                  style={styles.input}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => setSelectedRoom(null)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      await updateRoomStatusOrRate(
                        selectedRoom.id,
                        editStatus,
                        Number(editRate) || selectedRoom.rate
                      );
                      setSelectedRoom(null);
                    }}
                    style={styles.saveBtn}
                  >
                    <Text style={styles.saveBtnText}>Save & Sync Live</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  filterWrap: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: { backgroundColor: COLORS.espresso },
  filterText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.goldBright, fontWeight: '800' },
  grid: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 28,
  },
  roomCard: {
    width: '48.3%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1.5,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomNumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.espresso,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomNumText: { color: COLORS.goldBright, fontWeight: '800', fontSize: 12.5 },
  statusTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statusTagText: { fontSize: 10, fontWeight: '800' },
  catText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  rateText: { fontSize: 14, fontWeight: '900', color: COLORS.goldDark, marginTop: 2 },
  guestTag: { fontSize: 11, fontWeight: '700', color: COLORS.rose, marginTop: 6 },
  readyTag: { fontSize: 10.5, color: COLORS.textMuted, marginTop: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  label: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  statusChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  choiceChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  choiceChipText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textPrimary },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontWeight: '700', color: COLORS.textSecondary },
  saveBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 11,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontWeight: '800', color: COLORS.goldBright },
});
