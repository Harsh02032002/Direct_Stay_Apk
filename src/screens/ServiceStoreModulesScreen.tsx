import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { CheckCircle2, Plus, Sparkles, UtensilsCrossed, Boxes, Globe2 } from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { SubTabStrip } from '../components/SubTabStrip';
import { DateFilterBar, matchesQuickDateFilter, QuickDateFilter } from '../components/DateFilterBar';

interface Props {
  moduleId: 'housekeeping' | 'pos' | 'inventory' | 'otaManager';
}

export const ServiceStoreModulesScreen: React.FC<Props> = ({ moduleId }) => {
  const {
    state,
    markHousekeepingTaskStatus,
    addHousekeepingTask,
    addLaundryOrder,
    addLostFoundItem,
    updateRoomStatusOrRate,
    createPosOrder,
    addPosMenuItem,
    addInventoryProduct,
    adjustInventoryStock,
    addInventoryPurchase,
    addVendorRecord,
    addTravelAgent,
    upsertOtaChannel,
  } = usePms();

  const [dateFilter, setDateFilter] = useState<QuickDateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Housekeeping state
  const [hkTab, setHkTab] = useState<'cleaning' | 'laundry' | 'lostfound'>('cleaning');
  const [hkRoom, setHkRoom] = useState(state.rooms[0]?.number || '101');
  const [hkStaff, setHkStaff] = useState('Housekeeping Team');
  const [lnGuest, setLnGuest] = useState('');
  const [lnDesc, setLnDesc] = useState('Shirts & Trousers');
  const [lnAmt, setLnAmt] = useState('250');
  const [lfItem, setLfItem] = useState('');
  const [lfRoom, setLfRoom] = useState('101');

  // POS state
  const [posTab, setPosTab] = useState<'terminal' | 'orders' | 'menu'>('terminal');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [posRoom, setPosRoom] = useState(state.rooms[0]?.number || '101');
  const [postToRoom, setPostToRoom] = useState(true);
  const [menuName, setMenuName] = useState('');
  const [menuCat, setMenuCat] = useState('Main Course');
  const [menuPrice, setMenuPrice] = useState('220');

  // Inventory state
  const [invTab, setInvTab] = useState<'stock' | 'po' | 'vendors'>('stock');
  const [prodName, setProdName] = useState('');
  const [prodStock, setProdStock] = useState('20');
  const [prodPrice, setProdPrice] = useState('100');
  const [poSupplier, setPoSupplier] = useState('');
  const [poItem, setPoItem] = useState('');
  const [poQty, setPoQty] = useState('10');
  const [poCost, setPoCost] = useState('1500');
  const [vndName, setVndName] = useState('');
  const [vndPhone, setVndPhone] = useState('');
  const [vndCat, setVndCat] = useState('Housekeeping & Linen');

  // OTA state
  const [otaTab, setOtaTab] = useState<'channels' | 'agents' | 'feed'>('channels');
  const [otaName, setOtaName] = useState('MakeMyTrip / Goibibo');
  const [otaComm, setOtaComm] = useState('15');
  const [agName, setAgName] = useState('');
  const [agAgency, setAgAgency] = useState('');
  const [agMobile, setAgMobile] = useState('');
  const [agComm, setAgComm] = useState('10');

  // ---------------- 1. HOUSEKEEPING ----------------
  if (moduleId === 'housekeeping') {
    const dirtyRooms = state.rooms.filter((r) => r.status === 'Dirty');
    const filteredLogs = state.cleaningLogs.filter((l) => {
      if (!matchesQuickDateFilter(l.date, dateFilter)) return false;
      if (searchQuery.trim()) {
        return `${l.roomNumber} ${l.assignedStaff} ${l.notes}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      }
      return true;
    });

    return (
      <View style={styles.root}>
        <SubTabStrip
          activeId={hkTab}
          onSelect={(id) => setHkTab(id as any)}
          tabs={[
            {
              id: 'cleaning',
              label: 'Room Cleaning Queue',
              count: dirtyRooms.length + state.cleaningLogs.filter((l) => l.status !== 'Completed').length,
              Icon: Sparkles,
            },
            { id: 'laundry', label: 'Laundry Desk', count: state.laundryOrders.length },
            { id: 'lostfound', label: 'Lost & Found', count: state.lostAndFound.length },
          ]}
        />
        <DateFilterBar
          activeFilter={dateFilter}
          onChangeFilter={setDateFilter}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          searchPlaceholder="Search room, staff, item..."
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          {hkTab === 'cleaning' && (
            <>
              {dirtyRooms.length > 0 && (
                <View style={[styles.card, { borderColor: COLORS.amber }]}>
                  <Text style={styles.cardTitle}>
                    Dirty Rooms Needing Cleaning ({dirtyRooms.length})
                  </Text>
                  {dirtyRooms.map((rm) => (
                    <View key={rm.id} style={styles.rowItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>
                          Room {rm.number} ({rm.category})
                        </Text>
                        <Text style={styles.rowSub}>Marked Dirty — Checkout / Turnaround</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => updateRoomStatusOrRate(rm.id, 'Available')}
                        style={[styles.smallBtn, { backgroundColor: COLORS.emerald }]}
                      >
                        <CheckCircle2 size={13} color="#FFF" />
                        <Text style={styles.smallBtnText}>Mark Clean</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Assign Cleaning Task</Text>
                <View style={styles.twoCol}>
                  <TextInput
                    value={hkRoom}
                    onChangeText={setHkRoom}
                    placeholder="Room No (e.g. 101)"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TextInput
                    value={hkStaff}
                    onChangeText={setHkStaff}
                    placeholder="Staff Name"
                    style={[styles.input, { flex: 1.3 }]}
                  />
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    await addHousekeepingTask({
                      roomNumber: hkRoom || '101',
                      assignedStaff: hkStaff || 'Housekeeping',
                      cleaningType: 'Daily Cleaning',
                    });
                    Alert.alert('Task Assigned', `Room ${hkRoom} added to cleaning queue.`);
                  }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>+ Assign Housekeeping Task</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Housekeeping Log ({filteredLogs.length})</Text>
                {filteredLogs.length === 0 ? (
                  <Text style={styles.emptyText}>No cleaning tasks for selected filter.</Text>
                ) : (
                  filteredLogs.map((log) => (
                    <View key={log.id} style={styles.rowItem}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.rowTitle}>
                          Room {log.roomNumber} • {log.cleaningType || 'Cleaning'}
                        </Text>
                        <Text style={styles.rowSub}>
                          {log.date} • {log.assignedStaff} • {log.status}
                        </Text>
                      </View>
                      {log.status !== 'Completed' && (
                        <TouchableOpacity
                          onPress={() =>
                            markHousekeepingTaskStatus(log.id, 'Completed', log.roomNumber)
                          }
                          style={[styles.smallBtn, { backgroundColor: COLORS.emerald }]}
                        >
                          <Text style={styles.smallBtnText}>Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            </>
          )}

          {hkTab === 'laundry' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Laundry & Linen Orders</Text>
              <View style={styles.twoCol}>
                <TextInput
                  value={hkRoom}
                  onChangeText={setHkRoom}
                  placeholder="Room No"
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  value={lnGuest}
                  onChangeText={setLnGuest}
                  placeholder="Guest Name"
                  style={[styles.input, { flex: 1.5 }]}
                />
              </View>
              <View style={styles.twoCol}>
                <TextInput
                  value={lnDesc}
                  onChangeText={setLnDesc}
                  placeholder="Items"
                  style={[styles.input, { flex: 1.5 }]}
                />
                <TextInput
                  value={lnAmt}
                  onChangeText={setLnAmt}
                  keyboardType="numeric"
                  placeholder="Amount ₹"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <TouchableOpacity
                onPress={async () => {
                  await addLaundryOrder({
                    roomNumber: hkRoom || '101',
                    guestName: lnGuest || 'In-House Guest',
                    itemsSummary: lnDesc,
                    amount: Number(lnAmt) || 0,
                  });
                  setLnGuest('');
                  Alert.alert('Saved', 'Laundry order synced live.');
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>+ Add Laundry Ticket</Text>
              </TouchableOpacity>

              {state.laundryOrders.map((o) => (
                <View key={o.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      Rm {o.roomNumber} — {o.guestName || 'Guest'}
                    </Text>
                    <Text style={styles.rowSub}>{o.itemsSummary || 'Laundry'}</Text>
                  </View>
                  <Text style={styles.amtText}>₹{o.amount}</Text>
                </View>
              ))}
            </View>
          )}

          {hkTab === 'lostfound' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Lost & Found Register</Text>
              <View style={styles.twoCol}>
                <TextInput
                  value={lfItem}
                  onChangeText={setLfItem}
                  placeholder="Found Item Name"
                  style={[styles.input, { flex: 1.5 }]}
                />
                <TextInput
                  value={lfRoom}
                  onChangeText={setLfRoom}
                  placeholder="Room / Area"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <TouchableOpacity
                onPress={async () => {
                  if (!lfItem.trim()) return;
                  await addLostFoundItem({
                    itemName: lfItem,
                    roomNumber: lfRoom,
                    foundBy: 'Housekeeping',
                  });
                  setLfItem('');
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>+ Log Found Item</Text>
              </TouchableOpacity>
              {state.lostAndFound.map((lf) => (
                <View key={lf.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{lf.itemName}</Text>
                    <Text style={styles.rowSub}>
                      Location: {lf.roomNumber || 'Lobby'} • {lf.date}
                    </Text>
                  </View>
                  <Text style={styles.badgeTag}>{lf.status}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------------- 2. POS TERMINAL & FOOD ----------------
  if (moduleId === 'pos') {
    const selectedItems = state.posItems
      .filter((it) => (cart[it.id] || 0) > 0)
      .map((it) => ({
        itemId: it.id,
        name: it.name,
        quantity: cart[it.id],
        price: it.price,
      }));
    const cartTotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);

    return (
      <View style={styles.root}>
        <SubTabStrip
          activeId={posTab}
          onSelect={(id) => setPosTab(id as any)}
          tabs={[
            { id: 'terminal', label: 'POS Billing / KOT', Icon: UtensilsCrossed },
            { id: 'orders', label: 'Food Orders', count: state.posOrders.length },
            { id: 'menu', label: 'Menu Master', count: state.posItems.length },
          ]}
        />
        {posTab === 'orders' && (
          <DateFilterBar
            activeFilter={dateFilter}
            onChangeFilter={setDateFilter}
            searchQuery={searchQuery}
            onChangeSearch={setSearchQuery}
            searchPlaceholder="Search order room, guest..."
          />
        )}
        <ScrollView contentContainerStyle={styles.scroll}>
          {posTab === 'terminal' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Restaurant & Room Service KOT</Text>
              <View style={styles.twoCol}>
                <TextInput
                  value={posRoom}
                  onChangeText={setPosRoom}
                  placeholder="Room / Table No"
                  style={[styles.input, { flex: 1 }]}
                />
                <TouchableOpacity
                  onPress={() => setPostToRoom((p) => !p)}
                  style={[
                    styles.toggleBtn,
                    postToRoom && { backgroundColor: COLORS.espresso },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      postToRoom && { color: COLORS.goldBright },
                    ]}
                  >
                    {postToRoom ? 'Post to Room Folio' : 'Direct Cash/UPI'}
                  </Text>
                </TouchableOpacity>
              </View>

              {state.posItems.length === 0 ? (
                <Text style={styles.emptyText}>
                  No menu items yet. Open "Menu Master" tab above to add dishes.
                </Text>
              ) : (
                state.posItems.map((item) => {
                  const qty = cart[item.id] || 0;
                  return (
                    <View key={item.id} style={styles.rowItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{item.name}</Text>
                        <Text style={styles.rowSub}>
                          {item.category} • ₹{item.price}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() =>
                            setCart((p) => ({ ...p, [item.id]: Math.max(0, (p[item.id] || 0) - 1) }))
                          }
                          style={styles.qtyBtn}
                        >
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyVal}>{qty}</Text>
                        <TouchableOpacity
                          onPress={() =>
                            setCart((p) => ({ ...p, [item.id]: (p[item.id] || 0) + 1 }))
                          }
                          style={styles.qtyBtn}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}

              {selectedItems.length > 0 && (
                <TouchableOpacity
                  onPress={async () => {
                    const res = await createPosOrder({
                      roomNumber: posRoom,
                      items: selectedItems,
                      postToRoom,
                      paymentMethod: 'UPI',
                    });
                    if (res.ok) {
                      setCart({});
                      Alert.alert('KOT Punched', `Order ₹${cartTotal} synced live!`);
                    }
                  }}
                  style={[styles.primaryBtn, { marginTop: 12 }]}
                >
                  <Text style={styles.primaryBtnText}>
                    Punch KOT Order • ₹{cartTotal.toLocaleString('en-IN')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {posTab === 'orders' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>All Food Orders ({state.posOrders.length})</Text>
              {state.posOrders
                .filter((o) => matchesQuickDateFilter(o.dateTime, dateFilter))
                .map((ord) => (
                  <View key={ord.id} style={styles.rowItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {ord.roomNumber ? `Room ${ord.roomNumber}` : 'Walk-In Table'} •{' '}
                        {ord.paymentStatus || ord.status}
                      </Text>
                      <Text style={styles.rowSub}>
                        {(ord.items || []).map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                      </Text>
                    </View>
                    <Text style={styles.amtText}>₹{ord.totalAmount}</Text>
                  </View>
                ))}
            </View>
          )}

          {posTab === 'menu' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Dish to Menu Master</Text>
              <TextInput
                value={menuName}
                onChangeText={setMenuName}
                placeholder="Dish Name (e.g. Paneer Tikka)"
                style={styles.input}
              />
              <View style={styles.twoCol}>
                <TextInput
                  value={menuCat}
                  onChangeText={setMenuCat}
                  placeholder="Category"
                  style={[styles.input, { flex: 1.2 }]}
                />
                <TextInput
                  value={menuPrice}
                  onChangeText={setMenuPrice}
                  keyboardType="numeric"
                  placeholder="Price ₹"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <TouchableOpacity
                onPress={async () => {
                  if (!menuName.trim()) return;
                  await addPosMenuItem({
                    name: menuName,
                    category: menuCat,
                    price: Number(menuPrice) || 150,
                  });
                  setMenuName('');
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>+ Save Menu Item</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------------- 3. INVENTORY STORE ----------------
  if (moduleId === 'inventory') {
    const lowStock = state.inventoryProducts.filter(
      (p) => Number(p.currentStock) <= Number(p.minStockLevel || 5)
    );
    return (
      <View style={styles.root}>
        <SubTabStrip
          activeId={invTab}
          onSelect={(id) => setInvTab(id as any)}
          tabs={[
            {
              id: 'stock',
              label: 'Stock & Alerts',
              count: lowStock.length || state.inventoryProducts.length,
              Icon: Boxes,
            },
            { id: 'po', label: 'Purchase Orders', count: state.inventoryPurchases.length },
            { id: 'vendors', label: 'Verified Vendors', count: state.vendors.length },
          ]}
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          {invTab === 'stock' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Add Inventory Item</Text>
                <TextInput
                  value={prodName}
                  onChangeText={setProdName}
                  placeholder="Item Name (e.g. Bath Towels / Mineral Water)"
                  style={styles.input}
                />
                <View style={styles.twoCol}>
                  <TextInput
                    value={prodStock}
                    onChangeText={setProdStock}
                    keyboardType="numeric"
                    placeholder="Opening Qty"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TextInput
                    value={prodPrice}
                    onChangeText={setProdPrice}
                    keyboardType="numeric"
                    placeholder="Unit Cost ₹"
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    if (!prodName.trim()) return;
                    await addInventoryProduct({
                      name: prodName,
                      category: 'Housekeeping',
                      unit: 'pcs',
                      currentStock: Number(prodStock) || 0,
                      minStockLevel: 5,
                      unitPrice: Number(prodPrice) || 0,
                    });
                    setProdName('');
                  }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>+ Add Stock Item</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Live Store Inventory ({state.inventoryProducts.length})
                </Text>
                {state.inventoryProducts.map((p) => {
                  const isLow = Number(p.currentStock) <= Number(p.minStockLevel || 5);
                  return (
                    <View key={p.id} style={styles.rowItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{p.name}</Text>
                        <Text style={[styles.rowSub, isLow && { color: COLORS.rose }]}>
                          Stock: {p.currentStock} {p.unit || 'pcs'}{' '}
                          {isLow ? '• LOW STOCK' : ''}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => adjustInventoryStock(p.id, -1)}
                          style={styles.qtyBtn}
                        >
                          <Text style={styles.qtyBtnText}>-1</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => adjustInventoryStock(p.id, 5)}
                          style={styles.qtyBtn}
                        >
                          <Text style={styles.qtyBtnText}>+5</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {invTab === 'po' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Record Purchase Order (Stock IN)</Text>
              <TextInput
                value={poSupplier}
                onChangeText={setPoSupplier}
                placeholder="Supplier Name"
                style={styles.input}
              />
              <TextInput
                value={poItem}
                onChangeText={setPoItem}
                placeholder="Item Purchased"
                style={styles.input}
              />
              <View style={styles.twoCol}>
                <TextInput
                  value={poQty}
                  onChangeText={setPoQty}
                  keyboardType="numeric"
                  placeholder="Qty"
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  value={poCost}
                  onChangeText={setPoCost}
                  keyboardType="numeric"
                  placeholder="Total ₹"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <TouchableOpacity
                onPress={async () => {
                  if (!poItem.trim()) return;
                  await addInventoryPurchase({
                    supplierName: poSupplier || 'General Vendor',
                    itemName: poItem,
                    quantity: Number(poQty) || 1,
                    totalAmount: Number(poCost) || 0,
                  });
                  setPoItem('');
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>+ Save Purchase Order</Text>
              </TouchableOpacity>

              {state.inventoryPurchases.map((po) => (
                <View key={po.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {po.itemName} (×{po.quantity})
                    </Text>
                    <Text style={styles.rowSub}>
                      {po.supplierName} • {po.date}
                    </Text>
                  </View>
                  <Text style={styles.amtText}>₹{po.totalAmount}</Text>
                </View>
              ))}
            </View>
          )}

          {invTab === 'vendors' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Verified Suppliers & Vendors</Text>
              <TextInput
                value={vndName}
                onChangeText={setVndName}
                placeholder="Vendor Name"
                style={styles.input}
              />
              <View style={styles.twoCol}>
                <TextInput
                  value={vndPhone}
                  onChangeText={setVndPhone}
                  keyboardType="phone-pad"
                  placeholder="Mobile"
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  value={vndCat}
                  onChangeText={setVndCat}
                  placeholder="Supply Category"
                  style={[styles.input, { flex: 1.2 }]}
                />
              </View>
              <TouchableOpacity
                onPress={async () => {
                  if (!vndName.trim()) return;
                  await addVendorRecord({
                    name: vndName,
                    phone: vndPhone,
                    category: vndCat,
                  });
                  setVndName('');
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>+ Add Supplier</Text>
              </TouchableOpacity>
              {state.vendors.map((v) => (
                <View key={v.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{v.name}</Text>
                    <Text style={styles.rowSub}>
                      {v.category} • {v.phone}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------------- 4. OTA CHANNEL MANAGER ----------------
  const otaBookings = state.bookings.filter(
    (b) => b.bookingSource && !['Direct', 'Walk-in'].includes(b.bookingSource)
  );

  return (
    <View style={styles.root}>
      <SubTabStrip
        activeId={otaTab}
        onSelect={(id) => setOtaTab(id as any)}
        tabs={[
          { id: 'channels', label: 'Connected OTAs', count: state.otaChannels.length, Icon: Globe2 },
          { id: 'agents', label: 'Travel Agents', count: state.travelAgents.length },
          { id: 'feed', label: 'OTA Bookings', count: otaBookings.length },
        ]}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {otaTab === 'channels' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connect / Sync OTA Channel</Text>
            <View style={styles.twoCol}>
              <TextInput
                value={otaName}
                onChangeText={setOtaName}
                placeholder="OTA Name (MMT / Booking.com)"
                style={[styles.input, { flex: 1.5 }]}
              />
              <TextInput
                value={otaComm}
                onChangeText={setOtaComm}
                keyboardType="numeric"
                placeholder="Comm %"
                style={[styles.input, { flex: 0.8 }]}
              />
            </View>
            <TouchableOpacity
              onPress={async () => {
                await upsertOtaChannel({
                  name: otaName,
                  commissionPct: Number(otaComm) || 15,
                  status: 'Connected',
                });
                Alert.alert('Synced', `${otaName} channel active.`);
              }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Sync OTA Channel</Text>
            </TouchableOpacity>
            {state.otaChannels.map((ch) => (
              <View key={ch.id} style={styles.rowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{ch.name}</Text>
                  <Text style={styles.rowSub}>Commission: {ch.commissionPct || 15}%</Text>
                </View>
                <Text style={[styles.badgeTag, { color: COLORS.emerald }]}>CONNECTED</Text>
              </View>
            ))}
          </View>
        )}

        {otaTab === 'agents' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Travel Agents & Corporate Partners</Text>
            <View style={styles.twoCol}>
              <TextInput
                value={agName}
                onChangeText={setAgName}
                placeholder="Agent Name"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                value={agAgency}
                onChangeText={setAgAgency}
                placeholder="Agency Name"
                style={[styles.input, { flex: 1 }]}
              />
            </View>
            <View style={styles.twoCol}>
              <TextInput
                value={agMobile}
                onChangeText={setAgMobile}
                keyboardType="phone-pad"
                placeholder="Mobile"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                value={agComm}
                onChangeText={setAgComm}
                keyboardType="numeric"
                placeholder="Commission %"
                style={[styles.input, { flex: 1 }]}
              />
            </View>
            <TouchableOpacity
              onPress={async () => {
                if (!agName.trim()) return;
                await addTravelAgent({
                  name: agName,
                  agencyName: agAgency || agName,
                  phone: agMobile,
                  commissionRate: Number(agComm) || 10,
                });
                setAgName('');
              }}
              style={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>+ Add Travel Agent</Text>
            </TouchableOpacity>
            {state.travelAgents.map((ag) => (
              <View key={ag.id} style={styles.rowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {ag.name} ({ag.agencyName || 'Partner'})
                  </Text>
                  <Text style={styles.rowSub}>
                    {ag.phone} • Commission: {ag.commissionRate || 0}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {otaTab === 'feed' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>OTA & Agency Booking Feed</Text>
            {otaBookings.length === 0 ? (
              <Text style={styles.emptyText}>No external OTA bookings recorded yet.</Text>
            ) : (
              otaBookings.map((b) => (
                <View key={b.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {b.guestName} • Rm {b.roomNumber}
                    </Text>
                    <Text style={styles.rowSub}>
                      {b.bookingSource} • {b.checkInDate} → {b.checkOutDate}
                    </Text>
                  </View>
                  <Text style={styles.amtText}>₹{b.totalPayable || b.bookingAmount || 0}</Text>
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
  scroll: { padding: 12, gap: 12, paddingBottom: 28 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  twoCol: { flexDirection: 'row', gap: 8 },
  input: {
    height: 43,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
    paddingVertical: 0,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 9,
  },
  primaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.gold,
    marginBottom: 6,
  },
  primaryBtnText: { fontSize: 12.5, fontWeight: '800', color: COLORS.goldBright },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  rowTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  rowSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  amtText: { fontSize: 13.5, fontWeight: '900', color: COLORS.goldDark },
  badgeTag: { fontSize: 10.5, fontWeight: '800', color: COLORS.goldDark },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  smallBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  toggleBtn: {
    flex: 1.2,
    height: 43,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  toggleBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.textPrimary },
  qtyBtn: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyBtnText: { fontSize: 13, fontWeight: '900', color: COLORS.espresso },
  qtyVal: { fontSize: 13, fontWeight: '800', minWidth: 18, textAlign: 'center' },
  emptyText: { fontSize: 12, color: COLORS.textMuted, paddingVertical: 10 },
});
