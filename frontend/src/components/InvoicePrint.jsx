import React, { useRef, useState } from 'react';
import { X, Printer, Download } from 'lucide-react';
import jsPDF from 'jspdf';

const PURPLE = '#6d28d9';

const InvoicePrint = ({ order, user, onClose }) => {
  const printRef = useRef(null);
  const [logoError, setLogoError] = useState(false);

  if (!order) return null;

  const invoiceNumber = order.invoice_number || order.id || '-';
  const invoiceDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '-';
  const buildTitle = () => `Tax Invoice - ${order?.order_number || ''}`;

  // Calculate tax breakdown from items
  const taxSummary = {};
  (order.items || []).forEach((item) => {
    const rate = item.gst_rate || 0;
    const gstAmt = item.gst_amount || 0;
    const gstType = (item.gst_type || 'igst').toLowerCase();
    if (!taxSummary[rate]) taxSummary[rate] = { cgst: 0, sgst: 0, igst: 0, total: 0 };
    if (gstType === 'cgst_sgst' || gstType === 'intra') {
      taxSummary[rate].cgst += gstAmt / 2;
      taxSummary[rate].sgst += gstAmt / 2;
    } else {
      taxSummary[rate].igst += gstAmt;
    }
    taxSummary[rate].total += gstAmt;
  });

  const totalGst = order.gst_amount || 0;
  const totalCgst = Object.values(taxSummary).reduce((s, v) => s + v.cgst, 0);
  const totalSgst = Object.values(taxSummary).reduce((s, v) => s + v.sgst, 0);
  const totalIgst = Object.values(taxSummary).reduce((s, v) => s + v.igst, 0);
  const subtotalBeforeGst = (order.total_amount || 0) - totalGst;

  const isIntraState = totalCgst > 0 || totalSgst > 0;

  // ── PRINT ───────────────────────────────────────────────────────────
  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${buildTitle()}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #000; background: #fff; font-size: 11px; margin:0; padding:0; }
          .inv-wrapper { max-width: 720px; margin: 0 auto; }
          h1.company { font-size: 22px; font-weight: 900; color: ${PURPLE}; text-align: center; margin: 0 0 2px; }
          .sub { font-size: 10px; color: #444; text-align: center; margin: 0 0 2px; }
          .address { font-size: 11px; text-align: center; margin: 0 0 8px; }
          .inv-header-box { border: 1px solid #999; border-collapse: collapse; width: 100%; margin-bottom: 6px; }
          .inv-header-box td { padding: 4px 8px; font-size: 11px; }
          .inv-label { font-weight: 700; color: ${PURPLE}; }
          .title-bar { text-align: center; font-size: 14px; font-weight: 800; color: ${PURPLE}; letter-spacing: 1px; }
          .title-sub { font-size: 9px; text-align: center; color: #555; }
          table.items { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10.5px; }
          table.items th { background: ${PURPLE}; color: #fff; padding: 5px 6px; text-align: center; font-weight: 700; border: 1px solid #888; }
          table.items td { padding: 4px 6px; border: 1px solid #bbb; text-align: center; }
          table.items td:first-child { text-align: left; }
          .totals-table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; }
          .totals-table td { padding: 3px 8px; }
          .totals-table .lbl { font-weight: 600; color: ${PURPLE}; }
          .totals-table .amt { text-align: right; font-weight: 600; }
          .grand-total td { font-size: 13px; font-weight: 900; color: ${PURPLE}; border-top: 2px solid ${PURPLE}; padding-top: 4px; }
          .bill-to { border: 1px solid #bbb; padding: 6px 10px; margin-bottom: 6px; font-size: 11px; line-height: 1.6; }
          .bill-to .section-title { font-weight: 800; color: ${PURPLE}; font-size: 12px; margin-bottom: 4px; }
          .footer { border-top: 1px solid #bbb; margin-top: 12px; padding-top: 8px; font-size: 9.5px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="inv-wrapper">${content}</div>
      </body>
      </html>
    `);
    doc.close();
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      finally { document.body.removeChild(iframe); }
    }, 300);
  };

  // PDF generator (kept for later; UI button removed)
  const handleDownload = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    let y = 36;

    // Company name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(109, 40, 217);
    doc.text((user?.name || user?.company_name || 'Company').toUpperCase(), pw / 2, y, { align: 'center' });
    y += 16;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    if (user?.tagline) { doc.text(user.tagline, pw / 2, y, { align: 'center' }); y += 12; }
    if (user?.address) { doc.text(user.address, pw / 2, y, { align: 'center' }); y += 12; }
    y += 6;

    // Title bar
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(109, 40, 217);
    doc.text('TAX INVOICE', pw / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Subject to Salem Jurisdiction', pw / 2, y, { align: 'center' });
    y += 14;

    // Info row: Invoice No, Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(`INVOICE NO : ${order.order_number}`, 40, y);
    doc.text(`DATE : ${invoiceDate}`, pw - 40, y, { align: 'right' });
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    // GSTIN / State
    const sellerGstin = user?.gstin || '-';
    doc.text(`GSTIN : ${sellerGstin}`, 40, y);
    doc.text('STATE : TAMILNADU', pw / 2, y, { align: 'center' });
    doc.text('STATE CODE : 33', pw - 40, y, { align: 'right' });
    y += 20;

    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(109, 40, 217);
    doc.text('Bill To:', 40, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
    doc.setFontSize(10);
    [
      order.customer_name || '-',
      order.customer_email || '',
      order.customer_phone || '',
      order.customer_address || '',
      `GSTIN: ${order.customer_gstin || '-'}`,
    ].filter(Boolean).forEach((line) => {
      const lines = doc.splitTextToSize(line, pw - 80);
      doc.text(lines, 40, y);
      y += lines.length * 12;
    });
    y += 6;

    // Items table - manual draw
    const cols = [40, 70, 240, 340, 380, 430, 475, 520]; // x positions for column starts
    const headers = ['#', 'Particulars', 'Rate (₹)', 'Qty', 'Amt (₹)', 'GST%', 'GST Amt', 'Total'];
    const rowH = 18;

    // Header row background
    doc.setFillColor(109, 40, 217);
    doc.rect(40, y, pw - 80, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    headers.forEach((h, i) => {
      const cx = cols[i] + (i < headers.length - 1 ? (cols[i + 1] - cols[i]) / 2 : (pw - 40 - cols[i]) / 2);
      doc.text(h, cx, y + 12, { align: 'center' });
    });
    doc.setDrawColor(136, 136, 136);
    doc.rect(40, y, pw - 80, rowH);
    y += rowH;

    // Item rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    (order.items || []).forEach((item, idx) => {
      if (y > 760) { doc.addPage(); y = 40; }
      const bg = idx % 2 === 0 ? [255, 255, 255] : [249, 246, 255];
      doc.setFillColor(...bg);
      doc.rect(40, y, pw - 80, rowH, 'F');
      doc.setDrawColor(204, 204, 204);
      doc.rect(40, y, pw - 80, rowH);
      const baseAmt = (item.unit_price || 0) * (item.quantity || 0);
      const rowVals = [
        String(idx + 1),
        String(item.product_name || '-'),
        (item.unit_price || 0).toFixed(2),
        String(item.quantity || 0),
        baseAmt.toFixed(2),
        item.gst_rate ? `${item.gst_rate}%` : '-',
        (item.gst_amount || 0).toFixed(2),
        (item.subtotal || 0).toFixed(2),
      ];
      rowVals.forEach((val, ci) => {
        const x = ci === 1 ? cols[ci] + 2 : cols[ci] + (ci < cols.length - 1 ? (cols[ci + 1] - cols[ci]) / 2 : (pw - 40 - cols[ci]) / 2);
        const align = ci === 1 ? 'left' : 'center';
        const segment = ci === 1 ? doc.splitTextToSize(val, 95) : [val];
        doc.text(segment[0], x, y + 12, { align });
      });
      y += rowH;
    });
    y += 6;

    // Totals
    const totalsData = [
      ['Sub Total (excl. GST)', `Rs.${subtotalBeforeGst.toFixed(2)}`],
    ];
    if (isIntraState) {
      totalsData.push(['ADD: CGST 2.5%', `Rs.${totalCgst.toFixed(2)}`]);
      totalsData.push(['ADD: SGST 2.5%', `Rs.${totalSgst.toFixed(2)}`]);
    } else if (totalIgst > 0) {
      totalsData.push(['ADD: IGST', `Rs.${totalIgst.toFixed(2)}`]);
    }
    totalsData.push(['Total GST', `Rs.${totalGst.toFixed(2)}`]);
    totalsData.push(['TOTAL INVOICE VALUE', `Rs.${Math.round(order.total_amount || 0).toFixed(2)}`]);

    totalsData.forEach(([label, value], idx) => {
      if (y > 760) { doc.addPage(); y = 40; }
      const isLast = idx === totalsData.length - 1;
      doc.setFont('helvetica', isLast ? 'bold' : 'normal');
      doc.setFontSize(isLast ? 11 : 9.5);
      doc.setTextColor(isLast ? 109 : 60, isLast ? 40 : 60, isLast ? 217 : 60);
      if (isLast) {
        doc.setDrawColor(109, 40, 217);
        doc.line(pw - 200, y - 2, pw - 40, y - 2);
      }
      doc.text(label, pw - 200, y);
      doc.text(value, pw - 40, y, { align: 'right' });
      y += isLast ? 16 : 13;
    });


    // Footer
    y += 16;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Terms & Conditions:', 40, y);
    y += 12;
    const terms = 'Our Responsibility ceases as soon as the goods leave our premises. Subject to local jurisdiction.';
    const termLines = doc.splitTextToSize(terms, 280);
    doc.text(termLines, 40, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(109, 40, 217);
    doc.text(`For ${(user?.name || user?.company_name || 'Company').toUpperCase()}`, pw - 40, y + 20, { align: 'right' });
    y += 50;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text('Authorised Signatory', pw - 40, y, { align: 'right' });

    doc.save(`invoice-${order.order_number || 'order'}.pdf`);
  };

  // ── RENDER ──────────────────────────────────────────────────────────
  const sellerName = user?.name || user?.company_name || 'Company';
  const sellerGstin = user?.gstin || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
        style={{ border: `2px solid ${PURPLE}33` }}
      >
        {/* Modal Header */}
        <div
          className="flex justify-between items-center px-6 py-4 sticky top-0 z-10"
          style={{ background: PURPLE, color: '#fff' }}
        >
          <h2 className="text-lg font-bold tracking-wide">Tax Invoice — {order.order_number}</h2>
          <div className="flex gap-2 items-center">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-white/20 hover:bg-white/30 border border-white/30 transition-colors"
            >
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable invoice body */}
        <div className="overflow-auto flex-1 bg-gray-50 p-4">
          <div
            ref={printRef}
            style={{
              background: '#fff',
              color: '#000',
              fontFamily: 'Arial, sans-serif',
              padding: '24px 28px',
              maxWidth: '680px',
              margin: '0 auto',
              fontSize: '11px',
            }}
          >
            {/* Company Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              {!logoError ? (
                <img
                  src="/logo.png"
                  alt="Logo"
                  onError={() => setLogoError(true)}
                  style={{ maxHeight: '56px', margin: '0 auto 4px', display: 'block' }}
                />
              ) : null}
              <h1
                className="company"
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: PURPLE,
                  margin: '0 0 2px',
                  letterSpacing: '1px',
                }}
              >
                {sellerName.toUpperCase()}
              </h1>
              {user?.tagline && (
                <p style={{ fontSize: '9px', color: '#555', margin: '0 0 2px', fontStyle: 'italic' }}>
                  {user.tagline}
                </p>
              )}
              {user?.address && (
                <p style={{ fontSize: '10px', margin: '0 0 4px' }}>{user.address}</p>
              )}
              {user?.email && (
                <p style={{ fontSize: '9px', color: '#0066cc', margin: 0 }}>{user.email}</p>
              )}
            </div>

            <hr style={{ borderColor: PURPLE, borderWidth: '2px', margin: '8px 0' }} />

            {/* Invoice Title */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: PURPLE, letterSpacing: '2px' }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: '9px', color: '#666' }}>Subject to Local Jurisdiction</div>
            </div>

            {/* Info block */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #aaa',
                marginBottom: '6px',
                fontSize: '10px',
              }}
            >
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px', border: '1px solid #aaa', width: '35%' }}>
                    <span style={{ fontWeight: 700, color: PURPLE }}>INVOICE NO : </span>
                    <strong>{order.order_number}</strong>
                  </td>
                  <td
                    style={{
                      padding: '4px 8px',
                      border: '1px solid #aaa',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: PURPLE,
                      fontSize: '11px',
                    }}
                  >
                    TAX INVOICE
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #aaa', textAlign: 'right', width: '28%' }}>
                    <span style={{ fontWeight: 700, color: PURPLE }}>DATE : </span>
                    {invoiceDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px', border: '1px solid #aaa' }}>
                    <span style={{ fontWeight: 700, color: PURPLE }}>GSTIN : </span>{sellerGstin}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #aaa', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, color: PURPLE }}>STATE : </span>
                    {user?.state || 'TAMILNADU'}
                  </td>
                  <td style={{ padding: '4px 8px', border: '1px solid #aaa', textAlign: 'right' }}>
                    <span style={{ fontWeight: 700, color: PURPLE }}>STATE CODE : </span>
                    {user?.state_code || '33'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Bill To */}
            <div
              style={{
                border: '1px solid #bbb',
                padding: '8px 12px',
                marginBottom: '8px',
                fontSize: '11px',
                lineHeight: 1.7,
              }}
            >
              <div style={{ fontWeight: 800, color: PURPLE, fontSize: '11px', marginBottom: '2px' }}>
                To :
              </div>
              <strong>{order.customer_name || '-'}</strong>
              {order.customer_address && (
                <div style={{ whiteSpace: 'pre-line' }}>{order.customer_address}</div>
              )}
              {order.customer_email && <div>{order.customer_email}</div>}
              {order.customer_phone && <div>Ph: {order.customer_phone}</div>}
              {order.customer_gstin && (
                <div>
                  <span style={{ fontWeight: 700, color: PURPLE }}>GSTIN : </span>
                  {order.customer_gstin}
                </div>
              )}
            </div>

            {/* Items Table */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '8px',
                fontSize: '10.5px',
              }}
            >
              <thead>
                <tr>
                  {[
                    '#',
                    'Particulars',
                    'Rate / Unit (₹)',
                    'Qty',
                    'Amount (₹)',
                    'GST %',
                    'GST Amt (₹)',
                    'Total (₹)',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        background: PURPLE,
                        color: '#fff',
                        padding: '5px 6px',
                        border: '1px solid #888',
                        textAlign: h === 'Particulars' ? 'left' : 'center',
                        fontWeight: 700,
                        fontSize: '10px',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, idx) => {
                  const baseAmt = (item.unit_price || 0) * (item.quantity || 0);
                  return (
                    <tr key={item.id || idx}>
                      <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'center' }}>
                        {idx + 1}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'left' }}>
                        {item.product_name}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>
                        {(item.unit_price || 0).toFixed(2)}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'center' }}>
                        {item.quantity}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>
                        {baseAmt.toFixed(2)}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'center' }}>
                        {item.gst_rate ? `${item.gst_rate}%` : '-'}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right' }}>
                        {(item.gst_amount || 0).toFixed(2)}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>
                        {(item.subtotal || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {/* Empty rows for visual space */}
                {Array.from({ length: Math.max(0, 4 - (order.items || []).length) }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} style={{ border: '1px solid #ddd', padding: '6px', height: '22px' }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Section */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '8px' }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      padding: '4px 8px',
                      borderTop: '1px solid #aaa',
                      borderLeft: '1px solid #aaa',
                      fontWeight: 700,
                      color: PURPLE,
                      width: '55%',
                      verticalAlign: 'top',
                    }}
                  >
                    TOTAL AMOUNT IN WORDS :
                    <div style={{ fontWeight: 500, color: '#000', fontStyle: 'italic', marginTop: '2px', fontSize: '10px' }}>
                      {numberToWords(order.total_amount || 0)} Rupees Only
                    </div>
                  </td>
                  <td style={{ padding: '4px 8px', borderTop: '1px solid #aaa', width: '25%', fontWeight: 700, color: PURPLE }}>
                    TOTAL
                  </td>
                  <td
                    style={{
                      padding: '4px 8px',
                      borderTop: '1px solid #aaa',
                      borderRight: '1px solid #aaa',
                      textAlign: 'right',
                      fontWeight: 700,
                    }}
                  >
                    ₹{subtotalBeforeGst.toFixed(2)}
                  </td>
                </tr>
                {isIntraState && (
                  <>
                    <TaxRow label="ADD : CGST 2.5 %" value={totalCgst} purple={PURPLE} />
                    <TaxRow label="ADD : SGST 2.5 %" value={totalSgst} purple={PURPLE} />
                  </>
                )}
                {!isIntraState && totalIgst > 0 && (
                  <TaxRow label="ADD : IGST" value={totalIgst} purple={PURPLE} />
                )}
                <tr>
                  <td
                    style={{
                      padding: '4px 8px',
                      borderLeft: '1px solid #aaa',
                      border: '1px solid #aaa',
                      fontSize: '10px',
                    }}
                    rowSpan={3}
                  >
                    <div style={{ fontWeight: 700, color: PURPLE, marginBottom: '2px' }}>BANK DETAILS</div>
                    {user?.bank_name && <div><strong>BANK</strong> : {user.bank_name}</div>}
                    {user?.account_no && <div><strong>A/C NO</strong> : {user.account_no}</div>}
                    {user?.ifsc && <div><strong>IFSC</strong> : {user.ifsc}</div>}
                    {user?.branch && <div><strong>BRANCH</strong> : {user.branch}</div>}
                    {!user?.bank_name && !user?.account_no && (
                      <div style={{ color: '#999', fontStyle: 'italic' }}>No bank details on file</div>
                    )}
                  </td>
                  <td style={{ padding: '4px 8px', fontWeight: 700, color: PURPLE }}>TOTAL AMOUNT AFTER TAX</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, borderRight: '1px solid #aaa' }}>
                    ₹{(order.total_amount || 0).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px', color: '#555' }}>ROUND OFF</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color: '#555', borderRight: '1px solid #aaa' }}>
                    ₹{(Math.round(order.total_amount || 0) - (order.total_amount || 0)).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: '6px 8px',
                      fontWeight: 900,
                      fontSize: '13px',
                      color: PURPLE,
                      borderTop: '2px solid #aaa',
                    }}
                  >
                    TOTAL INVOICE VALUE
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      textAlign: 'right',
                      fontWeight: 900,
                      fontSize: '14px',
                      color: PURPLE,
                      borderTop: '2px solid #aaa',
                      borderRight: '1px solid #aaa',
                      borderBottom: '1px solid #aaa',
                    }}
                  >
                    ₹{Math.round(order.total_amount || 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div
              style={{
                borderTop: '1px solid #bbb',
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                fontSize: '10px',
              }}
            >
              <div style={{ maxWidth: '55%' }}>
                <div style={{ fontWeight: 700, color: PURPLE, marginBottom: '2px' }}>Terms And Conditions :</div>
                <div style={{ color: '#555', fontSize: '9px', lineHeight: 1.5 }}>
                  Our Responsibility ceases as soon as the goods leave our premises. If any dispute arises it shall
                  have Jurisdiction of local Courts only. Subject to local jurisdiction.
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: PURPLE, marginBottom: '24px' }}>
                  For {sellerName.toUpperCase()}
                </div>
                <div style={{ borderTop: '1px solid #aaa', paddingTop: '4px', fontSize: '10px' }}>
                  Authorised Signatory
                </div>
                <div style={{ fontSize: '9px', color: '#777', marginTop: '4px' }}>(E &amp; OE)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper row for tax lines
function TaxRow({ label, value, purple }) {
  return (
    <tr>
      <td style={{ padding: '3px 8px', borderLeft: '1px solid #aaa' }} />
      <td style={{ padding: '3px 8px', color: '#333' }}>{label}</td>
      <td style={{ padding: '3px 8px', textAlign: 'right', borderRight: '1px solid #aaa' }}>
        ₹{value.toFixed(2)}
      </td>
    </tr>
  );
}

// Convert number to words (Indian numbering)
function numberToWords(num) {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.round(num);
  if (n === 0) return 'Zero';
  const inWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  };
  return inWords(n);
}

export default InvoicePrint;
