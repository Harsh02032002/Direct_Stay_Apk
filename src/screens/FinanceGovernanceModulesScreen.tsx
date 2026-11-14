import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Users,
  IndianRupee,
  Wallet,
  FileBarChart2,
  ShieldCheck,
  Bell,
  Settings,
  KeyRound,
  CheckCircle2,
} from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { SubTabStrip } from '../components/SubTabStrip';
import { DateFilterBar, matchesQuickDateFilter, QuickDateFilter } from '../components/DateFilterBar';

interface Props {
  moduleId:
    | 'staff'
    | 'userList'
    | 'finance'
    | 'reports'
    | 'auditLogs'
    | 'notifications'
    | 'profile';
}

export const FinanceGovernanceModulesScreen: React.FC<Props> = ({ moduleId }) => {
  const {
    session,
    state,
    hotelProfile,
    addStaffMember,
    toggleStaffStatus,
    addExpenseEntry,
    addPettyCashEntry,
    addFinanceVoucher,
    addDailyClosing,
    updateHotelProfileSettings,
    markAllNotificationsRead,
  } = usePms();

  const [dateFilter, setDateFilter] = useState<QuickDateFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');

  // HRM: Strictly ONLY Staff & Salary!
  const [hrmTab, setHrmTab] = useState<'staff' | 'salary'>('staff');
  const [stName, setStName] = useState('');
  const [stMobile, setStMobile] = useState('');
  const [stDept, setStDept] = useState('Reception');
  const [stSalary, setStSalary] = useState('15000');
  const [stUser, setStUser] = useState('');
  const [stPass, setStPass] = useState('');

  // Finance
  const [finTab, setFinTab] = useState<'overview' | 'expenses' | 'petty' | 'closing'>('overview');
  const [expTitle, setExpTitle] = useState('');
  const [expCat, setExpCat] = useState('Operations');
  const [expAmt, setExpAmt] = useState('');
  const [pcType, setPcType] = useState<'IN' | 'OUT'>('OUT');
  const [pcPart, setPcPart] = useState('');
  const [pcAmt, setPcAmt] = useState('');

  // Reports
  const [repTab, setRepTab] = useState<'daily' | 'arrivals' | 'gst' | 'dues'>('daily');

  // Centralized Profile & Settings (Hotel Details + GST % + Invoice Prefix)
  const [profName, setProfName] = useState(hotelProfile?.name || '');
  const [profPhone, setProfPhone] = useState(
    hotelProfile?.phoneNumber || hotelProfile?.phone || ''
  );
  const [profEmail, setProfEmail] = useState(
    hotelProfile?.emailAddress || hotelProfile?.email || ''
  );
  const [profAddress, setProfAddress] = useState(hotelProfile?.address || '');
  const [profGstin, setProfGstin] = useState(hotelProfile?.gstNumber || '');
  const [profGstRate, setProfGstRate] = useState(String(hotelProfile?.defaultGstRate ?? 5));
  const [profInvPrefix, setProfInvPrefix] = useState(hotelProfile?.invoicePrefix || 'INV');
  const [profNextSeq, setProfNextSeq] = useState(
    String(hotelProfile?.nextInvoiceSequence || state.invoices.length + 1)
  );
  const [profCheckInTime, setProfCheckInTime] = useState(hotelProfile?.checkInTime || '12:00 PM');
  const [profCheckOutTime, setProfCheckOutTime] = useState(
    hotelProfile?.checkOutTime || '11:00 AM'
  );

  useEffect(() => {
    if (hotelProfile) {
      setProfName(hotelProfile.name || '');
      setProfPhone(hotelProfile.phoneNumber || hotelProfile.phone || '');
      setProfEmail(hotelProfile.emailAddress || hotelProfile.email || '');
      setProfAddress(hotelProfile.address || '');
      setProfGstin(hotelProfile.gstNumber || '');
      setProfGstRate(String(hotelProfile.defaultGstRate ?? 5));
      setProfInvPrefix(hotelProfile.invoicePrefix || 'INV');
      setProfCheckInTime(hotelProfile.checkInTime || '12:00 PM');
      setProfCheckOutTime(hotelProfile.checkOutTime || '11:00 AM');
    }
  }, [hotelProfile?.id]);

  // ---------------- 1. STAFF MANAGEMENT (HRM — ONLY STAFF & SALARY) ----------------
  if (moduleId === 'staff') {
    const totalMonthlyPayroll = state.staff
      .filter((s) => s.status !== 'Inactive')
      .reduce((sum, s) => sum + (Number(s.salary) || 0), 0);

    return (
      <View style={styles.root}>
        <SubTabStrip
          activeId={hrmTab}
          onSelect={(id) => setHrmTab(id as any)}
          tabs={[
            { id: 'staff', label: 'Staff', count: state.staff.length, Icon: Users },
            { id: 'salary', label: 'Salary', Icon: IndianRupee },
          ]}
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          {hrmTab === 'staff' ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Add Hotel Staff Member</Text>
                <View style={styles.twoCol}>
                  <TextInput
                    value={stName}
                    onChangeText={setStName}
                    placeholder="Full Name *"
                    style={[styles.input, { flex: 1.2 }]}
                  />
                  <TextInput
                    value={stMobile}
                    onChangeText={setStMobile}
                    keyboardType="phone-pad"
                    placeholder="Mobile *"
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                <View style={styles.twoCol}>
                  <TextInput
                    value={stDept}
                    onChangeText={setStDept}
                    placeholder="Role (Reception / HK)"
                    style={[styles.input, { flex: 1.2 }]}
                  />
                  <TextInput
                    value={stSalary}
                    onChangeText={setStSalary}
                    keyboardType="numeric"
                    placeholder="Monthly Salary ₹"
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                <View style={styles.twoCol}>
                  <TextInput
                    value={stUser}
                    onChangeText={setStUser}
                    autoCapitalize="none"
                    placeholder="Login Username"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TextInput
                    value={stPass}
                    onChangeText={setStPass}
                    placeholder="Login Password"
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    if (!stName.trim()) {
                      Alert.alert('Required', 'Please enter staff name.');
                      return;
                    }
                    await addStaffMember({
                      name: stName,
                      mobile: stMobile,
                      department: stDept,
                      designation: stDept,
                      username: stUser || stName.toLowerCase().replace(/\s+/g, ''),
                      password: stPass || '123456',
                      salary: Number(stSalary) || 15000,
                    });
                    setStName('');
                    setStMobile('');
                    setStUser('');
                    setStPass('');
                    Alert.alert('Saved', 'Staff member synced live.');
                  }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>+ Save Staff Member</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Staff Directory ({state.staff.length})</Text>
                {state.staff.length === 0 ? (
                  <Text style={styles.emptyText}>No staff added yet.</Text>
                ) : (
                  state.staff.map((s) => (
                    <View key={s.id} style={styles.rowItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{s.name}</Text>
                        <Text style={styles.rowSub}>
                          {s.department || s.role} • {s.mobile || 'No phone'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleStaffStatus(s.id)}
                        style={[
                          styles.statusChip,
                          {
                            backgroundColor:
                              s.status === 'Active' ? COLORS.emeraldSoft : COLORS.roseSoft,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: s.status === 'Active' ? COLORS.emerald : COLORS.rose,
                          }}
                        >
                          {s.status || 'Active'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : (
            <View style={styles.card}>
              <View style={styles.kpiBanner}>
                <Text style={styles.kpiBannerLabel}>TOTAL MONTHLY SALARY PAYROLL</Text>
                <Text style={styles.kpiBannerVal}>
                  ₹{totalMonthlyPayroll.toLocaleString('en-IN')}
                </Text>
              </View>
              <Text style={styles.cardTitle}>Staff Salary Sheet</Text>
              {state.staff.length === 0 ? (
                <Text style={styles.emptyText}>Add staff members in the Staff tab first.</Text>
              ) : (
                state.staff.map((s) => (
                  <View key={s.id} style={styles.rowItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{s.name}</Text>
                      <Text style={styles.rowSub}>
                        {s.department || s.designation} • {s.status}
                      </Text>
                    </View>
                    <Text style={styles.amtText}>
                      ₹{Number(s.salary || 0).toLocaleString('en-IN')}/mo
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------------- 2. USER LIST ----------------
  if (moduleId === 'userList') {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hotel Admin & Active Login Credentials</Text>
          <View style={styles.rowItem}>
            <KeyRound size={16} color={COLORS.goldDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {hotelProfile?.name || 'Hotel Admin'} (Owner / Admin)
              </Text>
              <Text style={styles.rowSub}>Username: {session?.username}</Text>
            </View>
            <Text style={[styles.amtText, { color: COLORS.emerald }]}>ACTIVE</Text>
          </View>
          {state.staff.map((s) => (
            <View key={s.id} style={styles.rowItem}>
              <Users size={16} color={COLORS.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {s.name} ({s.department || s.role})
                </Text>
                <Text style={styles.rowSub}>
                  Username: {s.username} • Pass: {s.plainPassword || '••••••'}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: s.status === 'Active' ? COLORS.emerald : COLORS.rose,
                }}
              >
                {s.status}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ---------------- 3. FINANCE HUB ----------------
  if (moduleId === 'finance') {
    const filteredBookings = state.bookings.filter(
      (b) =>
        b.status !== 'Cancelled' &&
        matchesQuickDateFilter(b.checkInDate || b.bookingDate, dateFilter)
    );
    const filteredExpenses = state.expenses.filter((e) =>
      matchesQuickDateFilter(e.date, dateFilter)
    );
    const totalIncome = filteredBookings.reduce(
      (s, b) => s + (Number(b.amountPaid ?? b.advanceAmount) || 0),
      0
    );
    const totalExpense = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    return (
      <View style={styles.root}>
        <SubTabStrip
          activeId={finTab}
          onSelect={(id) => setFinTab(id as any)}
          tabs={[
            { id: 'overview', label: 'Finance Overview', Icon: Wallet },
            { id: 'expenses', label: 'Expense Register', count: state.expenses.length },
            { id: 'petty', label: 'Petty Cash', count: state.pettyCash.length },
            { id: 'closing', label: 'Daily Shift Closing', count: state.dailyClosings.length },
          ]}
        />
        <DateFilterBar activeFilter={dateFilter} onChangeFilter={setDateFilter} />
        <ScrollView contentContainerStyle={styles.scroll}>
          {finTab === 'overview' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>P&L & Collection Summary</Text>
              <View style={styles.twoCol}>
                <View style={[styles.statBox, { backgroundColor: COLORS.emeraldSoft }]}>
                  <Text style={styles.statLabel}>Collections</Text>
                  <Text style={[styles.statVal, { color: COLORS.emerald }]}>
                    ₹{totalIncome.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: COLORS.roseSoft }]}>
                  <Text style={styles.statLabel}>Expenses</Text>
                  <Text style={[styles.statVal, { color: COLORS.rose }]}>
                    ₹{totalExpense.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
              <View style={[styles.kpiBanner, { marginTop: 10 }]}>
                <Text style={styles.kpiBannerLabel}>NET OPERATING SURPLUS</Text>
                <Text style={styles.kpiBannerVal}>
                  ₹{(totalIncome - totalExpense).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          )}

          {finTab === 'expenses' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Record Hotel Expense</Text>
              <TextInput
                value={expTitle}
                onChangeText={setExpTitle}
                placeholder="Expense Particulars (e.g. Electricity / Diesel)"
                style={styles.input}
              />
              <View style={styles.twoCol}>
                <TextInput
                  value={expCat}
                  onChangeText={setExpCat}
                  placeholder="Category"
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  value={expAmt}
                  onChangeText={setExpAmt}
                  keyboardType="numeric"
                  placeholder="Amount ₹"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <TouchableOpacity
                onPress={async () => {
                  if (!expTitle.trim() || !Number(expAmt)) return;
                  await addExpenseEntry({
                    category: expCat,
                    vendorName: 'Hotel Operations',
                    description: expTitle,
                    amount: Number(expAmt),
                    paymentMethod: 'Cash',
                  });
                  setExpTitle('');
                  setExpAmt('');
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>+ Save Expense</Text>
              </TouchableOpacity>
              {filteredExpenses.map((e) => (
                <View key={e.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{e.description}</Text>
                    <Text style={styles.rowSub}>
                      {e.category} • {e.date}
                    </Text>
                  </View>
                  <Text style={[styles.amtText, { color: COLORS.rose }]}>₹{e.amount}</Text>
                </View>
              ))}
            </View>
          )}

          {finTab === 'petty' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Petty Cash Drawer</Text>
              <View style={styles.twoCol}>
                <TouchableOpacity
                  onPress={() => setPcType(pcType === 'OUT' ? 'IN' : 'OUT')}
                  style={[styles.input, { flex: 0.7, justifyContent: 'center', alignItems: 'center' }]}
                >
                  <Text style={{ fontWeight: '800', color: COLORS.espresso }}>Cash {pcType}</Text>
                </TouchableOpacity>
                <TextInput
                  value={pcAmt}
                  onChangeText={setPcAmt}
                  keyboardType="numeric"
                  placeholder="Amount ₹"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <TextInput
                value={pcPart}
                onChangeText={setPcPart}
                placeholder="Particulars"
                style={styles.input}
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!pcPart.trim()) return;
                  await addPettyCashEntry({
                    type: pcType === 'IN' ? 'Cash In' : 'Cash Out',
                    amount: Number(pcAmt) || 0,
                    description: pcPart,
                  });
                  setPcPart('');
                  setPcAmt('');
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>+ Record Petty Cash</Text>
              </TouchableOpacity>
              {state.pettyCash.map((p) => (
                <View key={p.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{p.description}</Text>
                    <Text style={styles.rowSub}>
                      {p.type} • {p.date}
                    </Text>
                  </View>
                  <Text style={styles.amtText}>₹{p.amount}</Text>
                </View>
              ))}
            </View>
          )}

          {finTab === 'closing' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Daily Shift Cash Handover</Text>
              <TouchableOpacity
                onPress={async () => {
                  await addDailyClosing({
                    shift: 'Day Shift',
                    cashCollected: totalIncome,
                    upiCollected: 0,
                    notes: `Net surplus ₹${totalIncome - totalExpense}`,
                  });
                  Alert.alert('Closed', 'Shift closing recorded & synced.');
                }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Close Current Shift & Sync</Text>
              </TouchableOpacity>
              {state.dailyClosings.map((dc) => (
                <View key={dc.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {dc.date} • {dc.shift}
                    </Text>
                    <Text style={styles.rowSub}>Closed by {dc.closedBy}</Text>
                  </View>
                  <Text style={styles.amtText}>
                    ₹{Number(dc.cashCollected || 0) + Number(dc.upiCollected || 0)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------------- 4. AUDITS & REPORTS (INCL. DAILY REPORT) ----------------
  if (moduleId === 'reports') {
    const filteredBkgs = state.bookings.filter(
      (b) =>
        b.status !== 'Cancelled' &&
        matchesQuickDateFilter(b.checkInDate || b.bookingDate, dateFilter)
    );
    const cashCol = filteredBkgs
      .filter((b) => b.paymentMethod === 'Cash')
      .reduce((s, b) => s + (Number(b.amountPaid ?? b.advanceAmount) || 0), 0);
    const upiCol = filteredBkgs
      .filter((b) => b.paymentMethod !== 'Cash')
      .reduce((s, b) => s + (Number(b.amountPaid ?? b.advanceAmount) || 0), 0);
    const gstInvoices = state.invoices.filter(
      (i) => !i.isWithoutGst && Number(i.gstRate || 0) > 0 && matchesQuickDateFilter(i.dateCreated || i.date, dateFilter)
    );
    const outstandingBkgs = state.bookings.filter((b) => Number(b.dueAmount || 0) > 0);

    return (
      <View style={styles.root}>
        <SubTabStrip
          activeId={repTab}
          onSelect={(id) => setRepTab(id as any)}
          tabs={[
            { id: 'daily', label: 'Daily Collection Report', Icon: FileBarChart2 },
            { id: 'arrivals', label: 'Arrivals & Stays', count: filteredBkgs.length },
            { id: 'gst', label: 'GSTR-1 Tax Report', count: gstInvoices.length },
            { id: 'dues', label: 'Outstanding Dues', count: outstandingBkgs.length },
          ]}
        />
        <DateFilterBar activeFilter={dateFilter} onChangeFilter={setDateFilter} />
        <ScrollView contentContainerStyle={styles.scroll}>
          {repTab === 'daily' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Daily Report & Collection Sheet</Text>
              <View style={styles.twoCol}>
                <View style={[styles.statBox, { backgroundColor: COLORS.emeraldSoft }]}>
                  <Text style={styles.statLabel}>Cash Collection</Text>
                  <Text style={[styles.statVal, { color: COLORS.emerald }]}>
                    ₹{cashCol.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: COLORS.blueSoft }]}>
                  <Text style={styles.statLabel}>UPI / Card / Bank</Text>
                  <Text style={[styles.statVal, { color: COLORS.blue }]}>
                    ₹{upiCol.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
              <View style={[styles.kpiBanner, { marginTop: 10 }]}>
                <Text style={styles.kpiBannerLabel}>TOTAL COLLECTION ({dateFilter.toUpperCase()})</Text>
                <Text style={styles.kpiBannerVal}>
                  ₹{(cashCol + upiCol).toLocaleString('en-IN')}
                </Text>
              </View>
              {filteredBkgs.map((b) => (
                <View key={b.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {b.guestName} • Rm {b.roomNumber}
                    </Text>
                    <Text style={styles.rowSub}>
                      {b.checkInDate} • {b.paymentMethod} • {b.status}
                    </Text>
                  </View>
                  <Text style={styles.amtText}>₹{b.amountPaid ?? b.advanceAmount ?? 0}</Text>
                </View>
              ))}
            </View>
          )}

          {repTab === 'arrivals' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Arrivals & Departures Register</Text>
              {filteredBkgs.map((b) => (
                <View key={b.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      Rm {b.roomNumber} — {b.guestName}
                    </Text>
                    <Text style={styles.rowSub}>
                      {b.checkInDate} → {b.checkOutDate} ({b.status})
                    </Text>
                  </View>
                  <Text style={styles.amtText}>₹{b.totalPayable || b.bookingAmount || 0}</Text>
                </View>
              ))}
            </View>
          )}

          {repTab === 'gst' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>GSTR-1 Tax Invoices ({gstInvoices.length})</Text>
              {gstInvoices.map((inv) => (
                <View key={inv.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {inv.invoiceNumber} — {inv.guestName}
                    </Text>
                    <Text style={styles.rowSub}>
                      GST {inv.gstRate}% • Tax: ₹{inv.gst}
                    </Text>
                  </View>
                  <Text style={styles.amtText}>₹{inv.finalAmount}</Text>
                </View>
              ))}
            </View>
          )}

          {repTab === 'dues' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pending Guest Balances</Text>
              {outstandingBkgs.map((b) => (
                <View key={b.id} style={styles.rowItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {b.guestName} (Rm {b.roomNumber})
                    </Text>
                    <Text style={styles.rowSub}>{b.mobile}</Text>
                  </View>
                  <Text style={[styles.amtText, { color: COLORS.rose }]}>Due ₹{b.dueAmount}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------------- 5. OWNER AUDIT LOGS ----------------
  if (moduleId === 'auditLogs') {
    const filteredAudits = state.auditLogs.filter((l) => {
      if (!matchesQuickDateFilter(l.dateTime, dateFilter)) return false;
      if (searchQuery.trim()) {
        return `${l.action} ${l.performedBy} ${l.details}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      }
      return true;
    });

    return (
      <View style={styles.root}>
        <DateFilterBar
          activeFilter={dateFilter}
          onChangeFilter={setDateFilter}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          searchPlaceholder="Search action, user, room..."
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Owner Security & Audit Trail ({filteredAudits.length})</Text>
            {filteredAudits.length === 0 ? (
              <Text style={styles.emptyText}>
                No audit entries for this filter. Tap "All Records" above.
              </Text>
            ) : (
              filteredAudits.slice(0, 60).map((log) => (
                <View key={log.id} style={styles.rowItem}>
                  <ShieldCheck size={16} color={COLORS.goldDark} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{log.action}</Text>
                    <Text style={styles.rowSub}>{log.details}</Text>
                    <Text style={[styles.rowSub, { color: COLORS.goldDark }]}>
                      By {log.performedBy} • {String(log.dateTime || '').slice(0, 19).replace('T', ' ')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ---------------- 6. NOTIFICATIONS CENTER (CHECKOUT DIRTY ALERTS!) ----------------
  if (moduleId === 'notifications') {
    const dirtyRooms = state.rooms.filter((r) => r.status === 'Dirty');
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
              Live Alerts & Housekeeping Notifications
            </Text>
            {state.notifications.some((n) => !n.read) && (
              <TouchableOpacity onPress={markAllNotificationsRead}>
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: COLORS.goldDark }}>
                  Mark All Read
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {dirtyRooms.map((rm) => (
            <View
              key={`dirty-${rm.id}`}
              style={[
                styles.rowItem,
                { backgroundColor: COLORS.amberSoft, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6 },
              ]}
            >
              <Bell size={16} color={COLORS.amber} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: COLORS.amber }]}>
                  Housekeeping Alert: Room {rm.number} is DIRTY
                </Text>
                <Text style={styles.rowSub}>
                  Requires immediate turnaround cleaning before next check-in.
                </Text>
              </View>
            </View>
          ))}

          {state.notifications.length === 0 && dirtyRooms.length === 0 ? (
            <Text style={styles.emptyText}>
              All clear! Instant notifications appear here whenever a room checks out.
            </Text>
          ) : (
            state.notifications.map((n) => (
              <View key={n.id} style={styles.rowItem}>
                <Bell size={16} color={n.read ? COLORS.textMuted : COLORS.rose} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{n.title}</Text>
                  <Text style={styles.rowSub}>{n.message}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  // ---------------- 7. MY PROFILE & CENTRALIZED SETTINGS ----------------
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {/* GST % & Invoice Number Configuration (Centralized Settings!) */}
      <View style={[styles.card, { borderColor: COLORS.gold }]}>
        <Text style={styles.cardTitle}>GST % & Invoice Number Settings</Text>
        <Text style={[styles.rowSub, { marginBottom: 10 }]}>
          Configure your hotel's default GST % and Invoice Prefix here. Check-In uses this GST %
          automatically when "GST Invoice" is ticked.
        </Text>

        <Text style={styles.label}>Default GST % Slab</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          {['5', '12', '18'].map((slab) => {
            const active = profGstRate === slab;
            return (
              <TouchableOpacity
                key={slab}
                onPress={() => setProfGstRate(slab)}
                style={[
                  styles.slabPill,
                  active && { backgroundColor: COLORS.espresso, borderColor: COLORS.gold },
                ]}
              >
                <Text
                  style={[
                    styles.slabPillText,
                    active && { color: COLORS.goldBright },
                  ]}
                >
                  {slab}% GST
                </Text>
              </TouchableOpacity>
            );
          })}
          <TextInput
            value={profGstRate}
            onChangeText={setProfGstRate}
            keyboardType="numeric"
            placeholder="Custom %"
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
          />
        </View>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Invoice Prefix</Text>
            <TextInput
              value={profInvPrefix}
              onChangeText={setProfInvPrefix}
              autoCapitalize="characters"
              placeholder="INV"
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Next Invoice No.</Text>
            <TextInput
              value={profNextSeq}
              onChangeText={setProfNextSeq}
              keyboardType="numeric"
              placeholder="1001"
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.label}>Hotel GSTIN Number</Text>
        <TextInput
          value={profGstin}
          onChangeText={setProfGstin}
          autoCapitalize="characters"
          placeholder="22AAAAA0000A1Z5"
          style={styles.input}
        />
      </View>

      {/* Hotel Profile & Standard Timings */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hotel Profile & Property Settings</Text>
        <Text style={styles.label}>Hotel Name</Text>
        <TextInput value={profName} onChangeText={setProfName} style={styles.input} />

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Phone</Text>
            <TextInput value={profPhone} onChangeText={setProfPhone} style={styles.input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Email</Text>
            <TextInput value={profEmail} onChangeText={setProfEmail} style={styles.input} />
          </View>
        </View>

        <Text style={styles.label}>Full Property Address</Text>
        <TextInput value={profAddress} onChangeText={setProfAddress} style={styles.input} />

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Standard Check-In</Text>
            <TextInput
              value={profCheckInTime}
              onChangeText={setProfCheckInTime}
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Standard Check-Out</Text>
            <TextInput
              value={profCheckOutTime}
              onChangeText={setProfCheckOutTime}
              style={styles.input}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={async () => {
            await updateHotelProfileSettings({
              name: profName.trim() || hotelProfile?.name || 'DirectStay Property',
              phoneNumber: profPhone.trim(),
              phone: profPhone.trim(),
              emailAddress: profEmail.trim(),
              email: profEmail.trim(),
              address: profAddress.trim(),
              gstNumber: profGstin.trim(),
              defaultGstRate: Number(profGstRate) >= 0 ? Number(profGstRate) : 5,
              invoicePrefix: profInvPrefix.trim() || 'INV',
              nextInvoiceSequence: Number(profNextSeq) || 1,
              checkInTime: profCheckInTime.trim(),
              checkOutTime: profCheckOutTime.trim(),
            });
            Alert.alert(
              'Settings Saved & Synced',
              `GST ${profGstRate}%, Invoice Prefix "${profInvPrefix}", and Hotel Profile updated live!`
            );
          }}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Save All Settings to Live Server</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 5,
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
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.gold,
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.goldBright },
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
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  kpiBanner: {
    backgroundColor: COLORS.espresso,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  kpiBannerLabel: { fontSize: 10, fontWeight: '800', color: COLORS.goldBright, letterSpacing: 0.8 },
  kpiBannerVal: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginTop: 3 },
  statBox: {
    flex: 1,
    borderRadius: 13,
    padding: 12,
  },
  statLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  statVal: { fontSize: 16, fontWeight: '900', marginTop: 4 },
  slabPill: {
    paddingHorizontal: 13,
    height: 43,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slabPillText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  emptyText: { fontSize: 12, color: COLORS.textMuted, paddingVertical: 10 },
});
