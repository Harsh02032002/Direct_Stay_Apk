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
import {
  CalendarPlus,
  LogIn,
  LogOut,
  Lock,
  CheckSquare,
  Square,
  Globe,
  ClipboardList,
} from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { Booking } from '../types/pms';
import { SubTabStrip } from '../components/SubTabStrip';
import { DateFilterBar, matchesQuickDateFilter, QuickDateFilter } from '../components/DateFilterBar';

type FrontSubMode = 'advance' | 'reservations' | 'checkin' | 'inhouse' | 'cform';

export const FrontDeskScreen: React.FC = () => {
  const { state, hotelProfile, createAdvanceBooking, performCheckIn, performCheckout } = usePms();
  const [subMode, setSubMode] = useState<FrontSubMode>('advance');
  const [dateFilter, setDateFilter] = useState<QuickDateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const defaultGst =
    Number(hotelProfile?.defaultGstRate) > 0 ? Number(hotelProfile?.defaultGstRate) : 5;

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

  const availableRooms = state.rooms.filter(
    (r) => r.status === 'Available' || r.status === 'Clean' || r.status === 'Reserved'
  );
  const firstRoom = availableRooms[0] || state.rooms[0];

  // Shared Booking / Check-In Form State (NO Signature section — logged-in user & check-in date/time auto-captured in DB!)
  const [linkedBookingId, setLinkedBookingId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [aadhaar, setAadhaar] = useState('');
  const [address, setAddress] = useState('');
  const [nationality, setNationality] = useState('Indian');
  const [comingFrom, setComingFrom] = useState('');
  const [goingTo, setGoingTo] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Leisure');
  const [mealPlan, setMealPlan] = useState('EP');
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Single Room + Bulk Multi-Room (3-4+ rooms in one Advance Booking)
  const [roomNumber, setRoomNumber] = useState(firstRoom?.number || '101');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBulkRooms, setSelectedBulkRooms] = useState<string[]>(
    firstRoom?.number ? [firstRoom.number] : []
  );

  const [checkInDate, setCheckInDate] = useState(todayStr);
  const [checkOutDate, setCheckOutDate] = useState(tomorrowStr);
  const [adults, setAdults] = useState('2');
  const [ratePerNight, setRatePerNight] = useState(String(firstRoom?.rate || 2000));
  const [discount, setDiscount] = useState('0');
  const [withGst, setWithGst] = useState<boolean>(true);
  const [advanceAmt, setAdvanceAmt] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [submitting, setSubmitting] = useState(false);

  // Foreign Guest Form-C (Optional toggle for foreign nationals)
  const [isCFormRequired, setIsCFormRequired] = useState(false);
  const [passportNo, setPassportNo] = useState('');
  const [passportCountry, setPassportCountry] = useState('');
  const [visaNo, setVisaNo] = useState('');
  const [portOfArrival, setPortOfArrival] = useState('New Delhi Airport');

  // Checkout Modal State
  const [checkoutTarget, setCheckoutTarget] = useState<Booking | null>(null);
  const [coExtraAmt, setCoExtraAmt] = useState('0');
  const [coDiscount, setCoDiscount] = useState('0');
  const [coWithGst, setCoWithGst] = useState(true);
  const [coCollectedNow, setCoCollectedNow] = useState('0');
  const [coPayMethod, setCoPayMethod] = useState('UPI');

  const nights = (() => {
    const d1 = new Date(`${checkInDate}T00:00:00`);
    const d2 = new Date(`${checkOutDate}T00:00:00`);
    const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
    return Number.isFinite(diff) && diff > 0 ? diff : 1;
  })();

  const activeRoomsForCalc =
    subMode === 'advance' && bulkMode && selectedBulkRooms.length > 0
      ? selectedBulkRooms
      : [roomNumber];

  const roomSub =
    activeRoomsForCalc.length > 1
      ? activeRoomsForCalc.reduce((sum, rmNo) => {
          const rm = state.rooms.find((r) => r.number === rmNo);
          return sum + (Number(rm?.rate || ratePerNight || 2000) * nights);
        }, 0)
      : (Number(ratePerNight) || 0) * nights;

  const taxable = Math.max(0, roomSub - (Number(discount) || 0));
  const effGst = withGst ? defaultGst : 0;
  const taxAmt = effGst > 0 ? Math.round(((taxable * effGst) / 100) * 100) / 100 : 0;
  const grandTotal = Math.round((taxable + taxAmt) * 100) / 100;
  const netDue = Math.max(0, Math.round((grandTotal - (Number(advanceAmt) || 0)) * 100) / 100);

  const toggleBulkRoom = (rmNo: string) => {
    setSelectedBulkRooms((prev) => {
      if (prev.includes(rmNo)) {
        return prev.length > 1 ? prev.filter((x) => x !== rmNo) : prev;
      }
      return [...prev, rmNo];
    });
  };

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

    const savedNoGst =
      b.isWithoutGst === true ||
      b.gstInvoice === false ||
      (b.gstRate !== undefined && Number(b.gstRate) <= 0);
    setWithGst(!savedNoGst);
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
    setComingFrom('');
    setGoingTo('');
    setCompanyName('');
    setGstNumber('');
    setAdvanceAmt('0');
    setDiscount('0');
    setIsCFormRequired(false);
    setPassportNo('');
    setVisaNo('');
  };

  const handleSaveAdvanceBooking = async () => {
    if (!guestName.trim() || mobile.trim().length < 10) {
      Alert.alert('Validation', 'Please enter guest name and a valid 10-digit mobile number.');
      return;
    }
    const targetRooms = bulkMode && selectedBulkRooms.length > 0 ? selectedBulkRooms : [roomNumber];
    setSubmitting(true);
    const res = await createAdvanceBooking({
      guestName,
      mobile,
      email,
      aadhaarNumber: aadhaar,
      address,
      companyName,
      gstNumber,
      roomNumber: targetRooms[0],
      roomNumbers: targetRooms,
      checkInDate,
      checkOutDate,
      adults: Number(adults) || 2,
      ratePerNight: Number(ratePerNight) || 2000,
      discount: Number(discount) || 0,
      withGst,
      gstRate: defaultGst,
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
      `${guestName} booked in Room(s) ${targetRooms.join(', ')} (${
        withGst ? `GST ${defaultGst}%` : 'Without GST'
      }).`
    );
    resetForm();
  };

  const handleConfirmCheckIn = async () => {
    if (!guestName.trim() || mobile.trim().length < 10) {
      Alert.alert('Validation', 'Guest name and 10-digit mobile number are required.');
      return;
    }
    const nowTimeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setSubmitting(true);
    const res = await performCheckIn({
      linkedBookingId: linkedBookingId || undefined,
      guestName,
      mobile,
      email,
      idType,
      aadhaarNumber: aadhaar,
      address,
      nationality,
      comingFrom,
      goingTo,
      purposeOfVisit,
      mealPlan,
      companyName,
      gstNumber,
      roomNumber,
      checkInDate,
      arrivalTime: nowTimeStr,
      checkOutDate,
      adults: Number(adults) || 2,
      ratePerNight: Number(ratePerNight) || 2000,
      discount: Number(discount) || 0,
      withGst,
      gstRate: defaultGst,
      advanceAmount: Number(advanceAmt) || 0,
      paymentMethod,
      isCFormRequired,
      cFormData: isCFormRequired
        ? {
            passportNumber: passportNo,
            passportCountry: passportCountry || nationality,
            visaNumber: visaNo,
            portOfArrival,
          }
        : undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      Alert.alert('Check-In Error', res.error || 'Failed to check in guest');
      return;
    }
    Alert.alert(
      'Guest Checked In',
      `${guestName} checked into Room ${roomNumber}. Logged-in user & check-in timestamp saved automatically!`
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

    setCheckoutTarget(b);
    setCoExtraAmt('0');
    setCoDiscount(String(b.discountAmount || 0));
    setCoWithGst(!savedNoGst);
    setCoCollectedNow(String(b.dueAmount ?? 0));
    setCoPayMethod(b.paymentMethod || 'UPI');
  };

  const pendingAdvanceList = state.bookings.filter(
    (b) =>
      !b.isCheckedIn &&
      !b.isCompleted &&
      b.status !== 'Cancelled' &&
      b.status !== 'Checked Out'
  );
  const filteredReservations = pendingAdvanceList.filter((b) => {
    if (!matchesQuickDateFilter(b.checkInDate || b.bookingDate, dateFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${b.guestName} ${b.mobile} ${b.roomNumber} ${b.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const activeInHouseList = state.bookings.filter(
    (b) =>
      (b.isCheckedIn || b.status === 'Checked In') &&
      !b.isCompleted &&
      b.status !== 'Checked Out'
  );

  const foreignCheckins = state.checkins.filter(
    (c) =>
      c.isCFormRequired ||
      (c.nationality &&
        c.nationality.toLowerCase() !== 'indian' &&
        c.nationality.toLowerCase() !== 'india')
  );

  const isCheckInLockedByInv = Boolean(
    linkedBookingId &&
      state.invoices.some((i) => i.bookingId === linkedBookingId && !i.isSeparateInvoice)
  );

  return (
    <View style={styles.root}>
      <SubTabStrip
        activeId={subMode}
        onSelect={(id) => setSubMode(id as FrontSubMode)}
        tabs={[
          { id: 'advance', label: 'Advance Booking', Icon: CalendarPlus },
          {
            id: 'reservations',
            label: 'All Reservations',
            count: pendingAdvanceList.length,
            Icon: ClipboardList,
          },
          { id: 'checkin', label: 'Guest Check-In', Icon: LogIn },
          {
            id: 'inhouse',
            label: 'In-House & Checkout',
            count: activeInHouseList.length,
            Icon: LogOut,
          },
          {
            id: 'cform',
            label: 'Form-C Register',
            count: foreignCheckins.length,
            Icon: Globe,
          },
        ]}
      />

      {(subMode === 'reservations' || subMode === 'inhouse' || subMode === 'checkin') && (
        <DateFilterBar
          activeFilter={dateFilter}
          onChangeFilter={setDateFilter}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          showUpcoming
          searchPlaceholder="Search guest name, mobile, room..."
        />
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {(subMode === 'advance' || subMode === 'checkin') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {subMode === 'advance'
                ? 'New Advance Reservation'
                : linkedBookingId
                ? `Check-In Reservation (${linkedBookingId})`
                : 'Walk-In / Guest Check-In'}
            </Text>

            {subMode === 'checkin' && filteredReservations.length > 0 && (
              <View style={styles.prefillBox}>
                <Text style={styles.prefillLabel}>
                  TAP TO PREFILL FROM ADVANCE BOOKING ({filteredReservations.length}):
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {filteredReservations.map((b) => {
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
                            {b.checkInDate} • {noGst ? 'No GST' : `GST ${b.gstRate || defaultGst}%`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Single Clean GST Invoice Click / Unclick Checkbox (Uses Profile Settings GST %) */}
            {subMode === 'checkin' && isCheckInLockedByInv ? (
              <View style={styles.lockedBanner}>
                <Lock size={14} color={COLORS.amber} />
                <Text style={styles.lockedText}>
                  Invoice already generated — GST mode locked (
                  {withGst ? `GST ${defaultGst}%` : 'Without GST'}).
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setWithGst((p) => !p)}
                style={[
                  styles.gstSingleCheck,
                  withGst && {
                    borderColor: COLORS.emerald,
                    backgroundColor: COLORS.emeraldSoft,
                  },
                ]}
              >
                {withGst ? (
                  <CheckSquare size={20} color={COLORS.emerald} />
                ) : (
                  <Square size={20} color={COLORS.textSecondary} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.gstSingleTitle}>
                    GST Invoice ({withGst ? `${defaultGst}% GST Applied` : 'Unchecked — 0% Without GST'})
                  </Text>
                  <Text style={styles.gstSingleSub}>
                    Click / unclick for GST Invoice. Change GST % anytime in My Profile Settings.
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Guest Fields */}
            <Text style={styles.inputLabel}>Guest Full Name *</Text>
            <TextInput
              value={guestName}
              onChangeText={setGuestName}
              placeholder="e.g. Rajesh Sharma"
              placeholderTextColor={COLORS.textMuted}
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
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>ID / Aadhaar No.</Text>
                <TextInput
                  value={aadhaar}
                  onChangeText={setAadhaar}
                  placeholder="ID Number"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                />
              </View>
            </View>

            {subMode === 'checkin' && (
              <>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Coming From</Text>
                    <TextInput
                      value={comingFrom}
                      onChangeText={setComingFrom}
                      placeholder="City"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Going To</Text>
                    <TextInput
                      value={goingTo}
                      onChangeText={setGoingTo}
                      placeholder="Next City"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Nationality</Text>
                    <TextInput
                      value={nationality}
                      onChangeText={(val) => {
                        setNationality(val);
                        if (
                          val.trim() &&
                          val.trim().toLowerCase() !== 'indian' &&
                          val.trim().toLowerCase() !== 'india'
                        ) {
                          setIsCFormRequired(true);
                        }
                      }}
                      placeholder="Indian"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Meal Plan</Text>
                    <TextInput
                      value={mealPlan}
                      onChangeText={setMealPlan}
                      placeholder="EP / CP / MAP"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.input}
                    />
                  </View>
                </View>

                {/* Optional Foreigner Form-C Toggle */}
                <TouchableOpacity
                  onPress={() => setIsCFormRequired((p) => !p)}
                  style={styles.cformToggle}
                >
                  {isCFormRequired ? (
                    <CheckSquare size={17} color={COLORS.blue} />
                  ) : (
                    <Square size={17} color={COLORS.textSecondary} />
                  )}
                  <Text style={styles.cformToggleText}>
                    Foreign National Guest (Enable Police Form-C Details)
                  </Text>
                </TouchableOpacity>

                {isCFormRequired && (
                  <View style={styles.cformBox}>
                    <View style={styles.twoCol}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Passport No. *</Text>
                        <TextInput
                          value={passportNo}
                          onChangeText={setPassportNo}
                          autoCapitalize="characters"
                          placeholder="Passport No"
                          style={styles.input}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Visa No. *</Text>
                        <TextInput
                          value={visaNo}
                          onChangeText={setVisaNo}
                          autoCapitalize="characters"
                          placeholder="Visa No"
                          style={styles.input}
                        />
                      </View>
                    </View>
                    <View style={styles.twoCol}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Passport Country</Text>
                        <TextInput
                          value={passportCountry}
                          onChangeText={setPassportCountry}
                          placeholder="USA / UK / etc."
                          style={styles.input}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Port of Arrival</Text>
                        <TextInput
                          value={portOfArrival}
                          onChangeText={setPortOfArrival}
                          placeholder="Airport"
                          style={styles.input}
                        />
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Room Selector (Single OR Bulk 3-4+ Rooms in Advance Booking!) */}
            <View style={styles.roomSelectHeader}>
              <Text style={styles.inputLabel}>
                {subMode === 'advance' && bulkMode
                  ? `Select Multiple Rooms (${selectedBulkRooms.length} Selected)`
                  : 'Select Room'}
              </Text>
              {subMode === 'advance' && (
                <TouchableOpacity
                  onPress={() => {
                    setBulkMode((prev) => !prev);
                    if (!selectedBulkRooms.includes(roomNumber)) {
                      setSelectedBulkRooms([roomNumber]);
                    }
                  }}
                  style={[styles.bulkToggleBtn, bulkMode && styles.bulkToggleBtnActive]}
                >
                  <Text
                    style={[
                      styles.bulkToggleText,
                      bulkMode && { color: COLORS.espresso, fontWeight: '800' },
                    ]}
                  >
                    {bulkMode ? '✓ Bulk Multi-Room ON' : '+ Bulk Rooms (3-4 Rooms)'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 10 }}
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {state.rooms.map((rm) => {
                  const selected =
                    subMode === 'advance' && bulkMode
                      ? selectedBulkRooms.includes(rm.number)
                      : roomNumber === rm.number;
                  return (
                    <TouchableOpacity
                      key={rm.id}
                      onPress={() => {
                        if (subMode === 'advance' && bulkMode) {
                          toggleBulkRoom(rm.number);
                        } else {
                          setRoomNumber(rm.number);
                          setRatePerNight(String(rm.rate || 2000));
                        }
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
                <Text style={styles.inputLabel} numberOfLines={1}>
                  Check-In Date
                </Text>
                <TextInput
                  value={checkInDate}
                  onChangeText={setCheckInDate}
                  placeholder="YYYY-MM-DD"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel} numberOfLines={1}>
                  Check-Out Date
                </Text>
                <TextInput
                  value={checkOutDate}
                  onChangeText={setCheckOutDate}
                  placeholder="YYYY-MM-DD"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel} numberOfLines={1}>
                  Tariff / Night (₹)
                </Text>
                <TextInput
                  value={ratePerNight}
                  onChangeText={setRatePerNight}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel} numberOfLines={1}>
                  Advance Paid (₹)
                </Text>
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
                  <Text style={styles.inputLabel} numberOfLines={1}>
                    Company (Optional)
                  </Text>
                  <TextInput
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder="Corporate Name"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel} numberOfLines={1}>
                    Company GSTIN
                  </Text>
                  <TextInput
                    value={gstNumber}
                    onChangeText={setGstNumber}
                    autoCapitalize="characters"
                    placeholder="22AAAAA0000A1Z5"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.input}
                  />
                </View>
              </View>
            )}

            {/* Live Bill Breakdown */}
            <View style={styles.summaryBox}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>
                  Room Tariff ({activeRoomsForCalc.length} Rm × {nights} Night):
                </Text>
                <Text style={styles.sumVal}>₹{roomSub.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>
                  {withGst ? `GST (${defaultGst}%):` : 'GST (Without GST — 0%):'}
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
                  ? `Confirm Advance Booking (${activeRoomsForCalc.length} Room${
                      activeRoomsForCalc.length > 1 ? 's' : ''
                    })`
                  : 'Complete Guest Check-In'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* All Advance Reservations List with Today / All Filter */}
        {subMode === 'reservations' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Advance Reservations ({filteredReservations.length})
            </Text>
            {filteredReservations.length === 0 ? (
              <Text style={styles.emptyText}>
                No advance reservations match this filter. Tap "All Records" above to view all.
              </Text>
            ) : (
              filteredReservations.map((b) => {
                const noGst =
                  b.isWithoutGst === true ||
                  (b.gstRate !== undefined && Number(b.gstRate) <= 0);
                return (
                  <View key={b.id} style={styles.inhouseRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inhouseGuest}>
                        Rm {b.roomNumber} — {b.guestName}
                      </Text>
                      <Text style={styles.inhouseSub}>
                        {b.checkInDate} → {b.checkOutDate} •{' '}
                        {noGst ? 'Without GST' : `GST ${b.gstRate || defaultGst}%`}
                      </Text>
                      <Text style={styles.inhouseDue}>
                        Advance: ₹{b.advanceAmount ?? 0} | Total: ₹
                        {b.totalPayable || b.bookingAmount || 0}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => loadAdvanceBookingIntoCheckIn(b)}
                      style={[styles.checkoutBtn, { backgroundColor: COLORS.emerald }]}
                    >
                      <Text style={[styles.checkoutBtnText, { color: '#FFF' }]}>Check-In</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Active In-House Guests & Checkout */}
        {subMode === 'inhouse' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>In-House Guests Ready for Checkout</Text>
            {activeInHouseList.length === 0 ? (
              <Text style={styles.emptyText}>No active checked-in rooms right now.</Text>
            ) : (
              activeInHouseList
                .filter((b) => {
                  if (!matchesQuickDateFilter(b.checkInDate, dateFilter)) return false;
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    return `${b.guestName} ${b.roomNumber}`.toLowerCase().includes(q);
                  }
                  return true;
                })
                .map((b) => {
                  const noGst =
                    b.isWithoutGst === true ||
                    (b.gstRate !== undefined && Number(b.gstRate) <= 0);
                  return (
                    <View key={b.id} style={styles.inhouseRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inhouseGuest}>
                          Rm {b.roomNumber} — {b.guestName}
                        </Text>
                        <Text style={styles.inhouseSub}>
                          {b.checkInDate} → {b.checkOutDate} •{' '}
                          {noGst ? 'Without GST' : `GST ${b.gstRate || defaultGst}%`}
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

        {/* Police Form-C Foreign Guest Register */}
        {subMode === 'cform' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Foreign Guest Police Form-C Register ({foreignCheckins.length})
            </Text>
            {foreignCheckins.length === 0 ? (
              <Text style={styles.emptyText}>No foreign national Form-C entries recorded yet.</Text>
            ) : (
              foreignCheckins.map((c) => (
                <View key={c.id} style={styles.inhouseRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inhouseGuest}>
                      {c.guestName} ({c.nationality || 'Foreign'}) — Rm {c.roomNumber}
                    </Text>
                    <Text style={styles.inhouseSub}>
                      Passport: {c.cFormData?.passportNumber || 'N/A'} • Visa:{' '}
                      {c.cFormData?.visaNumber || 'N/A'}
                    </Text>
                    <Text style={styles.inhouseDue}>
                      Stay: {c.checkInDate} → {c.checkOutDate}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Checkout Clearance Modal (Auto-alerts Housekeeping Room Dirty!) */}
      <Modal visible={Boolean(checkoutTarget)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {checkoutTarget &&
              (() => {
                const existingInv = state.invoices.find(
                  (i) => i.bookingId === checkoutTarget.id && !i.isSeparateInvoice
                );
                const baseRm = Number(
                  checkoutTarget.roomSubtotal || checkoutTarget.bookingAmount || 0
                );
                const extraN = Number(coExtraAmt) || 0;
                const discN = Number(coDiscount) || 0;
                const txBase = Math.max(0, baseRm + extraN - discN);
                const effR = coWithGst ? defaultGst : 0;
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
                          {coWithGst ? `GST (${defaultGst}%)` : 'Without GST'}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setCoWithGst((p) => !p)}
                        style={[
                          styles.gstSingleCheck,
                          coWithGst && {
                            borderColor: COLORS.emerald,
                            backgroundColor: COLORS.emeraldSoft,
                          },
                        ]}
                      >
                        {coWithGst ? (
                          <CheckSquare size={19} color={COLORS.emerald} />
                        ) : (
                          <Square size={19} color={COLORS.textSecondary} />
                        )}
                        <Text style={styles.gstSingleTitle}>
                          GST Invoice ({coWithGst ? `${defaultGst}% GST` : 'Without GST 0%'})
                        </Text>
                      </TouchableOpacity>
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
                        style={styles.cancelModalBtn}
                      >
                        <Text style={styles.cancelModalText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          const target = checkoutTarget;
                          setCheckoutTarget(null);
                          const res = await performCheckout({
                            bookingOrCheckInId: target.id,
                            extraChargeAmt: Number(coExtraAmt) || 0,
                            discount: Number(coDiscount) || 0,
                            withGst: coWithGst,
                            gstRate: defaultGst,
                            collectedNow: Number(coCollectedNow) || 0,
                            paymentMethod: coPayMethod,
                          });
                          if (res.ok) {
                            Alert.alert(
                              'Checked Out & Housekeeping Notified',
                              `Room ${target.roomNumber} checked out and marked DIRTY. Instant notification sent to Housekeeping!`
                            );
                          } else {
                            Alert.alert('Checkout Error', res.error || 'Could not complete checkout');
                          }
                        }}
                        style={[styles.primaryActionBtn, { flex: 1.5, marginTop: 0 }]}
                      >
                        <Text style={styles.primaryActionText}>Finalize Checkout</Text>
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
  scroll: { padding: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  prefillBox: {
    backgroundColor: '#FAF6EE',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EADBC0',
    marginBottom: 12,
  },
  prefillLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.goldDark,
    marginBottom: 6,
  },
  prefillChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prefillChipActive: {
    borderColor: COLORS.gold,
    backgroundColor: '#FFF9EB',
  },
  prefillChipTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  prefillChipSub: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  gstSingleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#FAF8F5',
    marginBottom: 12,
  },
  gstSingleTitle: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  gstSingleSub: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 2 },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 11,
    backgroundColor: COLORS.amberSoft,
    marginBottom: 12,
  },
  lockedText: { flex: 1, fontSize: 11, fontWeight: '700', color: COLORS.amber },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 5,
  },
  input: {
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 0,
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  cformToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 6,
  },
  cformToggleText: { fontSize: 12, fontWeight: '700', color: COLORS.blue },
  cformBox: {
    backgroundColor: COLORS.blueSoft,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  roomSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  bulkToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F3EFE6',
    borderWidth: 1,
    borderColor: '#DFD4BE',
  },
  bulkToggleBtnActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.goldDark,
  },
  bulkToggleText: { fontSize: 10.5, fontWeight: '700', color: COLORS.textPrimary },
  roomChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomChipSelected: {
    backgroundColor: COLORS.espresso,
    borderColor: COLORS.gold,
  },
  roomChipNum: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  roomChipSub: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 2 },
  summaryBox: {
    backgroundColor: '#FAF8F4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EAE2D3',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  sumVal: { fontSize: 12.5, color: COLORS.textPrimary, fontWeight: '800' },
  sumTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5DEC9',
    paddingTop: 6,
    marginTop: 2,
  },
  sumTotalLabel: { fontSize: 13.5, fontWeight: '900', color: COLORS.espresso },
  sumTotalVal: { fontSize: 15, fontWeight: '900', color: COLORS.goldDark },
  primaryActionBtn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  primaryActionText: { fontSize: 13.5, fontWeight: '800', color: COLORS.goldBright },
  emptyText: { fontSize: 12.5, color: COLORS.textMuted, paddingVertical: 12 },
  inhouseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inhouseGuest: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  inhouseSub: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  inhouseDue: { fontSize: 11.5, fontWeight: '700', color: COLORS.goldDark, marginTop: 2 },
  checkoutBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    flexShrink: 0,
  },
  checkoutBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.espresso },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 11, 9, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
  },
  cancelModalBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
});
