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
import { FilePlus2, Lock, Share2, X } from 'lucide-react-native';
import { usePms } from '../context/PmsContext';
import { COLORS } from '../theme/colors';
import { Invoice } from '../types/pms';

function isInvoiceLockedNoGst(inv: Invoice): boolean {
  return (
    inv.isWithoutGst === true ||
    (inv.gstRate !== undefined && Number(inv.gstRate) <= 0) ||
    (inv.gstRate === undefined && Number(inv.gst || 0) <= 0)
  );
}

export const InvoicesScreen: React.FC = () => {
  const { state, hotelProfile, generateSeparateOrNewInvoice } = usePms();
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(state.bookings[0]?.id || '');
  const [genWithGst, setGenWithGst] = useState(true);
  const [genGstRate, setGenGstRate] = useState(5);
  const [genIncludeServices, setGenIncludeServices] = useState(true);
  const [generating, setGenerating] = useState(false);

  const openGeneratorForBooking = (bookingId: string, defaultWithGst: boolean) => {
    setSelectedBookingId(bookingId);
    setGenWithGst(defaultWithGst);
    setGenGstRate(5);
    setGeneratorOpen(true);
  };

  const handleShareInvoice = async (inv: Invoice) => {
    const noGst = isInvoiceLockedNoGst(inv);
    const msg =
      `*${hotelProfile?.name || 'DirectStay Hotel'}*\n` +
      `${noGst ? 'ROOM BILL (NO GST)' : `TAX INVOICE (${inv.gstRate || 5}% GST)`}\n` +
      `Invoice No: ${inv.invoiceNumber || inv.id}\n` +
      `Guest: ${inv.guestName} (Room ${inv.roomNumber})\n` +
      `Stay: ${inv.checkInDate} to ${inv.checkOutDate}\n` +
      `Subtotal: ₹${Number(inv.subtotal || inv.roomCharges || 0).toLocaleString('en-IN')}\n` +
      (noGst ? '' : `GST: ₹${Number(inv.gst || 0).toLocaleString('en-IN')}\n`) +
      `*Grand Total: ₹${Number(inv.finalAmount || 0).toLocaleString('en-IN')}*\n` +
      `Status: ${inv.paymentStatus || (inv.isPaid ? 'Paid' : 'Unpaid')}`;
    await Share.share({ message: msg });
  };

  return (
    <View style={styles.root}>
      {/* Top Generator Strip */}
      <View style={styles.topStrip}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stripTitle}>GST & Room Bills ({state.invoices.length})</Text>
          <Text style={styles.stripSub}>
            Generated invoices lock GST mode permanently. Use + Separate Invoice for another GST mode.
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
          <FilePlus2 size={15} color={COLORS.espresso} />
          <Text style={styles.newInvBtnText}>+ New / Separate</Text>
        </TouchableOpacity>
      </View>

      {/* Invoices List */}
      <ScrollView contentContainerStyle={styles.list}>
        {state.invoices.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No Generated Invoices Yet</Text>
            <Text style={styles.emptySub}>
              Tap "+ New / Separate" above to generate an official With-GST or No-GST invoice for any booking.
            </Text>
          </View>
        ) : (
          state.invoices.map((inv) => {
            const noGst = isInvoiceLockedNoGst(inv);
            return (
              <TouchableOpacity
                key={inv.id}
                activeOpacity={0.85}
                onPress={() => setViewingInvoice(inv)}
                style={styles.invCard}
              >
                <View style={styles.invRowTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.invNo}>{inv.invoiceNumber || inv.id}</Text>
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

                <Text style={styles.invGuest}>
                  {inv.guestName} • Room {inv.roomNumber}
                </Text>
                <Text style={styles.invDates}>
                  {inv.checkInDate} → {inv.checkOutDate}
                </Text>

                <View style={styles.invFooter}>
                  {/* Strictly Locked GST / No-GST Badge */}
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
                        : `Locked: With GST (${inv.gstRate || 5}%)`}
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

      {/* Invoice Preview Modal (Strictly Immutable GST Mode — Zero Edit Toggles!) */}
      <Modal visible={Boolean(viewingInvoice)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {viewingInvoice && (() => {
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
                          : `Locked: With GST (${viewingInvoice.gstRate || 5}%)`}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setViewingInvoice(null)}>
                      <X size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Classic Espresso & Gold Invoice Sheet */}
                  <View style={styles.espressoSheetHeader}>
                    <Text style={styles.sheetHotelName}>
                      {hotelProfile?.name || 'DIRECTSTAY HOTEL'}
                    </Text>
                    {!noGst && hotelProfile?.gstNumber ? (
                      <Text style={styles.sheetGstin}>GSTIN: {hotelProfile.gstNumber}</Text>
                    ) : null}
                    <Text style={styles.sheetInvNum}>
                      {noGst ? 'ROOM BILL' : 'TAX INVOICE'} • {viewingInvoice.invoiceNumber || viewingInvoice.id}
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
                        Rm {viewingInvoice.roomNumber} ({viewingInvoice.checkInDate} → {viewingInvoice.checkOutDate})
                      </Text>
                    </View>
                    <View style={styles.lineRow}>
                      <Text style={styles.lineLabel}>Room Charges:</Text>
                      <Text style={styles.lineVal}>
                        ₹{Number(viewingInvoice.roomCharges || 0).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    {Number(viewingInvoice.foodCharges || 0) + Number(viewingInvoice.otherCharges || 0) > 0 && (
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
                          CGST + SGST ({viewingInvoice.gstRate || 5}%):
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
                      <Text style={styles.separateModalBtnText}>
                        + Separate ({noGst ? 'With GST' : 'No GST'})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShareInvoice(viewingInvoice)}
                      style={styles.shareBtn}
                    >
                      <Share2 size={15} color={COLORS.goldBright} />
                      <Text style={styles.shareBtnText}>Share / WhatsApp</Text>
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

            <Text style={styles.genSub}>
              1. Select Booking Folio:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
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
                  🔒 Existing invoice(s) for this booking stay 100% untouched. A brand-new Separate Invoice with a unique Invoice Number will be created!
                </Text>
              </View>
            )}

            <Text style={styles.genSub}>2. Select Tax Mode (Locked Once Generated):</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              <TouchableOpacity
                onPress={() => setGenWithGst(true)}
                style={[
                  styles.modeBtn,
                  genWithGst && { backgroundColor: COLORS.emerald, borderColor: COLORS.emerald },
                ]}
              >
                <Text style={[styles.modeBtnText, genWithGst && { color: '#FFF' }]}>
                  With GST ({genGstRate}%)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setGenWithGst(false)}
                style={[
                  styles.modeBtn,
                  !genWithGst && { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
                ]}
              >
                <Text style={[styles.modeBtnText, !genWithGst && { color: '#FFF' }]}>
                  No GST (0% Bill)
                </Text>
              </TouchableOpacity>
            </View>

            {genWithGst && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {[5, 12, 18].map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setGenGstRate(s)}
                    style={[
                      styles.modeBtn,
                      genGstRate === s && { backgroundColor: COLORS.gold, borderColor: COLORS.goldDark },
                    ]}
                  >
                    <Text style={[styles.modeBtnText, genGstRate === s && { color: COLORS.espresso }]}>
                      {s}% GST
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => setGenIncludeServices((p) => !p)}
              style={[styles.scopeToggle, genIncludeServices && { borderColor: COLORS.gold }]}
            >
              <Text style={styles.scopeToggleText}>
                Scope: {genIncludeServices ? 'Booking + POS / Extra Services' : 'Only Room Booking'} (Tap to switch)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={generating || !selectedBookingId}
              onPress={async () => {
                setGenerating(true);
                const res = await generateSeparateOrNewInvoice({
                  bookingId: selectedBookingId,
                  withGst: genWithGst,
                  gstRate: genGstRate,
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
                  : `Generate ${genWithGst ? `With GST (${genGstRate}%)` : 'No GST (0%)'} Invoice`}
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
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stripTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary },
  stripSub: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 2 },
  newInvBtn: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  newInvBtnText: { fontSize: 11.5, fontWeight: '800', color: COLORS.espresso },
  list: { padding: 12, gap: 10, paddingBottom: 30 },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  emptySub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  invCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invNo: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  sepBadge: {
    backgroundColor: COLORS.indigoSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  sepBadgeText: { fontSize: 9, fontWeight: '800', color: COLORS.indigo },
  invTotal: { fontSize: 15, fontWeight: '900', color: COLORS.emerald },
  invGuest: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  invDates: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  invFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: COLORS.indigoSoft,
  },
  sepActionText: { fontSize: 10.5, fontWeight: '800', color: COLORS.indigo },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
  },
  previewTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  espressoSheetHeader: {
    backgroundColor: COLORS.espresso,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  sheetHotelName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  sheetGstin: { color: COLORS.goldBright, fontSize: 11, fontWeight: '700', marginTop: 2 },
  sheetInvNum: { color: '#E2E8F0', fontSize: 11.5, fontWeight: '700', marginTop: 5 },
  sheetBody: {
    marginTop: 12,
    backgroundColor: '#FAFBFD',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 7,
  },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  lineLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  lineVal: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  grandRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 4,
  },
  grandLabel: { fontSize: 13.5, fontWeight: '900', color: COLORS.espresso },
  grandVal: { fontSize: 15, fontWeight: '900', color: COLORS.emerald },
  previewActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  separateModalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.indigoSoft,
    borderWidth: 1,
    borderColor: COLORS.indigoBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  separateModalBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.indigo },
  shareBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.espresso,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.goldBright },
  genTitle: { fontSize: 15.5, fontWeight: '800', color: COLORS.textPrimary },
  genSub: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  bkgChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  bkgChipSel: { backgroundColor: COLORS.espresso, borderColor: COLORS.gold },
  bkgChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  infoNotice: {
    backgroundColor: COLORS.indigoSoft,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  infoNoticeText: { fontSize: 11, fontWeight: '700', color: COLORS.indigo },
  modeBtn: {
    flex: 1,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  scopeToggle: {
    padding: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  scopeToggleText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textPrimary },
  generateConfirmBtn: {
    height: 48,
    borderRadius: 13,
    backgroundColor: COLORS.espresso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateConfirmText: { color: COLORS.goldBright, fontSize: 13.5, fontWeight: '800' },
});
