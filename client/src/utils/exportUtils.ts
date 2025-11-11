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

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ExportData {
  [key: string]: any;
}

export const exportToExcel = (data: ExportData[], filename: string) => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    
    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Create blob and download
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    return true;
  } catch (error) {
    console.error('Excel export error:', error);
    return false;
  }
};


// Simple test function to verify PDF generation
export const testPdfExport = () => {
  try {
    const doc = new jsPDF();
    doc.text('Test PDF Export', 20, 20);
    doc.text('This is a test PDF to verify jsPDF is working.', 20, 40);
    doc.save('test-export.pdf');
    return true;
  } catch (error) {
    console.error('Test PDF export failed:', error);
    return false;
  }
};

// Fallback PDF export without autoTable
export const exportToPdfSimple = (data: ExportData[], columns: any[], filename: string, title: string) => {
  try {
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 22);
    
    // Extract column headers
    const columnHeaders = columns.map((col, index) => {
      if (typeof col.header === 'string') {
        return col.header;
      }
      return col.id || `Column ${index + 1}`;
    });
    
    // Calculate optimal column width based on page width
    const pageWidth = 210; // A4 width in mm
    const margin = 14;
    const availableWidth = pageWidth - (margin * 2);
    const cellWidth = Math.min(availableWidth / columns.length, 25); // Max 25mm per column
    const startX = margin;
    
    // Create simple table manually
    let yPosition = 40;
    const cellHeight = 8;
    
    // Draw headers
    doc.setFillColor(66, 139, 202);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    
    columnHeaders.forEach((header, index) => {
      const x = startX + (index * cellWidth);
      doc.rect(x, yPosition, cellWidth, cellHeight, 'F');
      
      // Truncate header text to fit
      const maxChars = Math.floor(cellWidth / 1.5); // Approximate chars per mm
      const headerText = header.substring(0, maxChars);
      doc.text(headerText, x + 1, yPosition + 5);
    });
    
    yPosition += cellHeight;
    
    // Draw data rows
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    
    data.forEach((row, rowIndex) => {
      columns.forEach((col, colIndex) => {
        const accessorKey = col.accessorKey || col.id;
        const value = row[accessorKey];
        
        // Format the value
        let cellText = 'N/A';
        if (value !== null && value !== undefined) {
          if (typeof value === 'number' && (accessorKey === 'amount' || accessorKey === 'adjustedAmount')) {
            cellText = `$${value.toFixed(2)}`;
          } else if (accessorKey.includes('Date') && value) {
            try {
              cellText = new Date(value).toLocaleDateString();
            } catch (e) {
              cellText = String(value);
            }
          } else {
            cellText = String(value);
          }
        }
        
        // Truncate text to fit
        const maxChars = Math.floor(cellWidth / 1.2); // Approximate chars per mm
        cellText = cellText.substring(0, maxChars);
        
        const x = startX + (colIndex * cellWidth);
        doc.text(cellText, x + 1, yPosition + 5);
      });
      yPosition += cellHeight;
      
      // Add new page if needed
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
    });
    
    // Save the PDF
    doc.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Simple PDF Export Error:', error);
    return false;
  }
};

export const exportToPdf = (data: ExportData[], columns: any[], filename: string, title: string) => {
  try {
    // Validate inputs
    if (!data || data.length === 0) {
      console.error('No data provided for PDF export');
      return false;
    }
    
    if (!columns || columns.length === 0) {
      console.error('No columns provided for PDF export');
      return false;
    }
    
    // Try autoTable first, fallback to simple method
    try {
      // Use landscape orientation for tables with many columns
      const useLandscape = columns.length > 6;
      const doc = new jsPDF(useLandscape ? 'landscape' : 'portrait');
      
      // Add title
      doc.setFontSize(16);
      doc.text(title, 14, 22);
      
      // Extract column headers
      const columnHeaders = columns.map((col, index) => {
        if (typeof col.header === 'string') {
          return col.header;
        }
        return col.id || `Column ${index + 1}`;
      });
      
      // Prepare table data
      const tableData = data.map(row => 
        columns.map(col => {
          const accessorKey = col.accessorKey || col.id;
          if (!accessorKey) return 'N/A';
          
          const value = row[accessorKey];
          if (value === null || value === undefined) return 'N/A';
          
          // Format values
          if (typeof value === 'number' && (accessorKey === 'amount' || accessorKey === 'adjustedAmount')) {
            return `$${value.toFixed(2)}`;
          }
          
          if (accessorKey.includes('Date') && value) {
            try {
              return new Date(value).toLocaleDateString();
            } catch (e) {
              return String(value);
            }
          }
          
          return String(value);
        })
      );
      
      // Try autoTable with responsive column widths
      (doc as any).autoTable({
        head: [columnHeaders],
        body: tableData,
        startY: 30,
        styles: {
          fontSize: useLandscape ? 7 : 8,
          cellPadding: 2,
          overflow: 'linebreak',
          halign: 'left',
        },
        columnStyles: {
          // Make all columns equal width
          ...Object.fromEntries(columns.map((_, index) => [index, { cellWidth: 'auto' }]))
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { left: 14, right: 14 },
      });
      
      // Save the PDF
      doc.save(`${filename}.pdf`);
      return true;
      
    } catch (autoTableError) {
      console.warn('autoTable failed, using fallback method');
      
      // Fallback to simple method
      return exportToPdfSimple(data, columns, filename, title);
    }
    
  } catch (error) {
    console.error('PDF export error:', error);
    return false;
  }
};
