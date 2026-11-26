import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  useWindowDimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BedDouble, Plus } from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { Room, RoomStatus } from '../types/pms';
import { SubTabStrip } from '../components/SubTabStrip';

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
  const { state, updateRoomStatusOrRate, addRoomEntity, addBulkRooms } = usePms();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 24 - 10) / 2);

  const [subTab, setSubTab] = useState<'rack' | 'categories'>('rack');
  const [filter, setFilter] = useState<'All' | RoomStatus>('All');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [editRate, setEditRate] = useState('');
  const [editStatus, setEditStatus] = useState<RoomStatus>('Available');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [newRmNo, setNewRmNo] = useState('');
  const [newRmCat, setNewRmCat] = useState('Deluxe');
  const [newRmFloor, setNewRmFloor] = useState('1st Floor');
  const [newRmRate, setNewRmRate] = useState('2500');

  // Bulk Room Creation / Range Builder State (Every row individually editable!)
  const [bulkStartNo, setBulkStartNo] = useState('201');
  const [bulkEndNo, setBulkEndNo] = useState('205');
  const [bulkDefaultFloor, setBulkDefaultFloor] = useState('2nd Floor');
  const [bulkDefaultCat, setBulkDefaultCat] = useState('Deluxe');
  const [bulkDefaultRate, setBulkDefaultRate] = useState('2500');
  const [bulkRows, setBulkRows] = useState<
    Array<{ id: string; number: string; floor: string; category: string; rate: string }>
  >([]);

  const generateBulkPreview = () => {
    const start = parseInt(bulkStartNo, 10);
    const end = parseInt(bulkEndNo, 10);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
      Alert.alert('Invalid Range', 'Enter a valid Start and End room number (e.g. 201 to 205).');
      return;
    }
    if (end - start + 1 > 50) {
      Alert.alert('Limit', 'Generate up to 50 rooms per batch.');
      return;
    }
    const existingSet = new Set(
      state.rooms.map((r) => String(r.number || '').trim().toLowerCase())
    );
    const generated: Array<{ id: string; number: string; floor: string; category: string; rate: string }> = [];
    let skipped = 0;
    for (let n = start; n <= end; n++) {
      const rmStr = String(n);
      if (existingSet.has(rmStr.toLowerCase())) {
        skipped++;
        continue;
      }
      generated.push({
        id: `brow-${n}-${Date.now()}`,
        number: rmStr,
        floor: bulkDefaultFloor.trim() || '1st Floor',
        category: bulkDefaultCat.trim() || 'Deluxe',
        rate: bulkDefaultRate.trim() || '2500',
      });
    }
    setBulkRows(generated);
    if (skipped > 0) {
      Alert.alert('Duplicates Skipped', `${skipped} existing room(s) were skipped automatically.`);
    }
  };

  const filteredRooms = state.rooms.filter((r) =>
    filter === 'All' ? true : r.status === filter
  );

  const categorySummary = Array.from(
    new Set(state.rooms.map((r) => r.category || 'Standard'))
  ).map((cat) => {
    const rms = state.rooms.filter((r) => (r.category || 'Standard') === cat);
    const avail = rms.filter((r) => r.status === 'Available' || r.status === 'Clean').length;
    const avgRate =
      rms.length > 0
        ? Math.round(rms.reduce((s, r) => s + (Number(r.rate) || 0), 0) / rms.length)
        : 0;
    return { cat, total: rms.length, avail, avgRate };
  });

  const openRoomEditor = (rm: Room) => {
    setSelectedRoom(rm);
    setEditRate(String(rm.rate || 2000));
    setEditStatus(rm.status);
  };

  return (
    <View style={styles.root}>
      <SubTabStrip
        activeId={subTab}
        onSelect={(id) => setSubTab(id as any)}
        tabs={[
          { id: 'rack', label: 'Room Status Board', count: state.rooms.length },
          { id: 'categories', label: 'Categories & Tariffs', count: categorySummary.length },
        ]}
      />

      {subTab === 'rack' ? (
        <>
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
                      <Text style={[styles.filterText, active && styles.filterTextActive]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setAddModalOpen(true)}
              style={styles.addRoomBtn}
            >
              <Plus size={14} color={COLORS.espresso} />
              <Text style={styles.addRoomBtnText}>Add Room</Text>
            </TouchableOpacity>
          </View>

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
                  style={[styles.roomCard, { width: cardWidth, borderColor: palette.border }]}
                >
                  <View style={styles.roomHeader}>
                    <View style={styles.roomNumBadge}>
                      <BedDouble size={13} color={COLORS.goldDark} />
                      <Text style={styles.roomNumText}>{rm.number}</Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: palette.bg }]}>
                      <Text
                        style={[styles.statusTagText, { color: palette.text }]}
                        numberOfLines={1}
                      >
                        {rm.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.catText} numberOfLines={1}>
                    {rm.category || 'Standard'}
                  </Text>
                  <Text style={styles.rateText}>
                    ₹{Number(rm.rate || 0).toLocaleString('en-IN')}/night
                  </Text>
                  {activeStay ? (
                    <Text style={styles.guestTag} numberOfLines={1}>
                      Guest: {activeStay.guestName}
                    </Text>
                  ) : (
                    <Text style={styles.readyTag} numberOfLines={1}>
                      Tap to update status / rate
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
          {categorySummary.map((c) => (
            <View key={c.cat} style={styles.catCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.catTitle}>{c.cat}</Text>
                <Text style={styles.catMeta}>
                  {c.avail} Available out of {c.total} Rooms
                </Text>
              </View>
              <Text style={styles.catAvg}>₹{c.avgRate.toLocaleString('en-IN')}/night</Text>
            </View>
          ))}
        </ScrollView>
      )}

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
                            backgroundColor: COLORS.gold,
                            borderColor: COLORS.goldDark,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceChipText,
                            editStatus === st && { color: COLORS.espresso },
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

      {/* Add Room / Bulk Room Creation Modal */}
      <Modal visible={addModalOpen} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Add Hotel Rooms (Single &amp; Bulk Range)</Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TouchableOpacity
                onPress={() => setAddMode('single')}
                style={[
                  styles.filterChip,
                  { flex: 1, alignItems: 'center' },
                  addMode === 'single' && styles.filterChipActive,
                ]}
              >
                <Text style={[styles.filterText, addMode === 'single' && styles.filterTextActive]}>
                  Single Room
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAddMode('bulk')}
                style={[
                  styles.filterChip,
                  { flex: 1, alignItems: 'center' },
                  addMode === 'bulk' && styles.filterChipActive,
                ]}
              >
                <Text style={[styles.filterText, addMode === 'bulk' && styles.filterTextActive]}>
                  Bulk Room Range
                </Text>
              </TouchableOpacity>
            </View>

            {addMode === 'single' ? (
              <>
                <Text style={styles.label}>Room Number *</Text>
                <TextInput
                  value={newRmNo}
                  onChangeText={setNewRmNo}
                  placeholder="e.g. 204"
                  style={styles.input}
                />
                <Text style={styles.label}>Floor</Text>
                <TextInput
                  value={newRmFloor}
                  onChangeText={setNewRmFloor}
                  placeholder="1st Floor"
                  style={styles.input}
                />
                <Text style={styles.label}>Room Category</Text>
                <TextInput
                  value={newRmCat}
                  onChangeText={setNewRmCat}
                  placeholder="Deluxe / Suite / Standard"
                  style={styles.input}
                />
                <Text style={styles.label}>Nightly Tariff (₹)</Text>
                <TextInput
                  value={newRmRate}
                  onChangeText={setNewRmRate}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setAddModalOpen(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!newRmNo.trim()) {
                        Alert.alert('Required', 'Enter room number.');
                        return;
                      }
                      const dup = state.rooms.some(
                        (r) => String(r.number || '').trim().toLowerCase() === newRmNo.trim().toLowerCase()
                      );
                      if (dup) {
                        Alert.alert('Duplicate Room', `Room ${newRmNo.trim()} already exists.`);
                        return;
                      }
                      await addRoomEntity({
                        number: newRmNo.trim(),
                        category: newRmCat.trim() || 'Deluxe',
                        floor: newRmFloor.trim() || '1st Floor',
                        bedType: 'Queen',
                        rate: Number(newRmRate) || 2000,
                      });
                      setNewRmNo('');
                      setAddModalOpen(false);
                    }}
                    style={styles.saveBtn}
                  >
                    <Text style={styles.saveBtnText}>Create Room</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Start No</Text>
                    <TextInput
                      value={bulkStartNo}
                      onChangeText={setBulkStartNo}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>End No</Text>
                    <TextInput
                      value={bulkEndNo}
                      onChangeText={setBulkEndNo}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Default Floor</Text>
                    <TextInput
                      value={bulkDefaultFloor}
                      onChangeText={setBulkDefaultFloor}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Default Category</Text>
                    <TextInput
                      value={bulkDefaultCat}
                      onChangeText={setBulkDefaultCat}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 0.8 }}>
                    <Text style={styles.label}>Price ₹</Text>
                    <TextInput
                      value={bulkDefaultRate}
                      onChangeText={setBulkDefaultRate}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                  <TouchableOpacity
                    onPress={generateBulkPreview}
                    style={[styles.saveBtn, { flex: 1, paddingVertical: 8 }]}
                  >
                    <Text style={styles.saveBtnText}>Generate Preview Rows</Text>
                  </TouchableOpacity>
                  {bulkRows.length > 0 && (
                    <TouchableOpacity
                      onPress={() =>
                        setBulkRows((prev) =>
                          prev.map((row) => ({
                            ...row,
                            floor: bulkDefaultFloor.trim() || row.floor,
                            category: bulkDefaultCat.trim() || row.category,
                            rate: bulkDefaultRate.trim() || row.rate,
                          }))
                        )
                      }
                      style={[styles.cancelBtn, { flex: 0.9, paddingVertical: 8 }]}
                    >
                      <Text style={styles.cancelBtnText}>Apply Defaults All</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {bulkRows.map((row, idx) => (
                  <View
                    key={row.id}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 10,
                      padding: 8,
                      marginBottom: 8,
                      backgroundColor: COLORS.bg,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.espresso }}>
                        Room Row #{idx + 1}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setBulkRows((prev) => prev.filter((r) => r.id !== row.id))}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.rose }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TextInput
                        value={row.number}
                        onChangeText={(v) =>
                          setBulkRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, number: v } : r))
                          )
                        }
                        placeholder="No"
                        style={[styles.input, { flex: 0.7, marginBottom: 0 }]}
                      />
                      <TextInput
                        value={row.floor}
                        onChangeText={(v) =>
                          setBulkRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, floor: v } : r))
                          )
                        }
                        placeholder="Floor"
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      />
                      <TextInput
                        value={row.category}
                        onChangeText={(v) =>
                          setBulkRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, category: v } : r))
                          )
                        }
                        placeholder="Category"
                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                      />
                      <TextInput
                        value={row.rate}
                        onChangeText={(v) =>
                          setBulkRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, rate: v } : r))
                          )
                        }
                        keyboardType="numeric"
                        placeholder="₹"
                        style={[styles.input, { flex: 0.8, marginBottom: 0 }]}
                      />
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={() =>
                    setBulkRows((prev) => [
                      ...prev,
                      {
                        id: `brow-add-${Date.now()}`,
                        number: '',
                        floor: bulkDefaultFloor.trim() || '1st Floor',
                        category: bulkDefaultCat.trim() || 'Deluxe',
                        rate: bulkDefaultRate.trim() || '2500',
                      },
                    ])
                  }
                  style={[styles.cancelBtn, { marginBottom: 10, paddingVertical: 8 }]}
                >
                  <Text style={styles.cancelBtnText}>+ Add Custom Room Row</Text>
                </TouchableOpacity>

                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setAddModalOpen(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (bulkRows.length === 0) {
                        Alert.alert('No Rows', 'Generate preview rows or tap + Add Custom Room Row.');
                        return;
                      }
                      const res = await addBulkRooms(
                        bulkRows.map((r) => ({
                          number: r.number,
                          floor: r.floor,
                          category: r.category,
                          rate: Number(r.rate) || 2000,
                        }))
                      );
                      Alert.alert(
                        'Bulk Rooms Created',
                        `Added ${res.createdCount} room(s)${
                          res.skippedDuplicates.length > 0
                            ? `. Skipped duplicate(s): ${res.skippedDuplicates.join(', ')}`
                            : '.'
                        }`
                      );
                      setBulkRows([]);
                      setAddModalOpen(false);
                    }}
                    style={styles.saveBtn}
                  >
                    <Text style={styles.saveBtnText}>Save {bulkRows.length} Room(s)</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  filterWrap: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterRow: { flexDirection: 'row', gap: 7, paddingRight: 6 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: { backgroundColor: COLORS.gold, borderWidth: 1, borderColor: COLORS.goldDark },
  filterText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.espresso, fontWeight: '800' },
  addRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  },
  addRoomBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.espresso },
  grid: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 28,
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  roomNumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF0D7',
    borderWidth: 1,
    borderColor: '#E5CE9A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomNumText: { color: COLORS.espresso, fontWeight: '800', fontSize: 12 },
  statusTag: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, flexShrink: 1 },
  statusTagText: { fontSize: 9.5, fontWeight: '800' },
  catText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  rateText: { fontSize: 14, fontWeight: '900', color: COLORS.goldDark, marginTop: 2 },
  guestTag: { fontSize: 11, fontWeight: '700', color: COLORS.rose, marginTop: 6 },
  readyTag: { fontSize: 10.5, color: COLORS.textMuted, marginTop: 6 },
  catCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary },
  catMeta: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  catAvg: { fontSize: 14.5, fontWeight: '900', color: COLORS.goldDark },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 18,
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
    paddingVertical: 0,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.gold,
    borderWidth: 1,
    borderColor: COLORS.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontWeight: '800', color: COLORS.espresso },
});
