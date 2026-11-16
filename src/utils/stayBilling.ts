/**
 * DirectStay — High-level billing API used by EVERY screen (Web /admin hub, legacy screens, Mobile).
 * buildStayBill()     => one call: collect folio + calculate bill
 * buildInvoiceRecord()=> legacy `Invoice` shaped object (saved to DB) from a BillResult
 * toInvoicePrintData()/toGrcPrintData() => data for the PDF-replica print templates
 */
import {
  BillCharge,
  BillPayment,
  BillResult,
  BillSettings,
  calculateBill,
  formatDateLabel,
  formatGrcNumber,
  formatInvoiceNumber,
  nextInvoiceSequence,
  normalizeBillSettings,
} from './billCalculator';
import { collectStayCharges, CollectStayInput, CollectStayResult } from './folioCollector';
import { GrcPrintData, InvoicePrintData, PrintHotel } from './printTemplates';

type AnyRec = Record<string, any>;

export interface StayBill {
  folio: CollectStayResult;
  bill: BillResult;
  settings: BillSettings;
}

export function buildStayBill(input: Omit<CollectStayInput, 'settings'> & { settings?: BillSettings; hotelSettings?: AnyRec | null; taxSettings?: AnyRec | null }): StayBill {
  const settings = input.settings || normalizeBillSettings(input.taxSettings, input.hotelSettings);
  const folio = collectStayCharges({ ...input, settings });
  const bill = calculateBill({
    charges: folio.charges,
    payments: folio.payments,
    discount: folio.discount,
    gstEnabled: folio.gstEnabled,
    settings,
  });
  return { folio, bill, settings };
}

/** Allocates the next invoice number for a hotel: PREFIX/1014/2025-26 (never duplicates). */
export function allocateInvoiceNumber(existingInvoices: AnyRec[], settings: BillSettings, date = new Date()): { invoiceNumber: string; sequence: number } {
  const seq = nextInvoiceSequence(
    (existingInvoices || []).map((i) => i?.invoiceNumber),
    settings.nextInvoiceSequence
  );
  return { invoiceNumber: formatInvoiceNumber(settings.invoicePrefix, seq, date), sequence: seq };
}

export function allocateGrcNumber(existingGrcNumbers: Array<string | undefined>, settings: BillSettings, date = new Date()): string {
  const seq = nextInvoiceSequence(existingGrcNumbers, settings.nextGrcSequence);
  return formatGrcNumber(settings.grcPrefix, seq, date);
}

/** Converts a BillResult into the persisted legacy `Invoice` record shape (all fields consistent). */
export function buildInvoiceRecord(params: {
  id: string;
  invoiceNumber: string;
  hotelId?: string;
  bookingId: string;
  checkInId?: string;
  guestName: string;
  guestMobile?: string;
  guestAddress?: string;
  companyName?: string;
  guestGstNumber?: string;
  roomNumbers: string[];
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  bill: BillResult;
  paymentMethod?: string;
  isSeparateInvoice?: boolean;
  parentInvoiceId?: string;
  invoiceScope?: 'Only Booking' | 'Booking + Other Services';
  dateCreated?: string;
  invoiceStatus?: string;
  extra?: AnyRec;
}): AnyRec {
  const b = params.bill;
  const today = params.dateCreated || new Date().toISOString().slice(0, 10);
  return {
    id: params.id,
    invoiceNumber: params.invoiceNumber,
    hotelId: params.hotelId,
    bookingId: params.bookingId,
    checkInId: params.checkInId,
    guestName: params.guestName,
    guestMobile: params.guestMobile || '',
    mobile: params.guestMobile || '',
    guestAddress: params.guestAddress || '',
    companyName: params.companyName || '',
    guestGstNumber: b.isGstInvoice ? params.guestGstNumber || '' : '',
    gstNumber: b.isGstInvoice ? params.guestGstNumber || '' : '',
    roomNumber: params.roomNumbers.join(', '),
    roomNumbers: params.roomNumbers,
    checkInDate: params.checkInDate,
    checkOutDate: params.checkOutDate,
    nights: params.nights,
    roomCharges: b.legacy.roomCharges,
    extraBedCharges: b.legacy.extraBedCharges,
    extraPersonCharges: b.legacy.extraPersonCharges,
    earlyCheckInCharges: b.legacy.earlyCheckInCharges,
    lateCheckOutCharges: b.legacy.lateCheckOutCharges,
    foodCharges: b.legacy.foodCharges,
    waterCharges: b.legacy.waterCharges,
    laundryCharges: b.legacy.laundryCharges,
    serviceCharges: b.legacy.serviceCharges,
    otherCharges: b.legacy.otherCharges + b.legacy.fineCharges,
    fineCharges: b.legacy.fineCharges,
    extraChargesTotal: 0,
    subtotal: b.subtotal,
    discount: b.discount,
    taxableAmount: b.taxableAmount,
    gstRate: b.headlineGstRate,
    gst: b.totalTax,
    cgst: b.cgst,
    sgst: b.sgst,
    taxAmount: b.totalTax,
    taxRows: b.taxRows,
    isWithoutGst: !b.isGstInvoice,
    invoiceType: b.isGstInvoice ? 'Tax Invoice' : 'Bill of Supply',
    finalAmount: b.grandTotal,
    totalAmount: b.grandTotal,
    advancePaid: b.receipts,
    paidAmount: b.receipts,
    pendingAmount: b.balance,
    refundDue: b.refundDue,
    isPaid: b.paymentStatus === 'Paid',
    paymentStatus: b.paymentStatus,
    invoiceStatus: params.invoiceStatus || 'Finalized',
    paymentMethod: params.paymentMethod || 'Cash',
    isSeparateInvoice: Boolean(params.isSeparateInvoice),
    parentInvoiceId: params.parentInvoiceId,
    invoiceScope: params.invoiceScope || 'Booking + Other Services',
    ledgerLines: b.lines,
    amountInWords: b.amountInWords,
    billEngine: 'v2',
    dateCreated: today,
    date: today,
    ...(params.extra || {}),
  };
}

export function hotelToPrintHotel(h: AnyRec | null | undefined): PrintHotel {
  const x = h || {};
  return {
    name: String(x.name || x.hotelName || 'Hotel'),
    address: String(x.address || x.hotelAddress || ''),
    phone: String(x.phoneNumber || x.phone || x.hotelPhone || ''),
    email: String(x.emailAddress || x.email || x.hotelEmail || ''),
    website: String(x.website && typeof x.website === 'string' ? x.website : ''),
    gstNumber: String(x.gstNumber || x.gstin || x.hotelGst || ''),
    panNumber: String(x.panNumber || ''),
    logoUrl: String(x.logoUrl || ''),
  };
}

const fmtDateTime = (date?: string, time?: string): string => {
  const d = formatDateLabel(date);
  const t = String(time || '').replace(/^\d{4}-\d{2}-\d{2},?\s*/, '').trim();
  return [d, t].filter(Boolean).join(' ');
};

export function toInvoicePrintData(params: {
  hotel: AnyRec | null | undefined;
  invoiceNumber: string;
  invoiceDate?: string;
  booking?: AnyRec | null;
  checkin?: AnyRec | null;
  folio: CollectStayResult;
  bill: BillResult;
  roomType?: string;
}): InvoicePrintData {
  const b = params.booking || {};
  const c = params.checkin || {};
  const addr = [c.address || b.address, [c.city, c.state].filter(Boolean).join(', '), c.pincode].filter(Boolean).join('\n');
  const roomType = params.roomType || c.roomType || b.roomType || b.requirements?.[0]?.categoryName || '';
  const pax =
    (Number(c.adults || b.adults || 0) + Number(c.children || b.children || 0)) ||
    Number(b.numGuests || 0) ||
    1;
  return {
    hotel: hotelToPrintHotel(params.hotel),
    invoiceNumber: params.invoiceNumber,
    invoiceDate: formatDateLabel(params.invoiceDate || new Date().toISOString().slice(0, 10)),
    reservationNo: String(b.bookingNo || b.id || c.bookingId || c.id || ''),
    guestName: String(c.guestName || b.guestName || b.customerName || 'Guest'),
    guestMobile: String(c.mobile || c.phone || b.mobile || ''),
    guestAddress: addr,
    placeOfSupply: String(c.state || b.state || (params.hotel as AnyRec)?.state || ''),
    companyName: String(c.companyName || b.companyName || ''),
    companyGstin: String(c.gstNumber || b.companyGst || b.gstNumber || ''),
    roomLabel: `${params.folio.roomNumbers.join(', ')}${roomType ? ` (${roomType})` : ''}`,
    pax,
    checkIn: fmtDateTime(params.folio.checkInDate, c.checkInTime || c.arrivalTime || b.checkInTime),
    checkOut: fmtDateTime(params.folio.checkOutDate, c.checkedOutDateTime ? new Date(c.checkedOutDateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : c.checkOutTime || b.checkOutTime),
    nights: params.folio.nights,
    bill: params.bill,
  };
}

const ddmmyyyy = (raw?: string): string => {
  const s = String(raw || '').slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
};

export function toGrcPrintData(params: {
  hotel: AnyRec | null | undefined;
  regNo: string;
  booking?: AnyRec | null;
  checkin?: AnyRec | null;
  roomRate?: number;
  roomType?: string;
  settings: BillSettings;
  terms?: string[];
}): GrcPrintData {
  const b = params.booking || {};
  const c = params.checkin || {};
  const h = params.hotel || {};
  const guests: AnyRec[] = Array.isArray(b.guests) ? b.guests : [];
  const primary = guests[0] || {};
  const time = (t?: string) => String(t || '').replace(/^\d{4}-\d{2}-\d{2},?\s*/, '').trim();
  return {
    hotel: hotelToPrintHotel(h),
    regNo: params.regNo,
    date: ddmmyyyy(c.checkInDate || b.checkInDate || new Date().toISOString().slice(0, 10)),
    guestName: String(c.guestName || b.customerName || b.guestName || ''),
    address: String(c.address || b.address || ''),
    city: String(c.city || b.city || ''),
    state: String(c.state || b.state || ''),
    nationality: String(c.nationality || b.nationality || 'India'),
    mobile: String(c.mobile || c.phone || b.mobile || ''),
    adults: c.adults ?? b.adults ?? 1,
    children: c.children ?? b.children ?? '',
    arrival: [ddmmyyyy(c.checkInDate || b.checkInDate), time(c.arrivalTime || c.checkInTime || b.checkInTime)].filter(Boolean).join(', '),
    departure: [ddmmyyyy(c.checkOutDate || b.checkOutDate), time(c.departureTime || c.checkOutTime || b.checkOutTime)].filter(Boolean).join(', '),
    roomNo: String(c.roomNumber || (Array.isArray(b.roomNumbers) ? b.roomNumbers.join(', ') : b.roomNumber) || ''),
    roomType: String(params.roomType || c.roomType || b.roomType || b.requirements?.[0]?.categoryName || ''),
    roomCharge: params.roomRate ?? c.roomRate ?? b.requirements?.[0]?.unitPrice ?? '',
    planName: String(c.mealPlan || b.requirements?.[0]?.planName || 'EP'),
    taxMode: params.settings.roomRateIncludesGst ? 'Include' : 'Exclude',
    bookingNo: String(b.bookingNo || c.bookingId || ''),
    company: String(c.companyName || b.companyName || 'Walk-in'),
    voucherNo: String(c.voucherNumber || b.voucherNumber || b.sourceBookingId || ''),
    guestIdType: String(c.idType || primary.documentType || b.idType || ''),
    guestIdNumber: String(c.idNumber || c.aadhaarNumber || c.passportNumber || primary.documentNumber || b.idNumber || ''),
    checkInTime: String(h.checkInTime || '12pm noon'),
    checkOutTime: String(h.checkOutTime || '11am'),
    terms: params.terms,
  };
}

export type { BillCharge, BillPayment, BillResult, BillSettings };
