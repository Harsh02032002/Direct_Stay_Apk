import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Share,
  Alert,
  StyleSheet,
} from 'react-native';
import { FilePlus2, Lock, Share2, X, CheckSquare, Square } from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { Invoice } from '../types/pms';
import { SubTabStrip } from '../components/SubTabStrip';
import { DateFilterBar, matchesQuickDateFilter, QuickDateFilter } from '../components/DateFilterBar';

function isInvoiceLockedNoGst(inv: Invoice): boolean {
  return (
    inv.isWithoutGst === true ||
    (inv.gstRate !== undefined && Number(inv.gstRate) <= 0) ||
    (inv.gstRate === undefined && Number(inv.gst || 0) <= 0)
  );
}

export const InvoicesScreen: React.FC = () => {
  const { state, hotelProfile, generateSeparateOrNewInvoice } = usePms();
  const defaultGst =
    Number(hotelProfile?.defaultGstRate) > 0 ? Number(hotelProfile?.defaultGstRate) : 5;

  const [subTab, setSubTab] = useState<'all' | 'gst' | 'nogst' | 'unpaid'>('all');
  const [dateFilter, setDateFilter] = useState<QuickDateFilter>('all');
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

  const handleShareInvoice = async (inv: Invoice) => {
    const noGst = isInvoiceLockedNoGst(inv);
    const msg =
      `*${hotelProfile?.name || 'DirectStay Hotel'}*\n` +
      `${noGst ? 'ROOM BILL (NO GST)' : `TAX INVOICE (${inv.gstRate || defaultGst}% GST)`}\n` +
      `Invoice No: ${inv.invoiceNumber || inv.id}\n` +
      `Guest: ${inv.guestName} (Room ${inv.roomNumber})\n` +
      `Stay: ${inv.checkInDate} to ${inv.checkOutDate}\n` +
      `Subtotal: ₹${Number(inv.subtotal || inv.roomCharges || 0).toLocaleString('en-IN')}\n` +
      (noGst ? '' : `GST: ₹${Number(inv.gst || 0).toLocaleString('en-IN')}\n`) +
      `*Grand Total: ₹${Number(inv.finalAmount || 0).toLocaleString('en-IN')}*\n` +
      `Status: ${inv.paymentStatus || (inv.isPaid ? 'Paid' : 'Unpaid')}`;
    await Share.share({ message: msg });
  };

  const filteredInvoices = state.invoices.filter((inv) => {
    const noGst = isInvoiceLockedNoGst(inv);
    if (subTab === 'gst' && noGst) return false;
    if (subTab === 'nogst' && !noGst) return false;
    if (subTab === 'unpaid' && inv.isPaid) return false;
    if (!matchesQuickDateFilter(inv.dateCreated || inv.date || inv.checkOutDate, dateFilter)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const hay = `${inv.invoiceNumber} ${inv.guestName} ${inv.roomNumber}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

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
            label: 'Without GST',
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
        searchQuery={searchQuery}
        onChangeSearch={setSearchQuery}
        searchPlaceholder="Search invoice no, guest, room..."
      />

      {/* Top Generator Strip */}
      <View style={styles.topStrip}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stripTitle}>Official Invoices ({filteredInvoices.length})</Text>
          <Text style={styles.stripSub}>
            GST mode locks once generated. Tap + Separate for an alternate bill.
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
              Switch filter to "All Records" or tap "+ Separate Bill" to generate one.
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
                    ₹{Number(inv.finalAmount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                <Text style={styles.invGuest} numberOfLines={1}>
                  {inv.guestName} • Room {inv.roomNumber}
                </Text>
                <Text style={styles.invDates}>
                  {inv.checkInDate} → {inv.checkOutDate}
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
                        ? 'Locked: No GST (0%)'
                        : `Locked: GST (${inv.gstRate || defaultGst}%)`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => openGeneratorForBooking(inv.bookingId, noGst)}
                    style={styles.sepActionBtn}
                  >
                    <FilePlus2 size={12} color={COLORS.indigo} />
                    <Text style={styles.sepActionText}>+ Separate Invoice</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Invoice Preview Modal */}
      <Modal visible={Boolean(viewingInvoice)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {viewingInvoice &&
              (() => {
                const noGst = isInvoiceLockedNoGst(viewingInvoice);
                return (
                  <>
                    <View style={styles.previewTopBar}>
                      <View
                        style={[
                          styles.lockBadge,
                          { backgroundColor: noGst ? COLORS.amberSoft : COLORS.emeraldSoft },
                        ]}
                      >
                        <Lock size={12} color={noGst ? COLORS.amber : COLORS.emerald} />
                        <Text
                          style={[
                            styles.lockBadgeText,
                            { color: noGst ? COLORS.amber : COLORS.emerald },
                          ]}
                        >
                          {noGst
                            ? 'Locked: No GST (0% Room Bill)'
                            : `Locked: With GST (${viewingInvoice.gstRate || defaultGst}%)`}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setViewingInvoice(null)}>
                        <X size={20} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.espressoSheetHeader}>
                      <Text style={styles.sheetHotelName}>
                        {hotelProfile?.name || 'DIRECTSTAY HOTEL'}
                      </Text>
                      {!noGst && hotelProfile?.gstNumber ? (
                        <Text style={styles.sheetGstin}>GSTIN: {hotelProfile.gstNumber}</Text>
                      ) : null}
                      <Text style={styles.sheetInvNum}>
                        {noGst ? 'ROOM BILL' : 'TAX INVOICE'} •{' '}
                        {viewingInvoice.invoiceNumber || viewingInvoice.id}
                      </Text>
                    </View>

                    <View style={styles.sheetBody}>
                      <View style={styles.lineRow}>
                        <Text style={styles.lineLabel}>Guest Name:</Text>
                        <Text style={styles.lineVal}>{viewingInvoice.guestName}</Text>
                      </View>
                      <View style={styles.lineRow}>
                        <Text style={styles.lineLabel}>Room & Dates:</Text>
                        <Text style={styles.lineVal}>
                          Rm {viewingInvoice.roomNumber} ({viewingInvoice.checkInDate} →{' '}
                          {viewingInvoice.checkOutDate})
                        </Text>
                      </View>
                      <View style={styles.lineRow}>
                        <Text style={styles.lineLabel}>Room Charges:</Text>
                        <Text style={styles.lineVal}>
                          ₹{Number(viewingInvoice.roomCharges || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      {Number(viewingInvoice.foodCharges || 0) +
                        Number(viewingInvoice.otherCharges || 0) >
                        0 && (
                        <View style={styles.lineRow}>
                          <Text style={styles.lineLabel}>POS / Extra Services:</Text>
                          <Text style={styles.lineVal}>
                            ₹
                            {(
                              Number(viewingInvoice.foodCharges || 0) +
                              Number(viewingInvoice.otherCharges || 0)
                            ).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      )}
                      {!noGst && (
                        <View style={styles.lineRow}>
                          <Text style={styles.lineLabel}>
                            CGST + SGST ({viewingInvoice.gstRate || defaultGst}%):
                          </Text>
                          <Text style={styles.lineVal}>
                            ₹{Number(viewingInvoice.gst || 0).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.lineRow, styles.grandRow]}>
                        <Text style={styles.grandLabel}>GRAND TOTAL</Text>
                        <Text style={styles.grandVal}>
                          ₹{Number(viewingInvoice.finalAmount || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.previewActions}>
                      <TouchableOpacity
                        onPress={() => {
                          const bId = viewingInvoice.bookingId;
                          setViewingInvoice(null);
                          openGeneratorForBooking(bId, noGst);
                        }}
                        style={styles.separateModalBtn}
                      >
                        <FilePlus2 size={15} color={COLORS.indigo} />
                        <Text style={styles.separateModalBtnText} numberOfLines={1}>
                          + Separate ({noGst ? 'With GST' : 'No GST'})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleShareInvoice(viewingInvoice)}
                        style={styles.shareBtn}
                      >
                        <Share2 size={15} color={COLORS.goldBright} />
                        <Text style={styles.shareBtnText} numberOfLines={1}>
                          Share / WhatsApp
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })()}
          </View>
        </View>
      </Modal>

      {/* Generate Official / Separate Invoice Modal */}
      <Modal visible={generatorOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.previewTopBar}>
              <Text style={styles.genTitle}>Generate Official / Separate Invoice</Text>
              <TouchableOpacity onPress={() => setGeneratorOpen(false)}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.genSub}>1. Select Booking Folio:</Text>
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
                  🔒 Existing invoice stays untouched. A new Separate Invoice with a unique number
                  will be created.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setGenWithGst((p) => !p)}
              style={[
                styles.gstCheckRow,
                genWithGst && { borderColor: COLORS.emerald, backgroundColor: COLORS.emeraldSoft },
              ]}
            >
              {genWithGst ? (
                <CheckSquare size={18} color={COLORS.emerald} />
              ) : (
                <Square size={18} color={COLORS.textSecondary} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.gstCheckTitle}>
                  GST Invoice ({genWithGst ? `${defaultGst}% GST Applied` : 'Unchecked — 0% No GST'})
                </Text>
                <Text style={styles.gstCheckSub}>
                  GST % slab is configured in My Profile & Settings
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGenIncludeServices((p) => !p)}
              style={[styles.scopeToggle, genIncludeServices && { borderColor: COLORS.gold }]}
            >
              <Text style={styles.scopeToggleText}>
                Scope:{' '}
                {genIncludeServices ? 'Booking + POS / Extra Services' : 'Only Room Booking'} (Tap
                to switch)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={generating || !selectedBookingId}
              onPress={async () => {
                setGenerating(true);
                const res = await generateSeparateOrNewInvoice({
                  bookingId: selectedBookingId,
                  withGst: genWithGst,
                  gstRate: defaultGst,
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
                  : `Generate ${genWithGst ? `GST (${defaultGst}%)` : 'Without GST'} Invoice`}
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
    padding: 18,
    paddingBottom: 28,
  },
  previewTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  espressoSheetHeader: {
    backgroundColor: COLORS.espresso,
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
  },
  sheetHotelName: { color: COLORS.goldBright, fontSize: 15, fontWeight: '900' },
  sheetGstin: { color: '#D6C9BE', fontSize: 11, marginTop: 2 },
  sheetInvNum: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 4 },
  sheetBody: {
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    padding: 13,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  lineLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  lineVal: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '800', flexShrink: 1 },
  grandRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 4,
  },
  grandLabel: { fontSize: 13.5, fontWeight: '900', color: COLORS.espresso },
  grandVal: { fontSize: 15.5, fontWeight: '900', color: COLORS.goldDark },
  previewActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  separateModalBtn: {
    flex: 1,
    minHeight: 45,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.indigoSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  separateModalBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.indigo },
  shareBtn: {
    flex: 1,
    minHeight: 45,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.espresso,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.goldBright },
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
    marginBottom: 12,
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
    marginBottom: 14,
  },
  scopeToggleText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textPrimary },
  generateConfirmBtn: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  generateConfirmText: { fontSize: 13, fontWeight: '800', color: COLORS.goldBright },
});
