import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import {
  FilePlus2,
  Lock,
  Printer,
  Share2,
  X,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { HotelProfile, Invoice, PmsStateSnapshot } from '../types/pms';
import { SubTabStrip } from '../components/SubTabStrip';
import {
  DateFilterBar,
  matchesQuickDateFilter,
  QuickDateFilter,
} from '../components/DateFilterBar';
import {
  amountToIndianWords,
  BillCharge,
  BillPayment,
  BillResult,
  calculateBill,
  formatDateLabel,
  formatMoney,
  normalizeBillSettings,
  r2,
} from '../utils/billCalculator';
import { CollectStayResult, stayNights } from '../utils/folioCollector';
import { buildStayBill, toInvoicePrintData } from '../utils/stayBilling';
import { InvoicePrintData, renderInvoiceHtml } from '../utils/printTemplates';
import { mobilePrint } from '../utils/mobilePrint';

function isInvoiceLockedNoGst(inv: Invoice): boolean {
  return (
    inv.isWithoutGst === true ||
    (inv.gstRate !== undefined && Number(inv.gstRate) <= 0) ||
    (inv.gstRate === undefined && Number(inv.gst || 0) <= 0)
  );
}

function buildInvoiceViewAndPrintData(
  inv: Invoice,
  state: PmsStateSnapshot,
  hotelProfile: HotelProfile | null
): InvoicePrintData {
  const bkg = state.bookings.find((b) => b.id === inv.bookingId) || null;
  const chk =
    state.checkins.find((c) => c.id === inv.checkInId || c.bookingId === inv.bookingId) || null;
  const baseSettings = normalizeBillSettings(hotelProfile);
  const noGst = isInvoiceLockedNoGst(inv);
  const effectiveRoomRate =
    !noGst && Number(inv.gstRate) > 0 ? Number(inv.gstRate) : baseSettings.roomGstRate;

  // Stored invoice breakdown fields are always pre-tax, so never re-split inclusive rates
  const invSettings = {
    ...baseSettings,
    roomGstRate: effectiveRoomRate,
    roomRateIncludesGst: false,
  };

  const nights = Math.max(
    1,
    Number(inv.nights) || stayNights(inv.checkInDate, inv.checkOutDate, bkg?.nights)
  );
  const roomNumbers =
    Array.isArray(inv.roomNumbers) && inv.roomNumbers.length > 0
      ? inv.roomNumbers
      : String(inv.roomNumber || bkg?.roomNumber || chk?.roomNumber || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
  const primaryRoom = roomNumbers[0] || '';

  let bill: BillResult;

  if (Array.isArray(inv.ledgerLines) && inv.ledgerLines.length > 0) {
    const subtotal = r2(inv.subtotal ?? inv.roomCharges ?? 0);
    const discount = r2(inv.discount ?? 0);
    const taxableAmount = r2(inv.taxableAmount ?? Math.max(0, subtotal - discount));
    const cgst = r2(inv.cgst ?? Number(inv.gst || 0) / 2);
    const sgst = r2(inv.sgst ?? Number(inv.gst || 0) - cgst);
    const totalTax = r2(inv.taxAmount ?? inv.gst ?? cgst + sgst);
    const grandTotal = r2(inv.finalAmount ?? inv.totalAmount ?? taxableAmount + totalTax);
    const receipts = r2(inv.advancePaid ?? inv.paidAmount ?? 0);
    const diff = r2(grandTotal - receipts);
    const balance = r2(inv.pendingAmount ?? Math.max(0, diff));
    const refundDue = r2(inv.refundDue ?? Math.max(0, -diff));
    const taxRows =
      Array.isArray(inv.taxRows) && inv.taxRows.length > 0
        ? inv.taxRows
        : !noGst && totalTax > 0
        ? [
            {
              rate: effectiveRoomRate,
              taxable: taxableAmount,
              cgst,
              sgst,
              tax: totalTax,
            },
          ]
        : [];

    bill = {
      lines: inv.ledgerLines,
      chargeLines: inv.ledgerLines.filter((l) => l.type === 'charge'),
      taxRows,
      totalsByKind: {
        room: r2(inv.roomCharges),
        extra_bed: r2(inv.extraBedCharges),
        extra_person: r2(inv.extraPersonCharges),
        early_checkin: r2(inv.earlyCheckInCharges),
        late_checkout: r2(inv.lateCheckOutCharges),
        food: r2(inv.foodCharges),
        water: r2(inv.waterCharges),
        laundry: r2(inv.laundryCharges),
        service: r2(inv.serviceCharges),
        fine: r2(inv.fineCharges),
        other: r2(inv.otherCharges),
      },
      subtotal,
      discount,
      taxableAmount,
      cgst,
      sgst,
      totalTax,
      grandTotal,
      receipts,
      balance,
      refundDue,
      paymentStatus:
        grandTotal > 0 && balance <= 0
          ? 'Paid'
          : receipts > 0
          ? 'Partially Paid'
          : grandTotal <= 0
          ? 'Paid'
          : 'Unpaid',
      isGstInvoice: !noGst && totalTax > 0,
      headlineGstRate: noGst ? 0 : effectiveRoomRate,
      amountInWords: inv.amountInWords || amountToIndianWords(grandTotal),
      legacy: {
        roomCharges: r2(inv.roomCharges),
        extraBedCharges: r2(inv.extraBedCharges),
        extraPersonCharges: r2(inv.extraPersonCharges),
        earlyCheckInCharges: r2(inv.earlyCheckInCharges),
        lateCheckOutCharges: r2(inv.lateCheckOutCharges),
        foodCharges: r2(inv.foodCharges),
        waterCharges: r2(inv.waterCharges),
        laundryCharges: r2(inv.laundryCharges),
        serviceCharges: r2(inv.serviceCharges),
        fineCharges: r2(inv.fineCharges),
        otherCharges: r2(inv.otherCharges),
      },
    };
  } else {
    const charges: BillCharge[] = [];
    const pushIf = (kind: BillCharge['kind'], description: string, amt?: number) => {
      if (Number(amt) > 0) {
        charges.push({
          id: `${kind}-${inv.id}`,
          kind,
          description,
          amount: Number(amt),
          nights: kind === 'room' ? nights : undefined,
          rate: kind === 'room' ? r2(Number(amt) / nights) : undefined,
          date: formatDateLabel(inv.checkOutDate || inv.dateCreated),
          roomNumber: primaryRoom,
        });
      }
    };
    pushIf('room', 'Room Charges', inv.roomCharges);
    pushIf('extra_bed', 'Extra Bed Charges', inv.extraBedCharges);
    pushIf('extra_person', 'Extra Person Charges', inv.extraPersonCharges);
    pushIf('early_checkin', 'Early Check-In Charges', inv.earlyCheckInCharges);
    pushIf('late_checkout', 'Late Check-Out Charges', inv.lateCheckOutCharges);
    pushIf('food', 'Food & Beverage Charges', inv.foodCharges);
    pushIf('water', 'Water Bottle Charges', inv.waterCharges);
    pushIf('laundry', 'Laundry Charges', inv.laundryCharges);
    pushIf('service', 'Extra Services', inv.serviceCharges);
    pushIf('other', 'Other Charges', inv.otherCharges);

    const paidAmt = Number(inv.advancePaid ?? inv.paidAmount ?? 0);
    const payments: BillPayment[] =
      paidAmt > 0
        ? [
            {
              id: `pay-${inv.id}`,
              amount: paidAmt,
              method: inv.paymentMethod || 'Cash',
              date: inv.dateCreated || inv.date,
            },
          ]
        : [];

    bill = calculateBill({
      charges,
      payments,
      discount: Number(inv.discount || 0),
      gstEnabled: !noGst,
      settings: invSettings,
    });
  }

  const folio: CollectStayResult = {
    charges: [],
    payments: [],
    gstEnabled: !noGst,
    discount: bill.discount,
    roomNumbers: roomNumbers.length ? roomNumbers : [inv.roomNumber || ''],
    nights,
    checkInDate: inv.checkInDate,
    checkOutDate: inv.checkOutDate,
    stayIds: [inv.bookingId, inv.checkInId || ''].filter(Boolean),
  };

  const guestOverride = {
    ...(bkg || {}),
    guestName: inv.guestName || bkg?.guestName,
    mobile: inv.guestMobile || inv.mobile || bkg?.mobile,
    address: inv.guestAddress || chk?.address || bkg?.address,
    companyName: inv.companyName || chk?.companyName || bkg?.companyName,
    gstNumber: inv.guestGstNumber || inv.gstNumber || chk?.gstNumber || bkg?.gstNumber,
  };

  return toInvoicePrintData({
    hotel: hotelProfile,
    invoiceNumber: inv.invoiceNumber || inv.id,
    invoiceDate: inv.dateCreated || inv.date || inv.checkOutDate,
    booking: guestOverride,
    checkin: chk,
    folio,
    bill,
  });
}

export const InvoicesScreen: React.FC = () => {
  const { state, hotelProfile, generateSeparateOrNewInvoice } = usePms();
  const billSettings = normalizeBillSettings(hotelProfile);

  const [subTab, setSubTab] = useState<'all' | 'gst' | 'nogst' | 'unpaid'>('all');
  const [dateFilter, setDateFilter] = useState<QuickDateFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(state.bookings[0]?.id || '');
  const [genWithGst, setGenWithGst] = useState(true);
  const [genIncludeServices, setGenIncludeServices] = useState(true);
  const [generating, setGenerating] = useState(false);

  const openGeneratorForBooking = (bookingId: string, defaultWithGst: boolean) => {
    setSelectedBookingId(bookingId);
    setGenWithGst(defaultWithGst);
    setGeneratorOpen(true);
  };

  const handlePrintInvoicePdf = async (inv: Invoice) => {
    const printData = buildInvoiceViewAndPrintData(inv, state, hotelProfile);
    const html = renderInvoiceHtml(printData);
    await mobilePrint.printHtml(html, `Invoice ${printData.invoiceNumber}`);
  };

  const handleShareInvoicePdf = async (inv: Invoice) => {
    const printData = buildInvoiceViewAndPrintData(inv, state, hotelProfile);
    const html = renderInvoiceHtml(printData);
    await mobilePrint.sharePdfFromHtml(html, `Invoice ${printData.invoiceNumber}`);
  };

  const filteredInvoices = state.invoices.filter((inv) => {
    const noGst = isInvoiceLockedNoGst(inv);
    if (subTab === 'gst' && noGst) return false;
    if (subTab === 'nogst' && !noGst) return false;
    if (subTab === 'unpaid' && inv.isPaid) return false;
    if (
      !matchesQuickDateFilter(
        inv.dateCreated || inv.date || inv.checkOutDate,
        dateFilter,
        fromDate,
        toDate
      )
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${inv.invoiceNumber} ${inv.guestName} ${inv.roomNumber} ${inv.companyName || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Live preview for Separate / New Invoice Generator Modal using Single Bill Calculator
  const genPreview = (() => {
    const bkg = state.bookings.find((b) => b.id === selectedBookingId);
    const chk = state.checkins.find(
      (c) => c.bookingId === selectedBookingId || c.id === selectedBookingId
    );
    if (!bkg && !chk) return null;
    const scopedBkg = !genIncludeServices && bkg ? { ...bkg, otherServices: [] } : bkg;
    const scopedChk =
      !genIncludeServices && chk
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
    return buildStayBill({
      booking: scopedBkg,
      checkin: scopedChk,
      posOrders: genIncludeServices ? state.posOrders : [],
      laundryOrders: genIncludeServices ? state.laundryOrders : [],
      waterBottles: genIncludeServices ? state.waterBottles : [],
      rooms: state.rooms,
      settings: billSettings,
      gstEnabledOverride: genWithGst,
    });
  })();

  return (
    <View style={styles.root}>
      <SubTabStrip
        activeId={subTab}
        onSelect={(id) => setSubTab(id as any)}
        tabs={[
          { id: 'all', label: 'All Bills', count: state.invoices.length },
          {
            id: 'gst',
            label: 'GST Invoices',
            count: state.invoices.filter((i) => !isInvoiceLockedNoGst(i)).length,
          },
          {
            id: 'nogst',
            label: 'Bill of Supply',
            count: state.invoices.filter((i) => isInvoiceLockedNoGst(i)).length,
          },
          {
            id: 'unpaid',
            label: 'Balance Due',
            count: state.invoices.filter((i) => !i.isPaid).length,
          },
        ]}
      />

      <DateFilterBar
        activeFilter={dateFilter}
        onChangeFilter={setDateFilter}
        fromDate={fromDate}
        toDate={toDate}
        onChangeFromDate={setFromDate}
        onChangeToDate={setToDate}
        searchQuery={searchQuery}
        onChangeSearch={setSearchQuery}
        searchPlaceholder="Search invoice no, guest, room..."
      />

      {/* Top Generator Strip */}
      <View style={styles.topStrip}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stripTitle}>Official Invoices ({filteredInvoices.length})</Text>
          <Text style={styles.stripSub}>
            Tap any invoice for Ledger Preview & PDF Print/Share, or + Separate Bill.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (!selectedBookingId && state.bookings[0]) {
              setSelectedBookingId(state.bookings[0].id);
            }
            setGeneratorOpen(true);
          }}
          style={styles.newInvBtn}
        >
          <FilePlus2 size={14} color={COLORS.espresso} />
          <Text style={styles.newInvBtnText}>+ Separate Bill</Text>
        </TouchableOpacity>
      </View>

      {/* Invoices List */}
      <ScrollView contentContainerStyle={styles.list}>
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No Matching Invoices</Text>
            <Text style={styles.emptySub}>
              Switch date filter to "All" or tap "+ Separate Bill" to generate an invoice.
            </Text>
          </View>
        ) : (
          filteredInvoices.map((inv) => {
            const noGst = isInvoiceLockedNoGst(inv);
            return (
              <TouchableOpacity
                key={inv.id}
                activeOpacity={0.85}
                onPress={() => setViewingInvoice(inv)}
                style={styles.invCard}
              >
                <View style={styles.invRowTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Text style={styles.invNo} numberOfLines={1}>
                      {inv.invoiceNumber || inv.id}
                    </Text>
                    {inv.isSeparateInvoice && (
                      <View style={styles.sepBadge}>
                        <Text style={styles.sepBadgeText}>SEPARATE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.invTotal}>
                    ₹{formatMoney(Number(inv.finalAmount || 0))}
                  </Text>
                </View>

                <Text style={styles.invGuest} numberOfLines={1}>
                  {inv.guestName} • Room {inv.roomNumber}
                </Text>
                <Text style={styles.invDates}>
                  {formatDateLabel(inv.checkInDate)} → {formatDateLabel(inv.checkOutDate)} • Issued{' '}
                  {formatDateLabel(inv.dateCreated || inv.date)}
                </Text>

                <View style={styles.invFooter}>
                  <View
                    style={[
                      styles.lockBadge,
                      { backgroundColor: noGst ? COLORS.amberSoft : COLORS.emeraldSoft },
                    ]}
                  >
                    <Lock size={11} color={noGst ? COLORS.amber : COLORS.emerald} />
                    <Text
                      style={[
                        styles.lockBadgeText,
                        { color: noGst ? COLORS.amber : COLORS.emerald },
                      ]}
                    >
                      {noGst
                        ? 'Bill of Supply (0%)'
                        : `Tax Invoice (${inv.gstRate || billSettings.roomGstRate}%)`}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => handlePrintInvoicePdf(inv)}
                      style={styles.pdfQuickBtn}
                    >
                      <Printer size={12} color={COLORS.espresso} />
                      <Text style={styles.pdfQuickBtnText}>PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openGeneratorForBooking(inv.bookingId, noGst)}
                      style={styles.sepActionBtn}
                    >
                      <FilePlus2 size={12} color={COLORS.indigo} />
                      <Text style={styles.sepActionText}>+ Separate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* HOTEL M M PRESTIGE Ledger Invoice Preview Modal */}
      <Modal visible={Boolean(viewingInvoice)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '92%' }]}>
            {viewingInvoice &&
              (() => {
                const printData = buildInvoiceViewAndPrintData(
                  viewingInvoice,
                  state,
                  hotelProfile
                );
                const b = printData.bill;
                const isTax = b.isGstInvoice;
                const h = printData.hotel;
                return (
                  <>
                    <View style={styles.previewTopBar}>
                      <View
                        style={[
                          styles.lockBadge,
                          { backgroundColor: !isTax ? COLORS.amberSoft : COLORS.emeraldSoft },
                        ]}
                      >
                        <Lock size={12} color={!isTax ? COLORS.amber : COLORS.emerald} />
                        <Text
                          style={[
                            styles.lockBadgeText,
                            { color: !isTax ? COLORS.amber : COLORS.emerald },
                          ]}
                        >
                          {isTax
                            ? `TAX INVOICE (${b.headlineGstRate}% GST)`
                            : 'BILL OF SUPPLY (0% GST)'}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setViewingInvoice(null)}>
                        <X size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: 8 }}
                    >
                      {/* Paper Header (HOTEL M M PRESTIGE layout) */}
                      <View style={styles.paperSheet}>
                        <Text style={styles.paperHotelName}>
                          {(h.name || 'DIRECTSTAY HOTEL').toUpperCase()}
                        </Text>
                        {h.address ? (
                          <Text style={styles.paperHotelMeta}>{h.address}</Text>
                        ) : null}
                        {h.phone || h.email ? (
                          <Text style={styles.paperHotelMeta}>
                            {[h.phone ? `Ph: ${h.phone}` : '', h.email ? `Email: ${h.email}` : '']
                              .filter(Boolean)
                              .join(' • ')}
                          </Text>
                        ) : null}

                        <View style={styles.paperTaxBanner}>
                          <View style={{ flex: 1 }}>
                            {isTax && h.gstNumber ? (
                              <Text style={styles.paperSmallBold}>GST: {h.gstNumber}</Text>
                            ) : null}
                            {h.panNumber ? (
                              <Text style={styles.paperSmallBold}>PAN: {h.panNumber}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.paperDocTitle}>
                            {isTax ? 'TAX INVOICE' : 'BILL OF SUPPLY'}
                          </Text>
                        </View>

                        {/* Guest & Stay Metadata */}
                        <View style={styles.metaGrid}>
                          <View style={{ flex: 1.15, gap: 2 }}>
                            <Text style={styles.metaRowText}>
                              <Text style={styles.metaKey}>Invoice No: </Text>
                              {printData.invoiceNumber}
                            </Text>
                            {printData.reservationNo ? (
                              <Text style={styles.metaRowText}>
                                <Text style={styles.metaKey}>Res. No: </Text>
                                {printData.reservationNo}
                              </Text>
                            ) : null}
                            <Text style={styles.metaRowText}>
                              <Text style={styles.metaKey}>Guest: </Text>
                              {printData.guestName}
                            </Text>
                            {printData.guestMobile ? (
                              <Text style={styles.metaRowText}>
                                <Text style={styles.metaKey}>Mobile: </Text>
                                {printData.guestMobile}
                              </Text>
                            ) : null}
                            {printData.companyName ? (
                              <Text style={styles.metaRowText}>
                                <Text style={styles.metaKey}>Company: </Text>
                                {printData.companyName}
                              </Text>
                            ) : null}
                            {isTax && printData.companyGstin ? (
                              <Text style={styles.metaRowText}>
                                <Text style={styles.metaKey}>Guest GSTIN: </Text>
                                {printData.companyGstin}
                              </Text>
                            ) : null}
                            {printData.placeOfSupply ? (
                              <Text style={styles.metaRowText}>
                                <Text style={styles.metaKey}>Place of Supply: </Text>
                                {printData.placeOfSupply}
                              </Text>
                            ) : null}
                          </View>

                          <View style={{ flex: 0.95, gap: 2 }}>
                            <Text style={styles.metaRowText}>
                              <Text style={styles.metaKey}>Date: </Text>
                              {printData.invoiceDate}
                            </Text>
                            <Text style={styles.metaRowText}>
                              <Text style={styles.metaKey}>Room: </Text>
                              {printData.roomLabel}
                            </Text>
                            <Text style={styles.metaRowText}>
                              <Text style={styles.metaKey}>Pax: </Text>
                              {printData.pax}
                            </Text>
                            <Text style={styles.metaRowText}>
                              <Text style={styles.metaKey}>Check-In: </Text>
                              {printData.checkIn}
                            </Text>
                            <Text style={styles.metaRowText}>
                              <Text style={styles.metaKey}>Check-Out: </Text>
                              {printData.checkOut}
                            </Text>
                            <Text style={styles.metaRowText}>
                              <Text style={styles.metaKey}>Nights: </Text>
                              {printData.nights}
                            </Text>
                          </View>
                        </View>

                        {/* Ledger Table */}
                        <View style={styles.ledgerHeader}>
                          <Text style={[styles.ledgerTh, { flex: 1.8 }]}>Description / SAC</Text>
                          <Text style={[styles.ledgerTh, { flex: 0.9, textAlign: 'right' }]}>
                            Charges
                          </Text>
                          <Text style={[styles.ledgerTh, { flex: 0.9, textAlign: 'right' }]}>
                            Receipts
                          </Text>
                        </View>

                        {b.lines.map((line, idx) => (
                          <View key={`${line.type}-${idx}`} style={styles.ledgerTr}>
                            <View style={{ flex: 1.8, paddingRight: 6 }}>
                              <Text style={styles.ledgerDesc}>
                                {line.roomNumber ? `[Rm ${line.roomNumber}] ` : ''}
                                {line.description.replace('\n', ' • ')}
                              </Text>
                              {(line.dateLabel || line.sac) && (
                                <Text style={styles.ledgerSub}>
                                  {[
                                    line.dateLabel,
                                    line.sac ? `SAC ${line.sac}` : '',
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </Text>
                              )}
                            </View>
                            <Text style={styles.ledgerAmt}>
                              {line.type !== 'receipt' ? formatMoney(line.charges) : '0.00'}
                            </Text>
                            <Text style={[styles.ledgerAmt, { color: COLORS.emerald }]}>
                              {line.receipts !== 0 ? formatMoney(line.receipts) : '0.00'}
                            </Text>
                          </View>
                        ))}

                        {/* Tax Slab Box */}
                        {isTax && b.taxRows.length > 0 && (
                          <View style={styles.taxSummaryBox}>
                            <Text style={styles.taxSummaryTitle}>GST Tax Breakdown</Text>
                            {b.taxRows.map((tr, idx) => (
                              <View key={idx} style={styles.lineRow}>
                                <Text style={styles.lineLabel}>
                                  Taxable ₹{formatMoney(tr.taxable)} @ {tr.rate}% (CGST ₹
                                  {formatMoney(tr.cgst)} + SGST ₹{formatMoney(tr.sgst)})
                                </Text>
                                <Text style={styles.lineVal}>₹{formatMoney(tr.tax)}</Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Totals Summary */}
                        <View style={styles.totalsBox}>
                          {b.discount > 0 && (
                            <View style={styles.lineRow}>
                              <Text style={styles.lineLabel}>Discount:</Text>
                              <Text style={styles.lineVal}>- ₹{formatMoney(b.discount)}</Text>
                            </View>
                          )}
                          <View style={styles.lineRow}>
                            <Text style={styles.grandLabel}>Invoice Amount:</Text>
                            <Text style={styles.grandVal}>₹{formatMoney(b.grandTotal)}</Text>
                          </View>
                          <View style={styles.lineRow}>
                            <Text style={styles.lineLabel}>Less Receipts:</Text>
                            <Text style={[styles.lineVal, { color: COLORS.emerald }]}>
                              ₹{formatMoney(b.receipts)}
                            </Text>
                          </View>
                          <View style={[styles.lineRow, styles.balanceDivider]}>
                            <Text style={styles.grandLabel}>
                              {b.refundDue > 0 ? 'Refund Due:' : 'Balance Due:'}
                            </Text>
                            <Text
                              style={[
                                styles.grandVal,
                                {
                                  color:
                                    b.balance > 0 ? COLORS.rose : COLORS.emerald,
                                },
                              ]}
                            >
                              ₹{formatMoney(b.refundDue > 0 ? b.refundDue : b.balance)}
                            </Text>
                          </View>
                          <Text style={styles.wordsText}>
                            Amount in Words: {b.amountInWords}
                          </Text>
                        </View>
                      </View>
                    </ScrollView>

                    <View style={styles.previewActions}>
                      <TouchableOpacity
                        onPress={() => handlePrintInvoicePdf(viewingInvoice)}
                        style={styles.shareBtn}
                      >
                        <Printer size={15} color={COLORS.goldBright} />
                        <Text style={styles.shareBtnText} numberOfLines={1}>
                          Print / Download PDF
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleShareInvoicePdf(viewingInvoice)}
                        style={styles.pdfShareSecondaryBtn}
                      >
                        <Share2 size={15} color={COLORS.espresso} />
                        <Text style={styles.pdfShareSecondaryText} numberOfLines={1}>
                          Share PDF
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        const bId = viewingInvoice.bookingId;
                        const noGst = isInvoiceLockedNoGst(viewingInvoice);
                        setViewingInvoice(null);
                        openGeneratorForBooking(bId, noGst);
                      }}
                      style={[styles.separateModalBtn, { marginTop: 8 }]}
                    >
                      <FilePlus2 size={14} color={COLORS.indigo} />
                      <Text style={styles.separateModalBtnText} numberOfLines={1}>
                        + Generate Separate ({isTax ? 'Bill of Supply / No GST' : 'GST Tax Invoice'})
                      </Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
          </View>
        </View>
      </Modal>

      {/* Generate Official / Separate Invoice Modal (Single ☑ GST Invoice Checkbox Only!) */}
      <Modal visible={generatorOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.previewTopBar}>
              <Text style={styles.genTitle}>Generate Official / Separate Invoice</Text>
              <TouchableOpacity onPress={() => setGeneratorOpen(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.genSub}>1. Select Stay Folio:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {state.bookings.map((b) => {
                  const sel = selectedBookingId === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => setSelectedBookingId(b.id)}
                      style={[styles.bkgChip, sel && styles.bkgChipSel]}
                    >
                      <Text style={[styles.bkgChipText, sel && { color: COLORS.goldBright }]}>
                        {b.guestName} (Rm {b.roomNumber})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {state.invoices.some((i) => i.bookingId === selectedBookingId) && (
              <View style={styles.infoNotice}>
                <Text style={styles.infoNoticeText}>
                  🔒 Existing invoice stays untouched. A Separate Invoice in{' '}
                  {billSettings.invoicePrefix}/.../FY format will be allocated.
                </Text>
              </View>
            )}

            {/* Single ☑ GST Invoice Checkbox (No 5%/12%/18% buttons — rate comes from Settings) */}
            <TouchableOpacity
              onPress={() => setGenWithGst((p) => !p)}
              style={[
                styles.gstCheckRow,
                genWithGst && { borderColor: COLORS.emerald, backgroundColor: COLORS.emeraldSoft },
              ]}
            >
              {genWithGst ? (
                <CheckSquare size={19} color={COLORS.emerald} />
              ) : (
                <Square size={19} color={COLORS.textSecondary} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.gstCheckTitle}>
                  GST Invoice (
                  {genWithGst
                    ? `Room ${billSettings.roomGstRate}% / Food ${billSettings.foodGstRate}%`
                    : 'Unchecked — Bill of Supply 0%'}
                  )
                </Text>
                <Text style={styles.gstCheckSub}>
                  GST rates & prefix ({billSettings.invoicePrefix}) come from Profile & Settings
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGenIncludeServices((p) => !p)}
              style={[styles.scopeToggle, genIncludeServices && { borderColor: COLORS.gold }]}
            >
              <Text style={styles.scopeToggleText}>
                Scope:{' '}
                {genIncludeServices
                  ? 'Booking + Food / Water / Extra Services'
                  : 'Only Room Booking'}{' '}
                (Tap to switch)
              </Text>
            </TouchableOpacity>

            {genPreview && (
              <View style={styles.genPreviewCard}>
                <View style={styles.lineRow}>
                  <Text style={styles.lineLabel}>Pre-Tax Subtotal:</Text>
                  <Text style={styles.lineVal}>₹{formatMoney(genPreview.bill.subtotal)}</Text>
                </View>
                {genPreview.bill.discount > 0 && (
                  <View style={styles.lineRow}>
                    <Text style={styles.lineLabel}>Less Discount:</Text>
                    <Text style={styles.lineVal}>- ₹{formatMoney(genPreview.bill.discount)}</Text>
                  </View>
                )}
                <View style={styles.lineRow}>
                  <Text style={styles.lineLabel}>CGST + SGST:</Text>
                  <Text style={styles.lineVal}>₹{formatMoney(genPreview.bill.totalTax)}</Text>
                </View>
                <View style={[styles.lineRow, { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 5 }]}>
                  <Text style={styles.grandLabel}>Invoice Total:</Text>
                  <Text style={styles.grandVal}>₹{formatMoney(genPreview.bill.grandTotal)}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              disabled={generating || !selectedBookingId}
              onPress={async () => {
                setGenerating(true);
                const res = await generateSeparateOrNewInvoice({
                  bookingId: selectedBookingId,
                  withGst: genWithGst,
                  includeServices: genIncludeServices,
                });
                setGenerating(false);
                setGeneratorOpen(false);
                if (res.ok && res.invoice) {
                  setViewingInvoice(res.invoice);
                } else {
                  Alert.alert('Error', res.error || 'Could not generate invoice');
                }
              }}
              style={styles.generateConfirmBtn}
            >
              <Text style={styles.generateConfirmText}>
                {generating
                  ? 'Generating & Syncing...'
                  : `Generate ${genWithGst ? 'Tax Invoice (GST)' : 'Bill of Supply (No GST)'}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  topStrip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stripTitle: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  stripSub: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 1 },
  newInvBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  newInvBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.espresso },
  list: { padding: 12, gap: 10, paddingBottom: 28 },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  invCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  invNo: { fontSize: 13.5, fontWeight: '900', color: COLORS.textPrimary },
  sepBadge: {
    backgroundColor: COLORS.indigoSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  sepBadgeText: { fontSize: 9, fontWeight: '900', color: COLORS.indigo },
  invTotal: { fontSize: 15.5, fontWeight: '900', color: COLORS.goldDark },
  invGuest: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  invDates: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  invFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  lockBadgeText: { fontSize: 10.5, fontWeight: '800' },
  pdfQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF3E0',
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pdfQuickBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.espresso },
  sepActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.indigoSoft,
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 8,
  },
  sepActionText: { fontSize: 11, fontWeight: '800', color: COLORS.indigo },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 11, 9, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 24,
  },
  previewTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paperSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#D6D3D1',
  },
  paperHotelName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  paperHotelMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  paperTaxBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#111827',
    paddingVertical: 6,
    marginTop: 10,
    gap: 8,
  },
  paperSmallBold: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#111827',
  },
  paperDocTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: COLORS.espresso,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  metaRowText: {
    fontSize: 11,
    color: '#1F2937',
    lineHeight: 15,
  },
  metaKey: {
    fontWeight: '800',
    color: '#111827',
  },
  ledgerHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
    marginTop: 4,
  },
  ledgerTh: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#111827',
  },
  ledgerTr: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ledgerDesc: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#111827',
  },
  ledgerSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  ledgerAmt: {
    flex: 0.9,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'right',
  },
  taxSummaryBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 9,
    marginTop: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5DEC9',
  },
  taxSummaryTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.goldDark,
    marginBottom: 2,
  },
  totalsBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#111827',
    gap: 5,
  },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lineLabel: { fontSize: 11.5, color: COLORS.textSecondary, fontWeight: '600', flex: 1 },
  lineVal: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '800' },
  balanceDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    marginTop: 2,
  },
  grandLabel: { fontSize: 13, fontWeight: '900', color: COLORS.espresso },
  grandVal: { fontSize: 14.5, fontWeight: '900', color: COLORS.goldDark },
  wordsText: {
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#374151',
    marginTop: 4,
  },
  previewActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  separateModalBtn: {
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: COLORS.indigoSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  separateModalBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.indigo },
  shareBtn: {
    flex: 1.25,
    minHeight: 45,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.espresso,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  shareBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.goldBright },
  pdfShareSecondaryBtn: {
    flex: 0.9,
    minHeight: 45,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pdfShareSecondaryText: { fontSize: 12, fontWeight: '800', color: COLORS.espresso },
  genTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  genSub: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 7 },
  bkgChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bkgChipSel: { backgroundColor: COLORS.espresso, borderColor: COLORS.gold },
  bkgChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  infoNotice: {
    backgroundColor: COLORS.amberSoft,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoNoticeText: { fontSize: 11, color: COLORS.amber, fontWeight: '700' },
  gstCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#FAF8F5',
    marginBottom: 10,
  },
  gstCheckTitle: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  gstCheckSub: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 1 },
  scopeToggle: {
    padding: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  scopeToggleText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textPrimary },
  genPreviewCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 11,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
    marginBottom: 12,
  },
  generateConfirmBtn: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  generateConfirmText: { fontSize: 13, fontWeight: '800', color: COLORS.goldBright },
});
