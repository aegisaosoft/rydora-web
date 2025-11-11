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
 * Author: Alexander Orlov
 *
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rydoraApi } from '../services/api';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { exportToExcel } from '../utils/exportUtils';
import './EzPass.css';

type EzPassRecord = {
  id: number;
  externalFleetCode: string | null;
  fleetName: string | null;
  vehicleId: string | null;
  vin: string | null;
  plateNumber: string | null;
  driverFirstName: string | null;
  driverLastName: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  driverEmailAddress: string | null;
  tollId: number;
  tollDate: string;
  tollTime: string | null;
  tollExitDate: string | null;
  tollAuthority: string | null;
  tollAuthorityDescription: string | null;
  transactionType: string | null;
  entry: string | null;
  exit: string | null;
  amount: number;
  currency: string | null;
  dateInvoiceDeployed: string;
  infoHeader: string | null;
  dailyPaymentId: string | null;
  adjustedAmount: number;
  originalPayerId: string | null;
  transponderNumber: string | null;
};

const EzPass: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const lastAttemptRef = useRef<number>(0);
  const attemptCountRef = useRef<number>(0);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set default dates
  useEffect(() => {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);
    
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(oneMonthAgo.toISOString().split('T')[0]);
    setHasSearched(true); // Enable automatic search on page load
  }, []);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  const { data: ezPassData, isLoading, error, refetch } = useQuery({
    queryKey: ['ezpass', dateFrom, dateTo],
    queryFn: () => rydoraApi.getEzPass(dateFrom, dateTo, 1),
    enabled: hasSearched,
    retry: 1
  });

  // Handle errors with enhanced rate limiting detection
  useEffect(() => {
    if (error) {
      const errorResponse = (error as any).response;
      
      // Handle rate limiting with specific messaging
      if (errorResponse?.status === 429) {
        const retryAfter = (error as any).retryAfterSeconds || 30;
        toast.error(
          `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
          { duration: 8000 }
        );
        
        // Start cooldown timer
        setCooldownTime(retryAfter);
        cooldownIntervalRef.current = setInterval(() => {
          setCooldownTime(prev => {
            if (prev <= 1) {
              if (cooldownIntervalRef.current) {
                clearInterval(cooldownIntervalRef.current);
                cooldownIntervalRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (errorResponse?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (errorResponse?.status === 403) {
        toast.error('Access denied. Please contact support.');
      } else if (errorResponse?.status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (!errorResponse) {
        toast.error('Network error. Please check your connection.');
      } else if (errorResponse?.status !== 404) {
        // Only show error if it's not a 404 (empty data is expected)
        toast.error(errorResponse?.data?.message || 'Failed to load EZ Pass data');
      }
    }
  }, [error]);

  const handleSearch = () => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptRef.current;
    
    // Prevent rapid successive attempts (minimum 2 seconds between attempts)
    if (timeSinceLastAttempt < 2000) {
      toast.error('Please wait a moment before trying again.');
      return;
    }
    
    // Track attempts and implement client-side rate limiting
    attemptCountRef.current += 1;
    lastAttemptRef.current = now;
    
    // Reset attempt count after 5 minutes
    if (attemptCountRef.current > 5) {
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      if (lastAttemptRef.current < fiveMinutesAgo) {
        attemptCountRef.current = 1;
      }
    }
    
    // Block if too many attempts in short time
    if (attemptCountRef.current > 5) {
      toast.error('Too many search attempts. Please wait 5 minutes before trying again.');
      return;
    }

    if (!dateFrom || !dateTo) {
      toast.error('Please select both Date from and Date to.');
      return;
    }
    
    if (new Date(dateFrom) > new Date(dateTo)) {
      toast.error('Date from cannot be later than Date to.');
      return;
    }

    setHasSearched(true);
    refetch();
  };

  const handleExportExcel = async () => {
    if (!ezPassData?.data || ezPassData.data.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const success = exportToExcel(
      ezPassData.data, 
      `E-ZPass_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`
    );
    
    if (success) {
      toast.success('Excel file downloaded successfully');
    } else {
      toast.error('Export failed. Please try again.');
    }
  };

  const handleExportPdf = async () => {
    if (!ezPassData?.data || ezPassData.data.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    try {
      // Import jsPDF and autoTable plugin
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable'); // Import plugin to register it with jsPDF
      
      // Create PDF in landscape mode
      const doc = new jsPDF('landscape');
      
      // Add title
      doc.setFontSize(18);
      doc.text('E-ZPass', 14, 20);
      
      // Add export date
      doc.setFontSize(10);
      doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Define column headers
      const headers = [
        'VIN',
        'License Plate', 
        'Toll ID',
        'Toll Date',
        'Toll Time',
        'Toll Authority',
        'Toll Authority Description',
        'Amount'
      ];
      
      // Prepare table data with proper formatting
      const tableData = ezPassData.data.map((row: EzPassRecord) => [
        row.vin || 'N/A',
        row.plateNumber || 'N/A',
        row.tollId?.toString() || 'N/A',
        row.tollDate ? new Date(row.tollDate).toLocaleDateString() : 'N/A',
        row.tollTime || 'N/A',
        row.tollAuthority || 'N/A',
        row.tollAuthorityDescription || 'N/A',
        row.adjustedAmount ? `$${row.adjustedAmount.toFixed(2)}` : 'N/A'
      ]);
      
      // Generate table with headers
      doc.autoTable({
        head: [headers], // Array of headers
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
          textColor: [0, 0, 0], // Black text
          lineColor: [0, 0, 0], // Black borders
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [41, 128, 185], // Blue background for headers
          textColor: [255, 255, 255], // White text for headers
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          // Adjusted column widths for landscape A4 (297mm width)
          0: { cellWidth: 30 }, // VIN
          1: { cellWidth: 25 }, // License Plate  
          2: { cellWidth: 20 }, // Toll ID
          3: { cellWidth: 25 }, // Toll Date
          4: { cellWidth: 20 }, // Toll Time
          5: { cellWidth: 35 }, // Toll Authority
          6: { cellWidth: 60 }, // Toll Authority Description
          7: { cellWidth: 25, halign: 'right' } // Amount (right-aligned)
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250] // Light gray alternating rows
        },
        margin: { left: 14, right: 14 },
        tableWidth: 'auto',
        showHead: 'everyPage', // Show headers on every page
        pageBreak: 'auto',
        rowPageBreak: 'avoid'
      });
      
      // Add total amount at the bottom
      const totalAmount = ezPassData.data.reduce((sum: number, row: EzPassRecord) => sum + (row.adjustedAmount || 0), 0);
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, finalY + 15);
      doc.text(`Total Records: ${ezPassData.data.length}`, 14, finalY + 25);
      
      // Save the PDF
      const filename = `E-ZPass_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
      doc.save(`${filename}.pdf`);
      
      return true;
      
    } catch (error) {
      console.error('PDF export error:', error);
      
      // Manual table creation fallback (no autoTable dependency)
      try {
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text('E-ZPass', 14, 20);
        doc.setFontSize(10);
        doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
        
        // Manual table creation
        let yPosition = 50;
        const lineHeight = 6;
        const pageHeight = doc.internal.pageSize.height;
        
        // Headers
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const headers = ['VIN', 'Plate', 'Toll ID', 'Date', 'Time', 'Authority', 'Description', 'Amount'];
        const columnPositions = [14, 44, 69, 89, 114, 134, 169, 229];
        
        headers.forEach((header, index) => {
          doc.text(header, columnPositions[index], yPosition);
        });
        
        // Line under headers
        doc.line(14, yPosition + 2, 254, yPosition + 2);
        yPosition += 8;
        
        // Data rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        ezPassData.data.forEach((row: EzPassRecord, index: number) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 30;
            // Repeat headers on new page
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            headers.forEach((header, headerIndex) => {
              doc.text(header, columnPositions[headerIndex], yPosition);
            });
            doc.line(14, yPosition + 2, 254, yPosition + 2);
            yPosition += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
          }
          
          const rowData = [
            (row.vin || 'N/A').substring(0, 8),
            (row.plateNumber || 'N/A').substring(0, 8),
            (row.tollId?.toString() || 'N/A').substring(0, 6),
            row.tollDate ? new Date(row.tollDate).toLocaleDateString().substring(0, 8) : 'N/A',
            (row.tollTime || 'N/A').substring(0, 8),
            (row.tollAuthority || 'N/A').substring(0, 12),
            (row.tollAuthorityDescription || 'N/A').substring(0, 20),
            row.adjustedAmount ? `$${row.adjustedAmount.toFixed(2)}` : 'N/A'
          ];
          
          rowData.forEach((data, dataIndex) => {
            doc.text(data, columnPositions[dataIndex], yPosition);
          });
          
          yPosition += lineHeight;
        });
        
        // Total
        yPosition += 10;
        const totalAmount = ezPassData.data.reduce((sum: number, row: EzPassRecord) => sum + (row.adjustedAmount || 0), 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, yPosition);
        doc.text(`Total Records: ${ezPassData.data.length}`, 14, yPosition + 10);
        
        const filename = `E-ZPass_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
        doc.save(`${filename}.pdf`);
        
        return true;
        
      } catch (fallbackError) {
        console.error('Manual PDF generation failed:', fallbackError);
        toast.error('PDF export failed completely. Please try again or contact support.');
        return false;
      }
    }
  };

  // Define table columns in requested sequence: VIN, License Plate, Toll ID, Toll Date, Toll Time, Toll Authority, Toll Authority Description, Amount
  const columns = useMemo<ColumnDef<EzPassRecord>[]>(
    () => [
      {
        accessorKey: 'vin',
        header: 'VIN',
        cell: ({ getValue }) => getValue<string | null>() || 'N/A',
      },
      {
        accessorKey: 'plateNumber',
        header: 'License Plate',
        cell: ({ getValue }) => getValue<string | null>() || 'N/A',
      },
      {
        accessorKey: 'tollId',
        header: 'Toll ID',
        cell: ({ getValue }) => {
          const id = getValue<number>();
          return <code className="text-muted">{id}</code>;
        },
      },
      {
        accessorKey: 'tollDate',
        header: 'Toll Date',
        cell: ({ getValue }) => {
          const date = getValue<string>();
          return date ? new Date(date).toLocaleDateString() : 'N/A';
        },
      },
      {
        accessorKey: 'tollTime',
        header: 'Toll Time',
        cell: ({ getValue }) => getValue<string | null>() || 'N/A',
      },
      {
        accessorKey: 'tollAuthority',
        header: 'Toll Authority',
        cell: ({ getValue }) => getValue<string | null>() || 'N/A',
      },
      {
        accessorKey: 'tollAuthorityDescription',
        header: 'Toll Authority Description',
        cell: ({ getValue }) => getValue<string | null>() || 'N/A',
      },
      {
        accessorKey: 'adjustedAmount',
        header: 'Amount',
        cell: ({ getValue }) => {
          const amount = getValue<number>();
          return <span className="text-success fw-bold">${amount.toFixed(2)}</span>;
        },
      },
    ],
    []
  );

  return (
    <section className="authenticated-page">
      <div className="container">
        {/* Page Title - First Line */}
        <div>
          <h1>E-ZPass</h1>
        </div>

        {/* Controls Line - Dates, Search */}
        <div className="search-controls">
          
          {/* Search Form */}
          <div className="form-group">
            <label htmlFor="ez-date-from">Date from</label>
            <input 
              id="ez-date-from" 
              type="date" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="ez-date-to">Date to</label>
            <input 
              id="ez-date-to" 
              type="date" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button type="button" onClick={handleSearch} className="btn btn-primary" disabled={isLoading || cooldownTime > 0}>
            {isLoading ? 'Searching...' : cooldownTime > 0 ? `Wait ${cooldownTime}s` : 'Search'}
          </button>
        </div>

        {/* Cooldown Message */}
        {cooldownTime > 0 && (
          <div className="cooldown-message">
            Please wait {cooldownTime} seconds before trying again.
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger">
            {error.message}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading E-ZPass data...</p>
          </div>
        ) : ezPassData?.data && ezPassData.data.length > 0 ? (
          <>
            <DataTable
            data={ezPassData.data as EzPassRecord[]}
            columns={columns}
            searchable={true}
            exportable={true}
            selectable={false}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            pageSize={10}
          />
          {/* Total Amount Display */}
          <div className="total-amount-display">
            Total Amount: ${ezPassData.data.reduce((sum: number, row: EzPassRecord) => sum + (parseFloat(row.adjustedAmount?.toString() || '0')), 0).toFixed(2)}
            {' '}({ezPassData.data.length} record{ezPassData.data.length !== 1 ? 's' : ''})
          </div>
          </>
        ) : hasSearched ? (
          <div className="no-data-message">
            <p>No data available. Please select date range and click Search.</p>
          </div>
        ) : (
          <div className="no-data-message">
            <p>Please select date range and click Search to view E-ZPass data.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default EzPass;
