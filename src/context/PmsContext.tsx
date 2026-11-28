import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdminSession,
  AppNotificationItem,
  BookedServiceSelection,
  Booking,
  DailyClosing,
  Expense,
  FinanceVoucher,
  GuestCheckIn,
  HotelProfile,
  HousekeepingLog,
  InventoryProduct,
  InventoryPurchase,
  Invoice,
  LaundryOrder,
  LostFoundItem,
  OtaChannel,
  PettyCashRecord,
  PmsStateSnapshot,
  PosItem,
  PosOrder,
  Room,
  RoomStatus,
  StaffMember,
  SupplierRecord,
  TravelAgent,
  WaterBottleLog,
} from '../types/pms';
import {
  allocateLiveGrcApi,
  fetchLiveHotelStateApi,
  generateLiveInvoiceApi,
  getStoredAdminSession,
  isValidEmail,
  LIVE_API_BASE_URL,
  logoutHotelAdminApi,
  sendBookingEmailApi,
  sendCheckInWelcomeEmailApi,
  sendCheckoutThankYouEmailApi,
  sendGuestInvoiceEmailApi,
  sendNightAuditSummaryEmailApi,
  sendStaffCredentialsEmailApi,
  submitRenewalRequestApi,
  syncLiveHotelDataApi,
} from '../api/directStayApi';
import {
  BillCharge,
  BillPayment,
  calculateBill,
  normalizeBillSettings,
  r2,
} from '../utils/billCalculator';
import {
  allocateInvoiceNumber,
  buildInvoiceRecord,
  buildStayBill,
} from '../utils/stayBilling';

interface PmsContextValue {
  session: AdminSession | null;
  bootstrapping: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  hotelProfile: HotelProfile | null;
  state: PmsStateSnapshot;
  setAuthenticatedSession: (sess: AdminSession) => void;
  logout: () => Promise<void>;
  refreshLiveState: () => Promise<void>;
  createAdvanceBooking: (input: {
    guestName: string;
    mobile: string;
    email: string;
    aadhaarNumber: string;
    address: string;
    companyName?: string;
    gstNumber?: string;
    roomNumber: string;
    roomNumbers?: string[];
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    ratePerNight: number;
    discount: number;
    withGst: boolean;
    gstRate?: number;
    advanceAmount: number;
    paymentMethod: string;
    bookingSource: string;
    bookedServices?: BookedServiceSelection[];
  }) => Promise<{ ok: boolean; error?: string }>;
  performCheckIn: (input: {
    linkedBookingId?: string;
    guestName: string;
    mobile: string;
    email?: string;
    idType?: string;
    aadhaarNumber: string;
    address: string;
    nationality?: string;
    comingFrom?: string;
    goingTo?: string;
    purposeOfVisit?: string;
    mealPlan?: string;
    companyName?: string;
    gstNumber?: string;
    roomNumber: string;
    roomNumbers?: string[];
    checkInDate: string;
    arrivalTime?: string;
    checkOutDate: string;
    departureTime?: string;
    earlyCheckInCharge?: number;
    lateCheckOutCharge?: number;
    extraBedCharge?: number;
    adults: number;
    children?: number;
    ratePerNight: number;
    discount: number;
    withGst: boolean;
    gstRate?: number;
    advanceAmount: number;
    paymentMethod: string;
    isCFormRequired?: boolean;
    cFormData?: GuestCheckIn['cFormData'];
    guestSignature?: string;
    bookedServices?: BookedServiceSelection[];
  }) => Promise<{ ok: boolean; checkInId?: string; grcNumber?: string; error?: string }>;
  performCheckout: (input: {
    bookingOrCheckInId: string;
    extraChargeDesc?: string;
    extraChargeAmt?: number;
    lateCheckOutCharge?: number;
    discount: number;
    withGst: boolean;
    gstRate?: number;
    collectedNow: number;
    paymentMethod: string;
  }) => Promise<{ ok: boolean; invoice?: Invoice; error?: string }>;
  generateSeparateOrNewInvoice: (input: {
    bookingId: string;
    withGst: boolean;
    gstRate?: number;
    includeServices: boolean;
  }) => Promise<{ ok: boolean; invoice?: Invoice; error?: string }>;
  undoCheckout: (
    invoiceId: string,
    reason?: string
  ) => Promise<{ ok: boolean; creditNote?: Invoice; error?: string }>;
  updateRoomStatusOrRate: (roomId: string, status: RoomStatus, newRate?: number) => Promise<void>;
  addRoomEntity: (input: {
    number: string;
    category: string;
    floor: string;
    bedType: string;
    rate: number;
  }) => Promise<void>;
  addBulkRooms: (
    roomsToAdd: Array<{
      number: string;
      category: string;
      floor: string;
      bedType?: string;
      rate: number;
    }>
  ) => Promise<{ createdCount: number; skippedDuplicates: string[] }>;
  createPosOrder: (input: {
    roomNumber?: string;
    guestName?: string;
    items: Array<{ itemId: string; name: string; quantity: number; price: number }>;
    postToRoom: boolean;
    paymentMethod: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  addPosMenuItem: (input: {
    name: string;
    category: string;
    subcategory?: string;
    price: number;
  }) => Promise<void>;
  markHousekeepingTaskStatus: (logId: string, status: string, roomNumber: string) => Promise<void>;
  addHousekeepingTask: (input: {
    roomNumber: string;
    assignedStaff: string;
    cleaningType: string;
  }) => Promise<void>;
  addLaundryOrder: (input: {
    roomNumber: string;
    guestName: string;
    itemsSummary: string;
    amount: number;
  }) => Promise<void>;
  addLostFoundItem: (input: {
    itemName: string;
    roomNumber: string;
    foundBy: string;
  }) => Promise<void>;
  addInventoryProduct: (input: {
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    minStockLevel: number;
    unitPrice: number;
  }) => Promise<void>;
  adjustInventoryStock: (productId: string, delta: number) => Promise<void>;
  addInventoryPurchase: (input: {
    supplierName: string;
    itemName: string;
    quantity: number;
    totalAmount: number;
  }) => Promise<void>;
  addVendorRecord: (input: { name: string; phone: string; category: string }) => Promise<void>;
  addTravelAgent: (input: {
    name: string;
    agencyName: string;
    phone: string;
    commissionRate: number;
  }) => Promise<void>;
  upsertOtaChannel: (input: { name: string; commissionPct: number; status: string }) => Promise<void>;
  addExpenseEntry: (input: {
    category: string;
    vendorName: string;
    description: string;
    amount: number;
    paymentMethod: string;
  }) => Promise<void>;
  addPettyCashEntry: (input: {
    type: 'Cash In' | 'Cash Out';
    description: string;
    amount: number;
  }) => Promise<void>;
  addFinanceVoucher: (input: {
    voucherType: 'Payment' | 'Receipt';
    partyName: string;
    amount: number;
    paymentMode: string;
    narration: string;
  }) => Promise<void>;
  addDailyClosing: (input: {
    shift: string;
    cashCollected: number;
    upiCollected: number;
    notes: string;
  }) => Promise<void>;
  addWaterBottleLog: (input: {
    roomNumber: string;
    totalBottles?: number;
    complimentaryQty: number;
    chargeableQty?: number;
    ratePerBottle?: number;
    bookingId?: string;
    checkInId?: string;
    guestName?: string;
    notes?: string;
  }) => Promise<void>;
  addExtraServiceCatalogItem: (serviceName: string, amount: number) => Promise<void>;
  addStaffMember: (input: {
    name: string;
    mobile: string;
    email?: string;
    department: string;
    designation: string;
    username: string;
    password: string;
    salary: number;
  }) => Promise<void>;
  toggleStaffStatus: (staffId: string) => Promise<void>;
  updateHotelProfileSettings: (patch: Partial<HotelProfile>) => Promise<void>;
  submitMembershipRenewal: (payload: Record<string, any>) => Promise<{ ok: boolean; renewalRequest?: any; error?: string }>;
  markAllNotificationsRead: () => Promise<void>;
}

const EMPTY_STATE: PmsStateSnapshot = {
  hotels: [],
  rooms: [],
  bookings: [],
  checkins: [],
  invoices: [],
  posItems: [],
  posCategories: [],
  posOrders: [],
  posAdvanceBookings: [],
  cleaningLogs: [],
  laundryOrders: [],
  lostAndFound: [],
  inventoryProducts: [],
  inventoryPurchases: [],
  vendors: [],
  otaChannels: [],
  travelAgents: [],
  expenses: [],
  pettyCash: [],
  cashBankAccounts: [],
  vouchers: [],
  ownerPayments: [],
  reimbursements: [],
  dailyClosings: [],
  waterBottles: [],
  staff: [],
  auditLogs: [],
  notifications: [],
};

const PmsContext = createContext<PmsContextValue | undefined>(undefined);

function calcNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(`${checkIn}T00:00:00`);
  const d2 = new Date(`${checkOut}T00:00:00`);
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) && diff > 0 ? diff : 1;
}

export const PmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [state, setState] = useState<PmsStateSnapshot>(EMPTY_STATE);

  const loadStateForSession = useCallback(async (activeSess: AdminSession) => {
    setSyncing(true);
    setSyncError(null);
    const res = await fetchLiveHotelStateApi(activeSess, LIVE_API_BASE_URL);
    setSyncing(false);
    if (res.unauthorized) {
      await logoutHotelAdminApi(activeSess, LIVE_API_BASE_URL);
      setSession(null);
      setState(EMPTY_STATE);
      return;
    }
    if (res.ok && res.data) {
      setState(res.data);
      setLastSyncedAt(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      );
    } else if (res.error) {
      setSyncError(res.error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await getStoredAdminSession();
      if (stored) {
        setSession(stored);
        await loadStateForSession(stored);
      }
      setBootstrapping(false);
    })();
  }, [loadStateForSession]);

  const setAuthenticatedSession = useCallback(
    (sess: AdminSession) => {
      setSession(sess);
      loadStateForSession(sess);
    },
    [loadStateForSession]
  );

  const logout = useCallback(async () => {
    await logoutHotelAdminApi(session, LIVE_API_BASE_URL);
    setSession(null);
    setState(EMPTY_STATE);
  }, [session]);

  const refreshLiveState = useCallback(async () => {
    if (!session) return;
    await loadStateForSession(session);
  }, [session, loadStateForSession]);

  const hotelProfile: HotelProfile | null =
    state.hotels.find((h) => h.id === session?.hotelId) ||
    session?.hotel ||
    (session
      ? {
          id: session.hotelId,
          name: 'DirectStay Property',
        }
      : null);

  const createAdvanceBooking: PmsContextValue['createAdvanceBooking'] = async (input) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const settings = normalizeBillSettings(hotelProfile);
    const selectedRooms =
      input.roomNumbers && input.roomNumbers.length > 0
        ? Array.from(new Set(input.roomNumbers.filter(Boolean)))
        : [input.roomNumber];
    const nights = calcNights(input.checkInDate, input.checkOutDate);
    const todayStr = new Date().toISOString().slice(0, 10);
    const totalRoomsCount = Math.max(1, selectedRooms.length);
    const perRoomDiscount = r2((Math.max(0, Number(input.discount) || 0)) / totalRoomsCount);
    const perRoomAdvance = r2((Math.max(0, Number(input.advanceAmount) || 0)) / totalRoomsCount);
    const selectedServices = Array.isArray(input.bookedServices) ? input.bookedServices : [];

    const createdBookings: Booking[] = selectedRooms.map((rmNo, idx) => {
      const matchedRoom = state.rooms.find((r) => r.number === rmNo);
      const unitRate =
        totalRoomsCount > 1 && matchedRoom?.rate
          ? Number(matchedRoom.rate)
          : Number(input.ratePerNight) || Number(matchedRoom?.rate || 2000);
      const roomGross = r2(unitRate * nights);
      const roomServices = idx === 0 ? selectedServices : [];
      const charges: BillCharge[] = [
        {
          id: `room-${rmNo}`,
          kind: 'room',
          description: 'Room Charges',
          amount: roomGross,
          rate: unitRate,
          nights,
          roomNumber: rmNo,
        },
        ...roomServices.map((srv, sIdx) => ({
          id: `srv-${sIdx}`,
          kind: 'service' as const,
          description: srv.serviceName,
          amount: Number(srv.amount) || 0,
          roomNumber: rmNo,
        })),
      ];
      const previewBill = calculateBill({
        charges,
        payments: perRoomAdvance > 0 ? [{ id: 'adv', amount: perRoomAdvance, method: input.paymentMethod || 'UPI' }] : [],
        discount: perRoomDiscount,
        gstEnabled: Boolean(input.withGst),
        settings,
      });
      const effRate = previewBill.headlineGstRate;
      const gstAmt = previewBill.totalTax;
      const totalPayable = previewBill.grandTotal;
      const due = previewBill.balance;
      const bkgId = `BKG-${Date.now().toString().slice(-6)}${totalRoomsCount > 1 ? `-${idx + 1}` : ''}`;

      return {
        id: bkgId,
        bookedServices: roomServices,
        otherServices: roomServices.map((srv, sIdx) => ({
          id: `ALLOC-BKG-${bkgId}-${sIdx}`,
          serviceType: 'Extra Service',
          description: srv.serviceName,
          amount: Number(srv.amount) || 0,
          dateTime: todayStr,
          roomNumber: rmNo,
        })),
        bookingNo: bkgId,
        hotelId: session.hotelId,
        guestName: input.guestName.trim(),
        customerName: input.guestName.trim(),
        mobile: input.mobile.trim(),
        email: input.email.trim(),
        aadhaarNumber: input.aadhaarNumber.trim(),
        address: input.address.trim(),
        companyName: input.companyName?.trim() || '',
        gstNumber: input.withGst ? input.gstNumber?.trim() || '' : '',
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        nights,
        adults: Math.max(1, Number(input.adults) || 1),
        children: 0,
        roomNumber: rmNo,
        roomNumbers: [rmNo],
        roomType: matchedRoom?.category || 'Deluxe',
        bookingAmount: roomGross,
        roomSubtotal: roomGross,
        discountAmount: perRoomDiscount,
        gstRate: effRate,
        gstAmount: gstAmt,
        isWithoutGst: !input.withGst,
        gstInvoice: Boolean(input.withGst),
        taxRate: effRate,
        taxAmount: gstAmt,
        totalPayable,
        advanceAmount: perRoomAdvance,
        amountPaid: perRoomAdvance,
        dueAmount: due,
        paymentMethod: input.paymentMethod || 'UPI',
        paymentStatus:
          due <= 0 && perRoomAdvance > 0
            ? 'Fully Paid'
            : perRoomAdvance > 0
            ? 'Partially Paid'
            : 'Unpaid',
        bookingSource: input.bookingSource || 'Direct',
        status: 'Confirmed',
        isCheckedIn: false,
        isCompleted: false,
        bookingDate: todayStr,
        notes: totalRoomsCount > 1 ? `Bulk Booking (${selectedRooms.join(', ')})` : '',
      };
    });

    const nextBookings = [...createdBookings, ...state.bookings];
    const nextRooms = state.rooms.map((rm) =>
      selectedRooms.includes(rm.number) && rm.status === 'Available' && input.checkInDate === todayStr
        ? { ...rm, status: 'Reserved' as RoomStatus }
        : rm
    );

    setState((prev) => ({ ...prev, bookings: nextBookings, rooms: nextRooms }));
    setSyncing(true);
    const res = await syncLiveHotelDataApi(session, {
      bookings: nextBookings,
      rooms: nextRooms,
    });
    setSyncing(false);

    // Auto-dispatch #7 Booking Confirmation Email from Mobile App
    const firstCreated = createdBookings[0];
    const guestEmail = String(input.email || firstCreated?.email || '').trim();
    if (res.ok && isValidEmail(guestEmail) && firstCreated) {
      void sendBookingEmailApi(session, {
        hotelName: hotelProfile?.name || 'DirectStay Hotel',
        eventType: 'booking_confirmation',
        bookingId: firstCreated.id,
        guestName: firstCreated.guestName,
        recipientEmail: guestEmail,
        mobile: firstCreated.mobile,
        roomNumber: selectedRooms.join(', '),
        roomType: firstCreated.roomType,
        checkInDate: firstCreated.checkInDate,
        checkOutDate: firstCreated.checkOutDate,
        nights,
        totalAmount: createdBookings.reduce((s, b) => s + Number(b.totalPayable || b.bookingAmount || 0), 0),
        advanceAmount: Number(input.advanceAmount || 0),
        pendingAmount: createdBookings.reduce((s, b) => s + Number(b.dueAmount || 0), 0),
        status: 'Confirmed',
      });
    }
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  };

  const performCheckIn: PmsContextValue['performCheckIn'] = async (input) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const settings = normalizeBillSettings(hotelProfile);
    const nights = calcNights(input.checkInDate, input.checkOutDate);
    const roomGross = r2(input.ratePerNight * nights);
    const selectedServices = Array.isArray(input.bookedServices) ? input.bookedServices : [];
    const disc = Math.max(0, Number(input.discount) || 0);
    const adv = Math.max(0, Number(input.advanceAmount) || 0);
    const existingInv = input.linkedBookingId
      ? state.invoices.find((inv) => inv.bookingId === input.linkedBookingId && !inv.isSeparateInvoice)
      : undefined;
    const linkedBkg = input.linkedBookingId
      ? state.bookings.find((b) => b.id === input.linkedBookingId)
      : undefined;

    const matchedRoom = state.rooms.find((r) => r.number === input.roomNumber);
    const checkInId = input.linkedBookingId || `CHK-${Date.now().toString().slice(-6)}`;
    let grcNumber = String(linkedBkg?.grcNumber || '').trim();
    if (!grcNumber) {
      const alloc = await allocateLiveGrcApi(session, {
        checkinId: checkInId,
        bookingId: input.linkedBookingId,
        prefix: settings.grcPrefix,
      });
      if (alloc.ok && alloc.grcNumber) {
        grcNumber = alloc.grcNumber;
      }
    }

    // Note: earlyCheckInCharge is stored on newCheckin.earlyCheckInCharge (collected directly by folioCollector),
    // so we do NOT duplicate it into extraList.
    const extraList = [];
    if (Number(input.lateCheckOutCharge) > 0) {
      extraList.push({
        id: `EXT-LATE-${Date.now()}`,
        category: 'Late Check-Out',
        description: `Late Check-Out (${input.departureTime || ''})`,
        amount: Number(input.lateCheckOutCharge),
        date: input.checkInDate,
      });
    }
    if (Number(input.extraBedCharge) > 0) {
      extraList.push({
        id: `EXT-BED-${Date.now()}`,
        category: 'Extra Bed',
        description: 'Extra Bed Charge',
        amount: Number(input.extraBedCharge),
        date: input.checkInDate,
      });
    }
    selectedServices.forEach((srv, idx) => {
      if (Number(srv.amount) > 0) {
        extraList.push({
          id: `ALLOC-CHK-${checkInId}-${idx}`,
          category: 'Extra Service',
          description: srv.serviceName,
          amount: Number(srv.amount),
          date: input.checkInDate,
        });
      }
    });

    const previewCharges: BillCharge[] = [
      {
        id: `room-${input.roomNumber}`,
        kind: 'room',
        description: 'Room Charges',
        amount: roomGross,
        rate: input.ratePerNight,
        nights,
        roomNumber: input.roomNumber,
      },
      ...(Number(input.earlyCheckInCharge) > 0
        ? [
            {
              id: `early-${checkInId}`,
              kind: 'early_checkin' as const,
              description: 'Early Check-In Charges',
              amount: Number(input.earlyCheckInCharge),
              roomNumber: input.roomNumber,
            },
          ]
        : []),
      ...(Number(input.lateCheckOutCharge) > 0
        ? [
            {
              id: `late-${checkInId}`,
              kind: 'late_checkout' as const,
              description: 'Late Check-Out Charges',
              amount: Number(input.lateCheckOutCharge),
              roomNumber: input.roomNumber,
            },
          ]
        : []),
      ...(Number(input.extraBedCharge) > 0
        ? [
            {
              id: `xbed-${checkInId}`,
              kind: 'extra_bed' as const,
              description: 'Extra Bed Charges',
              amount: Number(input.extraBedCharge),
              roomNumber: input.roomNumber,
            },
          ]
        : []),
      ...selectedServices.map((srv, idx) => ({
        id: `srv-${idx}`,
        kind: 'service' as const,
        description: srv.serviceName,
        amount: Number(srv.amount) || 0,
        roomNumber: input.roomNumber,
      })),
    ];

    const previewBill = calculateBill({
      charges: previewCharges,
      payments: adv > 0 ? [{ id: 'adv', amount: adv, method: input.paymentMethod || 'Cash' }] : [],
      discount: disc,
      gstEnabled: Boolean(input.withGst),
      settings,
    });
    const effRate = previewBill.headlineGstRate;
    const gstAmt = previewBill.totalTax;
    const totalPayable = previewBill.grandTotal;
    const due = previewBill.balance;

    const newCheckin: GuestCheckIn = {
      id: checkInId,
      hotelId: session.hotelId,
      bookingId: input.linkedBookingId || checkInId,
      grcNumber,
      guestName: input.guestName.trim(),
      mobile: input.mobile.trim(),
      phone: input.mobile.trim(),
      email: input.email?.trim() || '',
      aadhaarNumber: input.aadhaarNumber.trim(),
      idType: input.idType || 'Aadhaar Card',
      idNumber: input.aadhaarNumber.trim(),
      address: input.address.trim(),
      nationality: input.nationality || 'Indian',
      comingFrom: input.comingFrom?.trim() || '',
      goingTo: input.goingTo?.trim() || '',
      purposeOfVisit: input.purposeOfVisit || 'Leisure',
      mealPlan: input.mealPlan || 'EP',
      companyName: input.companyName?.trim() || '',
      gstNumber: input.withGst ? input.gstNumber?.trim() || '' : '',
      roomNumber: input.roomNumber,
      roomType: matchedRoom?.category || 'Deluxe',
      roomRate: input.ratePerNight,
      nights,
      checkInDate: input.checkInDate,
      arrivalTime: input.arrivalTime || '',
      checkOutDate: input.checkOutDate,
      departureTime: input.departureTime || '',
      earlyCheckInCharge: Number(input.earlyCheckInCharge) || 0,
      lateCheckOutCharge: Number(input.lateCheckOutCharge) || 0,
      extraBedCharge: Number(input.extraBedCharge) || 0,
      adults: Math.max(1, Number(input.adults) || 1),
      children: Math.max(0, Number(input.children) || 0),
      discount: disc,
      discountAmount: disc,
      advanceAmount: adv,
      paymentMethod: input.paymentMethod || 'Cash',
      gstRate: effRate,
      gstAmount: gstAmt,
      isWithoutGst: !input.withGst,
      isCFormRequired: Boolean(input.isCFormRequired),
      cFormData: input.isCFormRequired ? input.cFormData : undefined,
      guestSignature: input.guestSignature || '',
      checkedInBy: session.username,
      bookedServices: selectedServices,
      extraCharges: extraList,
      status: 'Active',
    };

    let nextBookings = [...state.bookings];
    if (input.linkedBookingId) {
      nextBookings = nextBookings.map((b) =>
        b.id === input.linkedBookingId
          ? {
              ...b,
              grcNumber: b.grcNumber || grcNumber,
              status: 'Checked In',
              isCheckedIn: true,
              roomNumber: input.roomNumber,
              otherServices: [],
              ...(existingInv
                ? {}
                : {
                    discountAmount: disc,
                    gstRate: effRate,
                    gstAmount: gstAmt,
                    isWithoutGst: !input.withGst,
                    gstInvoice: Boolean(input.withGst),
                    taxRate: effRate,
                    taxAmount: gstAmt,
                    totalPayable,
                    advanceAmount: adv,
                    amountPaid: adv,
                    dueAmount: due,
                  }),
            }
          : b
      );
    } else {
      const walkinBooking: Booking = {
        id: checkInId,
        bookingNo: checkInId,
        grcNumber,
        hotelId: session.hotelId,
        guestName: input.guestName.trim(),
        customerName: input.guestName.trim(),
        mobile: input.mobile.trim(),
        email: input.email?.trim() || '',
        idType: input.idType || 'Aadhaar Card',
        idNumber: input.aadhaarNumber.trim(),
        aadhaarNumber: input.aadhaarNumber.trim(),
        address: input.address.trim(),
        nationality: input.nationality || 'Indian',
        companyName: input.companyName?.trim() || '',
        gstNumber: input.withGst ? input.gstNumber?.trim() || '' : '',
        checkInDate: input.checkInDate,
        arrivalTime: input.arrivalTime || '',
        checkOutDate: input.checkOutDate,
        departureTime: input.departureTime || '',
        nights,
        adults: Math.max(1, Number(input.adults) || 1),
        children: Math.max(0, Number(input.children) || 0),
        roomNumber: input.roomNumber,
        roomNumbers: [input.roomNumber],
        roomType: matchedRoom?.category || 'Deluxe',
        bookingAmount: roomGross,
        roomSubtotal: roomGross,
        discountAmount: disc,
        gstRate: effRate,
        gstAmount: gstAmt,
        isWithoutGst: !input.withGst,
        gstInvoice: Boolean(input.withGst),
        taxRate: effRate,
        taxAmount: gstAmt,
        totalPayable,
        advanceAmount: adv,
        amountPaid: adv,
        dueAmount: due,
        paymentMethod: input.paymentMethod || 'Cash',
        paymentStatus: due <= 0 && adv > 0 ? 'Fully Paid' : adv > 0 ? 'Partially Paid' : 'Unpaid',
        bookingSource: 'Walk-in',
        status: 'Checked In',
        isCheckedIn: true,
        isCompleted: false,
        bookingDate: input.checkInDate,
      };
      nextBookings = [walkinBooking, ...nextBookings];
    }

    const nextCheckins = [newCheckin, ...state.checkins.filter((c) => c.id !== checkInId)];
    const nextRooms = state.rooms.map((rm) =>
      rm.number === input.roomNumber ? { ...rm, status: 'Occupied' as RoomStatus } : rm
    );

    setState((prev) => ({
      ...prev,
      bookings: nextBookings,
      checkins: nextCheckins,
      rooms: nextRooms,
    }));

    setSyncing(true);
    const res = await syncLiveHotelDataApi(session, {
      bookings: nextBookings,
      checkins: nextCheckins,
      rooms: nextRooms,
    });
    setSyncing(false);

    // Auto-dispatch #8 Guest Check-In Welcome & WiFi Email from Mobile App
    const ciEmail = String(input.email || linkedBkg?.email || '').trim();
    if (res.ok && isValidEmail(ciEmail)) {
      void sendCheckInWelcomeEmailApi(session, {
        bookingId: checkInId,
        hotelName: hotelProfile?.name || 'DirectStay Hotel',
        hotelPhone: hotelProfile?.phoneNumber || hotelProfile?.phone || '',
        hotelAddress: hotelProfile?.address || '',
        guestName: input.guestName.trim(),
        roomNumber: input.roomNumber,
        roomType: matchedRoom?.category || 'Deluxe',
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        checkOutTime: String((hotelProfile as any)?.checkOutTime || '11:00 AM'),
        wifiName: String((hotelProfile as any)?.wifiName || ''),
        wifiPassword: String((hotelProfile as any)?.wifiPassword || ''),
        recipientEmail: ciEmail,
      });
    }
    return res.ok ? { ok: true, checkInId, grcNumber } : { ok: false, error: res.error };
  };

  const performCheckout: PmsContextValue['performCheckout'] = async (input) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const bkg = state.bookings.find((b) => b.id === input.bookingOrCheckInId);
    const chk = state.checkins.find(
      (c) =>
        c.id === input.bookingOrCheckInId ||
        c.bookingId === input.bookingOrCheckInId ||
        (bkg && c.bookingId === bkg.id)
    );
    if (!bkg && !chk) return { ok: false, error: 'Stay record not found' };

    const settings = normalizeBillSettings(hotelProfile);
    const targetId = bkg?.id || chk!.bookingId || chk!.id;
    const roomNumber = chk?.roomNumber || bkg?.roomNumber || '';
    const guestName = chk?.guestName || bkg?.guestName || 'Guest';
    const todayStr = new Date().toISOString().slice(0, 10);

    const existingPrimaryInv = state.invoices.find(
      (inv) => inv.bookingId === targetId && !inv.isSeparateInvoice
    );
    const lockedExistingNoGst = existingPrimaryInv
      ? existingPrimaryInv.isWithoutGst === true ||
        (existingPrimaryInv.gstRate !== undefined && Number(existingPrimaryInv.gstRate) <= 0) ||
        (existingPrimaryInv.gstRate === undefined && Number(existingPrimaryInv.gst || 0) <= 0)
      : false;
    const effectiveWithGst = existingPrimaryInv ? !lockedExistingNoGst : Boolean(input.withGst);

    const additionalCharges: BillCharge[] = [];
    if (Number(input.extraChargeAmt) > 0) {
      additionalCharges.push({
        id: `EXT-CO-${Date.now()}`,
        kind: 'other',
        description: input.extraChargeDesc?.trim() || 'Checkout Additional Charges',
        amount: Number(input.extraChargeAmt),
        date: todayStr,
        roomNumber,
      });
    }
    if (Number(input.lateCheckOutCharge) > 0) {
      additionalCharges.push({
        id: `EXT-LATE-CO-${Date.now()}`,
        kind: 'late_checkout',
        description: 'Late Check-Out Charges',
        amount: Number(input.lateCheckOutCharge),
        date: todayStr,
        roomNumber,
      });
    }

    const additionalPayments: BillPayment[] = [];
    if (Number(input.collectedNow) > 0) {
      additionalPayments.push({
        id: `PAY-CO-${Date.now()}`,
        amount: Number(input.collectedNow),
        method: input.paymentMethod || 'UPI',
        date: todayStr,
        note: 'Checkout Settlement',
      });
    }

    const { folio, bill } = buildStayBill({
      booking: bkg,
      checkin: chk,
      posOrders: state.posOrders,
      laundryOrders: state.laundryOrders,
      waterBottles: state.waterBottles,
      rooms: state.rooms,
      settings,
      additionalCharges,
      additionalPayments,
      gstEnabledOverride: effectiveWithGst,
      discountOverride: Number(input.discount) || 0,
    });

    const allocated = existingPrimaryInv?.invoiceNumber
      ? { invoiceNumber: existingPrimaryInv.invoiceNumber, sequence: settings.nextInvoiceSequence }
      : allocateInvoiceNumber(state.invoices, settings);
    const invId = existingPrimaryInv?.id || `INV-${Date.now().toString().slice(-6)}`;

    const localInvoice = buildInvoiceRecord({
      id: invId,
      invoiceNumber: allocated.invoiceNumber,
      hotelId: session.hotelId,
      bookingId: targetId,
      checkInId: chk?.id,
      guestName,
      guestMobile: chk?.mobile || chk?.phone || bkg?.mobile || '',
      guestAddress: chk?.address || bkg?.address || '',
      companyName: chk?.companyName || bkg?.companyName || '',
      guestGstNumber: chk?.gstNumber || bkg?.gstNumber || '',
      roomNumbers: folio.roomNumbers.length ? folio.roomNumbers : [roomNumber],
      checkInDate: folio.checkInDate || bkg?.checkInDate || chk?.checkInDate || todayStr,
      checkOutDate: folio.checkOutDate || bkg?.checkOutDate || chk?.checkOutDate || todayStr,
      nights: folio.nights,
      bill,
      paymentMethod: input.paymentMethod || bkg?.paymentMethod || 'UPI',
      isSeparateInvoice: false,
      invoiceScope: 'Booking + Other Services',
      dateCreated: todayStr,
      invoiceStatus: 'Finalized',
    }) as Invoice;

    const apiGen = await generateLiveInvoiceApi(session, {
      id: localInvoice.id,
      invoiceNumber: localInvoice.invoiceNumber,
      bookingId: targetId,
      checkInId: chk?.id,
      guestName: localInvoice.guestName,
      guestMobile: localInvoice.guestMobile,
      companyName: localInvoice.companyName,
      guestGstNumber: localInvoice.guestGstNumber,
      gstNumber: localInvoice.gstNumber,
      roomNumber: localInvoice.roomNumber,
      checkInDate: localInvoice.checkInDate,
      checkOutDate: localInvoice.checkOutDate,
      nights: localInvoice.nights,
      roomCharges: localInvoice.roomCharges,
      overrideRoomCharges: localInvoice.roomCharges,
      extraBedCharges: localInvoice.extraBedCharges,
      extraPersonCharges: localInvoice.extraPersonCharges,
      earlyCheckInCharges: localInvoice.earlyCheckInCharges,
      lateCheckOutCharges: localInvoice.lateCheckOutCharges,
      foodCharges: localInvoice.foodCharges,
      overrideFoodCharges: localInvoice.foodCharges,
      waterCharges: localInvoice.waterCharges,
      laundryCharges: localInvoice.laundryCharges,
      serviceCharges: localInvoice.serviceCharges,
      fineCharges: localInvoice.fineCharges,
      otherCharges: localInvoice.otherCharges,
      discount: localInvoice.discount,
      overrideDiscount: localInvoice.discount,
      gstRate: localInvoice.gstRate,
      overrideGstRate: localInvoice.gstRate,
      foodGstRate: settings.foodGstRate,
      isWithoutGst: localInvoice.isWithoutGst,
      finalAmount: localInvoice.finalAmount,
      advancePaid: localInvoice.advancePaid,
      overrideAdvancePaid: localInvoice.advancePaid,
      ledgerLines: localInvoice.ledgerLines,
      taxRows: localInvoice.taxRows,
      overridePaymentMethod: localInvoice.paymentMethod,
      overrideInvoiceType: localInvoice.invoiceType,
      createSeparateInvoice: false,
      isSeparateInvoice: false,
    });

    const builtInvoice: Invoice =
      apiGen.ok && apiGen.invoice
        ? {
            ...localInvoice,
            ...apiGen.invoice,
            invoiceStatus: 'Finalized',
            dateCreated: localInvoice.dateCreated,
            guestAddress: localInvoice.guestAddress,
            roomNumbers: localInvoice.roomNumbers,
            ledgerLines: localInvoice.ledgerLines,
            taxRows: apiGen.invoice.taxRows || localInvoice.taxRows,
            amountInWords: apiGen.invoice.amountInWords || localInvoice.amountInWords,
          }
        : localInvoice;

    const effGstRate = bill.headlineGstRate;
    const gstAmt = bill.totalTax;
    const finalAmt = bill.grandTotal;
    const totalPaid = bill.receipts;
    const pending = bill.balance;
    const dirtyRoomList = folio.roomNumbers.length ? folio.roomNumbers : [roomNumber];

    const nextBookings = state.bookings.map((b) =>
      b.id === targetId
        ? {
            ...b,
            status: 'Checked Out',
            isCompleted: true,
            discountAmount: bill.discount,
            gstRate: effGstRate,
            gstAmount: gstAmt,
            isWithoutGst: !bill.isGstInvoice,
            gstInvoice: bill.isGstInvoice,
            taxRate: effGstRate,
            taxAmount: gstAmt,
            totalPayable: finalAmt,
            amountPaid: totalPaid,
            advanceAmount: totalPaid,
            dueAmount: pending,
            paymentMethod: input.paymentMethod || b.paymentMethod || 'UPI',
            paymentStatus: (
              pending <= 0 ? 'Fully Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid'
            ) as Booking['paymentStatus'],
            ...(Array.isArray(b.payments) && additionalPayments.length > 0
              ? {
                  payments: [
                    ...b.payments,
                    ...additionalPayments.map((p) => ({
                      id: p.id,
                      amount: p.amount,
                      paymentMethod: p.method,
                      date: p.date,
                      notes: p.note,
                    })),
                  ],
                }
              : {}),
          }
        : b
    );

    const nextCheckins = state.checkins.map((c) =>
      c.id === chk?.id || c.bookingId === targetId
        ? {
            ...c,
            status: 'Checked Out',
            checkedOutDateTime: new Date().toISOString(),
            discount: bill.discount,
            discountAmount: bill.discount,
            extraCharges: [
              ...(c.extraCharges || []),
              ...additionalCharges.map((ac) => ({
                id: ac.id,
                category: ac.kind === 'late_checkout' ? 'Late Check-Out' : 'Other',
                description: ac.description,
                amount: ac.amount,
                date: ac.date,
              })),
            ],
            payments: [
              ...(c.payments || []),
              ...additionalPayments.map((p) => ({
                id: p.id,
                amount: p.amount,
                paymentMethod: p.method,
                date: p.date,
                notes: p.note,
              })),
            ],
          }
        : c
    );

    const nextRooms = state.rooms.map((rm) =>
      dirtyRoomList.includes(rm.number) ? { ...rm, status: 'Dirty' as RoomStatus } : rm
    );

    const newHkTask: HousekeepingLog = {
      id: `HK-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      roomNumber: dirtyRoomList.join(', '),
      date: todayStr,
      assignedStaff: 'Housekeeping Team',
      cleaningType: 'Checkout Turnaround',
      status: 'Pending',
      notes: `Checkout cleaning after ${guestName}`,
    };

    const newNotif: AppNotificationItem = {
      id: `NTF-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      title: `Room ${dirtyRoomList.join(', ')} Checked Out — Dirty Alert`,
      message: `Housekeeping Alert: Room ${dirtyRoomList.join(', ')} (${guestName}) checked out and is now marked DIRTY for immediate turnaround cleaning.`,
      type: 'housekeeping',
      read: false,
      createdAt: new Date().toISOString(),
    };

    const nextCleaningLogs = [newHkTask, ...state.cleaningLogs];
    const nextNotifications = [newNotif, ...state.notifications];
    const nextInvoices = existingPrimaryInv
      ? state.invoices.map((i) => (i.id === existingPrimaryInv.id ? builtInvoice : i))
      : [builtInvoice, ...state.invoices.filter((i) => i.id !== builtInvoice.id)];

    setState((prev) => ({
      ...prev,
      bookings: nextBookings,
      checkins: nextCheckins,
      rooms: nextRooms,
      cleaningLogs: nextCleaningLogs,
      notifications: nextNotifications,
      invoices: nextInvoices,
    }));

    setSyncing(true);
    const res = await syncLiveHotelDataApi(session, {
      bookings: nextBookings,
      checkins: nextCheckins,
      rooms: nextRooms,
      cleaningLogs: nextCleaningLogs,
      notifications: nextNotifications,
      invoices: nextInvoices,
    });
    setSyncing(false);

    // Auto-dispatch #6 Guest Tax Invoice & #9 Checkout Thank You Emails from Mobile App
    const coEmail = String(chk?.email || bkg?.email || '').trim();
    if (res.ok && isValidEmail(coEmail)) {
      const hName = hotelProfile?.name || 'DirectStay Hotel';
      const hPhone = hotelProfile?.phoneNumber || hotelProfile?.phone || '';
      const hAddr = hotelProfile?.address || '';
      const invNo = String(builtInvoice.invoiceNumber || builtInvoice.id);
      void sendGuestInvoiceEmailApi(session, {
        hotelName: hName,
        hotelGstin: hotelProfile?.gstNumber || '',
        hotelAddress: hAddr,
        hotelPhone: hPhone,
        guestName,
        invoiceNumber: invNo,
        roomNumber: dirtyRoomList.join(', ') || roomNumber,
        checkInDate: String(builtInvoice.checkInDate || chk?.checkInDate || bkg?.checkInDate || todayStr),
        checkOutDate: String(builtInvoice.checkOutDate || todayStr),
        tariffAmount: bill.legacy.roomCharges,
        foodCharges: bill.legacy.foodCharges,
        otherCharges: r2(
          bill.legacy.waterCharges +
            bill.legacy.laundryCharges +
            bill.legacy.serviceCharges +
            bill.legacy.otherCharges +
            bill.legacy.fineCharges
        ),
        discount: bill.discount,
        cgst: bill.cgst,
        sgst: bill.sgst,
        totalAmount: bill.grandTotal,
        amountPaid: bill.receipts,
        balanceDue: bill.balance,
        isWithoutGst: !bill.isGstInvoice,
        paymentMode: String(input.paymentMethod || builtInvoice.paymentMethod || 'UPI'),
        recipientEmail: coEmail,
      });
      void sendCheckoutThankYouEmailApi(session, {
        bookingId: targetId,
        hotelName: hName,
        hotelPhone: hPhone,
        hotelAddress: hAddr,
        guestName,
        roomNumber: dirtyRoomList.join(', ') || roomNumber,
        checkInDate: String(builtInvoice.checkInDate || chk?.checkInDate || bkg?.checkInDate || todayStr),
        checkOutDate: String(builtInvoice.checkOutDate || todayStr),
        invoiceNumber: invNo,
        totalAmount: bill.grandTotal,
        reviewUrl: String((hotelProfile as any)?.googleReviewUrl || ''),
        recipientEmail: coEmail,
      });
    }
    return res.ok ? { ok: true, invoice: builtInvoice } : { ok: false, error: res.error };
  };

  const generateSeparateOrNewInvoice: PmsContextValue['generateSeparateOrNewInvoice'] = async (
    input
  ) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const bkg = state.bookings.find((b) => b.id === input.bookingId);
    const chk = state.checkins.find(
      (c) => c.bookingId === input.bookingId || c.id === input.bookingId
    );
    if (!bkg && !chk) return { ok: false, error: 'Booking not found' };

    const targetId = bkg?.id || chk!.bookingId || chk!.id;
    const settings = normalizeBillSettings(hotelProfile);
    const existingForBooking = state.invoices.filter((inv) => inv.bookingId === targetId);
    const isSeparate = existingForBooking.length > 0;
    const todayStr = new Date().toISOString().slice(0, 10);

    const scopedBkg = !input.includeServices && bkg ? { ...bkg, otherServices: [] } : bkg;
    const scopedChk =
      !input.includeServices && chk
        ? {
            ...chk,
            extraCharges: (chk.extraCharges || []).filter((ec) => {
              const cat = String(ec.category || '').toLowerCase();
              return (
                cat.includes('extra bed') ||
                cat.includes('early check') ||
                cat.includes('late check')
              );
            }),
          }
        : chk;

    const { folio, bill } = buildStayBill({
      booking: scopedBkg,
      checkin: scopedChk,
      posOrders: input.includeServices ? state.posOrders : [],
      laundryOrders: input.includeServices ? state.laundryOrders : [],
      waterBottles: input.includeServices ? state.waterBottles : [],
      rooms: state.rooms,
      settings,
      gstEnabledOverride: Boolean(input.withGst),
    });

    const allocated = allocateInvoiceNumber(state.invoices, settings);
    const newInvId = isSeparate
      ? `INV-SEP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`
      : `INV-${Date.now().toString().slice(-6)}`;
    const primaryRoom = chk?.roomNumber || bkg?.roomNumber || '';

    const localInvoice = buildInvoiceRecord({
      id: newInvId,
      invoiceNumber: allocated.invoiceNumber,
      hotelId: session.hotelId,
      bookingId: targetId,
      checkInId: chk?.id,
      guestName: chk?.guestName || bkg?.guestName || 'Guest',
      guestMobile: chk?.mobile || chk?.phone || bkg?.mobile || '',
      guestAddress: chk?.address || bkg?.address || '',
      companyName: chk?.companyName || bkg?.companyName || '',
      guestGstNumber: chk?.gstNumber || bkg?.gstNumber || '',
      roomNumbers: folio.roomNumbers.length ? folio.roomNumbers : [primaryRoom],
      checkInDate: folio.checkInDate || bkg?.checkInDate || chk?.checkInDate || todayStr,
      checkOutDate: folio.checkOutDate || bkg?.checkOutDate || chk?.checkOutDate || todayStr,
      nights: folio.nights,
      bill,
      paymentMethod: bkg?.paymentMethod || chk?.paymentMethod || 'UPI',
      isSeparateInvoice: isSeparate,
      parentInvoiceId: existingForBooking[0]?.id,
      invoiceScope: input.includeServices ? 'Booking + Other Services' : 'Only Booking',
      dateCreated: todayStr,
      invoiceStatus: 'Generated',
    }) as Invoice;

    const apiGen = await generateLiveInvoiceApi(session, {
      id: localInvoice.id,
      invoiceNumber: localInvoice.invoiceNumber,
      bookingId: targetId,
      checkInId: chk?.id,
      guestName: localInvoice.guestName,
      guestMobile: localInvoice.guestMobile,
      companyName: localInvoice.companyName,
      guestGstNumber: localInvoice.guestGstNumber,
      gstNumber: localInvoice.gstNumber,
      roomNumber: localInvoice.roomNumber,
      checkInDate: localInvoice.checkInDate,
      checkOutDate: localInvoice.checkOutDate,
      nights: localInvoice.nights,
      roomCharges: localInvoice.roomCharges,
      overrideRoomCharges: localInvoice.roomCharges,
      extraBedCharges: localInvoice.extraBedCharges,
      extraPersonCharges: localInvoice.extraPersonCharges,
      earlyCheckInCharges: localInvoice.earlyCheckInCharges,
      lateCheckOutCharges: localInvoice.lateCheckOutCharges,
      foodCharges: localInvoice.foodCharges,
      overrideFoodCharges: localInvoice.foodCharges,
      waterCharges: localInvoice.waterCharges,
      laundryCharges: localInvoice.laundryCharges,
      serviceCharges: localInvoice.serviceCharges,
      fineCharges: localInvoice.fineCharges,
      otherCharges: localInvoice.otherCharges,
      discount: localInvoice.discount,
      overrideDiscount: localInvoice.discount,
      gstRate: localInvoice.gstRate,
      overrideGstRate: localInvoice.gstRate,
      foodGstRate: settings.foodGstRate,
      isWithoutGst: localInvoice.isWithoutGst,
      finalAmount: localInvoice.finalAmount,
      advancePaid: localInvoice.advancePaid,
      overrideAdvancePaid: localInvoice.advancePaid,
      ledgerLines: localInvoice.ledgerLines,
      taxRows: localInvoice.taxRows,
      createSeparateInvoice: isSeparate,
      isSeparateInvoice: isSeparate,
      parentInvoiceId: existingForBooking[0]?.id,
      overridePaymentMethod: localInvoice.paymentMethod,
      overrideInvoiceType: localInvoice.invoiceType,
    });

    const finalInvoice: Invoice =
      apiGen.ok && apiGen.invoice
        ? {
            ...localInvoice,
            ...apiGen.invoice,
            isWithoutGst: localInvoice.isWithoutGst,
            isSeparateInvoice: isSeparate,
            gstRate: localInvoice.gstRate,
            dateCreated: localInvoice.dateCreated,
            guestAddress: localInvoice.guestAddress,
            roomNumbers: localInvoice.roomNumbers,
            invoiceScope: localInvoice.invoiceScope,
            ledgerLines: localInvoice.ledgerLines,
            taxRows: apiGen.invoice.taxRows || localInvoice.taxRows,
            amountInWords: apiGen.invoice.amountInWords || localInvoice.amountInWords,
          }
        : localInvoice;

    const nextInvoices = [
      finalInvoice,
      ...state.invoices.filter((i) => i.id !== finalInvoice.id),
    ];
    setState((prev) => ({ ...prev, invoices: nextInvoices }));
    await syncLiveHotelDataApi(session, { invoices: nextInvoices });
    return { ok: true, invoice: finalInvoice };
  };

  const updateRoomStatusOrRate: PmsContextValue['updateRoomStatusOrRate'] = async (
    roomId,
    status,
    newRate
  ) => {
    if (!session) return;
    const nextRooms = state.rooms.map((r) =>
      r.id === roomId
        ? {
            ...r,
            status,
            rate: newRate !== undefined && newRate > 0 ? newRate : r.rate,
          }
        : r
    );
    setState((prev) => ({ ...prev, rooms: nextRooms }));
    await syncLiveHotelDataApi(session, { rooms: nextRooms });
  };

  const addRoomEntity: PmsContextValue['addRoomEntity'] = async (input) => {
    if (!session) return;
    const newRoom: Room = {
      id: `RM-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      number: input.number.trim(),
      category: input.category.trim() || 'Deluxe',
      floor: input.floor.trim() || '1st Floor',
      bedType: input.bedType.trim() || 'King Bed',
      rate: Number(input.rate) || 2000,
      status: 'Available',
      maxOccupancy: 3,
      amenities: ['AC', 'Wi-Fi', 'TV'],
    };
    const nextRooms = [...state.rooms, newRoom];
    setState((prev) => ({ ...prev, rooms: nextRooms }));
    await syncLiveHotelDataApi(session, { rooms: nextRooms });
  };

  const addBulkRooms: PmsContextValue['addBulkRooms'] = async (roomsToAdd) => {
    if (!session) return { createdCount: 0, skippedDuplicates: [] };
    const existingNums = new Set(
      state.rooms.map((r) => String(r.number || '').trim().toLowerCase())
    );
    const seenBatch = new Set<string>();
    const skippedDuplicates: string[] = [];
    const created: Room[] = [];
    const baseTs = Date.now();

    roomsToAdd.forEach((item, idx) => {
      const cleanNum = String(item.number || '').trim();
      if (!cleanNum) return;
      const key = cleanNum.toLowerCase();
      if (existingNums.has(key) || seenBatch.has(key)) {
        skippedDuplicates.push(cleanNum);
        return;
      }
      seenBatch.add(key);
      created.push({
        id: `RM-${baseTs}-${idx}`,
        hotelId: session.hotelId,
        number: cleanNum,
        category: String(item.category || 'Deluxe').trim() || 'Deluxe',
        floor: String(item.floor || '1st Floor').trim() || '1st Floor',
        bedType: String(item.bedType || 'Queen').trim() || 'Queen',
        rate: Math.max(0, Number(item.rate) || 2000),
        status: 'Available',
        maxOccupancy: 3,
        amenities: ['AC', 'Wi-Fi', 'TV'],
      });
    });

    if (created.length > 0) {
      const nextRooms = [...state.rooms, ...created];
      setState((prev) => ({ ...prev, rooms: nextRooms }));
      await syncLiveHotelDataApi(session, { rooms: nextRooms });
    }
    return { createdCount: created.length, skippedDuplicates };
  };

  const createPosOrder: PmsContextValue['createPosOrder'] = async (input) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    if (input.items.length === 0) return { ok: false, error: 'Cart is empty' };
    const settings = normalizeBillSettings(hotelProfile);
    const subtotal = r2(input.items.reduce((s, i) => s + i.price * i.quantity, 0));
    const taxAmt = r2((subtotal * settings.foodGstRate) / 100);
    const totalAmount = r2(subtotal + taxAmt);
    const rmTrim = (input.roomNumber || '').trim();
    const activeChk = input.postToRoom && rmTrim
      ? state.checkins.find((c) => String(c.roomNumber) === rmTrim && c.status !== 'Checked Out')
      : undefined;
    const activeBkg = input.postToRoom && rmTrim
      ? state.bookings.find(
          (b) =>
            (activeChk && b.id === activeChk.bookingId) ||
            (String(b.roomNumber) === rmTrim &&
              (b.isCheckedIn || b.status === 'Checked In') &&
              !b.isCompleted &&
              b.status !== 'Checked Out')
        )
      : undefined;
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);
    const newOrder: PosOrder = {
      id: `POS-${Date.now().toString().slice(-6)}`,
      orderNumber: `KOT-${Date.now().toString().slice(-5)}`,
      hotelId: session.hotelId,
      bookingId: activeBkg?.id || activeChk?.bookingId || undefined,
      checkInId: activeChk?.id || undefined,
      orderType: input.postToRoom ? 'Room Service' : 'Dine In',
      roomNumber: rmTrim,
      guestName:
        input.guestName || activeChk?.guestName || activeBkg?.guestName || 'Walk-in Diner',
      items: input.items.map((it) => ({
        itemId: it.itemId,
        name: it.name,
        itemName: it.name,
        quantity: it.quantity,
        price: it.price,
        total: r2(it.price * it.quantity),
      })),
      subtotal,
      taxAmount: taxAmt,
      gstAmount: taxAmt,
      totalAmount,
      grandTotal: totalAmount,
      postToRoomBill: input.postToRoom,
      paymentStatus: input.postToRoom ? 'Unpaid' : 'Paid',
      paymentMethod: input.postToRoom ? 'Room Folio' : input.paymentMethod || 'UPI',
      status: 'Completed',
      date: todayStr,
      createdAt: nowIso,
      dateTime: nowIso.slice(0, 16).replace('T', ' '),
    };
    const nextOrders = [newOrder, ...state.posOrders];
    setState((prev) => ({ ...prev, posOrders: nextOrders }));
    const res = await syncLiveHotelDataApi(session, { posOrders: nextOrders });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  };

  const addPosMenuItem: PmsContextValue['addPosMenuItem'] = async (input) => {
    if (!session) return;
    const item: PosItem = {
      id: `ITEM-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      name: input.name.trim(),
      category: input.category.trim() || 'Main Course',
      subcategory: input.subcategory?.trim() || undefined,
      price: Number(input.price) || 150,
      isVeg: true,
      isAvailable: true,
    };
    const nextItems = [...state.posItems, item];
    setState((prev) => ({ ...prev, posItems: nextItems }));
    await syncLiveHotelDataApi(session, { posItems: nextItems });
  };

  const undoCheckout: PmsContextValue['undoCheckout'] = async (invoiceId, reason) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const orig = state.invoices.find((i) => i.id === invoiceId);
    if (!orig) return { ok: false, error: 'Invoice not found.' };
    if (orig.documentType === 'CreditNote' || orig.invoiceType === 'Credit Note') {
      return { ok: false, error: 'Cannot undo a Credit Note.' };
    }
    if (orig.invoiceStatus === 'Superseded' || orig.supersededByCreditNoteId) {
      return { ok: false, error: 'Checkout was already reversed for this invoice.' };
    }

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);
    const nowDate = new Date();
    const fyStart = nowDate.getMonth() >= 3 ? nowDate.getFullYear() : nowDate.getFullYear() - 1;
    const fyLabel = `${fyStart}-${String((fyStart + 1) % 100).padStart(2, '0')}`;
    const existingCnCount = state.invoices.filter(
      (i) => i.documentType === 'CreditNote' || i.invoiceType === 'Credit Note'
    ).length;
    const cnNumber = `CN/${existingCnCount + 1}/${fyLabel}`;
    const cnId = `CN-${Date.now().toString().slice(-6)}`;
    const origTotal = r2(orig.finalAmount ?? orig.totalAmount ?? 0);

    const creditNote: Invoice = {
      ...orig,
      id: cnId,
      invoiceNumber: cnNumber,
      creditNoteNumber: cnNumber,
      documentType: 'CreditNote',
      invoiceType: 'Credit Note',
      originalInvoiceId: orig.id,
      originalInvoiceNumber: orig.invoiceNumber,
      creditNoteReason: reason?.trim() || 'Undo Checkout — Stay reopened to In-House',
      roomCharges: -Math.abs(r2(orig.roomCharges)),
      foodCharges: -Math.abs(r2(orig.foodCharges)),
      waterCharges: -Math.abs(r2(orig.waterCharges)),
      otherCharges: -Math.abs(r2(orig.otherCharges)),
      subtotal: -Math.abs(r2(orig.subtotal)),
      taxableAmount: -Math.abs(r2(orig.taxableAmount ?? orig.subtotal)),
      gst: -Math.abs(r2(orig.gst)),
      cgst: -Math.abs(r2(orig.cgst ?? r2(orig.gst) / 2)),
      sgst: -Math.abs(r2(orig.sgst ?? r2(orig.gst) / 2)),
      taxAmount: -Math.abs(r2(orig.taxAmount ?? orig.gst)),
      finalAmount: -Math.abs(origTotal),
      totalAmount: -Math.abs(origTotal),
      advancePaid: 0,
      paidAmount: 0,
      pendingAmount: 0,
      refundDue: 0,
      isPaid: true,
      paymentStatus: 'Reversed',
      invoiceStatus: 'Finalized',
      dateCreated: todayStr,
      date: todayStr,
    };

    const nextInvoices: Invoice[] = [
      creditNote,
      ...state.invoices.map((inv) =>
        inv.id === orig.id
          ? {
              ...inv,
              invoiceStatus: 'Superseded' as const,
              paymentStatus: 'Settled' as const,
              pendingAmount: 0,
              isPaid: true,
              supersededByCreditNoteId: cnId,
              supersededAt: nowIso,
            }
          : inv
      ),
    ];

    const targetRooms =
      Array.isArray(orig.roomNumbers) && orig.roomNumbers.length > 0
        ? orig.roomNumbers
        : String(orig.roomNumber || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

    const nextBookings = state.bookings.map((b) =>
      b.id === orig.bookingId
        ? { ...b, isCheckedIn: true, isCompleted: false, status: 'Checked-In' }
        : b
    );
    const nextCheckins = state.checkins.map((c) =>
      c.id === orig.checkInId || c.bookingId === orig.bookingId
        ? { ...c, isCheckedOut: false, status: 'Checked-In' }
        : c
    );
    const nextRooms = state.rooms.map((r) =>
      targetRooms.includes(r.number) ? { ...r, status: 'Occupied' as RoomStatus } : r
    );
    const nextAudit = [
      {
        id: `AUD-${Date.now().toString().slice(-6)}`,
        hotelId: session.hotelId,
        action: 'Undo Checkout & Credit Note',
        performedBy: session.username || 'Admin',
        details: `Issued ${cnNumber} reversing ${orig.invoiceNumber}; reopened Room ${targetRooms.join(', ')} to In-House.`,
        dateTime: nowIso,
      },
      ...state.auditLogs,
    ];

    setState((prev) => ({
      ...prev,
      invoices: nextInvoices,
      bookings: nextBookings,
      checkins: nextCheckins,
      rooms: nextRooms,
      auditLogs: nextAudit,
    }));

    const res = await syncLiveHotelDataApi(session, {
      invoices: nextInvoices,
      bookings: nextBookings,
      checkins: nextCheckins,
      rooms: nextRooms,
      auditLogs: nextAudit,
    });
    return res.ok ? { ok: true, creditNote } : { ok: false, error: res.error };
  };

  const submitMembershipRenewal: PmsContextValue['submitMembershipRenewal'] = async (payload) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const res = await submitRenewalRequestApi(session, payload);
    if (res.ok && res.renewalRequest) {
      setState((prev) => ({
        ...prev,
        hotels: prev.hotels.map((h) =>
          h.id === session.hotelId ? { ...h, renewalRequest: res.renewalRequest } : h
        ),
      }));
    }
    return res;
  };

  const markHousekeepingTaskStatus: PmsContextValue['markHousekeepingTaskStatus'] = async (
    logId,
    status,
    roomNumber
  ) => {
    if (!session) return;
    const nextLogs = state.cleaningLogs.map((l) => (l.id === logId ? { ...l, status } : l));
    const nextRooms =
      status === 'Cleaned' || status === 'Inspected'
        ? state.rooms.map((r) =>
            r.number === roomNumber && (r.status === 'Dirty' || r.status === 'Clean')
              ? { ...r, status: 'Available' as RoomStatus }
              : r
          )
        : state.rooms;
    setState((prev) => ({ ...prev, cleaningLogs: nextLogs, rooms: nextRooms }));
    await syncLiveHotelDataApi(session, { cleaningLogs: nextLogs, rooms: nextRooms });
  };

  const addHousekeepingTask: PmsContextValue['addHousekeepingTask'] = async (input) => {
    if (!session) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const task: HousekeepingLog = {
      id: `HK-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      roomNumber: input.roomNumber.trim(),
      date: todayStr,
      assignedStaff: input.assignedStaff.trim() || 'Housekeeping Team',
      cleaningType: input.cleaningType.trim() || 'Deep Cleaning',
      status: 'Pending',
    };
    const nextLogs = [task, ...state.cleaningLogs];
    setState((prev) => ({ ...prev, cleaningLogs: nextLogs }));
    await syncLiveHotelDataApi(session, { cleaningLogs: nextLogs });
  };

  const addLaundryOrder: PmsContextValue['addLaundryOrder'] = async (input) => {
    if (!session) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const rmTrim = input.roomNumber.trim();
    const activeChk = state.checkins.find(
      (c) => String(c.roomNumber) === rmTrim && c.status !== 'Checked Out'
    );
    const activeBkg = state.bookings.find(
      (b) =>
        (activeChk && b.id === activeChk.bookingId) ||
        (String(b.roomNumber) === rmTrim &&
          (b.isCheckedIn || b.status === 'Checked In') &&
          !b.isCompleted &&
          b.status !== 'Checked Out')
    );
    const amt = r2(Number(input.amount) || 0);
    const orderId = `LND-${Date.now().toString().slice(-6)}`;
    const order: LaundryOrder = {
      id: orderId,
      orderNumber: orderId,
      hotelId: session.hotelId,
      bookingId: activeBkg?.id || activeChk?.bookingId || undefined,
      checkInId: activeChk?.id || undefined,
      orderType: 'Guest Laundry',
      roomNumber: rmTrim,
      guestName:
        input.guestName.trim() || activeChk?.guestName || activeBkg?.guestName || 'Room Guest',
      itemsSummary: input.itemsSummary.trim(),
      amount: amt,
      totalAmount: amt,
      paymentStatus: 'Post to Room',
      status: 'In Wash',
      date: todayStr,
    };
    const next = [order, ...state.laundryOrders];
    setState((prev) => ({ ...prev, laundryOrders: next }));
    await syncLiveHotelDataApi(session, { laundryOrders: next });
  };

  const addLostFoundItem: PmsContextValue['addLostFoundItem'] = async (input) => {
    if (!session) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const rec: LostFoundItem = {
      id: `LF-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      itemName: input.itemName.trim(),
      roomNumber: input.roomNumber.trim(),
      foundBy: input.foundBy.trim() || session.username,
      status: 'Stored at Desk',
      date: todayStr,
    };
    const next = [rec, ...state.lostAndFound];
    setState((prev) => ({ ...prev, lostAndFound: next }));
    await syncLiveHotelDataApi(session, { lostAndFound: next });
  };

  const addInventoryProduct: PmsContextValue['addInventoryProduct'] = async (input) => {
    if (!session) return;
    const prod: InventoryProduct = {
      id: `INV-PRD-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      name: input.name.trim(),
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      category: input.category.trim() || 'Amenities',
      unit: input.unit.trim() || 'pcs',
      currentStock: Number(input.currentStock) || 0,
      minStockLevel: Number(input.minStockLevel) || 5,
      unitPrice: Number(input.unitPrice) || 0,
    };
    const next = [prod, ...state.inventoryProducts];
    setState((prev) => ({ ...prev, inventoryProducts: next }));
    await syncLiveHotelDataApi(session, { inventoryProducts: next });
  };

  const adjustInventoryStock: PmsContextValue['adjustInventoryStock'] = async (
    productId,
    delta
  ) => {
    if (!session) return;
    const next = state.inventoryProducts.map((p) =>
      p.id === productId
        ? { ...p, currentStock: Math.max(0, (Number(p.currentStock) || 0) + delta) }
        : p
    );
    setState((prev) => ({ ...prev, inventoryProducts: next }));
    await syncLiveHotelDataApi(session, { inventoryProducts: next });
  };

  const addInventoryPurchase: PmsContextValue['addInventoryPurchase'] = async (input) => {
    if (!session) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const po: InventoryPurchase = {
      id: `PO-${Date.now().toString().slice(-6)}`,
      poNumber: `PO-${Date.now().toString().slice(-4)}`,
      hotelId: session.hotelId,
      supplierName: input.supplierName.trim(),
      itemName: input.itemName.trim(),
      quantity: Number(input.quantity) || 1,
      totalAmount: Number(input.totalAmount) || 0,
      status: 'Received',
      date: todayStr,
    };
    const next = [po, ...state.inventoryPurchases];
    setState((prev) => ({ ...prev, inventoryPurchases: next }));
    await syncLiveHotelDataApi(session, { inventoryPurchases: next });
  };

  const addVendorRecord: PmsContextValue['addVendorRecord'] = async (input) => {
    if (!session) return;
    const v: SupplierRecord = {
      id: `VND-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      category: input.category.trim() || 'General Supplies',
    };
    const next = [v, ...state.vendors];
    setState((prev) => ({ ...prev, vendors: next }));
    await syncLiveHotelDataApi(session, { vendors: next });
  };

  const addTravelAgent: PmsContextValue['addTravelAgent'] = async (input) => {
    if (!session) return;
    const agent: TravelAgent = {
      id: `AGT-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      name: input.name.trim(),
      agencyName: input.agencyName.trim() || input.name.trim(),
      phone: input.phone.trim(),
      commissionRate: Number(input.commissionRate) || 10,
      status: 'Active',
    };
    const next = [agent, ...state.travelAgents];
    setState((prev) => ({ ...prev, travelAgents: next }));
    await syncLiveHotelDataApi(session, { travelAgents: next });
  };

  const upsertOtaChannel: PmsContextValue['upsertOtaChannel'] = async (input) => {
    if (!session) return;
    const ch: OtaChannel = {
      id: `OTA-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      name: input.name.trim(),
      commissionPct: Number(input.commissionPct) || 15,
      status: input.status || 'Connected',
      lastSyncedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    const next = [ch, ...state.otaChannels.filter((c) => c.name !== ch.name)];
    setState((prev) => ({ ...prev, otaChannels: next }));
    await syncLiveHotelDataApi(session, { otaChannels: next });
  };

  const addExpenseEntry: PmsContextValue['addExpenseEntry'] = async (input) => {
    if (!session) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const newExp: Expense = {
      id: `EXP-${Date.now().toString().slice(-6)}`,
      expenseNo: `EXP-${Date.now().toString().slice(-5)}`,
      hotelId: session.hotelId,
      category: input.category,
      department: 'Operations',
      vendorName: input.vendorName,
      date: todayStr,
      description: input.description,
      amount: Number(input.amount) || 0,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'Paid',
      approvalStatus: 'Approved',
    };
    const nextExpenses = [newExp, ...state.expenses];
    setState((prev) => ({ ...prev, expenses: nextExpenses }));
    await syncLiveHotelDataApi(session, { expenses: nextExpenses });
  };

  const addPettyCashEntry: PmsContextValue['addPettyCashEntry'] = async (input) => {
    if (!session) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const entry: PettyCashRecord = {
      id: `PC-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      type: input.type,
      description: input.description.trim(),
      amount: Number(input.amount) || 0,
      date: todayStr,
      handledBy: session.username,
    };
    const next = [entry, ...state.pettyCash];
    setState((prev) => ({ ...prev, pettyCash: next }));
    await syncLiveHotelDataApi(session, { pettyCash: next });
  };

  const addFinanceVoucher: PmsContextValue['addFinanceVoucher'] = async (input) => {
    if (!session) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const v: FinanceVoucher = {
      id: `VCH-${Date.now().toString().slice(-6)}`,
      voucherNo: `VCH-${Date.now().toString().slice(-4)}`,
      hotelId: session.hotelId,
      voucherType: input.voucherType,
      partyName: input.partyName.trim(),
      amount: Number(input.amount) || 0,
      paymentMode: input.paymentMode || 'UPI',
      narration: input.narration.trim(),
      date: todayStr,
    };
    const next = [v, ...state.vouchers];
    setState((prev) => ({ ...prev, vouchers: next }));
    await syncLiveHotelDataApi(session, { vouchers: next });
  };

  const addDailyClosing: PmsContextValue['addDailyClosing'] = async (input) => {
    if (!session) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const dc: DailyClosing = {
      id: `CLS-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      date: todayStr,
      shift: input.shift || 'Day Shift',
      cashCollected: Number(input.cashCollected) || 0,
      upiCollected: Number(input.upiCollected) || 0,
      closedBy: session.username,
      notes: input.notes.trim(),
    };
    const next = [dc, ...state.dailyClosings];
    setState((prev) => ({ ...prev, dailyClosings: next }));
    await syncLiveHotelDataApi(session, { dailyClosings: next });

    // Auto-dispatch #12 Daily Night Audit / Shift Closing Summary to Hotel Owner
    const ownerEmail = String(hotelProfile?.emailAddress || hotelProfile?.email || '').trim();
    if (isValidEmail(ownerEmail)) {
      const occRooms = state.rooms.filter((r) => r.status === 'Occupied').length;
      const totRooms = Math.max(1, state.rooms.length);
      void sendNightAuditSummaryEmailApi(session, {
        hotelName: hotelProfile?.name || 'DirectStay Hotel',
        date: todayStr,
        closedBy: session.username,
        occupancyPct: Math.round((occRooms / totRooms) * 100),
        occupiedRooms: occRooms,
        totalRooms: state.rooms.length,
        openingCash: 0,
        roomCashIn: dc.cashCollected,
        posCashIn: 0,
        cashExpensesOut: 0,
        expectedClosing: dc.cashCollected,
        physicalCounted: dc.cashCollected,
        discrepancy: 0,
        upiCollected: dc.upiCollected,
        status: `${dc.shift} Closed`,
        recipientEmail: ownerEmail,
      });
    }
  };

  const addWaterBottleLog: PmsContextValue['addWaterBottleLog'] = async (input) => {
    if (!session) return;
    const settings = normalizeBillSettings(hotelProfile);
    const rmTrim = input.roomNumber.trim();
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);

    const activeChk = input.checkInId
      ? state.checkins.find((c) => c.id === input.checkInId)
      : state.checkins.find((c) => String(c.roomNumber) === rmTrim && c.status !== 'Checked Out');
    const activeBkg = input.bookingId
      ? state.bookings.find((b) => b.id === input.bookingId)
      : state.bookings.find(
          (b) =>
            (activeChk && b.id === activeChk.bookingId) ||
            (String(b.roomNumber) === rmTrim &&
              (b.isCheckedIn || b.status === 'Checked In') &&
              !b.isCompleted &&
              b.status !== 'Checked Out')
        );

    const freeCount = Math.max(0, Math.floor(Number(input.complimentaryQty) || 0));
    const hasExplicitTotal = input.totalBottles !== undefined && input.totalBottles !== null;
    const totalBottles = hasExplicitTotal
      ? Math.max(0, Math.floor(Number(input.totalBottles) || 0))
      : freeCount + Math.max(0, Math.floor(Number(input.chargeableQty) || 0));
    // Total Bottles − Free Complimentary Bottles = Chargeable Bottles × Rate
    const chargeableCount = hasExplicitTotal
      ? Math.max(0, totalBottles - freeCount)
      : Math.max(0, Math.floor(Number(input.chargeableQty) || 0));
    const rate =
      input.ratePerBottle !== undefined && Number(input.ratePerBottle) >= 0
        ? Number(input.ratePerBottle)
        : settings.waterBottleRate || 20;
    const totalCharge = r2(chargeableCount * rate);

    const wb: WaterBottleLog = {
      id: `WB-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      recordType: 'water',
      bookingId: activeBkg?.id || activeChk?.bookingId || undefined,
      checkInId: activeChk?.id || undefined,
      roomNumber: rmTrim,
      guestName:
        input.guestName?.trim() || activeChk?.guestName || activeBkg?.guestName || 'Guest',
      quantity: chargeableCount,
      totalBottles,
      complimentaryQty: freeCount,
      complimentaryCount: freeCount,
      chargeableQty: chargeableCount,
      extraChargeableCount: chargeableCount,
      unitPrice: rate,
      ratePerBottle: rate,
      totalAmount: totalCharge,
      chargeAmount: totalCharge,
      totalCharge,
      amount: totalCharge,
      isChargeable: chargeableCount > 0,
      date: todayStr,
      dateTime: nowIso,
      createdAt: nowIso,
      suppliedBy: session.username,
      loggedBy: session.username,
      staffName: session.username,
      notes: input.notes?.trim() || '',
    };
    const next = [wb, ...state.waterBottles];
    setState((prev) => ({ ...prev, waterBottles: next }));
    await syncLiveHotelDataApi(session, { waterBottles: next });
  };

  const addExtraServiceCatalogItem: PmsContextValue['addExtraServiceCatalogItem'] = async (
    serviceName,
    amount
  ) => {
    if (!session || !serviceName.trim()) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const cleanAmt = Math.max(0, Number(amount) || 0);
    const item: WaterBottleLog = {
      id: `SRV-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      recordType: 'service_catalog',
      serviceName: serviceName.trim(),
      configuredAmount: cleanAmt,
      chargeAmount: cleanAmt,
      isChargeable: cleanAmt > 0,
      roomNumber: 'CATALOG',
      complimentaryQty: 0,
      chargeableQty: 0,
      amount: cleanAmt,
      date: todayStr,
    };
    const next = [item, ...state.waterBottles];
    setState((prev) => ({ ...prev, waterBottles: next }));
    await syncLiveHotelDataApi(session, { waterBottles: next });
  };

  const addStaffMember: PmsContextValue['addStaffMember'] = async (input) => {
    if (!session) return;
    const st: StaffMember = {
      id: `STF-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      name: input.name.trim(),
      mobile: input.mobile.trim(),
      email: input.email?.trim() || '',
      department: input.department.trim() || 'Reception',
      designation: input.designation.trim() || 'Receptionist',
      role: input.department.trim() || 'Reception',
      username: input.username.trim(),
      password: input.password.trim(),
      plainPassword: input.password.trim(),
      salary: Number(input.salary) || 15000,
      shift: 'Morning',
      status: 'Active',
    };
    const next = [st, ...state.staff];
    setState((prev) => ({ ...prev, staff: next }));
    await syncLiveHotelDataApi(session, { staff: next });

    // Auto-dispatch #10 New Staff Login Credentials Email from Mobile App
    if (st.email && isValidEmail(st.email)) {
      void sendStaffCredentialsEmailApi(session, {
        hotelName: hotelProfile?.name || 'DirectStay Hotel',
        staffName: st.name,
        role: st.designation,
        department: st.department,
        shift: st.shift,
        loginUrl: 'https://directstay.online/admin',
        username: st.username,
        password: input.password.trim(),
        recipientEmail: st.email,
      });
    }
  };

  const toggleStaffStatus: PmsContextValue['toggleStaffStatus'] = async (staffId) => {
    if (!session) return;
    const next = state.staff.map((s) =>
      s.id === staffId ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s
    );
    setState((prev) => ({ ...prev, staff: next }));
    await syncLiveHotelDataApi(session, { staff: next });
  };

  const updateHotelProfileSettings: PmsContextValue['updateHotelProfileSettings'] = async (
    patch
  ) => {
    if (!session) return;
    const exists = state.hotels.some((h) => h.id === session.hotelId);
    const nextHotels = exists
      ? state.hotels.map((h) => (h.id === session.hotelId ? { ...h, ...patch } : h))
      : [{ ...(hotelProfile || { id: session.hotelId, name: 'DirectStay Property' }), ...patch }, ...state.hotels];
    setState((prev) => ({ ...prev, hotels: nextHotels }));
    await syncLiveHotelDataApi(session, { hotels: nextHotels });
  };

  const markAllNotificationsRead: PmsContextValue['markAllNotificationsRead'] = async () => {
    if (!session) return;
    const next = state.notifications.map((n) => ({ ...n, read: true }));
    setState((prev) => ({ ...prev, notifications: next }));
    await syncLiveHotelDataApi(session, { notifications: next });
  };

  return (
    <PmsContext.Provider
      value={{
        session,
        bootstrapping,
        syncing,
        lastSyncedAt,
        syncError,
        hotelProfile,
        state,
        setAuthenticatedSession,
        logout,
        refreshLiveState,
        createAdvanceBooking,
        performCheckIn,
        performCheckout,
        generateSeparateOrNewInvoice,
        undoCheckout,
        updateRoomStatusOrRate,
        addRoomEntity,
        addBulkRooms,
        createPosOrder,
        addPosMenuItem,
        markHousekeepingTaskStatus,
        addHousekeepingTask,
        addLaundryOrder,
        addLostFoundItem,
        addInventoryProduct,
        adjustInventoryStock,
        addInventoryPurchase,
        addVendorRecord,
        addTravelAgent,
        upsertOtaChannel,
        addExpenseEntry,
        addPettyCashEntry,
        addFinanceVoucher,
        addDailyClosing,
        addWaterBottleLog,
        addExtraServiceCatalogItem,
        addStaffMember,
        toggleStaffStatus,
        updateHotelProfileSettings,
        submitMembershipRenewal,
        markAllNotificationsRead,
      }}
    >
      {children}
    </PmsContext.Provider>
  );
};

export function usePms(): PmsContextValue {
  const ctx = useContext(PmsContext);
  if (!ctx) throw new Error('usePms must be used within PmsProvider');
  return ctx;
}
