import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import {
  Users,
  IndianRupee,
  Wallet,
  FileBarChart2,
  ShieldCheck,
  Bell,
  KeyRound,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { SubTabStrip } from '../components/SubTabStrip';
import {
  DateFilterBar,
  matchesQuickDateFilter,
  normalizeFilterDate,
  QuickDateFilter,
} from '../components/DateFilterBar';
import {
  formatDateLabel,
  formatGrcNumber,
  formatInvoiceNumber,
  formatMoney,
  nextInvoiceSequence,
  normalizeBillSettings,
  r2,
} from '../utils/billCalculator';
import { buildStayBill } from '../utils/stayBilling';

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

function classifyPaymentBucket(rawMethod?: string): 'cash' | 'upi' | 'card' | 'bank' {
  const m = String(rawMethod || '').toLowerCase();
  if (m.includes('upi') || m.includes('gpay') || m.includes('phonepe') || m.includes('paytm') || m.includes('qr')) {
    return 'upi';
  }
  if (m.includes('card') || m.includes('credit') || m.includes('debit') || m.includes('pos')) {
    return 'card';
  }
  if (m.includes('bank') || m.includes('neft') || m.includes('rtgs') || m.includes('imps') || m.includes('cheque') || m.includes('online')) {
    return 'bank';
  }
  return 'cash';
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
    addDailyClosing,
    updateHotelProfileSettings,
    submitMembershipRenewal,
    markAllNotificationsRead,
  } = usePms();

  const billSettings = normalizeBillSettings(hotelProfile);

  const [dateFilter, setDateFilter] = useState<QuickDateFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [renewPlanIdx, setRenewPlanIdx] = useState(0);
  const [renewUtr, setRenewUtr] = useState('');
  const [submittingRenewal, setSubmittingRenewal] = useState(false);

  // HRM: Strictly ONLY Staff & Salary
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
  const [expMode, setExpMode] = useState('Cash');
  const [pcType, setPcType] = useState<'IN' | 'OUT'>('OUT');
  const [pcPart, setPcPart] = useState('');
  const [pcAmt, setPcAmt] = useState('');

  // Reports
  const [repTab, setRepTab] = useState<'daily' | 'arrivals' | 'gst' | 'dues'>('daily');

  // Centralized Profile & Settings
  const [profName, setProfName] = useState(hotelProfile?.name || '');
  const [profPhone, setProfPhone] = useState(
    hotelProfile?.phoneNumber || hotelProfile?.phone || ''
  );
  const [profEmail, setProfEmail] = useState(
    hotelProfile?.emailAddress || hotelProfile?.email || ''
  );
  const [profAddress, setProfAddress] = useState(hotelProfile?.address || '');
  const [profPlaceOfSupply, setProfPlaceOfSupply] = useState(
    hotelProfile?.placeOfSupply || hotelProfile?.state || ''
  );
  const [profGstin, setProfGstin] = useState(hotelProfile?.gstNumber || '');
  const [profPan, setProfPan] = useState(hotelProfile?.panNumber || '');
  const [profRoomGstRate, setProfRoomGstRate] = useState(String(billSettings.roomGstRate));
  const [profFoodGstRate, setProfFoodGstRate] = useState(String(billSettings.foodGstRate));
  const [profRoomIncludesGst, setProfRoomIncludesGst] = useState<boolean>(
    billSettings.roomRateIncludesGst
  );
  const [profTaxOnAncillary, setProfTaxOnAncillary] = useState<boolean>(
    billSettings.taxOnAncillary
  );
  const [profInvPrefix, setProfInvPrefix] = useState(billSettings.invoicePrefix);
  const [profNextSeq, setProfNextSeq] = useState(
    String(
      nextInvoiceSequence(
        state.invoices.map((i) => i.invoiceNumber),
        billSettings.nextInvoiceSequence
      )
    )
  );
  const [profGrcPrefix, setProfGrcPrefix] = useState(billSettings.grcPrefix);
  const [profWaterBottleRate, setProfWaterBottleRate] = useState(
    String(billSettings.waterBottleRate)
  );
  const [profCheckInTime, setProfCheckInTime] = useState(hotelProfile?.checkInTime || '12:00 PM');
  const [profCheckOutTime, setProfCheckOutTime] = useState(
    hotelProfile?.checkOutTime || '11:00 AM'
  );

  useEffect(() => {
    if (hotelProfile) {
      const normalized = normalizeBillSettings(hotelProfile);
      setProfName(hotelProfile.name || '');
      setProfPhone(hotelProfile.phoneNumber || hotelProfile.phone || '');
      setProfEmail(hotelProfile.emailAddress || hotelProfile.email || '');
      setProfAddress(hotelProfile.address || '');
      setProfPlaceOfSupply(hotelProfile.placeOfSupply || hotelProfile.state || '');
      setProfGstin(hotelProfile.gstNumber || '');
      setProfPan(hotelProfile.panNumber || '');
      setProfRoomGstRate(String(normalized.roomGstRate));
      setProfFoodGstRate(String(normalized.foodGstRate));
      setProfRoomIncludesGst(normalized.roomRateIncludesGst);
      setProfTaxOnAncillary(normalized.taxOnAncillary);
      setProfInvPrefix(normalized.invoicePrefix);
      setProfNextSeq(
        String(
          nextInvoiceSequence(
            state.invoices.map((i) => i.invoiceNumber),
            normalized.nextInvoiceSequence
          )
        )
      );
      setProfGrcPrefix(normalized.grcPrefix);
      setProfWaterBottleRate(String(normalized.waterBottleRate));
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

  // ---------------- 2. ALL USERS LIST (Staff Accounts + Guest Customers + Advance Bookings) ----------------
  if (moduleId === 'userList') {
    const guestMap = new Map<
      string,
      { key: string; name: string; mobile: string; room: string; type: 'In-House Guest' | 'Advance Booking' | 'Past Guest'; status: string }
    >();
    state.checkins.forEach((c) => {
      const mobile = String(c.mobile || c.phone || '').trim();
      const key = mobile || c.id;
      const isOut = String(c.status || '').toLowerCase().includes('out');
      guestMap.set(key, {
        key,
        name: c.guestName || 'Guest',
        mobile: mobile || 'N/A',
        room: c.roomNumber || '-',
        type: isOut ? 'Past Guest' : 'In-House Guest',
        status: isOut ? 'Checked-Out' : 'In-House',
      });
    });
    state.bookings.forEach((b) => {
      const mobile = String(b.mobile || '').trim();
      const key = mobile || b.id;
      if (!guestMap.has(key)) {
        guestMap.set(key, {
          key,
          name: b.guestName || b.customerName || 'Guest',
          mobile: mobile || 'N/A',
          room: b.roomNumber || '-',
          type: b.isCompleted ? 'Past Guest' : 'Advance Booking',
          status: b.status || 'Confirmed',
        });
      }
    });
    const allGuests = Array.from(guestMap.values());
    const totalAllUsers = 1 + state.staff.length + allGuests.length;

    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All Hotel Users Directory ({totalAllUsers})</Text>
          <Text style={[styles.rowSub, { marginBottom: 8 }]}>
            Unified directory of Hotel Admin, Staff Accounts ({state.staff.length}), and Guest Customers &amp; Advance Bookings ({allGuests.length}).
          </Text>

          <View style={styles.rowItem}>
            <KeyRound size={16} color={COLORS.goldDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {hotelProfile?.name || 'Hotel Admin'} (Owner / Admin)
              </Text>
              <Text style={styles.rowSub}>Username: {session?.username}</Text>
            </View>
            <Text style={[styles.amtText, { color: COLORS.emerald }]}>ADMIN</Text>
          </View>

          {state.staff.map((s) => (
            <View key={s.id} style={styles.rowItem}>
              <Users size={16} color={COLORS.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>
                  {s.name} ({s.department || s.role || 'Staff'})
                </Text>
                <Text style={styles.rowSub}>
                  Staff • {s.mobile || 'N/A'} • User: {s.username}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: s.status === 'Active' ? COLORS.emerald : COLORS.rose,
                }}
              >
                {s.status || 'Active'}
              </Text>
            </View>
          ))}

          {allGuests.map((g) => (
            <View key={g.key} style={styles.rowItem}>
              <Users size={16} color={COLORS.goldDark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{g.name}</Text>
                <Text style={styles.rowSub}>
                  {g.type} • Room {g.room} • {g.mobile}
                </Text>
              </View>
              <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.espresso }}>
                {g.status}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ---------------- 3. SIMPLE FINANCIAL HUB (5-CARD OWNER SUMMARY + DATE-WISE LEDGER) ----------------
  if (moduleId === 'finance') {
    interface LedgerRow {
      id: string;
      date: string;
      title: string;
      subtitle: string;
      kind: 'stay' | 'pos' | 'expense';
      billed: number;
      received: number;
      due: number;
      expense: number;
      mode: string;
    }

    const ledgerRows: LedgerRow[] = [];
    let totalBilling = 0;
    let totalReceived = 0;
    let pendingBalanceDue = 0;
    let totalExpenses = 0;
    const receivedByMode = { cash: 0, upi: 0, card: 0, bank: 0 };

    // 1. Stays & Primary Invoices (single bill calculator avoids double counting)
    state.bookings
      .filter((b) => b.status !== 'Cancelled')
      .forEach((b) => {
        const primaryInv = state.invoices.find(
          (inv) => inv.bookingId === b.id && !inv.isSeparateInvoice
        );
        const stayDate =
          primaryInv?.dateCreated ||
          primaryInv?.date ||
          (b.isCompleted || b.status === 'Checked Out' ? b.checkOutDate : b.checkInDate) ||
          b.bookingDate ||
          '';
        if (!matchesQuickDateFilter(stayDate, dateFilter, fromDate, toDate)) return;

        const chk = state.checkins.find((c) => c.bookingId === b.id || c.id === b.id);
        const stayCalc = buildStayBill({
          booking: b,
          checkin: chk,
          posOrders: state.posOrders,
          laundryOrders: state.laundryOrders,
          waterBottles: state.waterBottles,
          rooms: state.rooms,
          settings: billSettings,
        });

        const billed = primaryInv
          ? r2(primaryInv.finalAmount ?? primaryInv.totalAmount ?? stayCalc.bill.grandTotal)
          : stayCalc.bill.grandTotal;
        const received = primaryInv
          ? r2(primaryInv.advancePaid ?? primaryInv.paidAmount ?? stayCalc.bill.receipts)
          : stayCalc.bill.receipts;
        const due = primaryInv
          ? r2(primaryInv.pendingAmount ?? Math.max(0, billed - received))
          : stayCalc.bill.balance;
        const mode = primaryInv?.paymentMethod || b.paymentMethod || 'Cash';

        totalBilling = r2(totalBilling + billed);
        totalReceived = r2(totalReceived + received);
        pendingBalanceDue = r2(pendingBalanceDue + due);

        if (stayCalc.folio.payments.length > 0) {
          stayCalc.folio.payments.forEach((p) => {
            if (p.amount > 0) {
              const bucket = classifyPaymentBucket(p.method);
              receivedByMode[bucket] = r2(receivedByMode[bucket] + p.amount);
            }
          });
        } else if (received > 0) {
          const bucket = classifyPaymentBucket(mode);
          receivedByMode[bucket] = r2(receivedByMode[bucket] + received);
        }

        ledgerRows.push({
          id: `stay-${b.id}`,
          date: normalizeFilterDate(stayDate),
          title: `${b.guestName} • Rm ${b.roomNumber}`,
          subtitle: `${primaryInv ? primaryInv.invoiceNumber : b.bookingNo || b.id} • ${b.status}`,
          kind: 'stay',
          billed,
          received,
          due,
          expense: 0,
          mode,
        });
      });

    // 2. Direct Counter / Dine-In POS Orders (not posted to room folio)
    state.posOrders.forEach((po) => {
      if (!po || String(po.status || '').toLowerCase() === 'cancelled') return;
      const toRoom =
        po.postToRoomBill === true ||
        String(po.paymentMethod || '').toLowerCase().includes('room');
      if (toRoom) return;
      const d = po.date || po.dateTime || po.createdAt || '';
      if (!matchesQuickDateFilter(d, dateFilter, fromDate, toDate)) return;
      const amt = r2(po.grandTotal ?? po.totalAmount ?? 0);
      const isPaid = String(po.paymentStatus || '').toLowerCase() === 'paid';
      const rec = isPaid ? amt : 0;
      const due = isPaid ? 0 : amt;
      const mode = po.paymentMethod || 'Cash';

      totalBilling = r2(totalBilling + amt);
      totalReceived = r2(totalReceived + rec);
      pendingBalanceDue = r2(pendingBalanceDue + due);
      if (rec > 0) {
        const bucket = classifyPaymentBucket(mode);
        receivedByMode[bucket] = r2(receivedByMode[bucket] + rec);
      }

      ledgerRows.push({
        id: `pos-${po.id}`,
        date: normalizeFilterDate(d),
        title: `POS Dining • ${po.guestName || po.tableNumber || 'Counter'}`,
        subtitle: `${po.orderNumber || po.id} • ${mode}`,
        kind: 'pos',
        billed: amt,
        received: rec,
        due,
        expense: 0,
        mode,
      });
    });

    // 3. Expenses
    const filteredExpenses = state.expenses.filter((e) =>
      matchesQuickDateFilter(e.date, dateFilter, fromDate, toDate)
    );
    filteredExpenses.forEach((e) => {
      const amt = r2(Number(e.amount) || 0);
      totalExpenses = r2(totalExpenses + amt);
      ledgerRows.push({
        id: `exp-${e.id}`,
        date: normalizeFilterDate(e.date),
        title: `Expense: ${e.description}`,
        subtitle: `${e.category}${e.vendorName ? ` • ${e.vendorName}` : ''}`,
        kind: 'expense',
        billed: 0,
        received: 0,
        due: 0,
        expense: amt,
        mode: e.paymentMethod || 'Cash',
      });
    });

    const netBalance = r2(totalReceived - totalExpenses);

    const visibleLedger = ledgerRows
      .filter((row) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return `${row.title} ${row.subtitle} ${row.mode}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return (
      <View style={styles.root}>
        <SubTabStrip
          activeId={finTab}
          onSelect={(id) => setFinTab(id as any)}
          tabs={[
            { id: 'overview', label: 'Owner Summary & Ledger', Icon: Wallet },
            { id: 'expenses', label: 'Expenses', count: state.expenses.length },
            { id: 'petty', label: 'Petty Cash', count: state.pettyCash.length },
            { id: 'closing', label: 'Shift Closing', count: state.dailyClosings.length },
          ]}
        />
        <DateFilterBar
          activeFilter={dateFilter}
          onChangeFilter={setDateFilter}
          fromDate={fromDate}
          toDate={toDate}
          onChangeFromDate={setFromDate}
          onChangeToDate={setToDate}
          searchQuery={finTab === 'overview' ? searchQuery : undefined}
          onChangeSearch={finTab === 'overview' ? setSearchQuery : undefined}
          searchPlaceholder="Search ledger guest, invoice, expense..."
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          {finTab === 'overview' && (
            <>
              {/* Clear 5-Card Owner Summary */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Financial Hub — Owner Summary</Text>

                <View style={styles.twoCol}>
                  {/* Card 1: Total Billing */}
                  <View style={[styles.statBox, { backgroundColor: '#FAF3E0' }]}>
                    <Text style={styles.statLabel}>1. Total Billing</Text>
                    <Text style={[styles.statVal, { color: COLORS.espresso }]}>
                      ₹{formatMoney(totalBilling)}
                    </Text>
                  </View>

                  {/* Card 3: Pending Balance Due */}
                  <View style={[styles.statBox, { backgroundColor: COLORS.amberSoft }]}>
                    <Text style={styles.statLabel}>3. Pending Balance Due</Text>
                    <Text style={[styles.statVal, { color: COLORS.amber }]}>
                      ₹{formatMoney(pendingBalanceDue)}
                    </Text>
                  </View>
                </View>

                {/* Card 2: Total Received (Cash / UPI / Card / Bank) */}
                <View
                  style={[
                    styles.statBox,
                    { backgroundColor: COLORS.emeraldSoft, marginTop: 8 },
                  ]}
                >
                  <Text style={styles.statLabel}>
                    2. Total Received (Cash / UPI / Card / Bank)
                  </Text>
                  <Text style={[styles.statVal, { color: COLORS.emerald }]}>
                    ₹{formatMoney(totalReceived)}
                  </Text>
                  <Text style={styles.modeBreakdownText}>
                    Cash ₹{formatMoney(receivedByMode.cash)} • UPI ₹
                    {formatMoney(receivedByMode.upi)} • Card ₹
                    {formatMoney(receivedByMode.card)} • Bank ₹
                    {formatMoney(receivedByMode.bank)}
                  </Text>
                </View>

                <View style={[styles.twoCol, { marginTop: 8 }]}>
                  {/* Card 4: Total Expenses */}
                  <View style={[styles.statBox, { backgroundColor: COLORS.roseSoft }]}>
                    <Text style={styles.statLabel}>4. Total Expenses</Text>
                    <Text style={[styles.statVal, { color: COLORS.rose }]}>
                      ₹{formatMoney(totalExpenses)}
                    </Text>
                  </View>

                  {/* Card 5: Net Balance */}
                  <View
                    style={[
                      styles.statBox,
                      { backgroundColor: COLORS.espresso, borderWidth: 1, borderColor: COLORS.gold },
                    ]}
                  >
                    <Text style={[styles.statLabel, { color: COLORS.goldBright }]}>
                      5. Net Balance
                    </Text>
                    <Text
                      style={[
                        styles.statVal,
                        { color: netBalance >= 0 ? '#FFFFFF' : '#FCA5A5' },
                      ]}
                    >
                      ₹{formatMoney(netBalance)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Clean Date-Wise Ledger List */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Date-Wise Ledger ({visibleLedger.length})
                </Text>
                {visibleLedger.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No ledger entries match the selected date range.
                  </Text>
                ) : (
                  visibleLedger.map((entry) => (
                    <View key={entry.id} style={styles.rowItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{entry.title}</Text>
                        <Text style={styles.rowSub}>
                          {formatDateLabel(entry.date) || entry.date} • {entry.subtitle} •{' '}
                          {entry.mode}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        {entry.kind === 'expense' ? (
                          <Text style={[styles.amtText, { color: COLORS.rose }]}>
                            - ₹{formatMoney(entry.expense)}
                          </Text>
                        ) : (
                          <>
                            <Text style={[styles.amtText, { color: COLORS.emerald }]}>
                              + ₹{formatMoney(entry.received)}
                            </Text>
                            <Text style={styles.rowSub}>
                              Bill ₹{formatMoney(entry.billed)}
                              {entry.due > 0 ? ` • Due ₹${formatMoney(entry.due)}` : ''}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
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
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                {['Cash', 'UPI', 'Card', 'Bank'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setExpMode(m)}
                    style={[
                      styles.modePill,
                      expMode === m && { backgroundColor: COLORS.espresso, borderColor: COLORS.gold },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modePillText,
                        expMode === m && { color: COLORS.goldBright },
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={async () => {
                  if (!expTitle.trim() || !Number(expAmt)) return;
                  await addExpenseEntry({
                    category: expCat,
                    vendorName: 'Hotel Operations',
                    description: expTitle,
                    amount: Number(expAmt),
                    paymentMethod: expMode,
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
                      {e.category} • {e.paymentMethod || 'Cash'} • {formatDateLabel(e.date)}
                    </Text>
                  </View>
                  <Text style={[styles.amtText, { color: COLORS.rose }]}>
                    ₹{formatMoney(e.amount)}
                  </Text>
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
                  style={[
                    styles.input,
                    { flex: 0.7, justifyContent: 'center', alignItems: 'center' },
                  ]}
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
              {state.pettyCash
                .filter((p) => matchesQuickDateFilter(p.date, dateFilter, fromDate, toDate))
                .map((p) => (
                  <View key={p.id} style={styles.rowItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{p.description}</Text>
                      <Text style={styles.rowSub}>
                        {p.type} • {formatDateLabel(p.date)}
                      </Text>
                    </View>
                    <Text style={styles.amtText}>₹{formatMoney(p.amount)}</Text>
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
                    cashCollected: receivedByMode.cash,
                    upiCollected: r2(
                      receivedByMode.upi + receivedByMode.card + receivedByMode.bank
                    ),
                    notes: `Net balance ₹${formatMoney(netBalance)}`,
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
                      {formatDateLabel(dc.date)} • {dc.shift}
                    </Text>
                    <Text style={styles.rowSub}>Closed by {dc.closedBy}</Text>
                  </View>
                  <Text style={styles.amtText}>
                    ₹{formatMoney(Number(dc.cashCollected || 0) + Number(dc.upiCollected || 0))}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------------- 4. AUDITS & REPORTS ----------------
  if (moduleId === 'reports') {
    const activeNonReversedInvoices = state.invoices.filter(
      (i) =>
        i &&
        i.documentType !== 'CreditNote' &&
        i.invoiceType !== 'Credit Note' &&
        i.invoiceStatus !== 'Superseded' &&
        !i.supersededByCreditNoteId
    );
    const filteredBkgs = state.bookings.filter(
      (b) =>
        b.status !== 'Cancelled' &&
        matchesQuickDateFilter(b.checkInDate || b.bookingDate, dateFilter, fromDate, toDate)
    );
    const filteredActiveInvs = activeNonReversedInvoices.filter((i) =>
      matchesQuickDateFilter(i.dateCreated || i.date, dateFilter, fromDate, toDate)
    );
    const invoicedBkgSet = new Set(activeNonReversedInvoices.map((i) => i.bookingId).filter(Boolean));
    const cashInvCol = filteredActiveInvs
      .filter((i) => classifyPaymentBucket(i.paymentMethod) === 'cash')
      .reduce((s, i) => s + (Number(i.paidAmount ?? i.advancePaid) || 0), 0);
    const nonCashInvCol = filteredActiveInvs
      .filter((i) => classifyPaymentBucket(i.paymentMethod) !== 'cash')
      .reduce((s, i) => s + (Number(i.paidAmount ?? i.advancePaid) || 0), 0);
    const cashAdvCol = filteredBkgs
      .filter((b) => !invoicedBkgSet.has(b.id) && classifyPaymentBucket(b.paymentMethod) === 'cash')
      .reduce((s, b) => s + (Number(b.amountPaid ?? b.advanceAmount) || 0), 0);
    const nonCashAdvCol = filteredBkgs
      .filter((b) => !invoicedBkgSet.has(b.id) && classifyPaymentBucket(b.paymentMethod) !== 'cash')
      .reduce((s, b) => s + (Number(b.amountPaid ?? b.advanceAmount) || 0), 0);
    const cashCol = r2(cashInvCol + cashAdvCol);
    const upiCol = r2(nonCashInvCol + nonCashAdvCol);
    const gstInvoices = activeNonReversedInvoices.filter(
      (i) =>
        !i.isWithoutGst &&
        Number(i.gstRate || 0) > 0 &&
        matchesQuickDateFilter(i.dateCreated || i.date, dateFilter, fromDate, toDate)
    );
    const outstandingBkgs = state.bookings.filter(
      (b) => b.status !== 'Cancelled' && Number(b.dueAmount || 0) > 0
    );

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
        <DateFilterBar
          activeFilter={dateFilter}
          onChangeFilter={setDateFilter}
          fromDate={fromDate}
          toDate={toDate}
          onChangeFromDate={setFromDate}
          onChangeToDate={setToDate}
        />
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
                <Text style={styles.kpiBannerLabel}>
                  TOTAL COLLECTION ({dateFilter.toUpperCase()})
                </Text>
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
      if (!matchesQuickDateFilter(l.dateTime, dateFilter, fromDate, toDate)) return false;
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
          fromDate={fromDate}
          toDate={toDate}
          onChangeFromDate={setFromDate}
          onChangeToDate={setToDate}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          searchPlaceholder="Search action, user, room..."
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Owner Security & Audit Trail ({filteredAudits.length})
            </Text>
            {filteredAudits.length === 0 ? (
              <Text style={styles.emptyText}>
                No audit entries for this filter. Tap "All" above.
              </Text>
            ) : (
              filteredAudits.slice(0, 60).map((log) => (
                <View key={log.id} style={styles.rowItem}>
                  <ShieldCheck size={16} color={COLORS.goldDark} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{log.action}</Text>
                    <Text style={styles.rowSub}>{log.details}</Text>
                    <Text style={[styles.rowSub, { color: COLORS.goldDark }]}>
                      By {log.performedBy} •{' '}
                      {String(log.dateTime || '').slice(0, 19).replace('T', ' ')}
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

  // ---------------- 6. NOTIFICATIONS CENTER ----------------
  if (moduleId === 'notifications') {
    const dirtyRooms = state.rooms.filter((r) => r.status === 'Dirty');
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
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
                {
                  backgroundColor: COLORS.amberSoft,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  marginBottom: 6,
                },
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

  // ---------------- 7. MY PROFILE & CENTRALIZED BILLING / GST / GRC SETTINGS ----------------
  const invoicePreviewStr = formatInvoiceNumber(
    profInvPrefix || 'INV',
    Math.max(1, Math.floor(Number(profNextSeq) || 1001))
  );
  const grcPreviewStr = formatGrcNumber(
    profGrcPrefix || 'GRC',
    Math.max(1, Math.floor(Number(hotelProfile?.nextGrcSequence || 1)))
  );

  const defaultPlans = [
    { id: 'pkg-full-pms', name: 'Full PMS (Unlimited Rooms)', priceYearly: 5999, gstRate: 18 },
    { id: 'pkg-pms-cm-starter', name: 'PMS + Channel Manager Starter (10 Rooms)', priceYearly: 12999, gstRate: 18 },
    { id: 'pkg-pms-cm-growth', name: 'PMS + Channel Manager Growth', priceYearly: 14999, gstRate: 18 },
  ];
  const activePlans =
    Array.isArray(state.packages) && state.packages.filter((p) => p && p.isActive !== false).length > 0
      ? state.packages
          .filter((p) => p && p.isActive !== false)
          .map((p) => ({
            id: p.id,
            name: p.name,
            priceYearly: Number(p.priceYearly || p.priceMonthly || 5999),
            gstRate: Number(p.gstRate ?? 18),
          }))
      : defaultPlans;
  const chosenPlan = activePlans[Math.min(renewPlanIdx, activePlans.length - 1)] || defaultPlans[0];
  const renewBase = chosenPlan.priceYearly;
  const renewGstRate = chosenPlan.gstRate;
  const renewGstAmt = Math.round(renewBase * (renewGstRate / 100));
  const renewTotal = renewBase + renewGstAmt;
  const upiId = state.systemWebsite?.paymentSettings?.upiId || 'directstay@upi';
  const upiPayee = state.systemWebsite?.paymentSettings?.upiPayeeName || 'DirectStay Hospitality SaaS';
  const waRaw = String(
    state.systemWebsite?.whatsappNumber || state.systemWebsite?.supportPhone || '917978563771'
  ).replace(/\D/g, '');
  const waDigits = waRaw.length === 10 ? `91${waRaw}` : waRaw || '917978563771';
  const daysRemaining = (() => {
    if (!hotelProfile?.subscriptionEndDate) return null;
    const d = new Date(hotelProfile.subscriptionEndDate);
    if (Number.isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  })();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {/* DirectStay SaaS Membership, Direct UPI Renewal & WhatsApp Support */}
      <View style={[styles.card, { borderColor: COLORS.emerald }]}>
        <Text style={styles.cardTitle}>SaaS Membership &amp; Direct UPI Renewal</Text>
        <Text style={[styles.rowSub, { marginBottom: 8 }]}>
          Plan: {hotelProfile?.subscriptionPlan || 'Yearly'} • Valid Until:{' '}
          {hotelProfile?.subscriptionEndDate || 'Active'}
          {daysRemaining !== null
            ? daysRemaining < 0
              ? ` • ${Math.abs(daysRemaining)}d overdue`
              : ` • ${daysRemaining}d remaining`
            : ''}
        </Text>

        {hotelProfile?.renewalRequest?.status === 'Pending' && (
          <View style={[styles.previewPill, { backgroundColor: COLORS.amberSoft, marginBottom: 8 }]}>
            <Text style={[styles.previewPillLabel, { color: COLORS.amber }]}>
              Pending Verification: {hotelProfile.renewalRequest.requestedPackageName} (UTR:{' '}
              {hotelProfile.renewalRequest.transactionReference || 'Submitted'})
            </Text>
          </View>
        )}

        <Text style={styles.label}>Select Renewal / Upgrade Plan (18% GST Extra)</Text>
        <View style={{ gap: 6, marginBottom: 8 }}>
          {activePlans.map((pl, idx) => {
            const isSel = idx === renewPlanIdx;
            const tot = pl.priceYearly + Math.round(pl.priceYearly * (pl.gstRate / 100));
            return (
              <TouchableOpacity
                key={pl.id}
                onPress={() => setRenewPlanIdx(idx)}
                style={[
                  styles.toggleRow,
                  { marginBottom: 0 },
                  isSel && { borderColor: COLORS.espresso, backgroundColor: '#FDF8EE' },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>{pl.name}</Text>
                  <Text style={styles.toggleSub}>
                    ₹{pl.priceYearly.toLocaleString('en-IN')}/yr + {pl.gstRate}% GST = ₹
                    {tot.toLocaleString('en-IN')}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: isSel ? COLORS.espresso : COLORS.textMuted }}>
                  {isSel ? 'SELECTED ✓' : 'Choose'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => {
            const note = `DirectStay ${chosenPlan.name} - ${hotelProfile?.name || session?.hotelId}`;
            const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
              upiPayee
            )}&am=${renewTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note.slice(0, 60))}`;
            Linking.openURL(upiUrl).catch(() =>
              Alert.alert('UPI Pay', `Pay ₹${renewTotal.toLocaleString('en-IN')} to UPI ID: ${upiId}`)
            );
          }}
          style={[styles.primaryBtn, { backgroundColor: '#16A34A', marginBottom: 8 }]}
        >
          <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>
            Pay ₹{renewTotal.toLocaleString('en-IN')} via UPI App ({upiId})
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>UTR / UPI Transaction Reference (Required for Verification)</Text>
        <TextInput
          value={renewUtr}
          onChangeText={setRenewUtr}
          placeholder="Enter 12-digit UPI UTR after payment"
          style={styles.input}
        />

        <View style={styles.twoCol}>
          <TouchableOpacity
            disabled={submittingRenewal}
            onPress={async () => {
              const clean = renewUtr.trim();
              if (clean.length < 6) {
                Alert.alert('UTR Required', 'Enter your valid UPI UTR / reference number (min 6 chars) after payment.');
                return;
              }
              setSubmittingRenewal(true);
              const res = await submitMembershipRenewal({
                requestedPackageId: chosenPlan.id,
                requestedPackageName: chosenPlan.name,
                requestedPlan: 'Yearly',
                requestedAmount: renewBase,
                baseAmount: renewBase,
                gstRate: renewGstRate,
                paymentMethod: 'UPI QR / Direct UPI',
                upiIdUsed: upiId,
                transactionReference: clean,
              });
              setSubmittingRenewal(false);
              if (res.ok) {
                setRenewUtr('');
                Alert.alert(
                  'Submitted for Verification',
                  'Your UTR has been queued for billing verification. Your plan & GST Invoice activate once verified.'
                );
              } else {
                Alert.alert('Submission Failed', res.error || 'Could not submit UTR.');
              }
            }}
            style={[styles.primaryBtn, { flex: 1.2 }]}
          >
            <Text style={styles.primaryBtnText}>
              {submittingRenewal ? 'Submitting...' : 'Submit UTR'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const msg = `Hello DirectStay Billing, I need renewal help for ${hotelProfile?.name || session?.hotelId} (${chosenPlan.name}).`;
              Linking.openURL(`https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`).catch(() => {});
            }}
            style={[styles.primaryBtn, { flex: 1, backgroundColor: '#059669' }]}
          >
            <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>WhatsApp Support</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* GST, Invoice Numbering, GRC & Water Bottle Rate Configuration */}
      <View style={[styles.card, { borderColor: COLORS.gold }]}>
        <Text style={styles.cardTitle}>GST, Invoice, GRC & Billing Rules</Text>
        <Text style={[styles.rowSub, { marginBottom: 10 }]}>
          Shared single-source billing rules across Web & Mobile. When "GST Invoice" is ticked at
          Check-In or Checkout, these exact GST rates and numbering formats apply automatically.
        </Text>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Default Room GST %</Text>
            <TextInput
              value={profRoomGstRate}
              onChangeText={setProfRoomGstRate}
              keyboardType="numeric"
              placeholder="5"
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Food (F&B) GST %</Text>
            <TextInput
              value={profFoodGstRate}
              onChangeText={setProfFoodGstRate}
              keyboardType="numeric"
              placeholder="5"
              style={styles.input}
            />
          </View>
        </View>

        {/* Toggle 1: Room Rate Includes GST */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setProfRoomIncludesGst((p) => !p)}
          style={[
            styles.toggleRow,
            profRoomIncludesGst && {
              borderColor: COLORS.emerald,
              backgroundColor: COLORS.emeraldSoft,
            },
          ]}
        >
          {profRoomIncludesGst ? (
            <CheckSquare size={18} color={COLORS.emerald} />
          ) : (
            <Square size={18} color={COLORS.textSecondary} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Room Rate Includes GST</Text>
            <Text style={styles.toggleSub}>
              When ON, entered room tariff is GST-inclusive and auto-splits into pre-tax + CGST/SGST.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Toggle 2: GST on Water / Extra Services */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setProfTaxOnAncillary((p) => !p)}
          style={[
            styles.toggleRow,
            profTaxOnAncillary && {
              borderColor: COLORS.emerald,
              backgroundColor: COLORS.emeraldSoft,
            },
          ]}
        >
          {profTaxOnAncillary ? (
            <CheckSquare size={18} color={COLORS.emerald} />
          ) : (
            <Square size={18} color={COLORS.textSecondary} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>GST on Water / Extra Services</Text>
            <Text style={styles.toggleSub}>
              Apply Room GST % to chargeable water bottles, laundry & extra services on GST invoices.
            </Text>
          </View>
        </TouchableOpacity>

        {/* Invoice Prefix + Next Sequence + Live Preview */}
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Invoice Prefix</Text>
            <TextInput
              value={profInvPrefix}
              onChangeText={setProfInvPrefix}
              autoCapitalize="characters"
              placeholder="MMPR"
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Next Invoice Number</Text>
            <TextInput
              value={profNextSeq}
              onChangeText={setProfNextSeq}
              keyboardType="numeric"
              placeholder="1014"
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.previewPill}>
          <Text style={styles.previewPillLabel}>Next Invoice Format Preview:</Text>
          <Text style={styles.previewPillVal}>{invoicePreviewStr}</Text>
        </View>

        {/* GRC Prefix + Water Bottle Rate */}
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>GRC Prefix ({grcPreviewStr})</Text>
            <TextInput
              value={profGrcPrefix}
              onChangeText={setProfGrcPrefix}
              autoCapitalize="characters"
              placeholder="GRC"
              style={styles.input}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Water Bottle Rate (₹)</Text>
            <TextInput
              value={profWaterBottleRate}
              onChangeText={setProfWaterBottleRate}
              keyboardType="numeric"
              placeholder="20"
              style={styles.input}
            />
          </View>
        </View>

        {/* GSTIN + PAN + Place of Supply */}
        <View style={styles.twoCol}>
          <View style={{ flex: 1.2 }}>
            <Text style={styles.label}>Hotel GSTIN Number</Text>
            <TextInput
              value={profGstin}
              onChangeText={setProfGstin}
              autoCapitalize="characters"
              placeholder="22AAAAA0000A1Z5"
              style={styles.input}
            />
          </View>
          <View style={{ flex: 0.9 }}>
            <Text style={styles.label}>PAN Number</Text>
            <TextInput
              value={profPan}
              onChangeText={setProfPan}
              autoCapitalize="characters"
              placeholder="AAAAA0000A"
              style={styles.input}
            />
          </View>
        </View>

        <Text style={styles.label}>Place of Supply (State)</Text>
        <TextInput
          value={profPlaceOfSupply}
          onChangeText={setProfPlaceOfSupply}
          placeholder="e.g. Maharashtra / Delhi / Karnataka"
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
            const roomGst = Number(profRoomGstRate) >= 0 ? Number(profRoomGstRate) : 5;
            const foodGst = Number(profFoodGstRate) >= 0 ? Number(profFoodGstRate) : 5;
            const wbRateVal = Number(profWaterBottleRate) >= 0 ? Number(profWaterBottleRate) : 20;
            const cleanPrefix = (profInvPrefix.trim() || 'INV').replace(/[-/\s]+$/, '');
            const cleanGrc = (profGrcPrefix.trim() || 'GRC').replace(/[-/\s]+$/, '');
            const cleanSeq = Math.max(1, Math.floor(Number(profNextSeq) || 1001));

            await updateHotelProfileSettings({
              name: profName.trim() || hotelProfile?.name || 'DirectStay Property',
              phoneNumber: profPhone.trim(),
              phone: profPhone.trim(),
              emailAddress: profEmail.trim(),
              email: profEmail.trim(),
              address: profAddress.trim(),
              state: profPlaceOfSupply.trim(),
              placeOfSupply: profPlaceOfSupply.trim(),
              gstNumber: profGstin.trim(),
              panNumber: profPan.trim(),
              defaultGstRate: roomGst,
              roomGstRate: roomGst,
              foodGstRate: foodGst,
              roomRateIncludesGst: profRoomIncludesGst,
              taxOnAncillary: profTaxOnAncillary,
              invoicePrefix: cleanPrefix,
              nextInvoiceSequence: cleanSeq,
              startingInvoiceNumber: cleanSeq,
              grcPrefix: cleanGrc,
              waterBottleRate: wbRateVal,
              checkInTime: profCheckInTime.trim(),
              checkOutTime: profCheckOutTime.trim(),
            });
            Alert.alert(
              'Settings Saved & Synced',
              `Room GST ${roomGst}%, Food GST ${foodGst}%, Next Invoice "${formatInvoiceNumber(
                cleanPrefix,
                cleanSeq
              )}", Water Bottle ₹${wbRateVal}, and GRC "${cleanGrc}" updated live!`
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
  modeBreakdownText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 5,
  },
  modePill: {
    flex: 1,
    height: 36,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePillText: { fontSize: 11.5, fontWeight: '800', color: COLORS.textPrimary },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#FAF8F5',
    marginBottom: 9,
  },
  toggleTitle: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  toggleSub: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 1 },
  previewPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginBottom: 10,
  },
  previewPillLabel: { fontSize: 11, fontWeight: '700', color: COLORS.espresso },
  previewPillVal: { fontSize: 12.5, fontWeight: '900', color: COLORS.goldDark },
  emptyText: { fontSize: 12, color: COLORS.textMuted, paddingVertical: 10 },
});
