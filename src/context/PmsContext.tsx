import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdminSession,
  Booking,
  Expense,
  GuestCheckIn,
  HotelProfile,
  HousekeepingLog,
  Invoice,
  PmsStateSnapshot,
  PosOrder,
  Room,
  RoomStatus,
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
  }) => Promise<{ ok: boolean; error?: string }>;
  performCheckIn: (input: {
    linkedBookingId?: string;
    guestName: string;
    mobile: string;
    aadhaarNumber: string;
    address: string;
    companyName?: string;
    gstNumber?: string;
    roomNumber: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    ratePerNight: number;
    discount: number;
    withGst: boolean;
    gstRate: number;
    advanceAmount: number;
    paymentMethod: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  performCheckout: (input: {
    bookingOrCheckInId: string;
    extraChargeDesc?: string;
    extraChargeAmt?: number;
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
  createPosOrder: (input: {
    roomNumber?: string;
    guestName?: string;
    items: Array<{ itemId: string; name: string; quantity: number; price: number }>;
    postToRoom: boolean;
    paymentMethod: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  markHousekeepingTaskStatus: (logId: string, status: string, roomNumber: string) => Promise<void>;
  addExpenseEntry: (input: {
    category: string;
    vendorName: string;
    description: string;
    amount: number;
    paymentMethod: string;
  }) => Promise<void>;
}

const EMPTY_STATE: PmsStateSnapshot = {
  hotels: [],
  rooms: [],
  bookings: [],
  checkins: [],
  invoices: [],
  posItems: [],
  posOrders: [],
  cleaningLogs: [],
  expenses: [],
  staff: [],
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

  // 1. Advance Booking (supports With GST & No GST 0%)
  const createAdvanceBooking: PmsContextValue['createAdvanceBooking'] = async (input) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const nights = calcNights(input.checkInDate, input.checkOutDate);
    const roomSub = Math.round(input.ratePerNight * nights * 100) / 100;
    const disc = Math.max(0, Number(input.discount) || 0);
    const taxable = Math.max(0, roomSub - disc);
    const effRate = input.withGst ? (Number(input.gstRate) > 0 ? Number(input.gstRate) : 5) : 0;
    const gstAmt = effRate > 0 ? Math.round(((taxable * effRate) / 100) * 100) / 100 : 0;
    const totalPayable = Math.round((taxable + gstAmt) * 100) / 100;
    const adv = Math.max(0, Number(input.advanceAmount) || 0);
    const due = Math.max(0, Math.round((totalPayable - adv) * 100) / 100);
    const matchedRoom = state.rooms.find((r) => r.number === input.roomNumber);
    const todayStr = new Date().toISOString().slice(0, 10);
    const bkgId = `BKG-${Date.now().toString().slice(-6)}`;

    const newBooking: Booking = {
      id: bkgId,
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
      paymentMethod: input.paymentMethod || 'UPI',
      paymentStatus: due <= 0 && adv > 0 ? 'Fully Paid' : adv > 0 ? 'Partially Paid' : 'Unpaid',
      bookingSource: input.bookingSource || 'Direct',
      status: 'Confirmed',
      isCheckedIn: false,
      isCompleted: false,
      bookingDate: todayStr,
    };

    const nextBookings = [newBooking, ...state.bookings];
    const nextRooms = state.rooms.map((rm) =>
      rm.number === input.roomNumber && rm.status === 'Available' && input.checkInDate === todayStr
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
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  };

  // 2. Walk-In or Advance Booking Check-In (supports With GST & No GST 0%)
  const performCheckIn: PmsContextValue['performCheckIn'] = async (input) => {
    if (!session) return { ok: false, error: 'Not authenticated' };
    const nights = calcNights(input.checkInDate, input.checkOutDate);
    const roomSub = Math.round(input.ratePerNight * nights * 100) / 100;
    const disc = Math.max(0, Number(input.discount) || 0);
    const taxable = Math.max(0, roomSub - disc);

    // Check if an invoice already exists for linkedBookingId -> if so, lock GST mode on existing invoice!
    const existingInv = input.linkedBookingId
      ? state.invoices.find((inv) => inv.bookingId === input.linkedBookingId && !inv.isSeparateInvoice)
      : undefined;

    const effRate = input.withGst ? (Number(input.gstRate) > 0 ? Number(input.gstRate) : 5) : 0;
    const gstAmt = effRate > 0 ? Math.round(((taxable * effRate) / 100) * 100) / 100 : 0;
    const totalPayable = Math.round((taxable + gstAmt) * 100) / 100;
    const adv = Math.max(0, Number(input.advanceAmount) || 0);
    const due = Math.max(0, Math.round((totalPayable - adv) * 100) / 100);
    const matchedRoom = state.rooms.find((r) => r.number === input.roomNumber);
    const checkInId = input.linkedBookingId || `CHK-${Date.now().toString().slice(-6)}`;

    const newCheckin: GuestCheckIn = {
      id: checkInId,
      hotelId: session.hotelId,
      bookingId: input.linkedBookingId || checkInId,
      guestName: input.guestName.trim(),
      mobile: input.mobile.trim(),
      phone: input.mobile.trim(),
      aadhaarNumber: input.aadhaarNumber.trim(),
      idType: 'Aadhaar Card',
      idNumber: input.aadhaarNumber.trim(),
      address: input.address.trim(),
      nationality: 'Indian',
      companyName: input.companyName?.trim() || '',
      gstNumber: effRate > 0 ? input.gstNumber?.trim() || '' : '',
      roomNumber: input.roomNumber,
      roomType: matchedRoom?.category || 'Deluxe',
      roomRate: input.ratePerNight,
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      adults: Math.max(1, Number(input.adults) || 1),
      children: 0,
      advanceAmount: adv,
      gstRate: effRate,
      gstAmount: gstAmt,
      isWithoutGst: effRate <= 0,
      extraCharges: [],
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

    const nextCheckins = [
      newCheckin,
      ...state.checkins.filter((c) => c.id !== checkInId),
    ];
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
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true };
  };

  // 3. Checkout Clearance & Official Invoice Generation (preserves locked GST if invoice already exists!)
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
    const addedExtra = Math.max(0, Number(input.extraChargeAmt) || 0);
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
    const invId = existingPrimaryInv?.id || `INV-${Date.now().toString().slice(-6)}`;
    const invNumber =
      existingPrimaryInv?.invoiceNumber || `INV-${todayStr.replace(/-/g, '')}-${seqNo}`;

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

    const nextCleaningLogs = [newHkTask, ...state.cleaningLogs];
    const nextInvoices = existingPrimaryInv
      ? state.invoices.map((i) => (i.id === existingPrimaryInv.id ? builtInvoice : i))
      : [builtInvoice, ...state.invoices];

    setState((prev) => ({
      ...prev,
      bookings: nextBookings,
      checkins: nextCheckins,
      rooms: nextRooms,
      cleaningLogs: nextCleaningLogs,
      invoices: nextInvoices,
    }));

    setSyncing(true);
    const res = await syncLiveHotelDataApi(session, {
      bookings: nextBookings,
      checkins: nextCheckins,
      rooms: nextRooms,
      cleaningLogs: nextCleaningLogs,
      invoices: nextInvoices,
    });
    setSyncing(false);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, invoice: builtInvoice };
  };

  // 4. Separate Invoice Generator (NEVER edits GST on an existing invoice — creates a brand-new invoice!)
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

    // Try server /api/invoices/generate first so Node/PHP sequential numbering & validation run
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

    const finalInvoice: Invoice = apiGen.ok && apiGen.invoice
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

  const markHousekeepingTaskStatus: PmsContextValue['markHousekeepingTaskStatus'] = async (
    logId,
    status,
    roomNumber
  ) => {
    if (!session) return;
    const nextLogs = state.cleaningLogs.map((l) =>
      l.id === logId ? { ...l, status } : l
    );
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
        createPosOrder,
        markHousekeepingTaskStatus,
        addExpenseEntry,
      }}
    >
      {children}
    </PmsContext.Provider>
  );
};

export function usePms(): PmsContextValue {
  const ctx = useContext(PmsContext);
  if (!ctx) throw new Error('usePms must be used inside PmsProvider');
  return ctx;
}
