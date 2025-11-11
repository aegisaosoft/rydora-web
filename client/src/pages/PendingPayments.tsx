import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rydoraApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { exportToExcel } from '../utils/exportUtils';
import { Button } from '../components/ui/Button';
import './PendingPayments.css';

interface Company {
  id: string;
  name: string;
  stateId: string;
  createdBy: string;
  userId: string;
  hqToken: string;
  isActive: boolean;
}

interface PendingPaymentRecord {
  id: string;
  paymentFlowId: string;
  bookingId: string;
  carId: string;
  fleetName: string;
  vin: string;
  tollDate: string;
  tollTime: string;
  numberOfTolls: number;
  totalTollAmount: number;
  totalCommision: number;
  total: number;
  currency: string;
  platform: string;
  dateCreated: string;
  lastUpdate: string;
  invoiceStatus: number;
  paymentStatus: number;
  details: string;
}

const PendingPayments: React.FC = () => {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hasSearched, setHasSearched] = useState(false);
  const [filteredData, setFilteredData] = useState<PendingPaymentRecord[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
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

  // Debug logging

  // Log detailed error information when error changes
  useEffect(() => {
    if (companiesError) {
      console.error('=== COMPANIES ERROR DETAILS ===');
      console.error('Error object:', companiesError);
      console.error('Error message:', companiesError.message);
      
      // Check if it's an axios error with response property
      if ('response' in companiesError && companiesError.response) {
        console.error('Error response:', companiesError.response);
        console.error('Error status:', (companiesError as any).response?.status);
        console.error('Error data:', (companiesError as any).response?.data);
      } else {
        console.error('No response property in error');
      }
      
      // Also log the full error structure to understand what we're dealing with
      console.error('Error keys:', Object.keys(companiesError));
    }
  }, [companiesError]);


  // Fetch pending payments data
  const { data: pendingPaymentsData, isLoading, error, refetch } = useQuery({
    queryKey: ['pending-payments', selectedCompanyId],
    queryFn: () => rydoraApi.getPendingPayments(undefined, undefined, 1, selectedCompanyId || undefined),
    enabled: true,
    retry: 1
  });

  // Update filtered data when API data changes
  useEffect(() => {
    if (!pendingPaymentsData) {
      return;
    }
    
    // Handle direct array response or wrapped response
    const dataArray = Array.isArray(pendingPaymentsData) 
      ? pendingPaymentsData 
      : pendingPaymentsData.result || pendingPaymentsData.data || [];
    
    setFilteredData(dataArray);
  }, [pendingPaymentsData]);


  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const success = exportToExcel(
      filteredData,
      `Pending_Payments_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`
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
      doc.text('Pending Payments', 14, 20);
      
      // Add export date
      doc.setFontSize(10);
      doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Define column headers
      const headers = [
        'Citation Number',
        'Notice Number',
        'Agency',
        'Amount',
        'Issue Date',
        'Due Date',
        'Status',
        'Company'
      ];
      
      // Prepare table data with proper formatting
      const tableData = filteredData.map((row: any) => [
        row.citationNumber || 'N/A',
        row.noticeNumber || 'N/A',
        row.agency || 'N/A',
        row.amount ? `$${row.amount.toFixed(2)}` : 'N/A',
        row.issueDate ? new Date(row.issueDate).toLocaleDateString() : 'N/A',
        row.startDate ? new Date(row.startDate).toLocaleDateString() : 'N/A',
        row.paymentStatus === 1 ? 'Unpaid' : 'Paid',
        row.companyName || 'N/A'
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
          0: { cellWidth: 25 }, // Citation Number
          1: { cellWidth: 25 }, // Notice Number
          2: { cellWidth: 30 }, // Agency
          3: { cellWidth: 20, halign: 'right' }, // Amount (right-aligned)
          4: { cellWidth: 25 }, // Issue Date
          5: { cellWidth: 25 }, // Due Date
          6: { cellWidth: 20 }, // Status
          7: { cellWidth: 30 } // Company
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
      const filename = `Pending_Payments_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
      doc.save(`${filename}.pdf`);
      
      return true;
      
    } catch (error) {
      console.error('PDF export error:', error);
      
      // Manual table creation fallback (no autoTable dependency)
      try {
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text('Pending Payments', 14, 20);
        doc.setFontSize(10);
        doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
        
        // Manual table creation
        let yPosition = 50;
        const lineHeight = 6;
        const pageHeight = doc.internal.pageSize.height;
        
        // Headers
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const headers = ['Citation', 'Notice', 'Agency', 'Amount', 'Issue Date', 'Due Date', 'Status', 'Company'];
        const columnPositions = [14, 39, 64, 89, 109, 134, 159, 184];
        
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
            (row.citationNumber || 'N/A').substring(0, 8),
            (row.noticeNumber || 'N/A').substring(0, 8),
            (row.agency || 'N/A').substring(0, 8),
            row.amount ? `$${row.amount.toFixed(2)}` : 'N/A',
            row.issueDate ? new Date(row.issueDate).toLocaleDateString().substring(0, 8) : 'N/A',
            row.startDate ? new Date(row.startDate).toLocaleDateString().substring(0, 8) : 'N/A',
            row.paymentStatus === 1 ? 'Unpaid' : 'Paid',
            (row.companyName || 'N/A').substring(0, 8)
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
        
        const filename = `Pending_Payments_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
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
  const handleSelectionChange = useMemo(() => (selectedRows: PendingPaymentRecord[]) => {
    const selectedIds = selectedRows.map((row: any) => row.id);
    setSelectedRows(selectedIds);
  }, []);

  // Revert function using toggleSelected - operates on filtered rows
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _toggleAllRowsSelection = () => {
    
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

  // Function to check only failed payment rows using getPreFilteredRowModel
  const checkFailedRows = useCallback(() => {
    
    if (!tableRef.current) {
      console.error('Table reference is null or undefined');
      toast.error('Table not ready');
      return;
    }
    
    // Use selection map approach
    const newSelection: Record<string, boolean> = {};
    
    // Define failed condition (paymentStatus === 0 for failed payments)
    const condition = (rowData: any) => rowData?.paymentStatus === 0;
    
    // Get pre-filtered rows and apply condition
    const preFilteredRows = tableRef.current.getPreFilteredRowModel().rows;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let _failedCount = 0;
    preFilteredRows.forEach((row: any) => {
      if (condition(row.original)) {
        newSelection[row.id] = true;
        _failedCount++;
      }
    });

    // Apply the selection
    tableRef.current.setRowSelection(newSelection);
    // Auto-selection completed silently
  }, []);

  // Auto-select failed payment rows after data loads and table is ready
  useEffect(() => {
    if (filteredData.length > 0 && tableRef.current) {
      // Small delay to ensure table is fully rendered
      setTimeout(() => {
        checkFailedRows();
      }, 100);
    }
  }, [filteredData, checkFailedRows]);

  // Define table columns based on actual API data structure
  const columns: ColumnDef<PendingPaymentRecord>[] = [
    {
      accessorKey: 'fleetName',
      header: 'Fleet Name',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('fleetName')}
        </div>
      ),
    },
    {
      accessorKey: 'vin',
      header: 'VIN',
      cell: ({ row }) => (
        <div className="font-medium">
          {row.getValue('vin')}
        </div>
      ),
    },
    {
      accessorKey: 'tollDate',
      header: 'Toll Date',
      cell: ({ row }) => {
        const date = new Date(row.getValue('tollDate') as string);
        return <div>{date.toLocaleDateString()}</div>;
      },
    },
    {
      accessorKey: 'tollTime',
      header: 'Toll Time',
      cell: ({ row }) => {
        const time = row.getValue('tollTime') as string;
        return <div>{time || '-'}</div>;
      },
    },
    {
      accessorKey: 'numberOfTolls',
      header: 'Number of Tolls',
      cell: ({ row }) => {
        const count = row.getValue('numberOfTolls') as number;
        return <div className="text-center">{count}</div>;
      },
    },
    {
      accessorKey: 'totalTollAmount',
      header: 'Toll Amount',
      cell: ({ row }) => {
        const amount = row.getValue('totalTollAmount') as number;
        return <div className="font-medium">${amount.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'totalCommision',
      header: 'Commission',
      cell: ({ row }) => {
        const commission = row.getValue('totalCommision') as number;
        return <div>${commission.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'total',
      header: 'Total Amount',
      cell: ({ row }) => {
        const total = row.getValue('total') as number;
        return <div className="font-medium text-primary">${total.toFixed(2)}</div>;
      },
    },
    {
      accessorKey: 'platform',
      header: 'Platform',
      cell: ({ row }) => {
        const platform = row.getValue('platform') as string;
        return <div>{platform}</div>;
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Payment Status',
      cell: ({ row }) => {
        const status = row.getValue('paymentStatus') as number;
        let statusText = '';
        let statusClass = '';
        
        switch (status) {
          case 0:
            statusText = 'Failed';
            statusClass = 'badge bg-danger';
            break;
          case 1:
            statusText = 'Pending';
            statusClass = 'badge bg-warning';
            break;
          case 2:
            statusText = 'Completed';
            statusClass = 'badge bg-success';
            break;
          default:
            statusText = 'Unknown';
            statusClass = 'badge bg-secondary';
        }
        
        return <span className={statusClass}>{statusText}</span>;
      },
    },
    {
      accessorKey: 'invoiceStatus',
      header: 'Invoice Status',
      cell: ({ row }) => {
        const status = row.getValue('invoiceStatus') as number;
        return <div className="text-center">{status}</div>;
      },
    },
    {
      accessorKey: 'dateCreated',
      header: 'Date Created',
      cell: ({ row }) => {
        const date = new Date(row.getValue('dateCreated') as string);
        return <div>{date.toLocaleDateString()}</div>;
      },
    },
  ];

  return (
    <section className="authenticated-page">
      <div className="container">
        {/* Page Title - First Line */}
        <div style={{ marginBottom: '8px' }}>
          <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#333' }}>Pending Payments</h1>
        </div>

        {/* Controls Line - Company, Dates, Search */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', marginBottom: '8px', width: '100%' }}>
          
          {/* Company Selection (Admin Only) */}
          {isAdmin && (
            <div style={{ margin: '0', padding: '0', display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap' }}>
              <label htmlFor="company-select" style={{ fontWeight: '700', fontSize: '14px', margin: '0', padding: '0', minWidth: '80px', lineHeight: '38px', whiteSpace: 'nowrap' }}>
                Company
              </label>
              <select
                id="company-select"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
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

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              refetch();
              toast.success('Data refreshed');
            }}
          >
            Refresh
          </Button>
          
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-danger" style={{ marginTop: '12px' }}>
            {error.message}
          </div>
        )}

        {/* Loading Spinner */}
        {(() => {
          return null;
        })()}
        
        {isLoading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading pending payments...</p>
          </div>
        ) : filteredData.length > 0 ? (
          <DataTable
            data={filteredData as PendingPaymentRecord[]}
            columns={columns}
            searchable={true}
            exportable={true}
            selectable={true}
            onSelectionChange={handleSelectionChange}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            tableRef={tableRef}
            pageSize={10}
          />
        ) : hasSearched ? (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <p>No data available. Please select date range and click Search.</p>
          </div>
        ) : (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <p>Please select date range and click Search to view pending payments.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default PendingPayments;

