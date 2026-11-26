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

export type FrontSubMode =
  | 'advance'
  | 'reservations'
  | 'checkin'
  | 'inhouse'
  | 'water'
  | 'services'
  | 'cform';

interface FrontDeskScreenProps {
  initialSubMode?: FrontSubMode;
  initialNavTick?: number;
}

export const FrontDeskScreen: React.FC<FrontDeskScreenProps> = ({
  initialSubMode,
  initialNavTick,
}) => {
  const {
    state,
    hotelProfile,
    createAdvanceBooking,
    performCheckIn,
    performCheckout,
    addWaterBottleLog,
    addExtraServiceCatalogItem,
  } = usePms();
  const [subMode, setSubMode] = useState<FrontSubMode>(initialSubMode || 'checkin');

  useEffect(() => {
    if (initialSubMode) {
      setSubMode(initialSubMode);
    }
  }, [initialSubMode, initialNavTick]);
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
  const [children, setChildren] = useState('0');
  const [bookingSource, setBookingSource] = useState('Direct');
  const [ratePerNight, setRatePerNight] = useState(String(firstRoom?.rate || 2000));
  const [gstMode, setGstMode] = useState<'non_gst' | 'gst_extra' | 'including_gst'>(() => {
    if (hotelProfile?.isGstEnabled === false) return 'non_gst';
    return billSettings.roomRateIncludesGst ? 'including_gst' : 'gst_extra';
  });
  const withGst = gstMode !== 'non_gst';
  const setWithGst = (next: boolean | ((prev: boolean) => boolean)) => {
    setGstMode((prev) => {
      const target = typeof next === 'function' ? next(prev !== 'non_gst') : next;
      if (!target) return 'non_gst';
      return billSettings.roomRateIncludesGst ? 'including_gst' : 'gst_extra';
    });
  };
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discount, setDiscount] = useState('0');
  const [advanceAmt, setAdvanceAmt] = useState('0');
  const [arrivalClock, setArrivalClock] = useState('12:00');
  const [arrivalMeridiem, setArrivalMeridiem] = useState<'AM' | 'PM'>('PM');
  const [departureClock, setDepartureClock] = useState('11:00');
  const [departureMeridiem, setDepartureMeridiem] = useState<'AM' | 'PM'>('AM');
  const arrivalTimeInput = `${arrivalClock.trim() || '12:00'} ${arrivalMeridiem}`;
  const departureTimeInput = `${departureClock.trim() || '11:00'} ${departureMeridiem}`;

  // Independently toggleable Check-In / Booking add-ons (strictly OFF by default)
  const [earlyCheckInApplied, setEarlyCheckInApplied] = useState(false);
  const [earlyCheckInAmt, setEarlyCheckInAmt] = useState(
    String(hotelProfile?.earlyCheckInFixedRate || hotelProfile?.earlyCheckInFee || 500)
  );
  const [lateCheckOutApplied, setLateCheckOutApplied] = useState(false);
  const [lateCheckOutAmt, setLateCheckOutAmt] = useState(
    String(hotelProfile?.lateCheckOutFee || 500)
  );
  const [extraBedApplied, setExtraBedApplied] = useState(false);
  const [extraBedQty, setExtraBedQty] = useState('1');
  const [extraBedRate, setExtraBedRate] = useState('500');
  const [checkInWaterApplied, setCheckInWaterApplied] = useState(false);
  const [checkInWaterFree, setCheckInWaterFree] = useState('2');
  const [checkInWaterPaid, setCheckInWaterPaid] = useState('0');
  const [customAddonLabel, setCustomAddonLabel] = useState('');
  const [customAddonAmt, setCustomAddonAmt] = useState('');

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
    bulkMode && selectedBulkRooms.length > 0 ? selectedBulkRooms : [roomNumber];

  const earlyChargeVal = earlyCheckInApplied ? Math.max(0, Number(earlyCheckInAmt) || 0) : 0;
  const lateChargeVal = lateCheckOutApplied ? Math.max(0, Number(lateCheckOutAmt) || 0) : 0;
  const extraBedChargeVal = extraBedApplied
    ? Math.max(0, Number(extraBedQty) || 1) * Math.max(0, Number(extraBedRate) || 0) * nights
    : 0;
  const waterBottleRateVal = Math.max(0, Number(billSettings.waterBottleRate) || 20);
  const checkInWaterChargeVal = checkInWaterApplied
    ? Math.max(0, Number(checkInWaterPaid) || 0) * waterBottleRateVal
    : 0;
  const customAddonVal =
    customAddonLabel.trim() && Number(customAddonAmt) > 0 ? Math.max(0, Number(customAddonAmt) || 0) : 0;

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
    ...(earlyChargeVal > 0
      ? [{ id: 'early-ci', kind: 'early_checkin' as const, description: 'Early Check-In Charge', amount: earlyChargeVal, roomNumber: activeRoomsForCalc[0] || roomNumber }]
      : []),
    ...(lateChargeVal > 0
      ? [{ id: 'late-co', kind: 'late_checkout' as const, description: 'Late Check-Out Charge', amount: lateChargeVal, roomNumber: activeRoomsForCalc[0] || roomNumber }]
      : []),
    ...(extraBedChargeVal > 0
      ? [{ id: 'extra-bed', kind: 'extra_bed' as const, description: `Extra Bed (${extraBedQty} × ${nights}N)`, amount: extraBedChargeVal, roomNumber: activeRoomsForCalc[0] || roomNumber }]
      : []),
    ...(checkInWaterChargeVal > 0
      ? [{ id: 'ci-water', kind: 'water' as const, description: `Water Bottles (${checkInWaterPaid} × ₹${waterBottleRateVal})`, amount: checkInWaterChargeVal, roomNumber: activeRoomsForCalc[0] || roomNumber }]
      : []),
    ...tickedServices.map((srv, i) => ({
      id: `srv-${i}`,
      kind: 'service' as const,
      description: String(srv.serviceName || 'Extra Service'),
      amount: servicePriceOf(srv),
      roomNumber: activeRoomsForCalc[0] || roomNumber,
    })),
    ...(customAddonVal > 0
      ? [{ id: 'custom-addon', kind: 'service' as const, description: customAddonLabel.trim(), amount: customAddonVal, roomNumber: activeRoomsForCalc[0] || roomNumber }]
      : []),
  ];

  const grossBeforeDiscount = formPreviewCharges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const resolvedDiscountAmt =
    discountEnabled && Number(discount) > 0
      ? discountType === 'percent'
        ? r2((grossBeforeDiscount * Math.min(100, Number(discount))) / 100)
        : r2(Number(discount))
      : 0;

  const effectivePreviewSettings = {
    ...billSettings,
    roomRateIncludesGst: gstMode === 'including_gst',
  };

  const formBillPreview = calculateBill({
    charges: formPreviewCharges,
    payments:
      Number(advanceAmt) > 0
        ? [{ id: 'adv', amount: Number(advanceAmt), method: paymentMethod }]
        : [],
    discount: resolvedDiscountAmt,
    gstEnabled: withGst,
    settings: effectivePreviewSettings,
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
    setIdType(b.idType || 'Aadhaar Card');
    setAadhaar(b.aadhaarNumber || b.idNumber || '');
    setAddress(b.address || '');
    setCompanyName(b.companyName || '');
    setGstNumber(b.gstNumber || '');
    setRoomNumber(b.roomNumber || firstRoom?.number || '101');
    if (Array.isArray(b.roomNumbers) && b.roomNumbers.length > 1) {
      setBulkMode(true);
      setSelectedBulkRooms(b.roomNumbers);
    } else {
      setBulkMode(false);
    }
    setCheckInDate(b.checkInDate || todayStr);
    setCheckOutDate(b.checkOutDate || tomorrowStr);
    const parseClock12 = (raw?: string, fallbackClock = '12:00', fallbackMer: 'AM' | 'PM' = 'PM') => {
      const m = String(raw || '').trim().match(/^(\d{1,2}:\d{2})\s*(AM|PM)?$/i);
      if (!m) return { clock: fallbackClock, mer: fallbackMer };
      return {
        clock: m[1],
        mer: (m[2]?.toUpperCase() === 'AM' ? 'AM' : m[2]?.toUpperCase() === 'PM' ? 'PM' : fallbackMer) as 'AM' | 'PM',
      };
    };
    if (b.arrivalTime || b.checkInTime) {
      const parsed = parseClock12(b.arrivalTime || b.checkInTime, '12:00', 'PM');
      setArrivalClock(parsed.clock);
      setArrivalMeridiem(parsed.mer);
    }
    if (b.departureTime || b.checkOutTime) {
      const parsed = parseClock12(b.departureTime || b.checkOutTime, '11:00', 'AM');
      setDepartureClock(parsed.clock);
      setDepartureMeridiem(parsed.mer);
    }
    setAdults(String(b.adults || 2));
    setChildren(String(b.children || 0));
    setBookingSource(b.bookingSource || (b as any).source || 'Direct');
    const perNight =
      Number(b.roomSubtotal || b.bookingAmount || 0) / Math.max(1, Number(b.nights) || 1);
    setRatePerNight(String(Math.round(perNight) || 2000));
    const savedDisc = Number(b.discountAmount || 0);
    setDiscountEnabled(savedDisc > 0);
    setDiscountType('fixed');
    setDiscount(String(savedDisc));

    const earlyVal = Number(b.earlyCheckInCharge || 0);
    setEarlyCheckInApplied(earlyVal > 0);
    if (earlyVal > 0) setEarlyCheckInAmt(String(earlyVal));
    const lateVal = Number((b as any).lateCheckOutCharge || 0);
    setLateCheckOutApplied(lateVal > 0);
    if (lateVal > 0) setLateCheckOutAmt(String(lateVal));
    const ebVal = Number((b as any).extraBedCharge || 0);
    setExtraBedApplied(ebVal > 0);

    const savedNoGst =
      b.isWithoutGst === true ||
      b.gstInvoice === false ||
      (b.gstRate !== undefined && Number(b.gstRate) <= 0);
    setGstMode(savedNoGst ? 'non_gst' : billSettings.roomRateIncludesGst ? 'including_gst' : 'gst_extra');
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
    setChildren('0');
    setAdvanceAmt('0');
    setDiscountEnabled(false);
    setDiscount('0');
    setEarlyCheckInApplied(false);
    setLateCheckOutApplied(false);
    setExtraBedApplied(false);
    setCheckInWaterApplied(false);
    setCheckInWaterFree('2');
    setCheckInWaterPaid('0');
    setCustomAddonLabel('');
    setCustomAddonAmt('');
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
    const allServices: BookedServiceSelection[] = [
      ...bookedServicesPayload,
      ...(customAddonVal > 0
        ? [{ serviceId: `custom-${Date.now()}`, serviceName: customAddonLabel.trim(), amount: customAddonVal }]
        : []),
    ];
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
      discount: resolvedDiscountAmt,
      withGst,
      advanceAmount: Number(advanceAmt) || 0,
      paymentMethod,
      bookingSource: bookingSource || 'Direct',
      bookedServices: allServices,
    });
    setSubmitting(false);
    if (!res.ok) {
      Alert.alert('Sync Error', res.error || 'Could not save booking');
      return;
    }
    Alert.alert(
      'Advance Booking Saved',
      `${guestName} booked in Room(s) ${targetRooms.join(', ')} (${
        gstMode === 'non_gst'
          ? 'Without GST 0%'
          : gstMode === 'including_gst'
          ? `Incl. GST ${defaultGst}%`
          : `GST Extra ${defaultGst}%`
      }).`
    );
    resetForm();
  };

  const handleConfirmCheckIn = async () => {
    if (!guestName.trim() || mobile.trim().length < 10) {
      Alert.alert('Validation', 'Guest name and 10-digit mobile number are required.');
      return;
    }
    const targetRooms = bulkMode && selectedBulkRooms.length > 0 ? selectedBulkRooms : [roomNumber];
    const nowTimeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const allServices: BookedServiceSelection[] = [
      ...bookedServicesPayload,
      ...(customAddonVal > 0
        ? [{ serviceId: `custom-${Date.now()}`, serviceName: customAddonLabel.trim(), amount: customAddonVal }]
        : []),
    ];
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
      roomNumber: targetRooms[0],
      roomNumbers: targetRooms,
      checkInDate,
      arrivalTime: arrivalTimeInput.trim() || nowTimeStr,
      checkOutDate,
      departureTime: departureTimeInput.trim() || '11:00 AM',
      earlyCheckInCharge: earlyChargeVal,
      lateCheckOutCharge: lateChargeVal,
      extraBedCharge: extraBedChargeVal,
      adults: Number(adults) || 2,
      children: Number(children) || 0,
      ratePerNight: Number(ratePerNight) || 2000,
      discount: resolvedDiscountAmt,
      withGst,
      advanceAmount: Number(advanceAmt) || 0,
      paymentMethod,
      bookedServices: allServices,
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
    if (res.ok && checkInWaterApplied) {
      const freeQty = Math.max(0, Number(checkInWaterFree) || 0);
      const paidQty = Math.max(0, Number(checkInWaterPaid) || 0);
      if (freeQty + paidQty > 0) {
        await addWaterBottleLog({
          roomNumber: targetRooms[0],
          totalBottles: freeQty + paidQty,
          complimentaryQty: freeQty,
          chargeableQty: paidQty,
          ratePerBottle: waterBottleRateVal,
          bookingId: linkedBookingId || res.checkInId,
          checkInId: res.checkInId,
          guestName,
          notes: 'Issued at Check-In',
        });
      }
    }
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

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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

            {/* ============ STEP 1: GUEST & IDENTITY DETAILS ============ */}
            <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.goldDark, letterSpacing: 0.7, marginBottom: 8 }}>
                1. GUEST &amp; IDENTITY DETAILS
              </Text>

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
                  <Text style={styles.inputLabel}>Email (For Invoice / Confirmation)</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="guest@email.com"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.input}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>ID Proof Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['Aadhaar Card', 'Passport', 'Driving License', 'PAN Card', 'Voter ID'].map((t) => {
                    const active = idType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setIdType(t)}
                        style={[
                          styles.bulkToggleBtn,
                          active && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                        ]}
                      >
                        <Text style={[styles.bulkToggleText, active && { color: COLORS.espresso, fontWeight: '800' }]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>{idType} Number</Text>
                  <TextInput
                    value={aadhaar}
                    onChangeText={setAadhaar}
                    placeholder="ID Number"
                    placeholderTextColor={COLORS.textMuted}
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Address / City</Text>
                  <TextInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Residential address"
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
                        placeholder="Origin City"
                        placeholderTextColor={COLORS.textMuted}
                        style={styles.input}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Going To</Text>
                      <TextInput
                        value={goingTo}
                        onChangeText={setGoingTo}
                        placeholder="Next Destination"
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
                      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
                        {['EP', 'CP', 'MAP', 'AP'].map((mp) => (
                          <TouchableOpacity
                            key={mp}
                            onPress={() => setMealPlan(mp)}
                            style={[
                              styles.bulkToggleBtn,
                              { flex: 1, alignItems: 'center', paddingVertical: 8 },
                              mealPlan === mp && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                            ]}
                          >
                            <Text style={[styles.bulkToggleText, mealPlan === mp && { color: COLORS.espresso, fontWeight: '800' }]}>
                              {mp}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Purpose of Visit</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {['Leisure', 'Business', 'Family', 'Event / Banquet', 'Medical'].map((purp) => {
                      const active = purposeOfVisit === purp;
                      return (
                        <TouchableOpacity
                          key={purp}
                          onPress={() => setPurposeOfVisit(purp)}
                          style={[
                            styles.bulkToggleBtn,
                            active && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                          ]}
                        >
                          <Text style={[styles.bulkToggleText, active && { color: COLORS.espresso, fontWeight: '800' }]}>
                            {purp}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
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
            </View>

            {/* ============ STEP 2: STAY, ROOM & 12H AM/PM TIMINGS ============ */}
            <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.goldDark, letterSpacing: 0.7, marginBottom: 8 }}>
                2. STAY, ROOMS &amp; 12H AM/PM TIMINGS
              </Text>

              <View style={styles.roomSelectHeader}>
                <Text style={styles.inputLabel}>
                  {bulkMode
                    ? `Select Multiple Rooms (${selectedBulkRooms.length} Selected)`
                    : 'Select Room'}
                </Text>
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
                    {bulkMode ? '✓ Multi-Room ON' : '+ Multi-Room / Group'}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}
              >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {state.rooms.map((rm) => {
                    const selected = bulkMode
                      ? selectedBulkRooms.includes(rm.number)
                      : roomNumber === rm.number;
                    return (
                      <TouchableOpacity
                        key={rm.id}
                        onPress={() => {
                          if (bulkMode) {
                            toggleBulkRoom(rm.number);
                          } else {
                            setRoomNumber(rm.number);
                            setRatePerNight(String(rm.rate || 2000));
                          }
                        }}
                        style={[styles.roomChip, selected && styles.roomChipSelected]}
                      >
                        <Text style={[styles.roomChipNum, selected && { color: COLORS.espresso }]}>
                          Rm {rm.number}
                        </Text>
                        <Text style={[styles.roomChipSub, selected && { color: COLORS.espresso }]}>
                          {rm.category} • ₹{rm.rate} • {rm.status}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Check-In & Check-Out Dates */}
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel} numberOfLines={1}>
                    Check-In Date *
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
                    Check-Out Date * ({nights}N)
                  </Text>
                  <TextInput
                    value={checkOutDate}
                    onChangeText={setCheckOutDate}
                    placeholder="YYYY-MM-DD"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* 12h AM/PM Arrival & Departure Time Pickers */}
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Arrival Time (12h)</Text>
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginBottom: 8 }}>
                    <TextInput
                      value={arrivalClock}
                      onChangeText={setArrivalClock}
                      placeholder="12:00"
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    />
                    {(['AM', 'PM'] as const).map((m) => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setArrivalMeridiem(m)}
                        style={[
                          styles.bulkToggleBtn,
                          { paddingHorizontal: 8, paddingVertical: 8 },
                          arrivalMeridiem === m && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                        ]}
                      >
                        <Text style={[styles.bulkToggleText, arrivalMeridiem === m && { color: COLORS.espresso, fontWeight: '800' }]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Departure Time (12h)</Text>
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginBottom: 8 }}>
                    <TextInput
                      value={departureClock}
                      onChangeText={setDepartureClock}
                      placeholder="11:00"
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    />
                    {(['AM', 'PM'] as const).map((m) => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setDepartureMeridiem(m)}
                        style={[
                          styles.bulkToggleBtn,
                          { paddingHorizontal: 8, paddingVertical: 8 },
                          departureMeridiem === m && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                        ]}
                      >
                        <Text style={[styles.bulkToggleText, departureMeridiem === m && { color: COLORS.espresso, fontWeight: '800' }]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Adults & Children Steppers + Nightly Tariff */}
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Adults</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TouchableOpacity
                      onPress={() => setAdults(String(Math.max(1, (Number(adults) || 1) - 1)))}
                      style={[styles.bulkToggleBtn, { paddingHorizontal: 12, paddingVertical: 7 }]}
                    >
                      <Text style={{ fontWeight: '800', color: COLORS.espresso }}>−</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.espresso, minWidth: 24, textAlign: 'center' }}>
                      {adults}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setAdults(String((Number(adults) || 1) + 1))}
                      style={[styles.bulkToggleBtn, { paddingHorizontal: 12, paddingVertical: 7 }]}
                    >
                      <Text style={{ fontWeight: '800', color: COLORS.espresso }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Children</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <TouchableOpacity
                      onPress={() => setChildren(String(Math.max(0, (Number(children) || 0) - 1)))}
                      style={[styles.bulkToggleBtn, { paddingHorizontal: 12, paddingVertical: 7 }]}
                    >
                      <Text style={{ fontWeight: '800', color: COLORS.espresso }}>−</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.espresso, minWidth: 24, textAlign: 'center' }}>
                      {children}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setChildren(String((Number(children) || 0) + 1))}
                      style={[styles.bulkToggleBtn, { paddingHorizontal: 12, paddingVertical: 7 }]}
                    >
                      <Text style={{ fontWeight: '800', color: COLORS.espresso }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Nightly Tariff + Reset to Rack Rate */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Tariff / Night (₹)</Text>
                  <TextInput
                    value={ratePerNight}
                    onChangeText={setRatePerNight}
                    keyboardType="numeric"
                    style={[styles.input, { marginBottom: 0 }]}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const rm = state.rooms.find((r) => r.number === roomNumber);
                    if (rm?.rate) setRatePerNight(String(rm.rate));
                  }}
                  style={[styles.bulkToggleBtn, { paddingVertical: 10, paddingHorizontal: 10 }]}
                >
                  <Text style={styles.bulkToggleText}>Reset Rack Rate</Text>
                </TouchableOpacity>
              </View>

              {/* Booking Source Chips */}
              <Text style={styles.inputLabel}>Booking Source</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['Direct', 'Walk-In', 'Phone', 'MakeMyTrip', 'Goibibo', 'Booking.com', 'Agoda', 'Travel Agent'].map((src) => {
                    const active = bookingSource === src;
                    return (
                      <TouchableOpacity
                        key={src}
                        onPress={() => setBookingSource(src)}
                        style={[
                          styles.bulkToggleBtn,
                          active && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                        ]}
                      >
                        <Text style={[styles.bulkToggleText, active && { color: COLORS.espresso, fontWeight: '800' }]}>
                          {src}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* ============ STEP 3: ADD-ONS, EXTRA BED, EARLY/LATE & WATER BOTTLES ============ */}
            <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.goldDark, letterSpacing: 0.7, marginBottom: 8 }}>
                3. OPTIONAL ADD-ONS, EXTRA BED &amp; WATER BOTTLES (OFF BY DEFAULT)
              </Text>

              {/* Early Check-In Surcharge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, backgroundColor: '#FDF8EE', borderWidth: 1, borderColor: COLORS.gold, borderRadius: 12, padding: 10 }}>
                <TouchableOpacity
                  onPress={() => setEarlyCheckInApplied((p) => !p)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  {earlyCheckInApplied ? <CheckSquare size={18} color={COLORS.emerald} /> : <Square size={18} color={COLORS.textSecondary} />}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.espresso }}>Early Check-In Surcharge</Text>
                </TouchableOpacity>
                {earlyCheckInApplied && (
                  <TextInput
                    value={earlyCheckInAmt}
                    onChangeText={setEarlyCheckInAmt}
                    keyboardType="numeric"
                    placeholder="₹500"
                    style={[styles.input, { width: 88, marginBottom: 0 }]}
                  />
                )}
              </View>

              {/* Late Check-Out Surcharge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, backgroundColor: '#FAF7F2', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10 }}>
                <TouchableOpacity
                  onPress={() => setLateCheckOutApplied((p) => !p)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  {lateCheckOutApplied ? <CheckSquare size={18} color={COLORS.emerald} /> : <Square size={18} color={COLORS.textSecondary} />}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.espresso }}>Late Check-Out Charge</Text>
                </TouchableOpacity>
                {lateCheckOutApplied && (
                  <TextInput
                    value={lateCheckOutAmt}
                    onChangeText={setLateCheckOutAmt}
                    keyboardType="numeric"
                    placeholder="₹500"
                    style={[styles.input, { width: 88, marginBottom: 0 }]}
                  />
                )}
              </View>

              {/* Extra Bed / Mattress */}
              <View style={{ marginBottom: 8, backgroundColor: '#FAF7F2', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10 }}>
                <TouchableOpacity
                  onPress={() => setExtraBedApplied((p) => !p)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  {extraBedApplied ? <CheckSquare size={18} color={COLORS.emerald} /> : <Square size={18} color={COLORS.textSecondary} />}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.espresso }}>
                    Extra Bed / Mattress {extraBedApplied ? `(+₹${formatMoney(extraBedChargeVal)})` : ''}
                  </Text>
                </TouchableOpacity>
                {extraBedApplied && (
                  <View style={[styles.twoCol, { marginTop: 8 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Qty</Text>
                      <TextInput value={extraBedQty} onChangeText={setExtraBedQty} keyboardType="numeric" style={[styles.input, { marginBottom: 0 }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Rate / Night (₹)</Text>
                      <TextInput value={extraBedRate} onChangeText={setExtraBedRate} keyboardType="numeric" style={[styles.input, { marginBottom: 0 }]} />
                    </View>
                  </View>
                )}
              </View>

              {/* Check-In Water Bottles Section */}
              {subMode === 'checkin' && (
                <View style={{ marginBottom: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: COLORS.blueBorder, borderRadius: 12, padding: 10 }}>
                  <TouchableOpacity
                    onPress={() => setCheckInWaterApplied((p) => !p)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    {checkInWaterApplied ? <CheckSquare size={18} color={COLORS.blue} /> : <Square size={18} color={COLORS.textSecondary} />}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.blue }}>
                      Issue Water Bottles at Check-In (₹{waterBottleRateVal}/extra bottle)
                    </Text>
                  </TouchableOpacity>
                  {checkInWaterApplied && (
                    <View style={[styles.twoCol, { marginTop: 8 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Complimentary (Free)</Text>
                        <TextInput value={checkInWaterFree} onChangeText={setCheckInWaterFree} keyboardType="numeric" style={[styles.input, { marginBottom: 0 }]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Chargeable Qty</Text>
                        <TextInput value={checkInWaterPaid} onChangeText={setCheckInWaterPaid} keyboardType="numeric" style={[styles.input, { marginBottom: 0 }]} />
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Available Extra Services */}
              <View style={styles.servicesBox}>
                <View style={styles.servicesBoxHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.servicesBoxTitle}>
                      ✨ AVAILABLE EXTRA SERVICES ({serviceCatalog.length})
                    </Text>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
                      Tap to add extra services to this {subMode === 'advance' ? 'Advance Booking' : 'Check-In'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSubMode('services')} style={styles.manageServicesBtn}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#0F766E' }}>+ Manage</Text>
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
                          {picked ? <CheckSquare size={17} color={COLORS.emerald} /> : <Square size={17} color={COLORS.textMuted} />}
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

                {/* Custom One-Off Add-On */}
                <View style={[styles.twoCol, { marginTop: 8 }]}>
                  <TextInput
                    value={customAddonLabel}
                    onChangeText={setCustomAddonLabel}
                    placeholder="Custom Add-on (e.g. Airport Pickup)"
                    placeholderTextColor={COLORS.textMuted}
                    style={[styles.input, { flex: 1.5, marginBottom: 0 }]}
                  />
                  <TextInput
                    value={customAddonAmt}
                    onChangeText={setCustomAddonAmt}
                    keyboardType="numeric"
                    placeholder="₹ Amt"
                    placeholderTextColor={COLORS.textMuted}
                    style={[styles.input, { flex: 0.7, marginBottom: 0 }]}
                  />
                </View>
              </View>
            </View>

            {/* ============ STEP 4: GST MODE, DISCOUNT & PAYMENT SETTLEMENT ============ */}
            <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.goldDark, letterSpacing: 0.7, marginBottom: 8 }}>
                4. GST MODE, DISCOUNT &amp; PAYMENT
              </Text>

              {/* 3-Mode GST Selector (Matches Web /admin 1:1!) */}
              {subMode === 'checkin' && isCheckInLockedByInv ? (
                <View style={styles.lockedBanner}>
                  <Lock size={14} color={COLORS.amber} />
                  <Text style={styles.lockedText}>
                    Invoice already generated — GST mode locked ({withGst ? `GST ${defaultGst}%` : 'Without GST 0%'}).
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                  {[
                    { id: 'non_gst' as const, label: 'No GST (0%)' },
                    { id: 'gst_extra' as const, label: `+ ${defaultGst}% Extra` },
                    { id: 'including_gst' as const, label: `Incl. ${defaultGst}% GST` },
                  ].map((opt) => {
                    const active = gstMode === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => setGstMode(opt.id)}
                        style={[
                          styles.bulkToggleBtn,
                          { flex: 1, alignItems: 'center', paddingVertical: 9 },
                          active && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                        ]}
                      >
                        <Text style={[styles.bulkToggleText, { fontSize: 11 }, active && { color: COLORS.espresso, fontWeight: '800' }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {withGst && (
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel} numberOfLines={1}>Company (Optional)</Text>
                    <TextInput
                      value={companyName}
                      onChangeText={setCompanyName}
                      placeholder="Corporate Name"
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel} numberOfLines={1}>Company GSTIN</Text>
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

              {/* Independent Discount Toggle (OFF / Fixed ₹ / %) */}
              <View style={{ marginBottom: 10, backgroundColor: '#FAF7F2', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <TouchableOpacity
                    onPress={() => setDiscountEnabled((p) => !p)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    {discountEnabled ? <CheckSquare size={18} color={COLORS.emerald} /> : <Square size={18} color={COLORS.textSecondary} />}
                    <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.espresso }}>Apply Discount</Text>
                  </TouchableOpacity>
                  {discountEnabled && (
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {(['fixed', 'percent'] as const).map((dt) => (
                        <TouchableOpacity
                          key={dt}
                          onPress={() => setDiscountType(dt)}
                          style={[
                            styles.bulkToggleBtn,
                            { paddingHorizontal: 8, paddingVertical: 4 },
                            discountType === dt && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                          ]}
                        >
                          <Text style={[styles.bulkToggleText, discountType === dt && { color: COLORS.espresso, fontWeight: '800' }]}>
                            {dt === 'fixed' ? '₹ Fixed' : '% Pct'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                {discountEnabled && (
                  <TextInput
                    value={discount}
                    onChangeText={setDiscount}
                    keyboardType="numeric"
                    placeholder={discountType === 'percent' ? 'Discount % (e.g. 10)' : 'Discount ₹ (e.g. 300)'}
                    style={[styles.input, { marginTop: 8, marginBottom: 0 }]}
                  />
                )}
              </View>

              {/* Payment Mode & Advance Paid */}
              <Text style={styles.inputLabel}>Payment Mode</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                {['Cash', 'UPI', 'Card', 'Bank Transfer'].map((pm) => {
                  const active = paymentMethod === pm;
                  return (
                    <TouchableOpacity
                      key={pm}
                      onPress={() => setPaymentMethod(pm)}
                      style={[
                        styles.bulkToggleBtn,
                        { flex: 1, alignItems: 'center', paddingVertical: 8 },
                        active && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                      ]}
                    >
                      <Text style={[styles.bulkToggleText, { fontSize: 11 }, active && { color: COLORS.espresso, fontWeight: '800' }]}>
                        {pm === 'Bank Transfer' ? 'Bank' : pm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Advance Paid Now (₹)</Text>
              <TextInput
                value={advanceAmt}
                onChangeText={setAdvanceAmt}
                keyboardType="numeric"
                placeholder="0"
                style={styles.input}
              />
            </View>

            {/* Live Reconciled Bill Breakdown */}
            <View style={styles.summaryBox}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>
                  Room Tariff ({activeRoomsForCalc.length} Rm × {nights}N{gstMode === 'including_gst' ? ', Pre-Tax' : ''}):
                </Text>
                <Text style={styles.sumVal}>₹{formatMoney(roomSub)}</Text>
              </View>
              {earlyChargeVal > 0 && (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Early Check-In Charge:</Text>
                  <Text style={styles.sumVal}>+ ₹{formatMoney(earlyChargeVal)}</Text>
                </View>
              )}
              {lateChargeVal > 0 && (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Late Check-Out Charge:</Text>
                  <Text style={styles.sumVal}>+ ₹{formatMoney(lateChargeVal)}</Text>
                </View>
              )}
              {extraBedChargeVal > 0 && (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Extra Bed ({extraBedQty} × {nights}N):</Text>
                  <Text style={styles.sumVal}>+ ₹{formatMoney(extraBedChargeVal)}</Text>
                </View>
              )}
              {checkInWaterChargeVal > 0 && (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Water Bottles ({checkInWaterPaid} × ₹{waterBottleRateVal}):</Text>
                  <Text style={styles.sumVal}>+ ₹{formatMoney(checkInWaterChargeVal)}</Text>
                </View>
              )}
              {(servicesTotal + customAddonVal) > 0 && (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Extra Services &amp; Add-Ons:</Text>
                  <Text style={[styles.sumVal, { color: '#0F766E' }]}>
                    + ₹{formatMoney(servicesTotal + customAddonVal)}
                  </Text>
                </View>
              )}
              {resolvedDiscountAmt > 0 && (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Discount:</Text>
                  <Text style={[styles.sumVal, { color: COLORS.emerald }]}>
                    − ₹{formatMoney(resolvedDiscountAmt)}
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
                <Text style={styles.sumLabel}>Advance Paid ({paymentMethod}):</Text>
                <Text style={[styles.sumVal, { color: COLORS.emerald }]}>₹{formatMoney(Number(advanceAmt) || 0)}</Text>
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
                  : `Complete Guest Check-In (${activeRoomsForCalc.length} Room${
                      activeRoomsForCalc.length > 1 ? 's' : ''
                    })`}
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
                        <Text style={[styles.roomChipNum, sel && { color: COLORS.espresso }]}>
                          Rm {b.roomNumber}
                        </Text>
                        <Text style={[styles.roomChipSub, sel && { color: COLORS.espresso }]}>
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.inputLabel}>Collect Now (₹)</Text>
                          <TouchableOpacity onPress={() => setCoCollectedNow(String(Math.max(0, Math.round(b.balance))))}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.emerald }}>Full Due</Text>
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          value={coCollectedNow}
                          onChangeText={setCoCollectedNow}
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                    </View>

                    <Text style={styles.inputLabel}>Settlement Payment Mode</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      {['Cash', 'UPI', 'Card', 'Bank Transfer'].map((pm) => {
                        const active = coPayMethod === pm;
                        return (
                          <TouchableOpacity
                            key={pm}
                            onPress={() => setCoPayMethod(pm)}
                            style={[
                              styles.bulkToggleBtn,
                              { flex: 1, alignItems: 'center', paddingVertical: 7 },
                              active && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                            ]}
                          >
                            <Text style={[styles.bulkToggleText, { fontSize: 11 }, active && { color: COLORS.espresso, fontWeight: '800' }]}>
                              {pm === 'Bank Transfer' ? 'Bank' : pm}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
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
    backgroundColor: COLORS.gold,
    borderColor: COLORS.goldDark,
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
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.goldDark,
  },
  primaryActionText: { fontSize: 13.5, fontWeight: '800', color: COLORS.espresso },
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
