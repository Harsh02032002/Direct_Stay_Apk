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
  fetchLiveHotelStateApi,
  generateLiveInvoiceApi,
  getStoredAdminSession,
  LIVE_API_BASE_URL,
  logoutHotelAdminApi,
  syncLiveHotelDataApi,
} from '../api/directStayApi';

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
    gstRate: number;
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
    gstRate: number;
    advanceAmount: number;
    paymentMethod: string;
    isCFormRequired?: boolean;
    cFormData?: GuestCheckIn['cFormData'];
    guestSignature?: string;
    bookedServices?: BookedServiceSelection[];
  }) => Promise<{ ok: boolean; error?: string }>;
  performCheckout: (input: {
    bookingOrCheckInId: string;
    extraChargeDesc?: string;
    extraChargeAmt?: number;
    lateCheckOutCharge?: number;
    discount: number;
    withGst: boolean;
    gstRate: number;
    collectedNow: number;
    paymentMethod: string;
  }) => Promise<{ ok: boolean; invoice?: Invoice; error?: string }>;
  generateSeparateOrNewInvoice: (input: {
    bookingId: string;
    withGst: boolean;
    gstRate: number;
    includeServices: boolean;
  }) => Promise<{ ok: boolean; invoice?: Invoice; error?: string }>;
  updateRoomStatusOrRate: (roomId: string, status: RoomStatus, newRate?: number) => Promise<void>;
  addRoomEntity: (input: {
    number: string;
    category: string;
    floor: string;
    bedType: string;
    rate: number;
  }) => Promise<void>;
  createPosOrder: (input: {
    roomNumber?: string;
    guestName?: string;
    items: Array<{ itemId: string; name: string; quantity: number; price: number }>;
    postToRoom: boolean;
    paymentMethod: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  addPosMenuItem: (input: { name: string; category: string; price: number }) => Promise<void>;
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
    complimentaryQty: number;
    chargeableQty: number;
  }) => Promise<void>;
  addExtraServiceCatalogItem: (serviceName: string, amount: number) => Promise<void>;
  addStaffMember: (input: {
    name: string;
    mobile: string;
    department: string;
    designation: string;
    username: string;
    password: string;
    salary: number;
  }) => Promise<void>;
  toggleStaffStatus: (staffId: string) => Promise<void>;
  updateHotelProfileSettings: (patch: Partial<HotelProfile>) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const EMPTY_STATE: PmsStateSnapshot = {
  hotels: [],
  rooms: [],
  bookings: [],
  checkins: [],
  invoices: [],
  posItems: [],
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
    const selectedRooms =
      input.roomNumbers && input.roomNumbers.length > 0
        ? Array.from(new Set(input.roomNumbers.filter(Boolean)))
        : [input.roomNumber];
    const nights = calcNights(input.checkInDate, input.checkOutDate);
    const defaultGst = Number(hotelProfile?.defaultGstRate) > 0 ? Number(hotelProfile?.defaultGstRate) : 5;
    const effRate = input.withGst ? (Number(input.gstRate) > 0 ? Number(input.gstRate) : defaultGst) : 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    const totalRoomsCount = Math.max(1, selectedRooms.length);
    const perRoomDiscount = Math.round(((Math.max(0, Number(input.discount) || 0)) / totalRoomsCount) * 100) / 100;
    const perRoomAdvance = Math.round(((Math.max(0, Number(input.advanceAmount) || 0)) / totalRoomsCount) * 100) / 100;
    const selectedServices = Array.isArray(input.bookedServices) ? input.bookedServices : [];
    const totalServicesSum = selectedServices.reduce((s, item) => s + (Number(item.amount) || 0), 0);

    const createdBookings: Booking[] = selectedRooms.map((rmNo, idx) => {
      const matchedRoom = state.rooms.find((r) => r.number === rmNo);
      const unitRate =
        totalRoomsCount > 1 && matchedRoom?.rate
          ? Number(matchedRoom.rate)
          : Number(input.ratePerNight) || Number(matchedRoom?.rate || 2000);
      const roomSub = Math.round(unitRate * nights * 100) / 100;
      const roomServicesShare = idx === 0 ? totalServicesSum : 0;
      const taxable = Math.max(0, roomSub + roomServicesShare - perRoomDiscount);
      const gstAmt = effRate > 0 ? Math.round(((taxable * effRate) / 100) * 100) / 100 : 0;
      const totalPayable = Math.round((taxable + gstAmt) * 100) / 100;
      const due = Math.max(0, Math.round((totalPayable - perRoomAdvance) * 100) / 100);
      const bkgId = `BKG-${Date.now().toString().slice(-6)}${totalRoomsCount > 1 ? `-${idx + 1}` : ''}`;

      return {
        id: bkgId,
        bookedServices: idx === 0 ? selectedServices : [],
        bookingNo: bkgId,
        hotelId: session.hotelId,
        guestName: input.guestName.trim(),
        customerName: input.guestName.trim(),
        mobile: input.mobile.trim(),
        email: input.email.trim(),
        aadhaarNumber: input.aadhaarNumber.trim(),
        address: input.address.trim(),
        companyName: input.companyName?.trim() || '',
        gstNumber: effRate > 0 ? input.gstNumber?.trim() || '' : '',
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        nights,
        adults: Math.max(1, Number(input.adults) || 1),
        children: 0,
        roomNumber: rmNo,
        roomType: matchedRoom?.category || 'Deluxe',
        bookingAmount: roomSub,
        roomSubtotal: roomSub,
        discountAmount: perRoomDiscount,
        gstRate: effRate,
        gstAmount: gstAmt,
        isWithoutGst: effRate <= 0,
        gstInvoice: effRate > 0,
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
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  };

  const performCheckIn: PmsContextValue['performCheckIn'] = async (input) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const nights = calcNights(input.checkInDate, input.checkOutDate);
    const roomSub = Math.round(input.ratePerNight * nights * 100) / 100;
    const selectedServices = Array.isArray(input.bookedServices) ? input.bookedServices : [];
    const servicesSum = selectedServices.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    const earlyLateSub =
      Math.max(0, Number(input.earlyCheckInCharge) || 0) +
      Math.max(0, Number(input.lateCheckOutCharge) || 0) +
      Math.max(0, Number(input.extraBedCharge) || 0) +
      servicesSum;
    const disc = Math.max(0, Number(input.discount) || 0);
    const taxable = Math.max(0, roomSub + earlyLateSub - disc);
    const existingInv = input.linkedBookingId
      ? state.invoices.find((inv) => inv.bookingId === input.linkedBookingId && !inv.isSeparateInvoice)
      : undefined;

    const defaultGst = Number(hotelProfile?.defaultGstRate) > 0 ? Number(hotelProfile?.defaultGstRate) : 5;
    const effRate = input.withGst ? (Number(input.gstRate) > 0 ? Number(input.gstRate) : defaultGst) : 0;
    const gstAmt = effRate > 0 ? Math.round(((taxable * effRate) / 100) * 100) / 100 : 0;
    const totalPayable = Math.round((taxable + gstAmt) * 100) / 100;
    const adv = Math.max(0, Number(input.advanceAmount) || 0);
    const due = Math.max(0, Math.round((totalPayable - adv) * 100) / 100);
    const matchedRoom = state.rooms.find((r) => r.number === input.roomNumber);
    const checkInId = input.linkedBookingId || `CHK-${Date.now().toString().slice(-6)}`;

    const extraList = [];
    if (Number(input.earlyCheckInCharge) > 0) {
      extraList.push({
        id: `EXT-EARLY-${Date.now()}`,
        category: 'Early Check-In',
        description: `Early Check-In (${input.arrivalTime || ''})`,
        amount: Number(input.earlyCheckInCharge),
      });
    }
    if (Number(input.lateCheckOutCharge) > 0) {
      extraList.push({
        id: `EXT-LATE-${Date.now()}`,
        category: 'Late Check-Out',
        description: `Late Check-Out (${input.departureTime || ''})`,
        amount: Number(input.lateCheckOutCharge),
      });
    }
    if (Number(input.extraBedCharge) > 0) {
      extraList.push({
        id: `EXT-BED-${Date.now()}`,
        category: 'Extra Bed',
        description: 'Extra Bed Charge',
        amount: Number(input.extraBedCharge),
      });
    }
    selectedServices.forEach((srv, idx) => {
      if (Number(srv.amount) > 0) {
        extraList.push({
          id: `ALLOC-CHK-${Date.now()}-${idx}`,
          category: 'Extra Service',
          description: srv.serviceName,
          amount: Number(srv.amount),
        });
      }
    });

    const newCheckin: GuestCheckIn = {
      id: checkInId,
      hotelId: session.hotelId,
      bookingId: input.linkedBookingId || checkInId,
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
      gstNumber: effRate > 0 ? input.gstNumber?.trim() || '' : '',
      roomNumber: input.roomNumber,
      roomType: matchedRoom?.category || 'Deluxe',
      roomRate: input.ratePerNight,
      checkInDate: input.checkInDate,
      arrivalTime: input.arrivalTime || '',
      checkOutDate: input.checkOutDate,
      departureTime: input.departureTime || '',
      earlyCheckInCharge: Number(input.earlyCheckInCharge) || 0,
      lateCheckOutCharge: Number(input.lateCheckOutCharge) || 0,
      extraBedCharge: Number(input.extraBedCharge) || 0,
      adults: Math.max(1, Number(input.adults) || 1),
      children: Math.max(0, Number(input.children) || 0),
      advanceAmount: adv,
      gstRate: effRate,
      gstAmount: gstAmt,
      isWithoutGst: effRate <= 0,
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
              status: 'Checked In',
              isCheckedIn: true,
              roomNumber: input.roomNumber,
              ...(existingInv
                ? {}
                : {
                    gstRate: effRate,
                    gstAmount: gstAmt,
                    isWithoutGst: effRate <= 0,
                    gstInvoice: effRate > 0,
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
        hotelId: session.hotelId,
        guestName: input.guestName.trim(),
        customerName: input.guestName.trim(),
        mobile: input.mobile.trim(),
        email: '',
        aadhaarNumber: input.aadhaarNumber.trim(),
        address: input.address.trim(),
        companyName: input.companyName?.trim() || '',
        gstNumber: effRate > 0 ? input.gstNumber?.trim() || '' : '',
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
        nights,
        adults: Math.max(1, Number(input.adults) || 1),
        children: 0,
        roomNumber: input.roomNumber,
        roomType: matchedRoom?.category || 'Deluxe',
        bookingAmount: roomSub,
        roomSubtotal: roomSub,
        discountAmount: disc,
        gstRate: effRate,
        gstAmount: gstAmt,
        isWithoutGst: effRate <= 0,
        gstInvoice: effRate > 0,
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
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  };

  const performCheckout: PmsContextValue['performCheckout'] = async (input) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const bkg = state.bookings.find((b) => b.id === input.bookingOrCheckInId);
    const chk = state.checkins.find(
      (c) => c.id === input.bookingOrCheckInId || c.bookingId === input.bookingOrCheckInId
    );
    if (!bkg && !chk) return { ok: false, error: 'Stay record not found' };

    const targetId = bkg?.id || chk!.id;
    const roomNumber = bkg?.roomNumber || chk!.roomNumber;
    const guestName = bkg?.guestName || chk!.guestName;
    const checkInDate = bkg?.checkInDate || chk!.checkInDate;
    const checkOutDate = bkg?.checkOutDate || chk!.checkOutDate;
    const nights = calcNights(checkInDate, checkOutDate);
    const roomCharges =
      Number(bkg?.roomSubtotal ?? bkg?.bookingAmount) || Number(chk?.roomRate || 0) * nights;

    const existingPosTotal = state.posOrders
      .filter((o) => o.roomNumber === roomNumber && o.paymentStatus !== 'Paid')
      .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    const checkInExtraTotal = (chk?.extraCharges || []).reduce(
      (s, e) => s + (Number(e.amount) || 0),
      0
    );
    const addedExtra =
      Math.max(0, Number(input.extraChargeAmt) || 0) +
      Math.max(0, Number(input.lateCheckOutCharge) || 0) +
      checkInExtraTotal;
    const foodAndExtra = existingPosTotal + addedExtra;
    const disc = Math.max(0, Number(input.discount) || 0);
    const taxable = Math.max(0, roomCharges + foodAndExtra - disc);

    const existingPrimaryInv = state.invoices.find(
      (inv) => inv.bookingId === targetId && !inv.isSeparateInvoice
    );
    const lockedExistingNoGst = existingPrimaryInv
      ? existingPrimaryInv.isWithoutGst === true ||
        (existingPrimaryInv.gstRate !== undefined && Number(existingPrimaryInv.gstRate) <= 0) ||
        (existingPrimaryInv.gstRate === undefined && Number(existingPrimaryInv.gst || 0) <= 0)
      : false;

    const effGstRate = existingPrimaryInv
      ? lockedExistingNoGst
        ? 0
        : Number(existingPrimaryInv.gstRate) || 5
      : input.withGst
      ? Number(input.gstRate) > 0
        ? Number(input.gstRate)
        : 5
      : 0;

    const gstAmt = effGstRate > 0 ? Math.round(((taxable * effGstRate) / 100) * 100) / 100 : 0;
    const cgst = Math.round((gstAmt / 2) * 100) / 100;
    const sgst = Math.round((gstAmt - cgst) * 100) / 100;
    const finalAmt = Math.round((taxable + gstAmt) * 100) / 100;
    const priorPaid = Number(bkg?.amountPaid ?? bkg?.advanceAmount ?? chk?.advanceAmount ?? 0);
    const totalPaid = Math.round((priorPaid + (Number(input.collectedNow) || 0)) * 100) / 100;
    const pending = Math.max(0, Math.round((finalAmt - totalPaid) * 100) / 100);
    const todayStr = new Date().toISOString().slice(0, 10);
    const seqNo = String(state.invoices.length + 1).padStart(4, '0');
    const invPrefix = (hotelProfile?.invoicePrefix || 'INV').trim();
    const invId = existingPrimaryInv?.id || `${invPrefix}-${Date.now().toString().slice(-6)}`;
    const invNumber =
      existingPrimaryInv?.invoiceNumber || `${invPrefix}-${todayStr.replace(/-/g, '')}-${seqNo}`;

    const builtInvoice: Invoice = {
      id: invId,
      invoiceNumber: invNumber,
      hotelId: session.hotelId,
      bookingId: targetId,
      checkInId: chk?.id,
      guestName,
      guestMobile: bkg?.mobile || chk?.mobile || '',
      mobile: bkg?.mobile || chk?.mobile || '',
      companyName: bkg?.companyName || chk?.companyName || '',
      guestGstNumber: effGstRate > 0 ? bkg?.gstNumber || chk?.gstNumber || '' : '',
      gstNumber: effGstRate > 0 ? bkg?.gstNumber || chk?.gstNumber || '' : '',
      roomNumber,
      checkInDate,
      checkOutDate,
      roomCharges,
      foodCharges: existingPosTotal,
      waterCharges: 0,
      otherCharges: addedExtra,
      subtotal: roomCharges + foodAndExtra,
      discount: disc,
      gstRate: effGstRate,
      gst: gstAmt,
      cgst,
      sgst,
      isWithoutGst: effGstRate <= 0,
      isSeparateInvoice: false,
      invoiceType: effGstRate > 0 ? 'Tax Invoice' : 'Bill of Supply',
      finalAmount: finalAmt,
      advancePaid: totalPaid,
      pendingAmount: pending,
      isPaid: pending <= 0,
      paymentStatus: pending <= 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid',
      invoiceStatus: 'Finalized',
      paymentMethod: input.paymentMethod || 'UPI',
      dateCreated: todayStr,
      date: todayStr,
    };

    const nextBookings = state.bookings.map((b) =>
      b.id === targetId
        ? {
            ...b,
            status: 'Checked Out',
            isCompleted: true,
            gstRate: effGstRate,
            gstAmount: gstAmt,
            isWithoutGst: effGstRate <= 0,
            gstInvoice: effGstRate > 0,
            taxRate: effGstRate,
            taxAmount: gstAmt,
            totalPayable: finalAmt,
            amountPaid: totalPaid,
            advanceAmount: totalPaid,
            dueAmount: pending,
            paymentStatus: (pending <= 0 ? 'Fully Paid' : 'Partially Paid') as Booking['paymentStatus'],
          }
        : b
    );

    const nextCheckins = state.checkins.map((c) =>
      c.id === chk?.id || c.bookingId === targetId
        ? { ...c, status: 'Checked Out', checkedOutDateTime: new Date().toISOString() }
        : c
    );

    const nextRooms = state.rooms.map((rm) =>
      rm.number === roomNumber ? { ...rm, status: 'Dirty' as RoomStatus } : rm
    );

    const newHkTask: HousekeepingLog = {
      id: `HK-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      roomNumber,
      date: todayStr,
      assignedStaff: 'Housekeeping Team',
      cleaningType: 'Checkout Turnaround',
      status: 'Pending',
      notes: `Checkout cleaning after ${guestName}`,
    };

    const newNotif: AppNotificationItem = {
      id: `NTF-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      title: `Room ${roomNumber} Checked Out — Dirty Alert`,
      message: `Housekeeping Alert: Room ${roomNumber} (${guestName}) checked out and is now marked DIRTY for immediate turnaround cleaning.`,
      type: 'housekeeping',
      read: false,
      createdAt: new Date().toISOString(),
    };

    const nextCleaningLogs = [newHkTask, ...state.cleaningLogs];
    const nextNotifications = [newNotif, ...state.notifications];
    const nextInvoices = existingPrimaryInv
      ? state.invoices.map((i) => (i.id === existingPrimaryInv.id ? builtInvoice : i))
      : [builtInvoice, ...state.invoices];

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
    return res.ok ? { ok: true, invoice: builtInvoice } : { ok: false, error: res.error };
  };

  const generateSeparateOrNewInvoice: PmsContextValue['generateSeparateOrNewInvoice'] = async (
    input
  ) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const bkg = state.bookings.find((b) => b.id === input.bookingId);
    if (!bkg) return { ok: false, error: 'Booking not found' };

    const existingForBooking = state.invoices.filter((inv) => inv.bookingId === bkg.id);
    const isSeparate = existingForBooking.length > 0;
    const todayStr = new Date().toISOString().slice(0, 10);
    const seqNo = String(state.invoices.length + 1).padStart(4, '0');
    const newInvId = isSeparate
      ? `INV-SEP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`
      : `INV-${Date.now().toString().slice(-6)}`;
    const newInvNumber = `INV-${todayStr.replace(/-/g, '')}-${seqNo}`;

    const roomCharges =
      Number(bkg.roomSubtotal ?? bkg.bookingAmount) ||
      calcNights(bkg.checkInDate, bkg.checkOutDate) * 2000;
    const posCharges = input.includeServices
      ? state.posOrders
          .filter((o) => o.roomNumber === bkg.roomNumber && o.paymentStatus !== 'Paid')
          .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0)
      : 0;
    const disc = Number(bkg.discountAmount) || 0;
    const taxable = Math.max(0, roomCharges + posCharges - disc);
    const effRate = input.withGst ? (Number(input.gstRate) > 0 ? Number(input.gstRate) : 5) : 0;
    const gstAmt = effRate > 0 ? Math.round(((taxable * effRate) / 100) * 100) / 100 : 0;
    const cgst = Math.round((gstAmt / 2) * 100) / 100;
    const sgst = Math.round((gstAmt - cgst) * 100) / 100;
    const finalAmt = Math.round((taxable + gstAmt) * 100) / 100;
    const paid = Number(bkg.amountPaid ?? bkg.advanceAmount ?? 0);
    const pending = Math.max(0, Math.round((finalAmt - paid) * 100) / 100);

    const apiGen = await generateLiveInvoiceApi(session, {
      id: newInvId,
      invoiceNumber: newInvNumber,
      bookingId: bkg.id,
      guestName: bkg.guestName,
      roomNumber: bkg.roomNumber,
      checkInDate: bkg.checkInDate,
      checkOutDate: bkg.checkOutDate,
      overrideRoomCharges: roomCharges,
      roomCharges,
      overrideFoodCharges: posCharges,
      foodCharges: posCharges,
      overrideDiscount: disc,
      discount: disc,
      overrideGstRate: effRate,
      gstRate: effRate,
      isWithoutGst: effRate <= 0,
      createSeparateInvoice: isSeparate,
      isSeparateInvoice: isSeparate,
      parentInvoiceId: existingForBooking[0]?.id,
      overrideAdvancePaid: paid,
      advancePaid: paid,
      overridePaymentMethod: bkg.paymentMethod || 'UPI',
      overrideInvoiceType: effRate > 0 ? 'Tax Invoice' : 'Bill of Supply',
    });

    const finalInvoice: Invoice =
      apiGen.ok && apiGen.invoice
        ? {
            ...apiGen.invoice,
            isWithoutGst: effRate <= 0,
            isSeparateInvoice: isSeparate,
            gstRate: effRate,
          }
        : {
            id: newInvId,
            invoiceNumber: newInvNumber,
            hotelId: session.hotelId,
            bookingId: bkg.id,
            guestName: bkg.guestName,
            guestMobile: bkg.mobile,
            mobile: bkg.mobile,
            companyName: bkg.companyName,
            guestGstNumber: effRate > 0 ? bkg.gstNumber : '',
            gstNumber: effRate > 0 ? bkg.gstNumber : '',
            roomNumber: bkg.roomNumber,
            checkInDate: bkg.checkInDate,
            checkOutDate: bkg.checkOutDate,
            roomCharges,
            foodCharges: posCharges,
            waterCharges: 0,
            otherCharges: 0,
            subtotal: roomCharges + posCharges,
            discount: disc,
            gstRate: effRate,
            gst: gstAmt,
            cgst,
            sgst,
            isWithoutGst: effRate <= 0,
            isSeparateInvoice: isSeparate,
            parentInvoiceId: existingForBooking[0]?.id,
            invoiceType: effRate > 0 ? 'Tax Invoice' : 'Bill of Supply',
            finalAmount: finalAmt,
            advancePaid: paid,
            pendingAmount: pending,
            isPaid: pending <= 0,
            paymentStatus: pending <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Unpaid',
            invoiceStatus: 'Generated',
            paymentMethod: bkg.paymentMethod || 'UPI',
            dateCreated: todayStr,
            date: todayStr,
          };

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

  const createPosOrder: PmsContextValue['createPosOrder'] = async (input) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    if (input.items.length === 0) return { ok: false, error: 'Cart is empty' };
    const subtotal = input.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const taxAmt = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmt) * 100) / 100;
    const newOrder: PosOrder = {
      id: `POS-${Date.now().toString().slice(-6)}`,
      orderNumber: `KOT-${Date.now().toString().slice(-5)}`,
      hotelId: session.hotelId,
      orderType: input.postToRoom ? 'Room Service' : 'Dine In',
      roomNumber: input.roomNumber || '',
      guestName: input.guestName || 'Walk-in Diner',
      items: input.items.map((it) => ({
        itemId: it.itemId,
        name: it.name,
        itemName: it.name,
        quantity: it.quantity,
        price: it.price,
        total: it.price * it.quantity,
      })),
      subtotal,
      taxAmount: taxAmt,
      totalAmount,
      paymentStatus: input.postToRoom ? 'Unpaid' : 'Paid',
      paymentMethod: input.postToRoom ? 'Room Folio' : input.paymentMethod || 'UPI',
      status: 'Completed',
      dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
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
      price: Number(input.price) || 150,
      isVeg: true,
      isAvailable: true,
    };
    const nextItems = [...state.posItems, item];
    setState((prev) => ({ ...prev, posItems: nextItems }));
    await syncLiveHotelDataApi(session, { posItems: nextItems });
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
    const order: LaundryOrder = {
      id: `LND-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      roomNumber: input.roomNumber.trim(),
      guestName: input.guestName.trim() || 'Room Guest',
      itemsSummary: input.itemsSummary.trim(),
      amount: Number(input.amount) || 0,
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
  };

  const addWaterBottleLog: PmsContextValue['addWaterBottleLog'] = async (input) => {
    if (!session) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const wb: WaterBottleLog = {
      id: `WB-${Date.now().toString().slice(-6)}`,
      hotelId: session.hotelId,
      roomNumber: input.roomNumber.trim(),
      complimentaryQty: Number(input.complimentaryQty) || 0,
      chargeableQty: Number(input.chargeableQty) || 0,
      amount: (Number(input.chargeableQty) || 0) * 20,
      date: todayStr,
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
        updateRoomStatusOrRate,
        addRoomEntity,
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
