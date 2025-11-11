/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

// EzPass PDF Export Code - Current Implementation
// This is the exact code being used in client/src/pages/EzPass.tsx

const handleExportPdf = async () => {
  if (!ezPassData?.data || ezPassData.data.length === 0) {
    toast.error('No data to export');
    return;
  }
  
  try {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');
    
    // Create PDF in landscape mode for better column fit
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(18);
    doc.text('E-ZPass Data Export', 14, 20);
    
    // Add export date
    doc.setFontSize(10);
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
    
    // Column headers removed - no captions in PDF
    
    // Prepare table data with proper formatting
    const tableData = ezPassData.data.map((row: EzPassRecord) => [
      row.vin || 'N/A',
      row.plateNumber || 'N/A',
      row.tollId || 'N/A',
      row.tollDate ? new Date(row.tollDate).toLocaleDateString() : 'N/A',
      row.tollTime || 'N/A',
      row.tollAuthority || 'N/A',
      row.tollAuthorityDescription || 'N/A',
      row.amount ? `$${row.amount.toFixed(2)}` : 'N/A'
    ]);
    
    // Generate table with optimized column widths
    try {
      doc.autoTable({
        head: [],  // ← THIS SHOULD REMOVE ALL CAPTIONS
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle',
          fillColor: [255, 255, 255], // White background for data cells
          textColor: [0, 0, 0] // Black text for data cells
        },
        columnStyles: {
          // Optimize column widths based on content (no headers)
          0: { cellWidth: 18 }, // VIN
          1: { cellWidth: 20 }, // License Plate
          2: { cellWidth: 15 }, // Toll ID
          3: { cellWidth: 18 }, // Toll Date
          4: { cellWidth: 15 }, // Toll Time
          5: { cellWidth: 25 }, // Toll Authority
          6: { cellWidth: 35 }, // Toll Authority Description
          7: { cellWidth: 15 }  // Amount
        },
        // No header styles needed - no captions
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
        showHead: 'everyPage'
      });
    } catch (autoTableError) {
      console.warn('autoTable failed, using fallback method');
      // Create a custom fallback without headers
      const doc = new jsPDF('landscape');
      doc.setFontSize(18);
      doc.text('E-ZPass Data Export', 14, 20);
      doc.setFontSize(10);
      doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Create table data without headers
      const fallbackTableData = ezPassData.data.map((row: EzPassRecord) => [
        row.vin || 'N/A',
        row.plateNumber || 'N/A',
        row.tollId || 'N/A',
        row.tollDate ? new Date(row.tollDate).toLocaleDateString() : 'N/A',
        row.tollTime || 'N/A',
        row.tollAuthority || 'N/A',
        row.tollAuthorityDescription || 'N/A',
        row.amount ? `$${row.amount.toFixed(2)}` : 'N/A'
      ]);
      
      // Use autoTable without headers
      doc.autoTable({
        head: [],  // ← FALLBACK ALSO USES head: []
        body: fallbackTableData,
        startY: 35,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'left',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 18 }, // VIN
          1: { cellWidth: 20 }, // License Plate
          2: { cellWidth: 15 }, // Toll ID
          3: { cellWidth: 18 }, // Toll Date
          4: { cellWidth: 15 }, // Toll Time
          5: { cellWidth: 25 }, // Toll Authority
          6: { cellWidth: 35 }, // Toll Authority Description
          7: { cellWidth: 15 }  // Amount
        }
      });
      
      const filename = `E-ZPass_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
      doc.save(`${filename}.pdf`);
      return true;
    }
    
    // Add total amount at the bottom
    const totalAmount = ezPassData.data.reduce((sum: number, row: EzPassRecord) => sum + (row.amount || 0), 0);
    const finalY = (doc as any).lastAutoTable.finalY || 200;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, finalY + 15);
    
    // Save the PDF
    const filename = `E-ZPass_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
    doc.save(`${filename}.pdf`);
    
    toast.success('PDF file downloaded successfully');
    return true;
    
  } catch (error) {
    console.error('PDF export error:', error);
    toast.error('Export failed. Please try again.');
    return false;
  }
};

// KEY POINTS:
// 1. head: [] - Should remove all column headers/captions
// 2. Both main method and fallback use head: []
// 3. No headStyles defined since there are no headers
// 4. If you still see VIN caption, check:
//    - Browser console for "autoTable failed" message
//    - Try hard refresh to clear cache
//    - Check if autoTable library is working correctly
