import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Database } from '@/types/database';

type WorkLog = Database['public']['Tables']['work_logs']['Row'] & {
  clients?: Database['public']['Tables']['clients']['Row'];
};

export function exportToPDF(
  logs: WorkLog[],
  clientName: string,
  monthKey: string,
  totalRevenue: number
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Invoice Header - Company Info
  doc.setFontSize(20);
  doc.setTextColor(0, 210, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('REMAPPRO', 14, 20);

  // Invoice Title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Work Log Report', pageWidth / 2, 20, { align: 'center' });

  // Client and Period Info Box
  const infoY = 50;
  doc.setDrawColor(0, 210, 255);
  doc.setLineWidth(0.5);
  doc.rect(14, infoY - 5, pageWidth - 28, 25);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Client:', 18, infoY + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(clientName, 40, infoY + 3);

  const monthDate = new Date(monthKey + '-01');
  const monthName = monthDate.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  doc.setFont('helvetica', 'bold');
  doc.text('Period:', 18, infoY + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(monthName, 40, infoY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Revenue:', pageWidth - 14, infoY + 3, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 210, 255);
  doc.text(`€${totalRevenue.toFixed(2)}`, pageWidth - 14, infoY + 10, { align: 'right' });

  // Table
  const tableData = logs.map((log, index) => {
    const serviceItems = Array.isArray(log.service_items) 
      ? log.service_items as Array<{ service_name: string; price: number }>
      : [];
    
    const servicesList = serviceItems.map(item => item.service_name).join(', ') || 'Unknown';
    const totalPrice = serviceItems.reduce((sum, item) => sum + Number(item.price), 0) || Number(log.total_price);
    
    const date = new Date(log.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return [
      (index + 1).toString(),
      date,
      log.car_info || '—',
      servicesList,
      `€${totalPrice.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    head: [['#', 'Date', 'Car Details', 'Service Type', 'Price']],
    body: tableData,
    startY: infoY + 30,
    styles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [0, 210, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 35 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50 },
      4: { cellWidth: 30, halign: 'right' },
    },
  });

  // Summary Section
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setDrawColor(0, 210, 255);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 70, finalY, pageWidth - 14, finalY);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Entries:', pageWidth - 70, finalY + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(logs.length.toString(), pageWidth - 14, finalY + 8, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Total Revenue:', pageWidth - 70, finalY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 210, 255);
  doc.text(`€${totalRevenue.toFixed(2)}`, pageWidth - 14, finalY + 15, { align: 'right' });

  // Footer - Company Info
  const footerY = finalY + 30;
  
  if (footerY > pageHeight - 20) {
    doc.addPage();
    doc.setFontSize(10);
    doc.setTextColor(0, 210, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('REMAPPRO', 
      pageWidth / 2, pageHeight - 10, { align: 'center' });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(0, 210, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('REMAPPRO', 
      pageWidth / 2, footerY, { align: 'center' });
  }

  // Generate filename
  const filename = `REMAPPRO_${clientName.replace(/\s+/g, '_')}_${monthKey}.pdf`;
  doc.save(filename);
}
