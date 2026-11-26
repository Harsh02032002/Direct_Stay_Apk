import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Printer,
  Share2,
  Droplets,
  X,
} from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { BookedServiceSelection, Booking, GuestCheckIn } from '../types/pms';
import { SubTabStrip } from '../components/SubTabStrip';
import {
  DateFilterBar,
  matchesQuickDateFilter,
  QuickDateFilter,
} from '../components/DateFilterBar';
import {
  BillCharge,
  calculateBill,
  formatMoney,
  normalizeBillSettings,
  r2,
} from '../utils/billCalculator';
import {
  allocateGrcNumber,
  buildStayBill,
  toGrcPrintData,
  toInvoicePrintData,
} from '../utils/stayBilling';
import { renderGrcHtml, renderInvoiceHtml } from '../utils/printTemplates';
import { mobilePrint } from '../utils/mobilePrint';

type FrontSubMode =
  | 'advance'
  | 'reservations'
  | 'checkin'
  | 'inhouse'
  | 'water'
  | 'services'
  | 'cform';

export const FrontDeskScreen: React.FC = () => {
  const {
    state,
    hotelProfile,
    createAdvanceBooking,
    performCheckIn,
    performCheckout,
    addWaterBottleLog,
    addExtraServiceCatalogItem,
  } = usePms();
  const [subMode, setSubMode] = useState<FrontSubMode>('advance');
  const [dateFilter, setDateFilter] = useState<QuickDateFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const billSettings = normalizeBillSettings(hotelProfile);
  const defaultGst = billSettings.roomGstRate;

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
  const [arrivalTimeInput, setArrivalTimeInput] = useState('12:00 PM');
  const [departureTimeInput, setDepartureTimeInput] = useState('11:00 AM');
  const [earlyCheckInApplied, setEarlyCheckInApplied] = useState(false);
  const [earlyCheckInAmt, setEarlyCheckInAmt] = useState(
    String(hotelProfile?.earlyCheckInFixedRate || hotelProfile?.earlyCheckInFee || 500)
  );
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvPrice, setNewSrvPrice] = useState('300');
  const [submitting, setSubmitting] = useState(false);

  const serviceCatalog = state.waterBottles.filter((w) => w.recordType === 'service_catalog');
  const waterBottleLogs = state.waterBottles.filter(
    (w) => w.recordType !== 'service_catalog' && w.recordType !== 'service_allocation'
  );
  const servicePriceOf = (w: (typeof serviceCatalog)[number]) =>
    Math.max(0, Number(w.configuredAmount ?? w.chargeAmount ?? w.amount ?? 0));
  const tickedServices = serviceCatalog.filter((s) => selectedServiceIds.includes(String(s.id)));
  const servicesTotal = tickedServices.reduce((sum, s) => sum + servicePriceOf(s), 0);
  const bookedServicesPayload: BookedServiceSelection[] = tickedServices.map((s) => ({
    serviceId: String(s.id),
    serviceName: String(s.serviceName || 'Extra Service'),
    amount: servicePriceOf(s),
  }));

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

  // Water Bottle Calculator Modal / Card State
  const [waterModalOpen, setWaterModalOpen] = useState(false);
  const [wbRoom, setWbRoom] = useState(firstRoom?.number || '101');
  const [wbGuestName, setWbGuestName] = useState('');
  const [wbBookingId, setWbBookingId] = useState('');
  const [wbCheckInId, setWbCheckInId] = useState('');
  const [wbTotalBottles, setWbTotalBottles] = useState('3');
  const [wbFreeBottles, setWbFreeBottles] = useState('1');
  const [wbRate, setWbRate] = useState(String(billSettings.waterBottleRate || 20));

  useEffect(() => {
    setWbRate(String(billSettings.waterBottleRate || 20));
  }, [billSettings.waterBottleRate]);

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

  const formPreviewCharges: BillCharge[] = [
    ...activeRoomsForCalc.map((rmNo, i) => {
      const rm = state.rooms.find((r) => r.number === rmNo);
      const perNight =
        activeRoomsForCalc.length > 1
          ? Number(rm?.rate || ratePerNight || 2000)
          : Number(ratePerNight) || 0;
      return {
        id: `rm-${rmNo}-${i}`,
        kind: 'room' as const,
        description: 'Room Charges',
        amount: r2(perNight * nights),
        rate: perNight,
        nights,
        roomNumber: rmNo,
      };
    }),
    ...tickedServices.map((srv, i) => ({
      id: `srv-${i}`,
      kind: 'service' as const,
      description: String(srv.serviceName || 'Extra Service'),
      amount: servicePriceOf(srv),
      roomNumber: activeRoomsForCalc[0] || roomNumber,
    })),
  ];

  const formBillPreview = calculateBill({
    charges: formPreviewCharges,
    payments:
      Number(advanceAmt) > 0
        ? [{ id: 'adv', amount: Number(advanceAmt), method: paymentMethod }]
        : [],
    discount: Number(discount) || 0,
    gstEnabled: withGst,
    settings: billSettings,
  });

  const roomSub = formBillPreview.legacy.roomCharges;
  const taxAmt = formBillPreview.totalTax;
  const grandTotal = formBillPreview.grandTotal;
  const netDue = formBillPreview.balance;

  const toggleBulkRoom = (rmNo: string) => {
    setSelectedBulkRooms((prev) => {
      if (prev.includes(rmNo)) {
        return prev.length > 1 ? prev.filter((x) => x !== rmNo) : prev;
      }
      return [...prev, rmNo];
    });
  };

  // GRC Print / Share (exact HOTEL RAJ RESIDENCY Guest Registration Card replica)
  const buildGrcHtmlForStay = (b?: Booking | null, c?: GuestCheckIn | null): { html: string; regNo: string } => {
    const chk =
      c ||
      (b
        ? state.checkins.find((x) => x.bookingId === b.id || x.id === b.id) || null
        : null);
    const bkg =
      b ||
      (chk
        ? state.bookings.find((x) => x.id === chk.bookingId || x.id === chk.id) || null
        : null);
    const regNo = String(chk?.grcNumber || bkg?.grcNumber || '').trim() || 'PENDING-SYNC';
    const rmNo = chk?.roomNumber || bkg?.roomNumber || '';
    const rm = state.rooms.find((r) => r.number === rmNo);
    const grcData = toGrcPrintData({
      hotel: hotelProfile,
      regNo,
      booking: bkg,
      checkin: chk,
      roomRate:
        chk?.roomRate ||
        (bkg ? r2(Number(bkg.roomSubtotal || bkg.bookingAmount || 0) / Math.max(1, Number(bkg.nights) || 1)) : rm?.rate),
      roomType: chk?.roomType || bkg?.roomType || rm?.category,
      settings: billSettings,
    });
    return { html: renderGrcHtml(grcData), regNo };
  };

  const handlePrintGrc = async (b?: Booking | null, c?: GuestCheckIn | null) => {
    const { html, regNo } = buildGrcHtmlForStay(b, c);
    await mobilePrint.printHtml(html, `GRC ${regNo}`);
  };

  const handleShareGrc = async (b?: Booking | null, c?: GuestCheckIn | null) => {
    const { html, regNo } = buildGrcHtmlForStay(b, c);
    await mobilePrint.sharePdfFromHtml(html, `GRC ${regNo}`);
  };

  // Water Bottle Quick Modal Launcher
  const openWaterModalForStay = (b?: Booking) => {
    if (b) {
      const chk = state.checkins.find((c) => c.bookingId === b.id || c.id === b.id);
      setWbRoom(b.roomNumber);
      setWbGuestName(b.guestName);
      setWbBookingId(b.id);
      setWbCheckInId(chk?.id || '');
    } else {
      const firstActive = activeInHouseList[0];
      if (firstActive) {
        const chk = state.checkins.find(
          (c) => c.bookingId === firstActive.id || c.id === firstActive.id
        );
        setWbRoom(firstActive.roomNumber);
        setWbGuestName(firstActive.guestName);
        setWbBookingId(firstActive.id);
        setWbCheckInId(chk?.id || '');
      }
    }
    setWbTotalBottles('3');
    setWbFreeBottles('1');
    setWbRate(String(billSettings.waterBottleRate || 20));
    setWaterModalOpen(true);
  };

  const wbTotalN = Math.max(0, Math.floor(Number(wbTotalBottles) || 0));
  const wbFreeN = Math.max(0, Math.floor(Number(wbFreeBottles) || 0));
  const wbChargeableN = Math.max(0, wbTotalN - wbFreeN);
  const wbRateN = Math.max(0, Number(wbRate) || 0);
  const wbTotalCharge = r2(wbChargeableN * wbRateN);

  const handleSaveWaterBottles = async (closeModalAfter = false) => {
    if (!wbRoom.trim()) {
      Alert.alert('Validation', 'Please enter or select a Room Number.');
      return;
    }
    if (wbTotalN <= 0) {
      Alert.alert('Validation', 'Total Bottles must be at least 1.');
      return;
    }
    await addWaterBottleLog({
      roomNumber: wbRoom.trim(),
      totalBottles: wbTotalN,
      complimentaryQty: wbFreeN,
      chargeableQty: wbChargeableN,
      ratePerBottle: wbRateN,
      bookingId: wbBookingId || undefined,
      checkInId: wbCheckInId || undefined,
      guestName: wbGuestName || undefined,
    });
    if (closeModalAfter) setWaterModalOpen(false);
    Alert.alert(
      'Water Bottles Logged',
      `Room ${wbRoom}: ${wbTotalN} Total − ${wbFreeN} Free = ${wbChargeableN} Chargeable × ₹${wbRateN} = ₹${formatMoney(
        wbTotalCharge
      )}`
    );
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
    setSelectedServiceIds((b.bookedServices || []).map((s) => String(s.serviceId)));
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
    setSelectedServiceIds([]);
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
      advanceAmount: Number(advanceAmt) || 0,
      paymentMethod,
      bookingSource: 'Direct',
      bookedServices: bookedServicesPayload,
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
      arrivalTime: arrivalTimeInput.trim() || nowTimeStr,
      checkOutDate,
      departureTime: departureTimeInput.trim() || '11:00 AM',
      earlyCheckInCharge: earlyCheckInApplied ? Math.max(0, Number(earlyCheckInAmt) || 0) : 0,
      adults: Number(adults) || 2,
      ratePerNight: Number(ratePerNight) || 2000,
      discount: Number(discount) || 0,
      withGst,
      advanceAmount: Number(advanceAmt) || 0,
      paymentMethod,
      bookedServices: bookedServicesPayload,
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
    resetForm();
    setSubMode('inhouse');
    Alert.alert(
      'Guest Checked In',
      `${guestName} checked into Room ${roomNumber} (GRC: ${res.grcNumber || 'Generated'}).`,
      [
        { text: 'Done', style: 'cancel' },
        {
          text: 'Print / Share GRC',
          onPress: () => {
            const chk = state.checkins.find((c) => c.id === res.checkInId);
            if (chk) handlePrintGrc(null, chk);
          },
        },
      ]
    );
  };

  const openCheckoutModal = (b: Booking) => {
    const chk = state.checkins.find((c) => c.bookingId === b.id || c.id === b.id);
    const existingInv = state.invoices.find(
      (i) => i.bookingId === b.id && !i.isSeparateInvoice
    );
    const savedNoGst = existingInv
      ? existingInv.isWithoutGst === true ||
        (existingInv.gstRate !== undefined && Number(existingInv.gstRate) <= 0)
      : b.isWithoutGst === true ||
        b.gstInvoice === false ||
        (b.gstRate !== undefined && Number(b.gstRate) <= 0);

    const preview = buildStayBill({
      booking: b,
      checkin: chk,
      posOrders: state.posOrders,
      laundryOrders: state.laundryOrders,
      waterBottles: state.waterBottles,
      rooms: state.rooms,
      settings: billSettings,
      gstEnabledOverride: !savedNoGst,
    });

    setCheckoutTarget(b);
    setCoExtraAmt('0');
    setCoDiscount(String(preview.folio.discount || 0));
    setCoWithGst(!savedNoGst);
    setCoCollectedNow(String(preview.bill.balance));
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
    if (
      !matchesQuickDateFilter(
        b.checkInDate || b.bookingDate,
        dateFilter,
        fromDate,
        toDate
      )
    ) {
      return false;
    }
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
            id: 'water',
            label: 'Water Bottles',
            count: waterBottleLogs.length,
            Icon: Droplets,
          },
          {
            id: 'services',
            label: 'Extra Services',
            count: serviceCatalog.length,
            Icon: Sparkles,
          },
          {
            id: 'cform',
            label: 'Form-C Register',
            count: foreignCheckins.length,
            Icon: Globe,
          },
        ]}
      />

      {(subMode === 'reservations' ||
        subMode === 'inhouse' ||
        subMode === 'checkin' ||
        subMode === 'water' ||
        subMode === 'cform') && (
        <DateFilterBar
          activeFilter={dateFilter}
          onChangeFilter={setDateFilter}
          fromDate={fromDate}
          toDate={toDate}
          onChangeFromDate={setFromDate}
          onChangeToDate={setToDate}
          searchQuery={searchQuery}
          onChangeSearch={setSearchQuery}
          showUpcoming={subMode === 'reservations' || subMode === 'checkin'}
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

            {/* Single Clean ☑ GST Invoice Checkbox (Rate comes strictly from Profile & Settings) */}
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
                    GST Invoice (
                    {withGst ? `${defaultGst}% Room GST Applied` : 'Unchecked — 0% Without GST'})
                  </Text>
                  <Text style={styles.gstSingleSub}>
                    Single GST Invoice tick. Configure GST % in Profile & Settings.
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

            <Text style={styles.inputLabel}>Address / City</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Guest residential address"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
            />

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

            {/* Room Selector */}
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

            {subMode === 'checkin' && (
              <>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel} numberOfLines={1}>
                      Arrival Time (12h AM/PM)
                    </Text>
                    <TextInput
                      value={arrivalTimeInput}
                      onChangeText={setArrivalTimeInput}
                      placeholder="e.g. 09:30 AM"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel} numberOfLines={1}>
                      Departure Time (12h)
                    </Text>
                    <TextInput
                      value={departureTimeInput}
                      onChangeText={setDepartureTimeInput}
                      placeholder="e.g. 11:00 AM"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.input}
                    />
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                    backgroundColor: '#FDF8EE',
                    borderWidth: 1,
                    borderColor: COLORS.gold,
                    borderRadius: 12,
                    padding: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setEarlyCheckInApplied((p) => !p)}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        borderWidth: 1.5,
                        borderColor: earlyCheckInApplied ? COLORS.emerald : COLORS.textSecondary,
                        backgroundColor: earlyCheckInApplied ? COLORS.emerald : '#FFFFFF',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {earlyCheckInApplied && (
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.espresso }}>
                      Early Check-In Charge
                    </Text>
                  </TouchableOpacity>
                  {earlyCheckInApplied && (
                    <TextInput
                      value={earlyCheckInAmt}
                      onChangeText={setEarlyCheckInAmt}
                      keyboardType="numeric"
                      placeholder="₹500"
                      style={[styles.input, { width: 92, marginBottom: 0 }]}
                    />
                  )}
                </View>
              </>
            )}

            {/* Available Extra Services */}
            <View style={styles.servicesBox}>
              <View style={styles.servicesBoxHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.servicesBoxTitle}>
                    ✨ AVAILABLE EXTRA SERVICES ({serviceCatalog.length})
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
                    Tap to add extra services to this{' '}
                    {subMode === 'advance' ? 'Advance Booking' : 'Check-In'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSubMode('services')}
                  style={styles.manageServicesBtn}
                >
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F766E' }}>
                    + Manage
                  </Text>
                </TouchableOpacity>
              </View>

              {serviceCatalog.length === 0 ? (
                <Text style={{ fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' }}>
                  No extra services added yet. Tap "+ Manage" to add service categories.
                </Text>
              ) : (
                serviceCatalog.map((srv) => {
                  const sid = String(srv.id);
                  const picked = selectedServiceIds.includes(sid);
                  const price = servicePriceOf(srv);
                  return (
                    <TouchableOpacity
                      key={sid}
                      activeOpacity={0.8}
                      onPress={() =>
                        setSelectedServiceIds((prev) =>
                          prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
                        )
                      }
                      style={[styles.servicePickRow, picked && styles.servicePickRowActive]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        {picked ? (
                          <CheckSquare size={17} color={COLORS.emerald} />
                        ) : (
                          <Square size={17} color={COLORS.textMuted} />
                        )}
                        <Text style={styles.servicePickName} numberOfLines={1}>
                          {srv.serviceName || 'Extra Service'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F766E' }}>
                        + ₹{price.toLocaleString('en-IN')}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Live Bill Breakdown */}
            <View style={styles.summaryBox}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>
                  Room Tariff ({activeRoomsForCalc.length} Rm × {nights} Night
                  {billSettings.roomRateIncludesGst && withGst ? ', Pre-Tax' : ''}):
                </Text>
                <Text style={styles.sumVal}>₹{formatMoney(roomSub)}</Text>
              </View>
              {servicesTotal > 0 && (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>
                    Extra Services ({tickedServices.length} selected):
                  </Text>
                  <Text style={[styles.sumVal, { color: '#0F766E' }]}>
                    + ₹{formatMoney(servicesTotal)}
                  </Text>
                </View>
              )}
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>
                  {withGst ? `CGST + SGST (${defaultGst}%):` : 'GST (Without GST — 0%):'}
                </Text>
                <Text style={styles.sumVal}>₹{formatMoney(taxAmt)}</Text>
              </View>
              <View style={[styles.sumRow, styles.sumTotalRow]}>
                <Text style={styles.sumTotalLabel}>Total Payable:</Text>
                <Text style={styles.sumTotalVal}>₹{formatMoney(grandTotal)}</Text>
              </View>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Balance Due at Hotel:</Text>
                <Text style={[styles.sumVal, { color: COLORS.rose }]}>
                  ₹{formatMoney(netDue)}
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

        {/* All Advance Reservations List with Date-Wise Filter + GRC Print/Share */}
        {subMode === 'reservations' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Advance Reservations ({filteredReservations.length})
            </Text>
            {filteredReservations.length === 0 ? (
              <Text style={styles.emptyText}>
                No advance reservations match this filter. Tap "All" above to view all.
              </Text>
            ) : (
              filteredReservations.map((b) => {
                const noGst =
                  b.isWithoutGst === true ||
                  (b.gstRate !== undefined && Number(b.gstRate) <= 0);
                return (
                  <View key={b.id} style={styles.stayCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inhouseGuest}>
                        Rm {b.roomNumber} — {b.guestName}
                      </Text>
                      <Text style={styles.inhouseSub}>
                        {b.checkInDate} → {b.checkOutDate} •{' '}
                        {noGst ? 'Without GST' : `GST ${b.gstRate || defaultGst}%`}
                      </Text>
                      <Text style={styles.inhouseDue}>
                        Advance: ₹{formatMoney(b.advanceAmount ?? 0)} | Total: ₹
                        {formatMoney(b.totalPayable || b.bookingAmount || 0)}
                      </Text>
                    </View>
                    <View style={styles.stayCardActions}>
                      <TouchableOpacity
                        onPress={() => handlePrintGrc(b, null)}
                        style={styles.grcBtn}
                      >
                        <Printer size={12} color={COLORS.espresso} />
                        <Text style={styles.grcBtnText}>Print / Share GRC</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => loadAdvanceBookingIntoCheckIn(b)}
                        style={[styles.checkoutBtn, { backgroundColor: COLORS.emerald }]}
                      >
                        <Text style={[styles.checkoutBtnText, { color: '#FFF' }]}>Check-In</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Active In-House Guests & Checkout + Print/Share GRC + Quick Water Bottle Log */}
        {subMode === 'inhouse' && (
          <View style={styles.card}>
            <View style={styles.inhouseTopRow}>
              <Text style={[styles.cardTitle, { marginBottom: 0, flex: 1 }]}>
                In-House Guests ({activeInHouseList.length})
              </Text>
              <TouchableOpacity
                onPress={() => openWaterModalForStay()}
                style={styles.waterHeaderBtn}
              >
                <Droplets size={13} color={COLORS.blue} />
                <Text style={styles.waterHeaderBtnText}>+ Log Water</Text>
              </TouchableOpacity>
            </View>
            {activeInHouseList.length === 0 ? (
              <Text style={styles.emptyText}>No active checked-in rooms right now.</Text>
            ) : (
              activeInHouseList
                .filter((b) => {
                  if (!matchesQuickDateFilter(b.checkInDate, dateFilter, fromDate, toDate)) {
                    return false;
                  }
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    return `${b.guestName} ${b.roomNumber} ${b.mobile || ''}`
                      .toLowerCase()
                      .includes(q);
                  }
                  return true;
                })
                .map((b) => {
                  const chk = state.checkins.find((c) => c.bookingId === b.id || c.id === b.id);
                  const liveStay = buildStayBill({
                    booking: b,
                    checkin: chk,
                    posOrders: state.posOrders,
                    laundryOrders: state.laundryOrders,
                    waterBottles: state.waterBottles,
                    rooms: state.rooms,
                    settings: billSettings,
                  });
                  return (
                    <View key={b.id} style={styles.stayCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inhouseGuest}>
                          Rm {b.roomNumber} — {b.guestName}
                        </Text>
                        <Text style={styles.inhouseSub}>
                          {b.checkInDate} → {b.checkOutDate} •{' '}
                          {liveStay.bill.isGstInvoice
                            ? `GST ${liveStay.bill.headlineGstRate}%`
                            : 'Without GST'}
                          {chk?.grcNumber ? ` • ${chk.grcNumber}` : ''}
                        </Text>
                        <Text style={styles.inhouseDue}>
                          Bill: ₹{formatMoney(liveStay.bill.grandTotal)} | Paid: ₹
                          {formatMoney(liveStay.bill.receipts)} | Due: ₹
                          {formatMoney(liveStay.bill.balance)}
                        </Text>
                      </View>

                      <View style={styles.stayCardActions}>
                        <TouchableOpacity
                          onPress={() => handlePrintGrc(b, chk)}
                          style={styles.grcBtn}
                        >
                          <Printer size={12} color={COLORS.espresso} />
                          <Text style={styles.grcBtnText}>Print / Share GRC</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleShareGrc(b, chk)}
                          style={styles.grcShareIconBtn}
                        >
                          <Share2 size={13} color={COLORS.indigo} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => openWaterModalForStay(b)}
                          style={styles.waterMiniBtn}
                        >
                          <Droplets size={12} color={COLORS.blue} />
                          <Text style={styles.waterMiniBtnText}>Water</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => openCheckoutModal(b)}
                          style={styles.checkoutBtn}
                        >
                          <Text style={styles.checkoutBtnText}>Checkout</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
            )}
          </View>
        )}

        {/* Water Bottle Calculation Card & Register */}
        {subMode === 'water' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Water Bottle Calculator & Folio Log</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 }}>
              Total Bottles − Free Complimentary Bottles = Chargeable Bottles × ₹Rate (auto-posted
              to guest stay folio).
            </Text>

            {activeInHouseList.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}
              >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {activeInHouseList.map((b) => {
                    const sel = wbRoom === b.roomNumber;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => {
                          const chk = state.checkins.find(
                            (c) => c.bookingId === b.id || c.id === b.id
                          );
                          setWbRoom(b.roomNumber);
                          setWbGuestName(b.guestName);
                          setWbBookingId(b.id);
                          setWbCheckInId(chk?.id || '');
                        }}
                        style={[styles.roomChip, sel && styles.roomChipSelected]}
                      >
                        <Text style={[styles.roomChipNum, sel && { color: COLORS.goldBright }]}>
                          Rm {b.roomNumber}
                        </Text>
                        <Text style={[styles.roomChipSub, sel && { color: '#FFF' }]}>
                          {b.guestName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <View style={styles.twoCol}>
              <View style={{ flex: 0.9 }}>
                <Text style={styles.inputLabel}>Room No. *</Text>
                <TextInput
                  value={wbRoom}
                  onChangeText={setWbRoom}
                  placeholder="101"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1.4 }}>
                <Text style={styles.inputLabel}>Guest Name</Text>
                <TextInput
                  value={wbGuestName}
                  onChangeText={setWbGuestName}
                  placeholder="In-House Guest"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Total Bottles</Text>
                <TextInput
                  value={wbTotalBottles}
                  onChangeText={setWbTotalBottles}
                  keyboardType="numeric"
                  placeholder="3"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Free Bottles</Text>
                <TextInput
                  value={wbFreeBottles}
                  onChangeText={setWbFreeBottles}
                  keyboardType="numeric"
                  placeholder="1"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Rate (₹)</Text>
                <TextInput
                  value={wbRate}
                  onChangeText={setWbRate}
                  keyboardType="numeric"
                  placeholder="20"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.waterCalcBanner}>
              <Text style={styles.waterCalcFormula}>
                {wbTotalN} Total − {wbFreeN} Free = {wbChargeableN} Chargeable × ₹{wbRateN}
              </Text>
              <Text style={styles.waterCalcTotal}>₹{formatMoney(wbTotalCharge)}</Text>
            </View>

            <TouchableOpacity
              onPress={() => handleSaveWaterBottles(false)}
              style={[styles.primaryActionBtn, { marginBottom: 14 }]}
            >
              <Text style={styles.primaryActionText}>+ Post Water Bottles to Room Folio</Text>
            </TouchableOpacity>

            <Text style={styles.cardTitle}>Recent Water Bottle Logs ({waterBottleLogs.length})</Text>
            {waterBottleLogs.filter((w) =>
              matchesQuickDateFilter(w.date, dateFilter, fromDate, toDate)
            ).length === 0 ? (
              <Text style={styles.emptyText}>No water bottle logs for selected date filter.</Text>
            ) : (
              waterBottleLogs
                .filter((w) => matchesQuickDateFilter(w.date, dateFilter, fromDate, toDate))
                .map((w) => {
                  const free = Number(w.complimentaryCount ?? w.complimentaryQty ?? 0);
                  const chg = Number(w.extraChargeableCount ?? w.chargeableQty ?? w.quantity ?? 0);
                  const tot = Number(w.totalBottles ?? free + chg);
                  const rt = Number(w.unitPrice ?? w.ratePerBottle ?? billSettings.waterBottleRate);
                  const amt = Number(w.chargeAmount ?? w.totalAmount ?? w.totalCharge ?? w.amount ?? 0);
                  return (
                    <View key={w.id} style={styles.inhouseRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inhouseGuest}>
                          Rm {w.roomNumber} — {w.guestName || 'Guest'}
                        </Text>
                        <Text style={styles.inhouseSub}>
                          Total {tot} • Free {free} • Chargeable {chg} × ₹{rt}
                        </Text>
                        <Text style={styles.inhouseSub}>
                          {w.date} {w.loggedBy ? `• By ${w.loggedBy}` : ''}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.sumVal,
                          { color: amt > 0 ? COLORS.goldDark : COLORS.emerald },
                        ]}
                      >
                        {amt > 0 ? `₹${formatMoney(amt)}` : 'Complimentary'}
                      </Text>
                    </View>
                  );
                })
            )}
          </View>
        )}

        {/* Extra Services / Guest Services Catalog */}
        {subMode === 'services' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Extra Services / Categories ({serviceCatalog.length})
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 }}>
              Add extra service categories here — they appear automatically in Advance Booking &
              Guest Check-In.
            </Text>
            <View style={styles.twoCol}>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.inputLabel}>Service / Category Name *</Text>
                <TextInput
                  value={newSrvName}
                  onChangeText={setNewSrvName}
                  placeholder="e.g. Airport Pickup, Decoration"
                  placeholderTextColor={COLORS.textMuted}
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Charge (₹) *</Text>
                <TextInput
                  value={newSrvPrice}
                  onChangeText={setNewSrvPrice}
                  keyboardType="numeric"
                  placeholder="300"
                  style={styles.input}
                />
              </View>
            </View>
            <TouchableOpacity
              onPress={async () => {
                if (!newSrvName.trim()) {
                  Alert.alert('Validation', 'Please enter service name');
                  return;
                }
                await addExtraServiceCatalogItem(newSrvName, Number(newSrvPrice) || 0);
                setNewSrvName('');
                Alert.alert('Added', 'Extra service category added to Advance Booking & Check-In!');
              }}
              style={[styles.primaryActionBtn, { marginBottom: 14 }]}
            >
              <Text style={styles.primaryActionText}>+ Add Extra Service Category</Text>
            </TouchableOpacity>

            {serviceCatalog.length === 0 ? (
              <Text style={styles.emptyText}>No extra services added yet.</Text>
            ) : (
              serviceCatalog.map((srv) => (
                <View key={srv.id} style={styles.inhouseRow}>
                  <Text style={styles.inhouseGuest}>{srv.serviceName}</Text>
                  <Text style={[styles.sumVal, { color: COLORS.emerald }]}>
                    ₹{servicePriceOf(srv).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Police Form-C Foreign Guest Register */}
        {subMode === 'cform' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Foreign Guest Police Form-C Register ({foreignCheckins.length})
            </Text>
            {foreignCheckins.filter((c) =>
              matchesQuickDateFilter(c.checkInDate, dateFilter, fromDate, toDate)
            ).length === 0 ? (
              <Text style={styles.emptyText}>No foreign national Form-C entries recorded yet.</Text>
            ) : (
              foreignCheckins
                .filter((c) => matchesQuickDateFilter(c.checkInDate, dateFilter, fromDate, toDate))
                .map((c) => (
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
                    <TouchableOpacity
                      onPress={() => handlePrintGrc(null, c)}
                      style={styles.grcBtn}
                    >
                      <Printer size={12} color={COLORS.espresso} />
                      <Text style={styles.grcBtnText}>GRC</Text>
                    </TouchableOpacity>
                  </View>
                ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Water Bottle Calculation Modal (Quick Launch from In-House Card) */}
      <Modal visible={waterModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                Water Bottle Calculator — Rm {wbRoom}
              </Text>
              <TouchableOpacity onPress={() => setWaterModalOpen(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {wbGuestName ? (
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 }}>
                Guest: {wbGuestName}
              </Text>
            ) : null}

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Total Bottles</Text>
                <TextInput
                  value={wbTotalBottles}
                  onChangeText={setWbTotalBottles}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Free Bottles</Text>
                <TextInput
                  value={wbFreeBottles}
                  onChangeText={setWbFreeBottles}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Rate (₹)</Text>
                <TextInput
                  value={wbRate}
                  onChangeText={setWbRate}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.waterCalcBanner}>
              <Text style={styles.waterCalcFormula}>
                {wbTotalN} Total − {wbFreeN} Free = {wbChargeableN} Chargeable × ₹{wbRateN}
              </Text>
              <Text style={styles.waterCalcTotal}>₹{formatMoney(wbTotalCharge)}</Text>
            </View>

            <View style={styles.twoCol}>
              <TouchableOpacity
                onPress={() => setWaterModalOpen(false)}
                style={styles.cancelModalBtn}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSaveWaterBottles(true)}
                style={[styles.primaryActionBtn, { flex: 1.5 }]}
              >
                <Text style={styles.primaryActionText}>Save to Room Folio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Checkout Clearance Modal (Uses Single Bill Calculator buildStayBill!) */}
      <Modal visible={Boolean(checkoutTarget)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            {checkoutTarget &&
              (() => {
                const matchedChk = state.checkins.find(
                  (c) => c.bookingId === checkoutTarget.id || c.id === checkoutTarget.id
                );
                const existingInv = state.invoices.find(
                  (i) => i.bookingId === checkoutTarget.id && !i.isSeparateInvoice
                );
                const extraN = Math.max(0, Number(coExtraAmt) || 0);
                const discN = Math.max(0, Number(coDiscount) || 0);
                const stayPreview = buildStayBill({
                  booking: checkoutTarget,
                  checkin: matchedChk,
                  posOrders: state.posOrders,
                  laundryOrders: state.laundryOrders,
                  waterBottles: state.waterBottles,
                  rooms: state.rooms,
                  settings: billSettings,
                  additionalCharges:
                    extraN > 0
                      ? [
                          {
                            id: 'co-extra-preview',
                            kind: 'other',
                            description: 'Additional Checkout Charges',
                            amount: extraN,
                            roomNumber: checkoutTarget.roomNumber,
                          },
                        ]
                      : [],
                  gstEnabledOverride: coWithGst,
                  discountOverride: discN,
                });
                const b = stayPreview.bill;

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
                          {coWithGst ? `GST (${b.headlineGstRate}%)` : 'Without GST'}
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
                          GST Invoice ({coWithGst ? `${defaultGst}% Room GST` : 'Without GST 0%'})
                        </Text>
                      </TouchableOpacity>
                    )}

                    <View style={[styles.twoCol, { marginTop: 6 }]}>
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
                        <Text style={styles.inputLabel}>Discount (₹)</Text>
                        <TextInput
                          value={coDiscount}
                          onChangeText={setCoDiscount}
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
                        <Text style={styles.sumLabel}>Room & Stay Charges:</Text>
                        <Text style={styles.sumVal}>
                          ₹
                          {formatMoney(
                            b.legacy.roomCharges +
                              b.legacy.extraBedCharges +
                              b.legacy.extraPersonCharges +
                              b.legacy.earlyCheckInCharges +
                              b.legacy.lateCheckOutCharges
                          )}
                        </Text>
                      </View>
                      {b.legacy.foodCharges > 0 && (
                        <View style={styles.sumRow}>
                          <Text style={styles.sumLabel}>Food / POS (Pre-Tax):</Text>
                          <Text style={styles.sumVal}>₹{formatMoney(b.legacy.foodCharges)}</Text>
                        </View>
                      )}
                      {b.legacy.waterCharges > 0 && (
                        <View style={styles.sumRow}>
                          <Text style={styles.sumLabel}>Water Bottles:</Text>
                          <Text style={styles.sumVal}>₹{formatMoney(b.legacy.waterCharges)}</Text>
                        </View>
                      )}
                      {b.legacy.laundryCharges + b.legacy.serviceCharges + b.legacy.otherCharges >
                        0 && (
                        <View style={styles.sumRow}>
                          <Text style={styles.sumLabel}>Laundry / Extra Services:</Text>
                          <Text style={styles.sumVal}>
                            ₹
                            {formatMoney(
                              b.legacy.laundryCharges +
                                b.legacy.serviceCharges +
                                b.legacy.otherCharges
                            )}
                          </Text>
                        </View>
                      )}
                      {b.discount > 0 && (
                        <View style={styles.sumRow}>
                          <Text style={styles.sumLabel}>Less Discount:</Text>
                          <Text style={styles.sumVal}>- ₹{formatMoney(b.discount)}</Text>
                        </View>
                      )}
                      {b.totalTax > 0 && (
                        <View style={styles.sumRow}>
                          <Text style={styles.sumLabel}>CGST + SGST:</Text>
                          <Text style={styles.sumVal}>₹{formatMoney(b.totalTax)}</Text>
                        </View>
                      )}
                      <View style={[styles.sumRow, styles.sumTotalRow]}>
                        <Text style={styles.sumTotalLabel}>Final Bill Total:</Text>
                        <Text style={styles.sumTotalVal}>₹{formatMoney(b.grandTotal)}</Text>
                      </View>
                      <View style={styles.sumRow}>
                        <Text style={styles.sumLabel}>
                          Prior Paid: ₹{formatMoney(b.receipts)} • Balance Before Now:
                        </Text>
                        <Text style={[styles.sumVal, { color: COLORS.rose }]}>
                          ₹{formatMoney(b.balance)}
                        </Text>
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
                            collectedNow: Number(coCollectedNow) || 0,
                            paymentMethod: coPayMethod,
                          });
                          if (res.ok) {
                            Alert.alert(
                              'Checked Out & Invoice Finalized',
                              `Invoice ${res.invoice?.invoiceNumber || ''} generated. Room ${target.roomNumber} marked DIRTY.`,
                              [
                                { text: 'Close', style: 'cancel' },
                                ...(res.invoice
                                  ? [
                                      {
                                        text: 'Print / Download PDF',
                                        onPress: () => {
                                          const inv = res.invoice!;
                                          const finalStay = buildStayBill({
                                            booking: target,
                                            checkin: matchedChk,
                                            posOrders: state.posOrders,
                                            laundryOrders: state.laundryOrders,
                                            waterBottles: state.waterBottles,
                                            rooms: state.rooms,
                                            settings: billSettings,
                                            additionalCharges:
                                              extraN > 0
                                                ? [
                                                    {
                                                      id: 'co-extra',
                                                      kind: 'other',
                                                      description: 'Additional Checkout Charges',
                                                      amount: extraN,
                                                      roomNumber: target.roomNumber,
                                                    },
                                                  ]
                                                : [],
                                            additionalPayments:
                                              Number(coCollectedNow) > 0
                                                ? [
                                                    {
                                                      id: 'co-pay',
                                                      amount: Number(coCollectedNow),
                                                      method: coPayMethod,
                                                    },
                                                  ]
                                                : [],
                                            gstEnabledOverride: coWithGst,
                                            discountOverride: discN,
                                          });
                                          const html = renderInvoiceHtml(
                                            toInvoicePrintData({
                                              hotel: hotelProfile,
                                              invoiceNumber: inv.invoiceNumber,
                                              invoiceDate: inv.dateCreated,
                                              booking: target,
                                              checkin: matchedChk,
                                              folio: finalStay.folio,
                                              bill: finalStay.bill,
                                            })
                                          );
                                          mobilePrint.printHtml(html, inv.invoiceNumber);
                                        },
                                      },
                                    ]
                                  : []),
                              ]
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
  servicesBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  servicesBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  servicesBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.4,
  },
  manageServicesBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#5EEAD4',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  servicePickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 6,
  },
  servicePickRowActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  servicePickName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.espresso,
    flex: 1,
  },
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
  inhouseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  waterHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  waterHeaderBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.blue,
  },
  stayCard: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  stayCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
  },
  grcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
  },
  grcBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.espresso,
  },
  grcShareIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.blueSoft,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
  },
  waterMiniBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.blue,
  },
  waterCalcBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  waterCalcFormula: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
    flex: 1,
  },
  waterCalcTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.blue,
  },
  inhouseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  inhouseGuest: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  inhouseSub: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  inhouseDue: { fontSize: 11.5, fontWeight: '700', color: COLORS.goldDark, marginTop: 2 },
  checkoutBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
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
