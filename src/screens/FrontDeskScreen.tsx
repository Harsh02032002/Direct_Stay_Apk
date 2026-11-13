import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { CalendarPlus, LogIn, LogOut, Lock, CheckCircle2 } from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { Booking } from '../types/pms';

type FrontSubMode = 'advance' | 'checkin' | 'inhouse';

export const FrontDeskScreen: React.FC = () => {
  const { state, createAdvanceBooking, performCheckIn, performCheckout } = usePms();
  const [subMode, setSubMode] = useState<FrontSubMode>('advance');

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

  const availableRooms = state.rooms.filter(
    (r) => r.status === 'Available' || r.status === 'Clean' || r.status === 'Reserved'
  );
  const firstRoom = availableRooms[0] || state.rooms[0];

  // Shared Booking / Check-In Form State
  const [linkedBookingId, setLinkedBookingId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [roomNumber, setRoomNumber] = useState(firstRoom?.number || '101');
  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [adults, setAdults] = useState('2');
  const [ratePerNight, setRatePerNight] = useState(String(firstRoom?.rate || 2000));
  const [discount, setDiscount] = useState('0');
  const [withGst, setWithGst] = useState<boolean>(true);
  const [gstRate, setGstRate] = useState<number>(5);
  const [advanceAmt, setAdvanceAmt] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [submitting, setSubmitting] = useState(false);

  // Checkout Modal State
  const [checkoutTarget, setCheckoutTarget] = useState<Booking | null>(null);
  const [coExtraAmt, setCoExtraAmt] = useState('0');
  const [coDiscount, setCoDiscount] = useState('0');
  const [coWithGst, setCoWithGst] = useState(true);
  const [coGstRate, setCoGstRate] = useState(5);
  const [coCollectedNow, setCoCollectedNow] = useState('0');
  const [coPayMethod, setCoPayMethod] = useState('UPI');

  const nights = (() => {
    const d1 = new Date(`${checkInDate}T00:00:00`);
    const d2 = new Date(`${checkOutDate}T00:00:00`);
    const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
    return Number.isFinite(diff) && diff > 0 ? diff : 1;
  })();
  const roomSub = (Number(ratePerNight) || 0) * nights;
  const taxable = Math.max(0, roomSub - (Number(discount) || 0));
  const effGst = withGst ? gstRate : 0;
  const taxAmt = effGst > 0 ? Math.round(((taxable * effGst) / 100) * 100) / 100 : 0;
  const grandTotal = Math.round((taxable + taxAmt) * 100) / 100;
  const netDue = Math.max(0, Math.round((grandTotal - (Number(advanceAmt) || 0)) * 100) / 100);

  const loadAdvanceBookingIntoCheckIn = (b: Booking) => {
    setLinkedBookingId(b.id);
    setGuestName(b.guestName || b.customerName || '');
    setMobile(b.mobile || '');
    setEmail(b.email || '');
    setAadhaar(b.aadhaarNumber || '');
    setAddress(b.address || '');
    setCompanyName(b.companyName || '');
    setGstNumber(b.gstNumber || '');
    setRoomNumber(b.roomNumber || firstRoom?.number || '101');
    setCheckInDate(b.checkInDate || todayStr);
    setCheckOutDate(b.checkOutDate || tomorrowStr);
    setAdults(String(b.adults || 2));
    const perNight =
      Number(b.roomSubtotal || b.bookingAmount || 0) / Math.max(1, Number(b.nights) || 1);
    setRatePerNight(String(Math.round(perNight) || 2000));
    setDiscount(String(b.discountAmount || 0));

    // Accurately preserve No GST (0%) vs With GST from saved Advance Booking!
    const savedNoGst =
      b.isWithoutGst === true ||
      b.gstInvoice === false ||
      (b.gstRate !== undefined && Number(b.gstRate) <= 0);
    setWithGst(!savedNoGst);
    setGstRate(savedNoGst ? 5 : Number(b.gstRate || b.taxRate || 5));
    setAdvanceAmt(String(b.advanceAmount ?? b.amountPaid ?? 0));
    setPaymentMethod(b.paymentMethod || 'UPI');
    setSubMode('checkin');
  };

  const resetForm = () => {
    setLinkedBookingId('');
    setGuestName('');
    setMobile('');
    setEmail('');
    setAadhaar('');
    setAddress('');
    setCompanyName('');
    setGstNumber('');
    setAdvanceAmt('0');
    setDiscount('0');
  };

  const handleSaveAdvanceBooking = async () => {
    if (!guestName.trim() || mobile.trim().length < 10) {
      Alert.alert('Validation', 'Please enter guest name and a valid 10-digit mobile number.');
      return;
    }
    setSubmitting(true);
    const res = await createAdvanceBooking({
      guestName,
      mobile,
      email,
      aadhaarNumber: aadhaar,
      address,
      companyName,
      gstNumber,
      roomNumber,
      checkInDate,
      checkOutDate,
      adults: Number(adults) || 2,
      ratePerNight: Number(ratePerNight) || 2000,
      discount: Number(discount) || 0,
      withGst,
      gstRate,
      advanceAmount: Number(advanceAmt) || 0,
      paymentMethod,
      bookingSource: 'Direct',
    });
    setSubmitting(false);
    if (!res.ok) {
      Alert.alert('Sync Error', res.error || 'Could not save booking');
      return;
    }
    Alert.alert(
      'Advance Booking Saved',
      `${guestName} booked in Room ${roomNumber} (${withGst ? `With GST ${gstRate}%` : 'No GST 0%'}).`
    );
    resetForm();
  };

  const handleConfirmCheckIn = async () => {
    if (!guestName.trim() || mobile.trim().length < 10) {
      Alert.alert('Validation', 'Guest name and 10-digit mobile number are required.');
      return;
    }
    setSubmitting(true);
    const res = await performCheckIn({
      linkedBookingId: linkedBookingId || undefined,
      guestName,
      mobile,
      aadhaarNumber: aadhaar,
      address,
      companyName,
      gstNumber,
      roomNumber,
      checkInDate,
      checkOutDate,
      adults: Number(adults) || 2,
      ratePerNight: Number(ratePerNight) || 2000,
      discount: Number(discount) || 0,
      withGst,
      gstRate,
      advanceAmount: Number(advanceAmt) || 0,
      paymentMethod,
    });
    setSubmitting(false);
    if (!res.ok) {
      Alert.alert('Check-In Error', res.error || 'Failed to check in guest');
      return;
    }
    Alert.alert(
      'Guest Checked In',
      `${guestName} checked into Room ${roomNumber} (${withGst ? `With GST ${gstRate}%` : 'No GST 0%'}).`
    );
    resetForm();
    setSubMode('inhouse');
  };

  const openCheckoutModal = (b: Booking) => {
    const existingInv = state.invoices.find(
      (i) => i.bookingId === b.id && !i.isSeparateInvoice
    );
    const savedNoGst = existingInv
      ? existingInv.isWithoutGst === true ||
        (existingInv.gstRate !== undefined && Number(existingInv.gstRate) <= 0)
      : b.isWithoutGst === true ||
        b.gstInvoice === false ||
        (b.gstRate !== undefined && Number(b.gstRate) <= 0);
    const rate = existingInv
      ? Number(existingInv.gstRate) || 5
      : Number(b.gstRate || b.taxRate || 5);

    setCheckoutTarget(b);
    setCoExtraAmt('0');
    setCoDiscount(String(b.discountAmount || 0));
    setCoWithGst(!savedNoGst);
    setCoGstRate(rate > 0 ? rate : 5);
    setCoCollectedNow(String(b.dueAmount ?? 0));
    setCoPayMethod(b.paymentMethod || 'UPI');
  };

  const pendingAdvanceList = state.bookings.filter(
    (b) => !b.isCheckedIn && !b.isCompleted && b.status !== 'Cancelled' && b.status !== 'Checked Out'
  );
  const activeInHouseList = state.bookings.filter(
    (b) => (b.isCheckedIn || b.status === 'Checked In') && !b.isCompleted && b.status !== 'Checked Out'
  );

  const isCheckInLockedByInv = Boolean(
    linkedBookingId &&
      state.invoices.some((i) => i.bookingId === linkedBookingId && !i.isSeparateInvoice)
  );

  return (
    <View style={styles.root}>
      {/* Sub-Navigation Pills */}
      <View style={styles.subBar}>
        {[
          { key: 'advance', label: 'Advance Booking', Icon: CalendarPlus },
          { key: 'checkin', label: 'Guest Check-In', Icon: LogIn },
          { key: 'inhouse', label: `In-House (${activeInHouseList.length})`, Icon: LogOut },
        ].map(({ key, label, Icon }) => {
          const active = subMode === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setSubMode(key as FrontSubMode)}
              style={[styles.subBtn, active && styles.subBtnActive]}
            >
              <Icon size={14} color={active ? COLORS.goldBright : COLORS.textSecondary} />
              <Text style={[styles.subBtnText, active && styles.subBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {(subMode === 'advance' || subMode === 'checkin') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {subMode === 'advance'
                ? 'New Advance Reservation'
                : linkedBookingId
                ? `Check-In Linked Booking (${linkedBookingId})`
                : 'Walk-In / Reservation Check-In'}
            </Text>

            {subMode === 'checkin' && pendingAdvanceList.length > 0 && (
              <View style={styles.prefillBox}>
                <Text style={styles.prefillLabel}>LOAD SAVED ADVANCE BOOKING:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {pendingAdvanceList.map((b) => {
                      const noGst =
                        b.isWithoutGst === true ||
                        (b.gstRate !== undefined && Number(b.gstRate) <= 0);
                      return (
                        <TouchableOpacity
                          key={b.id}
                          onPress={() => loadAdvanceBookingIntoCheckIn(b)}
                          style={[
                            styles.prefillChip,
                            linkedBookingId === b.id && styles.prefillChipActive,
                          ]}
                        >
                          <Text style={styles.prefillChipTitle}>
                            {b.guestName} (Rm {b.roomNumber})
                          </Text>
                          <Text style={styles.prefillChipSub}>
                            {noGst ? 'No GST (0%)' : `With GST (${b.gstRate || 5}%)`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* TAX / BILLING MODE: WITH GST vs NO GST (0%) */}
            <View style={styles.gstBox}>
              <Text style={styles.gstHeader}>
                TAX / BILLING MODE (WITH GST vs NO GST)
              </Text>
              {subMode === 'checkin' && isCheckInLockedByInv ? (
                <View style={styles.lockedBanner}>
                  <Lock size={14} color={COLORS.amber} />
                  <Text style={styles.lockedText}>
                    Invoice already generated for this booking — GST mode is locked ({withGst ? `${gstRate}% GST` : 'No GST'}). Generate a separate invoice from Invoices tab if needed.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.gstToggleRow}>
                    <TouchableOpacity
                      onPress={() => setWithGst(true)}
                      style={[
                        styles.gstOptionBtn,
                        withGst && { backgroundColor: COLORS.emerald, borderColor: COLORS.emerald },
                      ]}
                    >
                      <Text style={[styles.gstOptionText, withGst && { color: '#FFF' }]}>
                        With GST ({gstRate}%)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setWithGst(false)}
                      style={[
                        styles.gstOptionBtn,
                        !withGst && { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
                      ]}
                    >
                      <Text style={[styles.gstOptionText, !withGst && { color: '#FFF' }]}>
                        No GST (0% Bill)
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {withGst && (
                    <View style={styles.slabRow}>
                      {[5, 12, 18].map((slab) => (
                        <TouchableOpacity
                          key={slab}
                          onPress={() => setGstRate(slab)}
                          style={[
                            styles.slabBtn,
                            gstRate === slab && {
                              backgroundColor: COLORS.gold,
                              borderColor: COLORS.goldDark,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.slabBtnText,
                              gstRate === slab && { color: COLORS.espresso },
                            ]}
                          >
                            {slab}% GST
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Guest Fields */}
            <Text style={styles.inputLabel}>Guest Full Name *</Text>
            <TextInput
              value={guestName}
              onChangeText={setGuestName}
              placeholder="e.g. Rajesh Sharma"
              style={styles.input}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Mobile (10-digit) *</Text>
                <TextInput
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  maxLength={10}
                  placeholder="9876543210"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Aadhaar / ID No.</Text>
                <TextInput
                  value={aadhaar}
                  onChangeText={setAadhaar}
                  placeholder="12-digit ID"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Room Selector */}
            <Text style={styles.inputLabel}>Select Room</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {state.rooms.map((rm) => {
                  const selected = roomNumber === rm.number;
                  return (
                    <TouchableOpacity
                      key={rm.id}
                      onPress={() => {
                        setRoomNumber(rm.number);
                        setRatePerNight(String(rm.rate || 2000));
                      }}
                      style={[styles.roomChip, selected && styles.roomChipSelected]}
                    >
                      <Text style={[styles.roomChipNum, selected && { color: COLORS.goldBright }]}>
                        Rm {rm.number}
                      </Text>
                      <Text style={[styles.roomChipSub, selected && { color: '#FFF' }]}>
                        ₹{rm.rate} • {rm.status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Check-In (YYYY-MM-DD)</Text>
                <TextInput value={checkInDate} onChangeText={setCheckInDate} style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Check-Out (YYYY-MM-DD)</Text>
                <TextInput value={checkOutDate} onChangeText={setCheckOutDate} style={styles.input} />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Tariff / Night (₹)</Text>
                <TextInput
                  value={ratePerNight}
                  onChangeText={setRatePerNight}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Advance Paid (₹)</Text>
                <TextInput
                  value={advanceAmt}
                  onChangeText={setAdvanceAmt}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            {withGst && (
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Company (Optional)</Text>
                  <TextInput
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Corporate Name"
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Company GSTIN</Text>
                  <TextInput
                    value={gstNumber}
                    onChangeText={setGstNumber}
                    autoCapitalize="characters"
                    placeholder="22AAAAA0000A1Z5"
                    style={styles.input}
                  />
                </View>
              </View>
            )}

            {/* Live Bill Breakdown */}
            <View style={styles.summaryBox}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Room Tariff ({nights} Night):</Text>
                <Text style={styles.sumVal}>₹{roomSub.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>
                  {withGst ? `GST (${gstRate}%):` : 'GST (No GST — 0%):'}
                </Text>
                <Text style={styles.sumVal}>₹{taxAmt.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.sumRow, styles.sumTotalRow]}>
                <Text style={styles.sumTotalLabel}>Total Payable:</Text>
                <Text style={styles.sumTotalVal}>₹{grandTotal.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Balance Due at Hotel:</Text>
                <Text style={[styles.sumVal, { color: COLORS.rose }]}>
                  ₹{netDue.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              disabled={submitting}
              onPress={subMode === 'advance' ? handleSaveAdvanceBooking : handleConfirmCheckIn}
              style={styles.primaryActionBtn}
            >
              <Text style={styles.primaryActionText}>
                {submitting
                  ? 'Syncing to Live Server...'
                  : subMode === 'advance'
                  ? `Confirm Advance Booking (${withGst ? `${gstRate}% GST` : 'No GST'})`
                  : `Complete Guest Check-In (${withGst ? `${gstRate}% GST` : 'No GST'})`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active In-House Guests & Pending Reservations */}
        {subMode === 'inhouse' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>In-House Guests Ready for Checkout</Text>
            {activeInHouseList.length === 0 ? (
              <Text style={styles.emptyText}>No active checked-in rooms right now.</Text>
            ) : (
              activeInHouseList.map((b) => {
                const noGst =
                  b.isWithoutGst === true ||
                  (b.gstRate !== undefined && Number(b.gstRate) <= 0);
                return (
                  <View key={b.id} style={styles.inhouseRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inhouseGuest}>
                        Rm {b.roomNumber} — {b.guestName}
                      </Text>
                      <Text style={styles.inhouseSub}>
                        {b.checkInDate} → {b.checkOutDate} •{' '}
                        {noGst ? 'No GST (0%)' : `With GST (${b.gstRate || 5}%)`}
                      </Text>
                      <Text style={styles.inhouseDue}>
                        Paid: ₹{b.amountPaid ?? b.advanceAmount ?? 0} | Due: ₹{b.dueAmount ?? 0}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => openCheckoutModal(b)}
                      style={styles.checkoutBtn}
                    >
                      <Text style={styles.checkoutBtnText}>Checkout</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Checkout Clearance Modal */}
      <Modal visible={Boolean(checkoutTarget)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {checkoutTarget && (() => {
              const existingInv = state.invoices.find(
                (i) => i.bookingId === checkoutTarget.id && !i.isSeparateInvoice
              );
              const baseRm = Number(checkoutTarget.roomSubtotal || checkoutTarget.bookingAmount || 0);
              const extraN = Number(coExtraAmt) || 0;
              const discN = Number(coDiscount) || 0;
              const txBase = Math.max(0, baseRm + extraN - discN);
              const effR = coWithGst ? coGstRate : 0;
              const txAmt = effR > 0 ? Math.round(((txBase * effR) / 100) * 100) / 100 : 0;
              const gTot = Math.round((txBase + txAmt) * 100) / 100;

              return (
                <>
                  <Text style={styles.cardTitle}>
                    Checkout Room {checkoutTarget.roomNumber} — {checkoutTarget.guestName}
                  </Text>

                  {existingInv ? (
                    <View style={styles.lockedBanner}>
                      <Lock size={14} color={COLORS.amber} />
                      <Text style={styles.lockedText}>
                        Locked Invoice ({existingInv.invoiceNumber}):{' '}
                        {coWithGst ? `With GST (${coGstRate}%)` : 'No GST (0%)'} — GST cannot be edited on an existing invoice.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.gstToggleRow}>
                      <TouchableOpacity
                        onPress={() => setCoWithGst(true)}
                        style={[
                          styles.gstOptionBtn,
                          coWithGst && { backgroundColor: COLORS.emerald, borderColor: COLORS.emerald },
                        ]}
                      >
                        <Text style={[styles.gstOptionText, coWithGst && { color: '#FFF' }]}>
                          With GST ({coGstRate}%)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setCoWithGst(false)}
                        style={[
                          styles.gstOptionBtn,
                          !coWithGst && { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
                        ]}
                      >
                        <Text style={[styles.gstOptionText, !coWithGst && { color: '#FFF' }]}>
                          No GST (0%)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={[styles.twoCol, { marginTop: 10 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Extra Charges (₹)</Text>
                      <TextInput
                        value={coExtraAmt}
                        onChangeText={setCoExtraAmt}
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Collecting Now (₹)</Text>
                      <TextInput
                        value={coCollectedNow}
                        onChangeText={setCoCollectedNow}
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <View style={styles.summaryBox}>
                    <View style={styles.sumRow}>
                      <Text style={styles.sumLabel}>Final Bill Total:</Text>
                      <Text style={styles.sumTotalVal}>₹{gTot.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>

                  <View style={styles.twoCol}>
                    <TouchableOpacity
                      onPress={() => setCheckoutTarget(null)}
                      style={[styles.gstOptionBtn, { flex: 1 }]}
                    >
                      <Text style={styles.gstOptionText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        const res = await performCheckout({
                          bookingOrCheckInId: checkoutTarget.id,
                          extraChargeAmt: Number(coExtraAmt) || 0,
                          discount: Number(coDiscount) || 0,
                          withGst: coWithGst,
                          gstRate: coGstRate,
                          collectedNow: Number(coCollectedNow) || 0,
                          paymentMethod: coPayMethod,
                        });
                        setCheckoutTarget(null);
                        if (res.ok && res.invoice) {
                          Alert.alert(
                            'Checked Out & Invoice Locked',
                            `Invoice ${res.invoice.invoiceNumber} generated (${
                              res.invoice.isWithoutGst ? 'No GST 0%' : `With GST ${res.invoice.gstRate}%`
                            }).`
                          );
                        } else if (!res.ok) {
                          Alert.alert('Checkout Error', res.error || 'Failed');
                        }
                      }}
                      style={[
                        styles.gstOptionBtn,
                        { flex: 1.4, backgroundColor: COLORS.espresso, borderColor: COLORS.espresso },
                      ]}
                    >
                      <CheckCircle2 size={15} color={COLORS.goldBright} />
                      <Text style={[styles.gstOptionText, { color: COLORS.goldBright }]}>
                        Complete Checkout
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  subBar: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  subBtnActive: { backgroundColor: COLORS.espresso },
  subBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  subBtnTextActive: { color: COLORS.goldBright, fontWeight: '800' },
  scroll: { padding: 14, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 15.5, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  prefillBox: {
    backgroundColor: COLORS.goldSoft,
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(196,154,58,0.35)',
  },
  prefillLabel: { fontSize: 10, fontWeight: '800', color: COLORS.goldDark, marginBottom: 6 },
  prefillChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prefillChipActive: { borderColor: COLORS.espresso, backgroundColor: '#FEF9EE' },
  prefillChipTitle: { fontSize: 11.5, fontWeight: '800', color: COLORS.textPrimary },
  prefillChipSub: { fontSize: 10, fontWeight: '700', color: COLORS.goldDark },
  gstBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  gstHeader: { fontSize: 10.5, fontWeight: '800', color: COLORS.textSecondary, marginBottom: 8 },
  gstToggleRow: { flexDirection: 'row', gap: 8 },
  gstOptionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gstOptionText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  slabRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  slabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  slabBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.textSecondary },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 11,
    backgroundColor: COLORS.amberSoft,
    borderWidth: 1,
    borderColor: COLORS.amberBorder,
  },
  lockedText: { flex: 1, fontSize: 11, fontWeight: '700', color: '#92400E' },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 5,
    marginTop: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    paddingHorizontal: 12,
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    backgroundColor: '#FAFAFA',
    marginBottom: 4,
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  roomChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  roomChipSelected: { backgroundColor: COLORS.espresso, borderColor: COLORS.gold },
  roomChipNum: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  roomChipSub: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  summaryBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 13,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(196,154,58,0.35)',
    gap: 5,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sumLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  sumVal: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  sumTotalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(196,154,58,0.3)',
    paddingTop: 6,
    marginTop: 3,
  },
  sumTotalLabel: { fontSize: 13.5, fontWeight: '800', color: COLORS.espresso },
  sumTotalVal: { fontSize: 14.5, fontWeight: '900', color: COLORS.emerald },
  primaryActionBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 13,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: { color: COLORS.goldBright, fontSize: 13.5, fontWeight: '800' },
  emptyText: { fontSize: 12.5, color: COLORS.textMuted, paddingVertical: 14 },
  inhouseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  inhouseGuest: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  inhouseSub: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  inhouseDue: { fontSize: 11.5, fontWeight: '700', color: COLORS.goldDark, marginTop: 2 },
  checkoutBtn: {
    backgroundColor: COLORS.rose,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  checkoutBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 8,
  },
});
