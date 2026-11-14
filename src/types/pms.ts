export type AdminModuleId =
  | 'dashboard'
  | 'frontDesk'
  | 'invoice'
  | 'rooms'
  | 'housekeeping'
  | 'staff'
  | 'userList'
  | 'pos'
  | 'inventory'
  | 'otaManager'
  | 'finance'
  | 'reports'
  | 'auditLogs'
  | 'notifications'
  | 'profile';

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
  bedType?: string;
  rate: number;
  status: RoomStatus;
  cleaningStatus?: string;
  maxOccupancy?: number;
  extraPersonCharge?: number;
  amenities?: string[];
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

export interface CFormDetails {
  passportNumber?: string;
  passportCountry?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  visaNumber?: string;
  visaType?: string;
  visaExpiryDate?: string;
  arrivalDateInIndia?: string;
  portOfArrival?: string;
  nextDestination?: string;
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
  comingFrom?: string;
  goingTo?: string;
  purposeOfVisit?: string;
  mealPlan?: string;
  idType?: string;
  idNumber?: string;
  aadhaarNumber?: string;
  companyName?: string;
  gstNumber?: string;
  roomNumber: string;
  roomType?: string;
  roomRate: number;
  checkInDate: string;
  arrivalTime?: string;
  checkOutDate: string;
  departureTime?: string;
  earlyCheckInCharge?: number;
  lateCheckOutCharge?: number;
  extraBedCharge?: number;
  adults?: number;
  children?: number;
  advanceAmount?: number;
  gstRate?: number;
  gstAmount?: number;
  isWithoutGst?: boolean;
  isCFormRequired?: boolean;
  cFormData?: CFormDetails;
  guestSignature?: string;
  checkedInBy?: string;
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
  invoiceType?:
    | 'Booking Invoice'
    | 'Stay Checkout Invoice'
    | 'Proforma Invoice'
    | 'Tax Invoice'
    | 'Bill of Supply';
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
  tableNumber?: string;
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

export interface LaundryOrder {
  id: string;
  hotelId?: string;
  roomNumber: string;
  guestName?: string;
  itemsSummary?: string;
  amount: number;
  status: string;
  date: string;
}

export interface LostFoundItem {
  id: string;
  hotelId?: string;
  itemName: string;
  roomNumber: string;
  foundBy?: string;
  status: string;
  date: string;
}

export interface InventoryProduct {
  id: string;
  hotelId?: string;
  name: string;
  sku?: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  unitPrice: number;
}

export interface InventoryPurchase {
  id: string;
  hotelId?: string;
  poNumber?: string;
  supplierName: string;
  itemName?: string;
  quantity?: number;
  totalAmount: number;
  status: string;
  date: string;
}

export interface SupplierRecord {
  id: string;
  hotelId?: string;
  name: string;
  phone?: string;
  category?: string;
  gstNumber?: string;
}

export interface OtaChannel {
  id: string;
  hotelId?: string;
  name: string;
  commissionPct?: number;
  status: string;
  lastSyncedAt?: string;
}

export interface TravelAgent {
  id: string;
  hotelId?: string;
  name: string;
  agencyName?: string;
  phone: string;
  email?: string;
  commissionRate?: number;
  status?: string;
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

export interface PettyCashRecord {
  id: string;
  hotelId?: string;
  type: 'Cash In' | 'Cash Out' | string;
  description: string;
  amount: number;
  date: string;
  handledBy?: string;
}

export interface CashBankAccount {
  id: string;
  hotelId?: string;
  accountName: string;
  accountType: string;
  bankName?: string;
  accountNumber?: string;
  balance: number;
}

export interface FinanceVoucher {
  id: string;
  hotelId?: string;
  voucherNo: string;
  voucherType: 'Payment' | 'Receipt' | string;
  partyName: string;
  amount: number;
  paymentMode: string;
  narration?: string;
  date: string;
}

export interface DailyClosing {
  id: string;
  hotelId?: string;
  date: string;
  shift?: string;
  cashCollected: number;
  upiCollected: number;
  cardCollected?: number;
  expensesTotal?: number;
  closedBy?: string;
  notes?: string;
}

export interface WaterBottleLog {
  id: string;
  hotelId?: string;
  roomNumber: string;
  guestName?: string;
  complimentaryQty: number;
  chargeableQty: number;
  amount?: number;
  date: string;
}

export interface StaffMember {
  id: string;
  hotelId?: string;
  name: string;
  mobile: string;
  email?: string;
  department: string;
  designation: string;
  role?: string;
  shift?: string;
  salary?: number;
  allowedModules?: string[];
  username: string;
  password?: string;
  plainPassword?: string;
  status: string;
}

export interface AuditLogItem {
  id: string;
  hotelId?: string;
  action: string;
  performedBy: string;
  details: string;
  dateTime: string;
}

export interface AppNotificationItem {
  id: string;
  hotelId?: string;
  title: string;
  message: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
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
  website?: string;
  checkInTime?: string;
  checkOutTime?: string;
  invoicePrefix?: string;
  nextInvoiceSequence?: number;
  defaultGstRate?: number;
  isGstEnabled?: boolean;
  earlyCheckInFee?: number;
  lateCheckOutFee?: number;
  status?: string;
  subscriptionPlan?: string;
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
  posAdvanceBookings: any[];
  cleaningLogs: HousekeepingLog[];
  laundryOrders: LaundryOrder[];
  lostAndFound: LostFoundItem[];
  inventoryProducts: InventoryProduct[];
  inventoryPurchases: InventoryPurchase[];
  vendors: SupplierRecord[];
  otaChannels: OtaChannel[];
  travelAgents: TravelAgent[];
  expenses: Expense[];
  pettyCash: PettyCashRecord[];
  cashBankAccounts: CashBankAccount[];
  vouchers: FinanceVoucher[];
  ownerPayments: any[];
  reimbursements: any[];
  dailyClosings: DailyClosing[];
  waterBottles: WaterBottleLog[];
  staff: StaffMember[];
  auditLogs: AuditLogItem[];
  notifications: AppNotificationItem[];
}
