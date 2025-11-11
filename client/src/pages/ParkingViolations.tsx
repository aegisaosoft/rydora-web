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
import './ParkingViolations.css';

interface Company {
  id: string;
  name: string;
  stateId: string;
  createdBy: string;
  userId: string;
  hqToken: string;
  isActive: boolean;
}

type ParkingViolationRecord = {
  id: number;
  citationNumber: string | null;
  noticeNumber: string;
  agency: string;
  address: string | null;
  tag: string;
  state: string;
  issueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  amount: number;
  currency: string;
  paymentStatus: number;
  fineType: number;
  note: string | null;
  link: string | null;
  driver: string | null;
};

const ParkingViolations: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Initialize state from URL parameters if available
  const urlParams = new URLSearchParams(window.location.search);
  const [dateFrom, setDateFrom] = useState(urlParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(urlParams.get('dateTo') || '');
  const [hasSearched, setHasSearched] = useState(false);
  const [filteredData, setFilteredData] = useState<ParkingViolationRecord[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(urlParams.get('companyId') || '');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('1'); // Default to unpaid (for selection filter)
  const [selectedSubmitStatus, setSelectedSubmitStatus] = useState('1'); // For submit action dropdown
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(urlParams.get('showOnlyUnpaid') === 'true');
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

  // Set default dates
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
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      
      setDateTo(today.toISOString().split('T')[0]);
      setDateFrom(oneMonthAgo.toISOString().split('T')[0]);
    }
  }, []);

  const { data: violationData, isLoading, error, refetch } = useQuery({
    queryKey: ['parking-violations', dateFrom, dateTo, selectedCompanyId],
    queryFn: () => rydoraApi.getParkingViolations(dateFrom, dateTo, 1, selectedCompanyId),
    enabled: true // Always fetch data when component mounts
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      // Only show error if it's not a 404 (empty data is expected)
      if ((error as any).response?.status !== 404) {
        toast.error((error as any).response?.data?.message || 'Failed to load parking violations');
      }
    }
  }, [error]);

  // Set filtered data (filter by unpaid if toggle is active)
  useEffect(() => {
    if (!violationData?.data) {
      setFilteredData([]);
      setSelectedRows([]);
      return;
    }
    
    // Filter by unpaid if toggle is active (paymentStatus === 1 means unpaid)
    if (showOnlyUnpaid) {
      const unpaidViolations = violationData.data.filter((v: ParkingViolationRecord) => v.paymentStatus === 1);
      setFilteredData(unpaidViolations);
    } else {
      setFilteredData(violationData.data);
    }
  }, [violationData?.data, showOnlyUnpaid]);

  const handleSearch = () => {
    if (!dateFrom || !dateTo) {
      toast.error('Please select both Date from and Date to.');
      return;
    }
    setHasSearched(true);
    refetch();
  };

  const handleExportExcel = async () => {
    if (!violationData?.data || violationData.data.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const success = exportToExcel(
      violationData.data, 
      `Parking_Violations_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`
    );
    
    if (success) {
      toast.success('Excel file downloaded successfully');
    } else {
      toast.error('Export failed. Please try again.');
    }
  };

  const handleExportPdf = async () => {
    if (!violationData?.data || violationData.data.length === 0) {
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
      doc.text('Parking Violations', 14, 20);
      
      // Add export date
      doc.setFontSize(10);
      doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Define column headers
      const headers = [
        'Citation',
        'Notice',
        'License Plate',
        'Driver',
        'Amount',
        'Issue Date',
        'Due Date',
        'Agency',
        'Address',
        'Status',
        'Fine Type',
        'Note'
      ];
      
      // Prepare table data with proper formatting
      const tableData = violationData.data.map((row: ParkingViolationRecord) => [
        row.citationNumber || 'N/A',
        row.noticeNumber || 'N/A',
        row.tag && row.state ? `${row.tag}-${row.state}` : row.tag || 'N/A',
        row.driver || 'N/A',
        `${row.currency || 'USD'} ${row.amount.toFixed(2)}`,
        row.issueDate ? new Date(row.issueDate).toLocaleDateString() : 'N/A',
        row.startDate ? new Date(row.startDate).toLocaleDateString() : 'N/A',
        row.agency || 'N/A',
        row.address || 'N/A',
        row.paymentStatus === 1 ? 'Unpaid' : row.paymentStatus === -5 ? 'Paid by others' : row.paymentStatus === 0 ? 'Paid' : 'Unknown',
        row.fineType === 0 ? 'Parking Violation' : 'Other',
        row.note || 'N/A'
      ]);
      
      // Generate table with headers
      doc.autoTable({
        head: [headers], // Array of headers
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 2,
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
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          // Adjusted column widths for landscape A4 (297mm width) - 12 columns
          0: { cellWidth: 20 }, // Citation
          1: { cellWidth: 25 }, // Notice
          2: { cellWidth: 25 }, // License Plate
          3: { cellWidth: 25 }, // Driver
          4: { cellWidth: 20 }, // Amount
          5: { cellWidth: 20 }, // Issue Date
          6: { cellWidth: 20 }, // Due Date
          7: { cellWidth: 30 }, // Agency
          8: { cellWidth: 40 }, // Address
          9: { cellWidth: 15 }, // Status
          10: { cellWidth: 25 }, // Fine Type
          11: { cellWidth: 30 } // Note
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
      const totalAmount = violationData.data.reduce((sum: number, row: ParkingViolationRecord) => sum + (row.amount || 0), 0);
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, finalY + 15);
      doc.text(`Total Records: ${violationData.data.length}`, 14, finalY + 25);
      
      // Save the PDF
      const filename = `Parking_Violations_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
      doc.save(`${filename}.pdf`);
      
      return true;
      
    } catch (error) {
      console.error('PDF export error:', error);
      
      // Manual table creation fallback (no autoTable dependency)
      try {
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text('Parking Violations', 14, 20);
        doc.setFontSize(10);
        doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
        
        // Manual table creation
        let yPosition = 50;
        const lineHeight = 6;
        const pageHeight = doc.internal.pageSize.height;
        
        // Headers
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const headers = ['Citation', 'Notice', 'Plate', 'Driver', 'Amount', 'Issue', 'Due', 'Agency', 'Address', 'Status', 'Type', 'Note'];
        const columnPositions = [14, 34, 59, 84, 109, 129, 149, 169, 199, 234, 249, 264];
        
        headers.forEach((header, index: number) => {
          doc.text(header, columnPositions[index], yPosition);
        });
        
        // Line under headers
        doc.line(14, yPosition + 2, 254, yPosition + 2);
        yPosition += 8;
        
        // Data rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        
        violationData.data.forEach((row: ParkingViolationRecord, index: number) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 30;
            // Repeat headers on new page
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            headers.forEach((header, headerIndex: number) => {
              doc.text(header, columnPositions[headerIndex], yPosition);
            });
            doc.line(14, yPosition + 2, 254, yPosition + 2);
            yPosition += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
          }
          
          const rowData = [
            (row.citationNumber || 'N/A').substring(0, 8),
            (row.noticeNumber || 'N/A').substring(0, 8),
            (row.tag && row.state ? `${row.tag}-${row.state}` : row.tag || 'N/A').substring(0, 8),
            (row.driver || 'N/A').substring(0, 8),
            `${row.currency || 'USD'} ${row.amount.toFixed(2)}`.substring(0, 8),
            row.issueDate ? new Date(row.issueDate).toLocaleDateString().substring(0, 8) : 'N/A',
            row.startDate ? new Date(row.startDate).toLocaleDateString().substring(0, 8) : 'N/A',
            (row.agency || 'N/A').substring(0, 8),
            (row.address || 'N/A').substring(0, 12),
            row.paymentStatus === 1 ? 'Unpaid' : row.paymentStatus === -5 ? 'Paid by others' : row.paymentStatus === 0 ? 'Paid' : 'Unknown',
            row.fineType === 0 ? 'Parking' : 'Other',
            (row.note || 'N/A').substring(0, 8)
          ];
          
          rowData.forEach((data, dataIndex: number) => {
            doc.text(data, columnPositions[dataIndex], yPosition);
          });
          
          yPosition += lineHeight;
        });
        
        // Total
        yPosition += 10;
        const totalAmount = violationData.data.reduce((sum: number, row: ParkingViolationRecord) => sum + (row.amount || 0), 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, yPosition);
        doc.text(`Total Records: ${violationData.data.length}`, 14, yPosition + 10);
        
        const filename = `Parking_Violations_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
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
  const handleSelectionChange = useMemo(() => (selectedRows: ParkingViolationRecord[]) => {
    const selectedIds = selectedRows.map((row: any) => row.id);
    setSelectedRows(selectedIds);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const _canPaySelected = useMemo(() => {
  //   if (!filteredData || selectedRows.length === 0) return false;
  //   const selectedRecords = filteredData.filter(r => selectedRows.includes(r.id));
  //   if (selectedRecords.length === 0) return false;
  //   return selectedRecords.every(r => typeof r.link === 'string' && r.link.trim() !== '');
  // }, [filteredData, selectedRows]);

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
      // const _wasSelected = row.getIsSelected();
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
    // let _selectedCount = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // let _uncheckedCount = 0;
    
    // Check all rows with matching status, uncheck all others
    preFilteredRows.forEach((row: any) => {
      if (condition(row.original)) {
        newSelection[row.id] = true;
        // _selectedCount++;
      } else {
        newSelection[row.id] = false; // Explicitly uncheck others
        // _uncheckedCount++;
      }
    });
    
    // Apply the selection
    tableRef.current.setRowSelection(newSelection);
    
    // Selection completed without toast notification
  }, [selectedPaymentStatus]);

  const handleEditSelected = () => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one violation to edit');
      return;
    }

    const firstSelectedViolationId = selectedRows[0];
    // Navigate to edit page with the first selected violation ID and preserve filters and table state
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (selectedCompanyId) params.append('companyId', selectedCompanyId);
    if (showOnlyUnpaid) params.append('showOnlyUnpaid', 'true');
    
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
    
    navigate(`/edit-violation/${firstSelectedViolationId}?${params.toString()}`);
  };

  const handleRowDoubleClick = (row: ParkingViolationRecord) => {
    // Open link in new window if it exists
    if (row.link && row.link.trim() !== '') {
      // Copy citation or notice number to clipboard before opening link
      const numberToCopy = row.citationNumber && row.citationNumber.trim() !== '' 
        ? row.citationNumber 
        : row.noticeNumber;
      
      if (numberToCopy && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(numberToCopy).catch(err => {
          console.error('Failed to copy to clipboard:', err);
        });
      }
      
      // Open the link directly
      window.open(row.link, '_blank', 'noopener,noreferrer');
    }
    // Silently do nothing if no link exists (no toast notification needed)
  };

  const handleToggleUnpaid = () => {
    setShowOnlyUnpaid(!showOnlyUnpaid);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const _handleDeleteSelected = async () => {
  //   if (selectedRows.length === 0) {
  //     toast.error('Please select at least one violation to delete');
  //     return;
  //   }

  //   // Show confirmation dialog
  //   const confirmed = window.confirm(
  //     `Are you sure you want to delete ${selectedRows.length} selected violation(s)? This action cannot be undone.`
  //   );

  //   if (!confirmed) {
  //     return;
  //   }

  //   try {
  //     // Delete each selected violation one by one
  //     const deletePromises = selectedRows.map(async (violationId) => {
  //       try {
  //         await rydoraApi.deleteViolation(violationId.toString());
  //         return { success: true, id: violationId };
  //       } catch (error) {
  //         console.error(`Failed to delete violation with ID ${violationId}:`, error);
  //         return { success: false, id: violationId, error };
  //       }
  //     });

  //     // Wait for all delete operations to complete
  //     const results = await Promise.all(deletePromises);
      
  //     // Count successful and failed deletions
  //     const successful = results.filter(r => r.success);
  //     const failed = results.filter(r => !r.success);

  //     // Show results
  //     if (successful.length === selectedRows.length) {
  //       toast.success(`Successfully deleted ${successful.length} violation(s)`);
  //     } else if (successful.length > 0) {
  //       toast.success(`Deleted ${successful.length} violation(s), ${failed.length} failed`);
  //     } else {
  //       toast.error('Failed to delete any violations');
  //     }

  //     // Optimistically remove successfully deleted rows from UI
  //     if (successful.length > 0) {
  //       const deletedIds = new Set(successful.map(s => s.id));
  //       setFilteredData(prev => prev.filter(row => !deletedIds.has(row.id)));
  //     }

  //     // Clear selection and refresh data from server
  //     setSelectedRows([]);
  //     await queryClient.invalidateQueries({ queryKey: ['parking-violations'] });
  //     refetch();

  //   } catch (error) {
  //     console.error('Error during delete operation:', error);
  //     toast.error('An error occurred while deleting violations');
  //   }
  // };

  const handleSubmitSelected = async () => {
    if (selectedRows.length === 0) {
      toast.error('Please select at least one violation to submit');
      return;
    }

    if (!selectedCompanyId || selectedCompanyId.trim() === '') {
      toast.error('Please select a company before changing status');
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to update payment status for ${selectedRows.length} selected violation(s)?`
    );

    if (!confirmed) {
      return;
    }

    try {
      // Get the payment status from the submit dropdown
      const paymentStatus = parseInt(selectedSubmitStatus);
      
      // Call the API to update payment status for selected violations
      await rydoraApi.updateViolationPaymentStatus(
        selectedRows,
        paymentStatus,
        selectedCompanyId
      );

      toast.success(`Successfully updated payment status for ${selectedRows.length} violation(s)`);

      // Clear selection and refresh data from server
      setSelectedRows([]);
      await queryClient.invalidateQueries({ queryKey: ['parking-violations'] });
      refetch();

    } catch (error) {
      console.error('Error during payment status update:', error);
      toast.error('An error occurred while updating payment status');
    }
  };

  // Do not auto-select unpaid rows on load
  useEffect(() => {
    // intentionally left blank per requirement: don't check unpaid violations on load
  }, [filteredData]);





  // Define table columns - matching C# version structure
  const columns = useMemo<ColumnDef<ParkingViolationRecord>[]>(
    () => [
      {
        id: 'payButton',
        header: '',
        cell: ({ row }) => {
          const link = row.original.link;
          const citationNumber = row.original.citationNumber;
          const hasLink = link && typeof link === 'string' && link.trim() !== '' && link !== 'null';
          
          return (
            <button
              className="btn btn-sm btn-primary"
              style={{ padding: '1px 3px', fontSize: '12px', whiteSpace: 'nowrap', minWidth: 'auto' }}
              onClick={(e) => {
                e.stopPropagation();
                if (hasLink) {
                  // Copy citation or notice number to clipboard before opening link
                  const numberToCopy = citationNumber && citationNumber.trim() !== '' 
                    ? citationNumber 
                    : row.original.noticeNumber;
                  
                  if (numberToCopy && navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(numberToCopy).catch(err => {
                      console.error('Failed to copy to clipboard:', err);
                    });
                  }
                  
                  // Open the link directly
                  window.open(link, '_blank', 'noopener,noreferrer');
                }
              }}
              disabled={!hasLink}
              title={hasLink ? link : 'No payment link available'}
            >
              Pay
            </button>
          );
        },
        size: 8,
        enableSorting: false,
      },
      {
        accessorKey: 'citationNumber',
        header: 'Citation',
        cell: ({ getValue }) => getValue<string | null>() || 'N/A',
      },
      {
        accessorKey: 'noticeNumber',
        header: 'Notice',
        cell: ({ getValue }) => getValue<string>(),
      },
      {
        accessorKey: 'tag',
        header: 'License Plate',
        cell: ({ getValue, row }) => {
          const tag = getValue<string>();
          const state = row.original.state;
          return tag && state ? `${tag}-${state}` : tag || 'N/A';
        },
      },
      {
        accessorKey: 'driver',
        header: 'Driver',
        cell: ({ row }) => row.original.driver || 'N/A',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue, row }) => {
          const amount = getValue<number>();
          const currency = row.original.currency || 'USD';
          return `${currency} ${amount.toFixed(2)}`;
        },
      },
      {
        accessorKey: 'issueDate',
        header: 'Issue Date',
        cell: ({ getValue }) => {
          const date = getValue<string | null>();
          return date ? new Date(date).toLocaleDateString() : 'N/A';
        },
      },
      {
        accessorKey: 'startDate',
        header: 'Due Date',
        cell: ({ getValue }) => {
          const date = getValue<string | null>();
          return date ? new Date(date).toLocaleDateString() : 'N/A';
        },
      },
      {
        accessorKey: 'agency',
        header: 'Agency',
        cell: ({ getValue }) => getValue<string>(),
      },
      {
        accessorKey: 'address',
        header: 'Address',
        cell: ({ getValue }) => getValue<string | null>() || 'N/A',
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Status',
        cell: ({ getValue, row }) => {
          const status = getValue<number>();
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
        accessorKey: 'fineType',
        header: 'Fine Type',
        cell: ({ getValue }) => {
          const fineType = getValue<number>();
          return fineType === 0 ? 'Parking Violation' : 'Other';
        },
      },
      {
        accessorKey: 'note',
        header: 'Note',
        cell: ({ getValue }) => getValue<string | null>() || 'N/A',
      },
    ],
    []
  );

  return (
    <section className="authenticated-page">
      <div className="container">
        {/* Page Title - First Line */}
        <div style={{ marginBottom: '8px' }}>
          <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#333' }}>Parking Violations</h1>
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
              <label htmlFor="pv-date-from" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Date from</label>
              <input 
                id="pv-date-from" 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ fontSize: '16px', height: '38px', minWidth: '150px' }} 
              />
            </div>
            <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <label htmlFor="pv-date-to" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Date to</label>
              <input 
                id="pv-date-to" 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ fontSize: '16px', height: '38px', minWidth: '150px' }} 
              />
            </div>
            <button type="button" onClick={handleSearch} className="btn btn-primary" disabled={isLoading} style={{ height: '37px', fontSize: '16px', padding: '6px 12px', lineHeight: '1.5' }}>
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (dateFrom) params.append('dateFrom', dateFrom);
                    if (dateTo) params.append('dateTo', dateTo);
                    if (selectedCompanyId) params.append('companyId', selectedCompanyId);
                    if (showOnlyUnpaid) params.append('showOnlyUnpaid', 'true');
                    
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
                    
                    navigate(`/new-violation?${params.toString()}`);
                  }}
                  className="btn btn-success" 
                  style={{ fontSize: '16px', height: '38px', display: 'inline-flex', alignItems: 'center' }}
                >
                  Add Violation
                </button>
              </div>
        </div>


        {error && (
          <div className="message-container">
            <div className="alert alert-danger">
              <h4>Error</h4>
              <p>{error.message}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading parking violations...</p>
          </div>
        ) : filteredData.length > 0 ? (
          <>
            <DataTable
            data={filteredData as ParkingViolationRecord[]}
            columns={columns}
            searchable={true}
            exportable={true}
            selectable={true}
            onSelectionChange={handleSelectionChange}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            onRowDoubleClick={handleRowDoubleClick}
            tableRef={tableRef}
            initialPageIndex={initialPageIndex}
            initialGlobalFilter={initialGlobalFilter}
            additionalButtons={
              <>
                {/* Selection and action buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                        minWidth: '140px', 
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
                    variant={selectedRows.length === 0 ? "outline" : "warning"}
                    size="sm"
                    type="button"
                    onClick={handleSubmitSelected}
                    disabled={selectedRows.length === 0}
                  >
                    Change Status to
                  </Button>
                  <select
                    value={selectedSubmitStatus}
                    onChange={(e) => setSelectedSubmitStatus(e.target.value)}
                    style={{ 
                      fontSize: '14px', 
                      height: '32px', 
                      minWidth: '140px', 
                      padding: '4px 8px', 
                      border: '1px solid #ccc', 
                      borderRadius: '4px' 
                    }}
                    title="Submission Status"
                  >
                    <option value="0">Paid</option>
                    <option value="1">Unpaid</option>
                    <option value="2">Processing</option>
                    <option value="-5">Paid by others</option>
                  </select>
                </div>
                
                {/* Unpaid toggle hidden as requested */}
                {false && (
                  <Button
                    variant={showOnlyUnpaid ? "default" : "outline"}
                    size="sm"
                    type="button"
                    onClick={handleToggleUnpaid}
                  >
                    {showOnlyUnpaid ? 'All' : 'Unpaid'}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={handleEditSelected}
                  disabled={selectedRows.length === 0}
                >
                  Edit
                </Button>
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
            <p>Please select date range and click Search to view parking violations.</p>
          </div>
        )}

      </div>
    </section>
  );
};

export default ParkingViolations;
