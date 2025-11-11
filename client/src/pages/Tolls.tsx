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

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rydoraApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { exportToExcel } from '../utils/exportUtils';
import { Button } from '../components/ui/Button';
import './Tolls.css';

interface Company {
  id: string;
  name: string;
  stateId: string;
  createdBy: string;
  userId: string;
  hqToken: string;
  isActive: boolean;
}

interface TollRecord {
  id: string;
  plateNumber: string;
  violationDate: string;
  location: string;
  amount: number;
  paymentStatus: number;
  paymentDate?: string;
  company?: string;
  notes?: string;
}

const Tolls: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Initialize state from URL parameters if available
  const urlParams = new URLSearchParams(window.location.search);
  const [dateFrom, setDateFrom] = useState(urlParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(urlParams.get('dateTo') || '');
  const [hasSearched, setHasSearched] = useState(false);
  const [filteredData, setFilteredData] = useState<TollRecord[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(urlParams.get('companyId') || '');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('1'); // Default to unpaid
  const [initialPageIndex] = useState(parseInt(urlParams.get('pageIndex') || '0'));
  const [initialGlobalFilter] = useState(urlParams.get('globalFilter') || '');
  const tableRef = useRef<any>(null);

  // Check if user is admin (fallback to isOwner if isAdmin is null, but respect explicit false)
  const isAdmin = user?.isAdmin ?? false;
  
  // Fetch active companies (only if user is admin)
  const { data: companiesData, isLoading: companiesLoading, error: companiesError } = useQuery({
    queryKey: ['activeCompanies'],
    queryFn: rydoraApi.getActiveCompanies,
    enabled: isAdmin, // Only fetch if user is admin
    retry: 1
  });

  // Set default dates (last 30 days) and trigger initial search
  useEffect(() => {
    // Check if URL parameters are present (returning from edit page)
    const urlParams = new URLSearchParams(window.location.search);
    const dateFromParam = urlParams.get('dateFrom');
    const dateToParam = urlParams.get('dateTo');
    const companyIdParam = urlParams.get('companyId');
    
    if (dateFromParam || dateToParam || companyIdParam) {
      // URL parameters present, auto-search
      setHasSearched(true);
    } else {
      // No URL parameters, set default dates
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      setDateTo(today.toISOString().split('T')[0]);
      setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
      setHasSearched(true); // Enable automatic search on page load
    }
  }, []);

  // Fetch tolls data using the correct tolls API
  const { data: tollsData, isLoading, error, refetch } = useQuery({
    queryKey: ['tolls', dateFrom, dateTo, selectedCompanyId],
    queryFn: () => {
      return rydoraApi.getTolls(dateFrom, dateTo, 1, selectedCompanyId || '');
    },
    enabled: Boolean(hasSearched && dateFrom && dateTo), // Fetch when search is enabled and dates are set
    retry: 1
  });

  // Refetch data when company selection changes
  useEffect(() => {
    if (hasSearched && dateFrom && dateTo) {
      refetch();
    }
  }, [selectedCompanyId, refetch, hasSearched, dateFrom, dateTo]);

  // Update filtered data when API data changes
  useEffect(() => {
    if (!tollsData) {
      return;
    }
    
    // Handle the response structure from ExternalTollDailyInvoice API
    const dataArray = Array.isArray(tollsData)
      ? tollsData
      : (tollsData as any)?.result || (tollsData as any)?.data || [];

    console.log('=== TOLLS DATA RECEIVED ===');
    console.log('First toll item:', dataArray[0]);
    console.log('First toll ID:', dataArray[0]?.id);

    // Map rydoraApi ExternalTollDailyInvoice format to frontend TollRecord format
    const mappedData = dataArray.map((item: any) => ({
      id: item.id,
      plateNumber: item.plateNumber,
      violationDate: item.transactionDate || item.transactionDateTime,
      location: item.agency || item.plazaDescription || 'Unknown',
      amount: item.amount || 0,
      paymentStatus: item.paymentStatus,
      paymentDate: item.dateCompleted,
      company: item.company || 'Unknown',
      notes: item.note || item.description
    }));

    console.log('First mapped toll:', mappedData[0]);

    // Hide soft-deleted/inactive records if API returns isActive=false after delete
    const visible = mappedData.filter((item: any) => item?.isActive !== false);
    setFilteredData(visible);
  }, [tollsData]);

  const handleSearch = () => {
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

  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const success = exportToExcel(
      filteredData,
      `Tolls_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`
    );
    
    if (success) {
      toast.success('Excel file downloaded successfully');
    } else {
      toast.error('Export failed. Please try again.');
    }
  };

  const handleExportPdf = async () => {
    if (!filteredData || filteredData.length === 0) {
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
      doc.text('Tolls', 14, 20);
      
      // Add export date
      doc.setFontSize(10);
      doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Define column headers using actual column definitions
      const headers = [
        'Plate Number',
        'Date',
        'Location',
        'Amount',
        'Status',
        'Payment Date',
        'Company',
        'Notes'
      ];
      
      // Prepare table data with proper formatting using actual column data
      const tableData = filteredData.map((row: any) => [
        row.plateNumber || 'N/A',
        row.violationDate ? new Date(row.violationDate).toLocaleDateString() : 'N/A',
        row.location || 'N/A',
        row.amount ? `$${parseFloat(row.amount).toFixed(2)}` : 'N/A',
        row.paymentStatus === 0 ? 'Paid' : row.paymentStatus === 1 ? 'Unpaid' : row.paymentStatus === 2 ? 'Processing' : row.paymentStatus === -5 ? 'Paid by others' : 'Unknown',
        row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : 'N/A',
        row.company || 'N/A',
        row.notes || 'N/A'
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
          0: { cellWidth: 25 }, // Plate Number
          1: { cellWidth: 20 }, // Date
          2: { cellWidth: 35 }, // Location
          3: { cellWidth: 20, halign: 'right' }, // Amount (right-aligned)
          4: { cellWidth: 20 }, // Status
          5: { cellWidth: 25 }, // Payment Date
          6: { cellWidth: 30 }, // Company
          7: { cellWidth: 40 } // Notes
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
      const totalAmount = filteredData.reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, finalY + 15);
      doc.text(`Total Records: ${filteredData.length}`, 14, finalY + 25);
      
      // Save the PDF
      const filename = `Tolls_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
      doc.save(`${filename}.pdf`);
      
      return true;
      
    } catch (error) {
      console.error('PDF export error:', error);
      
      // Manual table creation fallback (no autoTable dependency)
      try {
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text('Tolls', 14, 20);
        doc.setFontSize(10);
        doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
        
        // Manual table creation
        let yPosition = 50;
        const lineHeight = 6;
        const pageHeight = doc.internal.pageSize.height;
        
        // Headers
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const headers = ['Plate Number', 'Date', 'Location', 'Amount', 'Status', 'Payment Date', 'Company', 'Notes'];
        const columnPositions = [14, 39, 59, 94, 114, 134, 159, 189];
        
        headers.forEach((header, index: number) => {
          doc.text(header, columnPositions[index], yPosition);
        });
        
        // Line under headers
        doc.line(14, yPosition + 2, 254, yPosition + 2);
        yPosition += 8;
        
        // Data rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        filteredData.forEach((row: any, index: number) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 30;
            // Repeat headers on new page
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            headers.forEach((header, headerIndex: number) => {
              doc.text(header, columnPositions[headerIndex], yPosition);
            });
            doc.line(14, yPosition + 2, 254, yPosition + 2);
            yPosition += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
          }
          
          const rowData = [
            (row.plateNumber || 'N/A').substring(0, 8),
            row.violationDate ? new Date(row.violationDate).toLocaleDateString().substring(0, 8) : 'N/A',
            (row.location || 'N/A').substring(0, 8),
            row.amount ? `$${parseFloat(row.amount).toFixed(2)}` : 'N/A',
            (row.paymentStatus === 0 ? 'Paid' : row.paymentStatus === 1 ? 'Unpaid' : row.paymentStatus === 2 ? 'Processing' : row.paymentStatus === -5 ? 'Paid by others' : 'Unknown').substring(0, 8),
            row.paymentDate ? new Date(row.paymentDate).toLocaleDateString().substring(0, 8) : 'N/A',
            (row.company || 'N/A').substring(0, 8),
            (row.notes || 'N/A').substring(0, 8)
          ];
          
          rowData.forEach((data, dataIndex: number) => {
            doc.text(data, columnPositions[dataIndex], yPosition);
          });
          
          yPosition += lineHeight;
        });
        
        // Total
        yPosition += 10;
        const totalAmount = filteredData.reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, yPosition);
        doc.text(`Total Records: ${filteredData.length}`, 14, yPosition + 10);
        
        const filename = `Tolls_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
        doc.save(`${filename}.pdf`);
        
        return true;
        
      } catch (fallbackError) {
        console.error('Manual PDF generation failed:', fallbackError);
        toast.error('PDF export failed completely. Please try again or contact support.');
        return false;
      }
    }
  };

  // Memoized selection change handler to prevent re-renders
  const handleSelectionChange = useMemo(() => (selectedRows: TollRecord[]) => {
    const selectedIds = selectedRows.map((row: any) => String(row.id));
    setSelectedRows(selectedIds);
  }, []);

  // Your suggested revert function using toggleSelected - operates on filtered rows
  const toggleAllRowsSelection = () => {
    
    if (!tableRef.current) {
      console.error('Table reference is null or undefined');
      toast.error('Table not ready');
      return;
    }
    
    // Get filtered rows (respects search/filter)
    const filteredRows = tableRef.current.getFilteredRowModel().rows;
    
    
    // Toggle each filtered row individually
    filteredRows.forEach((row: any, _index: number) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _wasSelected = row.getIsSelected();
      row.toggleSelected();
    });
  };

  // Function to select rows by payment status
  const selectRowsByPaymentStatus = useCallback(() => {
    
    if (!tableRef.current) {
      console.error('Table reference is null or undefined');
      toast.error('Table not ready');
      return;
    }
    
    // Use your suggested approach with selection map
    const newSelection: Record<string, boolean> = {};
    
    // Define condition based on selected payment status
    const condition = (rowData: any) => {
      const status = parseInt(selectedPaymentStatus);
      return rowData?.paymentStatus === status;
    };
    
    // Get pre-filtered rows and apply condition
    const preFilteredRows = tableRef.current.getPreFilteredRowModel().rows;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let _selectedCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let _uncheckedCount = 0;
    
    // Check all rows with matching status, uncheck all others
    preFilteredRows.forEach((row: any) => {
      if (condition(row.original)) {
        newSelection[row.id] = true;
        _selectedCount++;
      } else {
        newSelection[row.id] = false; // Explicitly uncheck others
        _uncheckedCount++;
      }
    });
    
    // Apply the selection
    tableRef.current.setRowSelection(newSelection);
    
    // Selection completed without toast notification
  }, [selectedPaymentStatus]);

  const handleEditSelected = () => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one toll to edit');
      return;
    }

    const firstSelectedTollId = selectedRows[0];
    console.log('=== EDIT TOLL CLICKED ===');
    console.log('Selected toll ID:', firstSelectedTollId);
    console.log('Selected toll ID type:', typeof firstSelectedTollId);
    console.log('All selected rows:', selectedRows);
    
    // Navigate to edit page with the first selected toll ID and preserve filters and table state
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (selectedCompanyId) params.append('companyId', selectedCompanyId);
    
    // Get table state from ref if available
    if (tableRef.current) {
      const tableState = tableRef.current.getState();
      if (tableState.pagination?.pageIndex !== undefined) {
        params.append('pageIndex', tableState.pagination.pageIndex.toString());
      }
      if (tableState.globalFilter) {
        params.append('globalFilter', tableState.globalFilter);
      }
    }
    
    console.log('Navigating to:', `/edit-toll/${firstSelectedTollId}?${params.toString()}`);
    navigate(`/edit-toll/${firstSelectedTollId}?${params.toString()}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one toll to delete');
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedRows.length} selected toll(s)? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      // Delete each selected toll one by one
      const deletePromises = selectedRows.map(async (tollId) => {
        try {
          await rydoraApi.deleteExternalTollDailyInvoice(tollId);
          return { success: true, id: tollId };
        } catch (error) {
          console.error(`Failed to delete toll with ID ${tollId}:`, error);
          return { success: false, id: tollId, error };
        }
      });

      // Wait for all delete operations to complete
      const results = await Promise.all(deletePromises);
      
      // Count successful and failed deletions
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      // Show results
      if (successful.length === selectedRows.length) {
        toast.success(`Successfully deleted ${successful.length} toll(s)`);
      } else if (successful.length > 0) {
        toast.success(`Deleted ${successful.length} toll(s), ${failed.length} failed`);
      } else {
        toast.error('Failed to delete any tolls');
      }

      // Optimistically remove successfully deleted rows from UI
      if (successful.length > 0) {
        const deletedIds = new Set(successful.map(s => s.id));
        setFilteredData(prev => prev.filter(row => !deletedIds.has(String((row as any).id))));
      }

      // Clear selection and refresh data from server
      setSelectedRows([]);
      await queryClient.invalidateQueries({ queryKey: ['external-daily-invoice'], exact: false });
      refetch();

    } catch (error) {
      console.error('Error during delete operation:', error);
      toast.error('An error occurred while deleting tolls');
    }
  };

  const handleSubmitSelected = async () => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one toll to submit');
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to update payment status for ${selectedRows.length} selected toll(s)?`
    );

    if (!confirmed) {
      return;
    }

    try {
      // Get the payment status from the dropdown
      const paymentStatus = parseInt(selectedPaymentStatus);
      
      // Call the API to update payment status for selected tolls
      await rydoraApi.updateExternalTollDailyInvoicePaymentStatus(
        selectedRows,
        paymentStatus,
        selectedCompanyId || undefined
      );

      toast.success(`Successfully updated payment status for ${selectedRows.length} toll(s)`);

      // Clear selection and refresh data from server
      setSelectedRows([]);
      await queryClient.invalidateQueries({ queryKey: ['external-daily-invoice'], exact: false });
      refetch();

    } catch (error) {
      console.error('Error during payment status update:', error);
      toast.error('An error occurred while updating payment status');
    }
  };

  // Removed auto-selection - selection only happens on button click

  // Define table columns
  const columns: ColumnDef<TollRecord>[] = [
    {
      accessorKey: 'plateNumber',
      header: 'Plate Number',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('plateNumber')}
        </div>
      ),
    },
    {
      accessorKey: 'violationDate',
      header: 'Date',
      cell: ({ row }) => {
        const date = new Date(row.getValue('violationDate') as string);
        return <div>{date.toLocaleDateString()}</div>;
      },
    },
    {
      accessorKey: 'location',
      header: 'Location',
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('amount') as string);
        return <div className="font-medium">${amount.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('paymentStatus') as number;
        let statusText = '';
        let statusClass = '';
        
        switch (status) {
          case 0:
            statusText = 'Paid';
            statusClass = 'badge bg-success';
            break;
          case 1:
            statusText = 'Unpaid';
            statusClass = 'badge bg-danger';
            break;
          case 2:
            statusText = 'Processing';
            statusClass = 'badge bg-warning';
            break;
          case -5:
            statusText = 'Paid by others';
            statusClass = 'badge bg-info';
            break;
          default:
            statusText = 'Unknown';
            statusClass = 'badge bg-secondary';
        }
        
        return <span className={statusClass}>{statusText}</span>;
      },
    },
    {
      accessorKey: 'paymentDate',
      header: 'Payment Date',
      cell: ({ row }) => {
        const paymentDate = row.getValue('paymentDate') as string;
        return paymentDate ? <div>{new Date(paymentDate).toLocaleDateString()}</div> : <div>-</div>;
      },
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) => {
        const company = row.getValue('company') as string;
        return <div>{company || '-'}</div>;
      },
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => {
        const notes = row.getValue('notes') as string;
        return <div className="max-w-xs truncate" title={notes}>{notes || '-'}</div>;
      },
    },
  ];

  return (
    <section className="authenticated-page">
      <div className="container">
        {/* Page Title - First Line */}
        <div style={{ marginBottom: '8px' }}>
          <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#333' }}>Tolls</h1>
        </div>

        {/* Controls Line - Company, Dates, Search, Add */}
        <div className="search-controls" style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', marginBottom: '8px', width: '100%' }}>
          
          {/* Company Selection (Admin Only) */}
          {isAdmin && (
            <div style={{ margin: '0', padding: '0', display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap' }}>
              <label htmlFor="company-select" style={{ fontWeight: '700', fontSize: '14px', margin: '0', padding: '0', minWidth: '80px', lineHeight: '38px', whiteSpace: 'nowrap' }}>
                Company
              </label>
              <select
                id="company-select"
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                }}
                style={{ fontSize: '16px', height: '38px', minWidth: '200px', margin: '0', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                disabled={companiesLoading}
              >
                <option value="">All Companies</option>
                {companiesData?.result?.map((company: Company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} ({company.stateId})
                  </option>
                ))}
              </select>
              {companiesError && isAdmin && (
                <small className="text-danger" style={{ marginLeft: '8px', whiteSpace: 'nowrap' }}>
                  Failed to load companies. Please refresh the page.
                </small>
              )}
            </div>
          )}
          
          {/* Search Form */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <label htmlFor="tolls-date-from" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Date from</label>
              <input 
                id="tolls-date-from" 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ fontSize: '16px', height: '38px', minWidth: '150px' }} 
              />
            </div>
            <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <label htmlFor="tolls-date-to" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Date to</label>
              <input 
                id="tolls-date-to" 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ fontSize: '16px', height: '38px', minWidth: '150px' }} 
              />
            </div>
            <button type="button" onClick={handleSearch} className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
              {/* Action Buttons - Add Toll button hidden but functionality preserved */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Add Toll button hidden but route still accessible at /new-toll */}
              </div>
        </div>


        {/* Error Display */}
        {error && (
          <div className="message-container">
            <div className="alert alert-danger">
              <h4>Error</h4>
              <p>{error.message}</p>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading tolls...</p>
          </div>
        ) : filteredData.length > 0 ? (
          <>
            <DataTable
            data={filteredData as TollRecord[]}
            columns={columns}
            searchable={true}
            exportable={true}
            selectable={true}
            onSelectionChange={handleSelectionChange}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            tableRef={tableRef}
            initialPageIndex={initialPageIndex}
            initialGlobalFilter={initialGlobalFilter}
            additionalButtons={
              <>
                {/* Hidden buttons but functionality preserved */}
                <div style={{ display: 'none' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={toggleAllRowsSelection}
                  >
                    Revert
                  </Button>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={selectRowsByPaymentStatus}
                    >
                      Select
                    </Button>
                    <select
                      value={selectedPaymentStatus}
                      onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                      style={{ 
                        fontSize: '14px', 
                        height: '32px', 
                        minWidth: '120px', 
                        padding: '4px 8px', 
                        border: '1px solid #ccc', 
                        borderRadius: '4px' 
                      }}
                    >
                      <option value="0">Paid</option>
                      <option value="1">Unpaid</option>
                      <option value="2">Processing</option>
                      <option value="-5">Paid by others</option>
                    </select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleSubmitSelected}
                    disabled={selectedRows.length === 0}
                  >
                    Submit Selected
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={handleEditSelected}
                    disabled={selectedRows.length === 0}
                  >
                    Edit
                  </Button>
                </div>
                
                {/* Delete button hidden but functionality preserved */}
                {/* <Button
                  variant="destructive"
                  size="sm"
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedRows.length === 0}
                >
                  Delete
                </Button> */}
              </>
            }
            pageSize={10}
          />
          {/* Total Amount Display */}
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#e8f5e8', 
            borderRadius: '8px', 
            border: '1px solid #28a745',
            textAlign: 'right',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            Total Amount: ${filteredData.reduce((sum, row) => sum + (parseFloat(row.amount?.toString() || '0')), 0).toFixed(2)}
            {' '}({filteredData.length} record{filteredData.length !== 1 ? 's' : ''})
          </div>
          </>
        ) : hasSearched ? (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <p>No data available. Please select date range and click Search.</p>
          </div>
        ) : (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <p>Please select date range and click Search to view tolls.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Tolls;

