/**
 * DirectStay — Print templates (pure HTML strings, no DOM / React) shared by Web + Mobile.
 *  - renderInvoiceHtml(): exact replica of "HOTEL M M PRESTIGE" Tax Invoice (ledger layout)
 *  - renderGrcHtml():     exact replica of "HOTEL RAJ RESIDENCY" Guest Registration Card
 */
import { BillResult, formatMoney } from './billCalculator';

export interface PrintHotel {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  gstNumber?: string;
  panNumber?: string;
  logoUrl?: string;
}

export interface InvoicePrintData {
  hotel: PrintHotel;
  invoiceNumber: string;
  invoiceDate: string; // "05-Nov-2025"
  reservationNo?: string;
  guestName: string;
  guestMobile?: string;
  guestAddress?: string;
  placeOfSupply?: string;
  companyName?: string;
  companyGstin?: string;
  roomLabel: string; // "402 (POD)"
  pax?: number | string;
  checkIn?: string; // "04-Nov-2025 01:33 PM"
  checkOut?: string;
  nights?: number;
  bill: BillResult;
  copyLabel?: string; // ORIGINAL FOR RECIPIENT
  footerNote?: string;
}

export interface GrcPrintData {
  hotel: PrintHotel;
  regNo: string;
  date: string; // "01-11-2026"
  guestName: string;
  address?: string;
  city?: string;
  state?: string;
  nationality?: string;
  mobile?: string;
  adults?: number | string;
  children?: number | string;
  arrival?: string; // "01-11-2026, 09:11 AM"
  departure?: string;
  roomNo?: string;
  roomType?: string;
  roomCharge?: number | string;
  planName?: string;
  taxMode?: 'Include' | 'Exclude' | string;
  bookingNo?: string;
  company?: string;
  voucherNo?: string;
  guestIdType?: string;
  guestIdNumber?: string;
  checkInTime?: string; // "12pm noon"
  checkOutTime?: string; // "11am"
  terms?: string[];
}

export const esc = (v: unknown): string =>
  String(v === undefined || v === null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (v: number) => (v === 0 ? '0.00' : formatMoney(v));

const BASE_CSS = `
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; font-size: 12px; }
  .sheet { width: 100%; max-width: 190mm; margin: 0 auto; padding: 4mm 2mm; }
  table { border-collapse: collapse; width: 100%; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  @media screen { body { background: #f3f3f3; } .sheet { background: #fff; margin: 12px auto; padding: 10mm; box-shadow: 0 1px 6px rgba(0,0,0,.15); } }
`;

// ---------------------------------------------------------------------------
// TAX INVOICE (HOTEL M M PRESTIGE layout)
// ---------------------------------------------------------------------------
export function renderInvoiceHtml(d: InvoicePrintData): string {
  const b = d.bill;
  const isTax = b.isGstInvoice;
  const title = isTax ? 'TAX INVOICE' : 'BILL OF SUPPLY';
  const h = d.hotel;

  const addressLines = String(h.address || '')
    .split(/\n/)
    .map((l) => `<div>${esc(l)}</div>`)
    .join('');

  const guestAddr = String(d.guestAddress || '')
    .split(/\n|,(?=\s*[A-Za-z])/)
    .map((x) => x.trim())
    .filter(Boolean);

  const leftRows: Array<[string, string]> = [
    ['Invoice No.:', d.invoiceNumber],
    ['Reservation No.:', d.reservationNo || ''],
    ['Guest Name:', d.guestName],
    ['Guest Mobile:', d.guestMobile || ''],
    ['Address:', guestAddr.join('<br/>') || ''],
  ];
  if (d.companyName) leftRows.push(['Company:', d.companyName]);
  if (d.companyGstin && isTax) leftRows.push(['Guest GSTIN:', d.companyGstin]);
  leftRows.push(['Place of Supply:', d.placeOfSupply || '']);

  const rightRows: Array<[string, string]> = [
    ['Date:', d.invoiceDate],
    ['Room No:', d.roomLabel],
    ['Pax:', String(d.pax ?? '')],
    ['Check In:', d.checkIn || ''],
    ['Check Out:', d.checkOut || ''],
    ['No. of Night(s):', String(d.nights ?? '')],
  ];

  const kv = (rows: Array<[string, string]>, labelW: string) =>
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="width:${labelW};padding:2px 6px 2px 0;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:2px 0;vertical-align:top">${k === 'Address:' ? v : esc(v)}</td></tr>`
      )
      .join('');

  const ledgerRows = b.lines
    .map((l, i) => {
      const desc = esc(l.description).replace(/\n/g, '<br/>');
      const showCharges = l.type !== 'receipt';
      const showReceipts = true;
      void i;
      return `<tr>
        <td style="padding:3px 4px;vertical-align:top;width:14%">${esc(l.dateLabel)}</td>
        <td style="padding:3px 4px;vertical-align:top;width:7%">${esc(l.roomNumber)}</td>
        <td style="padding:3px 4px;vertical-align:top">${desc}</td>
        <td style="padding:3px 4px;vertical-align:top;width:10%">${esc(l.sac)}</td>
        <td class="right" style="padding:3px 4px;vertical-align:top;width:12%">${showCharges ? money(l.charges) : '0.00'}</td>
        <td class="right" style="padding:3px 4px;vertical-align:top;width:12%">${showReceipts ? money(l.receipts) : ''}</td>
        <td class="right" style="padding:3px 4px;vertical-align:top;width:10%"></td>
      </tr>`;
    })
    .join('');

  const taxRowsHtml = isTax
    ? b.taxRows
        .map(
          (t) =>
            `<tr><td class="center" style="padding:2px">Rs ${money(t.taxable)}</td><td class="center" style="padding:2px">${t.rate}%</td><td class="center" style="padding:2px">Rs ${money(t.tax)}</td></tr>`
        )
        .join('') +
      `<tr><td class="center bold" style="padding:2px">Rs ${money(b.taxRows.reduce((x, t) => x + t.taxable, 0))}</td><td></td><td class="center bold" style="padding:2px">Rs ${money(b.totalTax)}</td></tr>`
    : `<tr><td class="center" style="padding:2px">Rs ${money(b.taxableAmount)}</td><td class="center" style="padding:2px">0%</td><td class="center" style="padding:2px">Rs 0.00</td></tr>`;

  const balanceLabel = b.refundDue > 0 ? 'Refund Due' : 'Balance';
  const balanceValue = b.refundDue > 0 ? b.refundDue : b.balance;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(title)} ${esc(d.invoiceNumber)}</title>
<style>${BASE_CSS}
  .hdr { text-align:center; line-height:1.45; }
  .hdr .name { font-size: 20px; font-weight: 700; letter-spacing: .5px; }
  .ledger th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; font-weight: 700; text-align: left; }
  .ledger th.right { text-align: right; }
  .ledger tbody tr:last-child td { border-bottom: 1px solid #000; }
  .summary td { vertical-align: top; }
</style></head><body><div class="sheet">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="width:70px">${h.logoUrl ? `<img src="${esc(h.logoUrl)}" alt="" style="max-width:70px;max-height:70px;object-fit:contain"/>` : ''}</div>
    <div class="hdr" style="flex:1">
      <div class="name">${esc(String(h.name || '').toUpperCase())}</div>
      ${addressLines}
      ${h.phone ? `<div>Phone: ${esc(h.phone)}</div>` : ''}
      ${h.email ? `<div>Email: ${esc(h.email)}</div>` : ''}
      ${h.website ? `<div>Website: ${esc(h.website)}</div>` : ''}
    </div>
    <div style="width:70px"></div>
  </div>

  <table style="margin-top:14px"><tr>
    <td style="width:33%;vertical-align:bottom;line-height:1.5">
      ${isTax && h.gstNumber ? `<div>GST : ${esc(h.gstNumber)}</div>` : ''}
      ${h.panNumber ? `<div>PAN : ${esc(h.panNumber)}</div>` : ''}
    </td>
    <td class="center bold" style="width:34%;vertical-align:bottom;font-size:14px">${esc(title)}</td>
    <td class="right" style="width:33%;vertical-align:bottom">${esc(d.copyLabel || 'ORIGINAL FOR RECIPIENT')}</td>
  </tr></table>

  <table style="margin-top:12px"><tr>
    <td style="width:58%;vertical-align:top"><table>${kv(leftRows, '120px')}</table></td>
    <td style="width:42%;vertical-align:top"><table>${kv(rightRows, '110px')}</table></td>
  </tr></table>

  <table class="ledger" style="margin-top:14px">
    <thead><tr>
      <th></th><th>Room</th><th>Description</th><th>HSN/SAC</th>
      <th class="right">Charges</th><th class="right">Receipts</th><th class="right">Balance</th>
    </tr></thead>
    <tbody>${ledgerRows}</tbody>
  </table>

  <table class="summary" style="margin-top:6px"><tr>
    <td style="width:58%">
      <table>
        <tr><td class="center" style="padding:2px">Taxable Amount</td><td class="center" style="padding:2px">Tax %</td><td class="center" style="padding:2px">Tax Amount</td></tr>
        ${taxRowsHtml}
      </table>
    </td>
    <td style="width:42%">
      <table>
        ${b.discount > 0 ? `<tr><td style="padding:2px 6px">Discount</td><td class="right" style="padding:2px">Rs ${money(b.discount)}</td></tr>` : ''}
        <tr><td style="padding:2px 6px">Invoice Amount</td><td class="right" style="padding:2px">Rs ${money(b.grandTotal)}</td></tr>
        <tr><td style="padding:2px 6px">Less Receipts</td><td class="right" style="padding:2px">Rs ${money(b.receipts)}</td></tr>
        <tr><td class="bold" style="padding:2px 6px">${balanceLabel}</td><td class="right bold" style="padding:2px">Rs ${money(balanceValue)}</td></tr>
      </table>
    </td>
  </tr></table>

  <div style="margin-top:6px">Invoice Amount In Words: ${esc(b.amountInWords)}</div>

  <div class="center" style="margin-top:40px">${esc(d.footerNote || `Thank you for choosing "${h.name}" as your home away from home.`)}</div>
</div></body></html>`;
}

// ---------------------------------------------------------------------------
// GUEST REGISTRATION CARD (HOTEL RAJ RESIDENCY layout)
// ---------------------------------------------------------------------------
export function defaultGrcTerms(checkInTime = '12pm noon', checkOutTime = '11am'): string[] {
  return [
    `Check-in and Check-out time:- 'Check - in' time is ${checkInTime}. 'Check - out' time is ${checkOutTime}. Early check-in and late check-out are subject to availability and may incur additional charges.`,
    `Luggage Storage:- Luggage can be stored at the guest's sole risk.`,
    `Valuables:- Hotel guests are requested not to leave any valuables open. Any valuables left in the room will be at the guest's own risk and the hotel will not be responsible for any such losses.`,
    `Pets:- Pets are not allowed unless specifically permitted in writing at the time of booking.`,
    `Government Rules & Regulations:- Guests are requested to observe the government rules in force for registrations. Fire arms, alcoholic drinks etc.`,
    `Right of Admission:- Management reserves the right of admission and may ask any guest to vacate their room at any time without any notice or reason. Non-compliance may result in the guest's belongings being removed and the room being secured.`,
    `Use of Hotel Facilities:- The guest should abide by and follow the rules laid by the management. In case of the damage to the hotel property by the guest, they will be liable to compensate the hotel for the same.`,
    `I agree that my liability for the bill is not waived and agree to be held personally liable in the event that the indicated person, company or association fails to pay part or full amount of the charges on the bill.`,
    `Occupancy Policy:- Maximum two adults are allowed in the room. Children under the age of 6 stay free when sharing existing beds with parents. Extra beds are available on request at an additional charge. Unregistered guests are not allowed in the rooms.`,
    `Wifi:- Internet access is provided via the hotel's Wi-Fi. Guests are solely responsible for their use of the network.`,
  ];
}

export function renderGrcHtml(d: GrcPrintData): string {
  const h = d.hotel;
  const terms = d.terms && d.terms.length ? d.terms : defaultGrcTerms(d.checkInTime, d.checkOutTime);
  const row = (label: string, value: unknown, extraLabel?: string, extraValue?: unknown) => `
    <tr>
      <td style="width:190px;padding:3px 4px">${esc(label)}</td>
      <td style="padding:3px 4px">:&nbsp; ${esc(value)}</td>
      ${extraLabel !== undefined ? `<td class="right" style="padding:3px 4px;white-space:nowrap">${esc(extraLabel)}</td><td style="padding:3px 4px;width:120px">${esc(extraValue)}</td>` : '<td></td><td></td>'}
    </tr>`;
  const office = (l1: string, v1: unknown, l2: string, v2: unknown) => `
    <tr>
      <td style="width:150px;padding:3px 4px">${esc(l1)}</td><td style="padding:3px 4px">: ${esc(v1)}</td>
      <td style="width:150px;padding:3px 4px">${esc(l2)}</td><td style="padding:3px 4px">: ${esc(v2)}</td>
    </tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>GRC ${esc(d.regNo)}</title>
<style>${BASE_CSS}
  .grc-box { border: 1px solid #000; }
  .terms { font-size: 10.5px; line-height: 1.4; }
</style></head><body><div class="sheet">
  <div style="display:flex;align-items:center;gap:10px">
    <div style="width:70px">${h.logoUrl ? `<img src="${esc(h.logoUrl)}" alt="" style="max-width:70px;max-height:70px;object-fit:contain"/>` : ''}</div>
    <div class="center" style="flex:1;line-height:1.5">
      <div style="font-size:20px;font-weight:700">${esc(String(h.name || '').toUpperCase())}</div>
      ${h.address ? `<div>${esc(h.address)}</div>` : ''}
      ${h.phone ? `<div>Phone No. :- &nbsp;${esc(h.phone)}</div>` : ''}
      ${h.gstNumber ? `<div>GST No.:- &nbsp;${esc(h.gstNumber)}</div>` : ''}
    </div>
    <div style="width:70px"></div>
  </div>

  <div class="center bold" style="font-size:15px;margin:14px 0 8px;text-decoration:underline">GUEST REGISTRATION CARD</div>

  <table><tr>
    <td class="bold">REG No. - ${esc(d.regNo)}</td>
    <td class="right bold">Date :- ${esc(d.date)}</td>
  </tr></table>

  <table class="grc-box" style="margin-top:6px">
    ${row('Guest Name', String(d.guestName || '').toUpperCase())}
    ${row('Address', String(d.address || '').toUpperCase())}
    ${row('City/State', `${d.city || ''} / ${d.state || ''}`, 'Nationality :', d.nationality || 'India')}
    ${row('Mobile/Tel. No.', d.mobile || '')}
    ${row('No. of Person', `Adults : ${d.adults ?? ''}/ Child: ${d.children ?? ''}`)}
    ${row('Arrival Date', d.arrival || '')}
    ${row('Exp. Departure', d.departure || '')}
  </table>

  <div class="bold" style="margin-top:8px">FOR OFFICE USE ONLY</div>
  <table class="grc-box">
    ${office('Room No.', d.roomNo || '', 'Room Type', d.roomType || '')}
    ${office('Room Charge', d.roomCharge ?? '', 'Plan Name', d.planName || '')}
    ${office('Tax', d.taxMode || '', 'Booking No.', d.bookingNo || '')}
    ${office('Company', d.company || 'Walk-in', 'Voucher No.', d.voucherNo || '')}
    ${office('Guest ID', String(d.guestIdType || '').toUpperCase(), 'ID Number', d.guestIdNumber || '')}
  </table>

  <div class="terms" style="margin-top:18px">
    <div style="margin-bottom:4px">The following are the terms and conditions of the Agreement Under which rooms are permitted to be used by the guests and are binding on them :-</div>
    ${terms.map((t, i) => `<div>${i + 1}. ${esc(t)}</div>`).join('')}
  </div>

  <table style="margin-top:60px"><tr>
    <td class="center" style="width:33%"><div style="border-top:1px solid #000;margin:0 16px;padding-top:4px">Front Office Manager</div></td>
    <td class="center" style="width:34%"><div style="border-top:1px solid #000;margin:0 16px;padding-top:4px">FOA</div></td>
    <td class="center" style="width:33%"><div style="border-top:1px solid #000;margin:0 16px;padding-top:4px">Guest Signature</div></td>
  </tr></table>
</div></body></html>`;
}
