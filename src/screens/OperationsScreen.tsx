import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { UtensilsCrossed, Sparkles, Wallet, Users, CheckCircle2 } from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';

type OpsSubTab = 'pos' | 'housekeeping' | 'expenses' | 'staff';

export const OperationsScreen: React.FC = () => {
  const { state, createPosOrder, markHousekeepingTaskStatus, addExpenseEntry } = usePms();
  const [subTab, setSubTab] = useState<OpsSubTab>('pos');

  // POS Cart State
  const [cart, setCart] = useState<Record<string, number>>({});
  const [posRoom, setPosRoom] = useState('');
  const [postToRoom, setPostToRoom] = useState(true);

  // Expense Form State
  const [expCategory, setExpCategory] = useState('Housekeeping');
  const [expVendor, setExpVendor] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');

  const addItemQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const cartItems = state.posItems
    .filter((i) => cart[i.id] > 0)
    .map((i) => ({ itemId: i.id, name: i.name, quantity: cart[i.id], price: i.price }));
  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <View style={styles.root}>
      {/* Sub-Tabs */}
      <View style={styles.subBar}>
        {[
          { key: 'pos', label: 'POS Food', Icon: UtensilsCrossed },
          { key: 'housekeeping', label: 'Cleaning', Icon: Sparkles },
          { key: 'expenses', label: 'Expenses', Icon: Wallet },
          { key: 'staff', label: 'Staff', Icon: Users },
        ].map(({ key, label, Icon }) => {
          const active = subTab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setSubTab(key as OpsSubTab)}
              style={[styles.subBtn, active && styles.subBtnActive]}
            >
              <Icon size={13} color={active ? COLORS.goldBright : COLORS.textSecondary} />
              <Text style={[styles.subText, active && styles.subTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 1. POS RESTAURANT TERMINAL */}
        {subTab === 'pos' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Restaurant POS & Room Service</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TouchableOpacity
                onPress={() => setPostToRoom(true)}
                style={[styles.modeBtn, postToRoom && styles.modeBtnActive]}
              >
                <Text style={[styles.modeText, postToRoom && styles.modeTextActive]}>
                  Post to Room Folio
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPostToRoom(false)}
                style={[styles.modeBtn, !postToRoom && styles.modeBtnActive]}
              >
                <Text style={[styles.modeText, !postToRoom && styles.modeTextActive]}>
                  Direct Paid (Walk-In)
                </Text>
              </TouchableOpacity>
            </View>

            {postToRoom && (
              <TextInput
                value={posRoom}
                onChangeText={setPosRoom}
                placeholder="Enter Occupied Room Number (e.g. 101)"
                style={styles.input}
              />
            )}

            {state.posItems.length === 0 ? (
              <Text style={styles.muted}>No POS menu items configured on this property yet.</Text>
            ) : (
              state.posItems.slice(0, 20).map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <View key={item.id} style={styles.menuRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuName}>{item.name}</Text>
                      <Text style={styles.menuMeta}>
                        {item.category} • ₹{item.price}
                      </Text>
                    </View>
                    <View style={styles.qtyBox}>
                      <TouchableOpacity
                        onPress={() => addItemQty(item.id, -1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyVal}>{qty}</Text>
                      <TouchableOpacity
                        onPress={() => addItemQty(item.id, 1)}
                        style={styles.qtyBtn}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {cartItems.length > 0 && (
              <TouchableOpacity
                onPress={async () => {
                  if (postToRoom && !posRoom.trim()) {
                    Alert.alert('Room Required', 'Enter room number to post order to Room Folio.');
                    return;
                  }
                  const res = await createPosOrder({
                    roomNumber: posRoom.trim(),
                    guestName: posRoom ? `Room ${posRoom}` : 'Diner',
                    items: cartItems,
                    postToRoom,
                    paymentMethod: 'UPI',
                  });
                  if (res.ok) {
                    setCart({});
                    Alert.alert('KOT & Order Saved', 'POS order synced to live hotel server.');
                  }
                }}
                style={styles.actionBtn}
              >
                <Text style={styles.actionBtnText}>
                  Place Order (₹{cartTotal} + 5% GST)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 2. HOUSEKEEPING */}
        {subTab === 'housekeeping' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Housekeeping & Dirty Rooms Turnaround</Text>
            {state.cleaningLogs.length === 0 ? (
              <Text style={styles.muted}>All rooms clean — no pending housekeeping tasks.</Text>
            ) : (
              state.cleaningLogs.slice(0, 20).map((log) => {
                const done = log.status === 'Cleaned' || log.status === 'Inspected';
                return (
                  <View key={log.id} style={styles.menuRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuName}>
                        Room {log.roomNumber} • {log.cleaningType || 'Cleaning'}
                      </Text>
                      <Text style={styles.menuMeta}>
                        {log.assignedStaff} • {log.date} • {log.status}
                      </Text>
                    </View>
                    {!done ? (
                      <TouchableOpacity
                        onPress={() =>
                          markHousekeepingTaskStatus(log.id, 'Cleaned', log.roomNumber)
                        }
                        style={styles.cleanBtn}
                      >
                        <CheckCircle2 size={13} color="#FFF" />
                        <Text style={styles.cleanBtnText}>Mark Clean</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.emerald }}>
                        Cleaned ✓
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* 3. EXPENSES & FINANCE */}
        {subTab === 'expenses' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Record Property Expense</Text>
            <TextInput
              value={expCategory}
              onChangeText={setExpCategory}
              placeholder="Category (e.g. Housekeeping, Utilities)"
              style={styles.input}
            />
            <TextInput
              value={expVendor}
              onChangeText={setExpVendor}
              placeholder="Vendor / Payee Name"
              style={styles.input}
            />
            <TextInput
              value={expDesc}
              onChangeText={setExpDesc}
              placeholder="Description"
              style={styles.input}
            />
            <TextInput
              value={expAmt}
              onChangeText={setExpAmt}
              keyboardType="numeric"
              placeholder="Amount (₹)"
              style={styles.input}
            />
            <TouchableOpacity
              onPress={async () => {
                if (!Number(expAmt)) {
                  Alert.alert('Amount Required', 'Enter valid expense amount.');
                  return;
                }
                await addExpenseEntry({
                  category: expCategory || 'Miscellaneous',
                  vendorName: expVendor || 'Local Vendor',
                  description: expDesc || 'Operational Expense',
                  amount: Number(expAmt),
                  paymentMethod: 'UPI',
                });
                setExpVendor('');
                setExpDesc('');
                setExpAmt('');
                Alert.alert('Expense Saved', 'Synced to live Finance ledger.');
              }}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>Save Expense</Text>
            </TouchableOpacity>

            <Text style={[styles.cardTitle, { marginTop: 18 }]}>Recent Expenses</Text>
            {state.expenses.slice(0, 10).map((ex) => (
              <View key={ex.id} style={styles.menuRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuName}>{ex.description || ex.category}</Text>
                  <Text style={styles.menuMeta}>
                    {ex.category} • {ex.date}
                  </Text>
                </View>
                <Text style={styles.expAmtText}>
                  ₹{Number(ex.amount || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 4. STAFF DIRECTORY */}
        {subTab === 'staff' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Property Staff ({state.staff.length})</Text>
            {state.staff.length === 0 ? (
              <Text style={styles.muted}>No staff records added yet.</Text>
            ) : (
              state.staff.map((st) => (
                <View key={st.id} style={styles.menuRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuName}>{st.name}</Text>
                    <Text style={styles.menuMeta}>
                      {st.designation || st.department} • +91 {st.mobile}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.emerald }}>
                    {st.status}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  subBar: {
    flexDirection: 'row',
    padding: 10,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  subBtnActive: { backgroundColor: COLORS.espresso },
  subText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  subTextActive: { color: COLORS.goldBright, fontWeight: '800' },
  scroll: { padding: 14, paddingBottom: 30 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: COLORS.espresso, borderColor: COLORS.gold },
  modeText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary },
  modeTextActive: { color: COLORS.goldBright, fontWeight: '800' },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 9,
    backgroundColor: '#FAFAFA',
  },
  muted: { fontSize: 12, color: COLORS.textMuted, paddingVertical: 10 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  menuName: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  menuMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  qtyVal: { fontSize: 13, fontWeight: '800', minWidth: 16, textAlign: 'center' },
  actionBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: COLORS.goldBright, fontSize: 13, fontWeight: '800' },
  cleanBtn: {
    backgroundColor: COLORS.emerald,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  cleanBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  expAmtText: { fontSize: 13.5, fontWeight: '800', color: COLORS.rose },
});
