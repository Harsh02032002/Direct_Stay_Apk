export type RoomStatus =
  | 'Available'
  | 'Occupied'
  | 'Reserved'
  | 'Dirty'
  | 'Clean'
  | 'Inspection'
  | 'Out of Service'
  | 'Blocked';

export interface Room {
  id: string;
  hotelId?: string;
  number: string;
  category: string;
  floor?: string;
  rate: number;
  status: RoomStatus;
  maxOccupancy?: number;
}

export interface Booking {
  id: string;
  hotelId?: string;
  bookingNo?: string;
  guestName: string;
  customerName?: string;
  mobile: string;
  email: string;
  aadhaarNumber: string;
  address: string;
  companyName?: string;
  gstNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adults: number;
  children: number;
  roomNumber: string;
  roomType: string;
  bookingAmount?: number;
  roomSubtotal?: number;
  discountAmount?: number;
  gstRate?: number;
  gstAmount?: number;
  isWithoutGst?: boolean;
  gstInvoice?: boolean;
  taxRate?: number;
  taxAmount?: number;
  totalPayable?: number;
  advanceAmount: number;
  amountPaid?: number;
  dueAmount?: number;
  paymentMethod: string;
  paymentStatus?: 'Unpaid' | 'Partially Paid' | 'Fully Paid' | 'Refunded';
  bookingSource: string;
  status: string;
  isCheckedIn?: boolean;
  isCompleted?: boolean;
  bookingDate?: string;
  notes?: string;
}

export interface ExtraCharge {
  id: string;
  category: string;
  description: string;
  amount: number;
  dateTime?: string;
}

export interface GuestCheckIn {
  id: string;
  hotelId?: string;
  bookingId?: string;
  guestName: string;
  mobile?: string;
  phone?: string;
  email?: string;
  address?: string;
  nationality?: string;
  idType?: string;
  idNumber?: string;
  aadhaarNumber?: string;
  companyName?: string;
  gstNumber?: string;
  roomNumber: string;
  roomType?: string;
  roomRate: number;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  advanceAmount?: number;
  gstRate?: number;
  gstAmount?: number;
  isWithoutGst?: boolean;
  extraCharges?: ExtraCharge[];
  status?: string;
  checkedOutDateTime?: string;
}

export interface Invoice {
  id: string;
  hotelId?: string;
  invoiceNumber: string;
  bookingId: string;
  checkInId?: string;
  guestName: string;
  guestMobile?: string;
  mobile?: string;
  companyName?: string;
  guestGstNumber?: string;
  gstNumber?: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  roomCharges: number;
  foodCharges: number;
  waterCharges: number;
  otherCharges: number;
  laundryCharges?: number;
  subtotal: number;
  discount: number;
  gstRate?: number;
  gst: number;
  cgst?: number;
  sgst?: number;
  isWithoutGst?: boolean;
  isSeparateInvoice?: boolean;
  parentInvoiceId?: string;
  invoiceType?: 'Booking Invoice' | 'Stay Checkout Invoice' | 'Proforma Invoice' | 'Tax Invoice' | 'Bill of Supply';
  finalAmount: number;
  advancePaid?: number;
  pendingAmount?: number;
  isPaid: boolean;
  paymentStatus?: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Cancelled' | 'Refunded';
  invoiceStatus?: 'Draft' | 'Generated' | 'Finalized' | 'Cancelled';
  paymentMethod?: string;
  dateCreated: string;
  date?: string;
}

export interface PosItem {
  id: string;
  hotelId?: string;
  name: string;
  category: string;
  price: number;
  isVeg?: boolean;
  isAvailable?: boolean;
}

export interface PosOrder {
  id: string;
  hotelId?: string;
  orderNumber?: string;
  orderType: string;
  roomNumber?: string;
  guestName?: string;
  items: Array<{
    itemId: string;
    name?: string;
    itemName?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  paymentStatus: 'Paid' | 'Unpaid' | string;
  paymentMethod?: string;
  status: string;
  dateTime?: string;
}

export interface HousekeepingLog {
  id: string;
  hotelId?: string;
  roomNumber: string;
  date: string;
  assignedStaff: string;
  cleaningType?: string;
  status: 'Pending' | 'In Progress' | 'Assigned' | 'Cleaned' | 'Inspected' | string;
  notes?: string;
}

export interface Expense {
  id: string;
  hotelId?: string;
  expenseNo?: string;
  category: string;
  department?: string;
  vendorName?: string;
  date: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  approvalStatus?: string;
}

export interface StaffMember {
  id: string;
  hotelId?: string;
  name: string;
  mobile: string;
  department: string;
  designation: string;
  role?: string;
  allowedModules?: string[];
  username: string;
  status: string;
}

export interface HotelProfile {
  id: string;
  name: string;
  address?: string;
  phoneNumber?: string;
  phone?: string;
  emailAddress?: string;
  email?: string;
  gstNumber?: string;
  status?: string;
  subscriptionStatus?: string;
  subscriptionEndDate?: string;
}

export interface AdminSession {
  token: string;
  role: string;
  rawRole: string;
  hotelId: string;
  username: string;
  hotel?: HotelProfile | null;
  staff?: StaffMember | null;
}

export interface PmsStateSnapshot {
  hotels: HotelProfile[];
  rooms: Room[];
  bookings: Booking[];
  checkins: GuestCheckIn[];
  invoices: Invoice[];
  posItems: PosItem[];
  posOrders: PosOrder[];
  cleaningLogs: HousekeepingLog[];
  expenses: Expense[];
  staff: StaffMember[];
}
