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

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rydoraApi, default as api } from '../services/api';
import { ParkingViolation } from '../services/nycViolationsApi';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { exportToExcel } from '../utils/exportUtils';
import { Button } from '../components/ui/Button';

interface Car {
  id: string;
  carPlateNumber: string;
  carPlateNumberState: string;
  vin: string;
  carBrand: string;
  carModel: string;
  year: number;
  title: string;
}

interface NYCViolationDisplay extends ParkingViolation {
  // Additional computed fields for display
  formattedAmount: string;
  formattedDate: string;
  carInfo?: string;
}

const NYCViolations: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedViolations] = useState<NYCViolationDisplay[]>([]);
  const [isLoadingViolations, setIsLoadingViolations] = useState(false);
  const [violationsData, setViolationsData] = useState<NYCViolationDisplay[]>([]);
  const [violationsError, setViolationsError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [allViolationsData, setAllViolationsData] = useState<NYCViolationDisplay[]>([]);

  // Set default dates
  useEffect(() => {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(oneYearAgo.toISOString().split('T')[0]);
    setHasSearched(true); // Enable automatic search on page load
  }, []);

  // Step 1: Get cars from Rydora API
  const { data: carsResponse, isLoading: carsLoading, error: carsError, refetch: refetchCars } = useQuery({
    queryKey: ['cars-list', dateFrom, dateTo],
    queryFn: () => rydoraApi.getCars(0), // role = 0
    enabled: hasSearched,
    retry: 1
  });

  // Step 2: Extract license plates and fetch violations from Socrata
  useEffect(() => {
    const fetchViolations = async () => {
      if (!carsResponse?.result || carsResponse.result.length === 0) {
        return;
      }

      setIsLoadingViolations(true);
      setViolationsError(null);

      try {

        // Extract license plates from cars
        const cars: Car[] = Array.isArray(carsResponse.result) 
          ? carsResponse.result 
          : [carsResponse.result];

        const licensePlates = cars
          .map(car => car.carPlateNumber)
          .filter(plate => plate && plate.trim() !== '')
          .map(plate => plate.trim().toUpperCase());

        if (licensePlates.length === 0) {
          setViolationsData([]);
          return;
        }

        // Fetch violations from Socrata API
        
        let violations: any[] = [];
        
        try {
          
          // Format dates for the server
          const formatDateForAPI = (dateStr: string) => {
            const date = new Date(dateStr);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;
          };

          const formattedDateFrom = formatDateForAPI(dateFrom);
          const formattedDateTo = formatDateForAPI(dateTo);
          
          // Call server endpoint with license plates and date range
          const url = `/rydora/nyc-violations?licensePlates=${encodeURIComponent(JSON.stringify(licensePlates))}&dateFrom=${encodeURIComponent(formattedDateFrom)}&dateTo=${encodeURIComponent(formattedDateTo)}&limit=5000`;
          
          const response = await api.get(url);
          violations = response.data.rows || response.data.data || [];
          
        } catch (error) {
          console.error('Error fetching violations from server:', error);
          // Return empty array instead of throwing to prevent page crash
          violations = [];
        }


        // Transform all violations for display
        const allTransformedViolations: NYCViolationDisplay[] = violations.map(violation => {
          // Find matching car info
          const matchingCar = cars.find(car => 
            car.carPlateNumber?.toUpperCase() === violation.plate?.toUpperCase()
          );

          return {
            ...violation,
            formattedAmount: violation.fine_amount ? `$${parseFloat(violation.fine_amount).toFixed(2)}` : '$0.00',
            formattedDate: violation.issue_date ? new Date(violation.issue_date).toLocaleDateString() : '',
            carInfo: matchingCar ? `${matchingCar.carBrand} ${matchingCar.carModel} (${matchingCar.year})` : ''
          };
        });

        // Filter for unpaid violations (amount > 0)
        const unpaidViolations = allTransformedViolations.filter(violation => {
          const amountDue = parseFloat(violation.amount_due || '0');
          return amountDue > 0;
        });
        
        
        // Store both datasets
        setAllViolationsData(allTransformedViolations);
        setViolationsData(unpaidViolations); // Start with unpaid only

        // Data loaded silently

      } catch (error) {
        console.error('Error fetching NYC violations:', error);
        setViolationsError(error instanceof Error ? error.message : 'Failed to fetch violations');
        toast.error('Failed to fetch NYC violations');
      } finally {
        setIsLoadingViolations(false);
      }
    };

    if (carsResponse?.result) {
      fetchViolations();
    }
  }, [carsResponse, dateFrom, dateTo]);

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
    refetchCars();
  };

  const handleExportExcel = async () => {
    if (!violationsData || violationsData.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const success = exportToExcel(
      violationsData,
      `NYC_Violations_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`
    );
    
    if (success) {
      toast.success('Excel file downloaded successfully!');
    } else {
      toast.error('Export failed. Please try again.');
    }
  };

  const handleExportPdf = async () => {
    if (!violationsData || violationsData.length === 0) {
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
      doc.text('NYC Violations', 14, 20);
      
      // Add export date
      doc.setFontSize(10);
      doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
      
      // Define column headers
      const headers = [
        'Plate',
        'State',
        'License Type',
        'Summons Number',
        'Issue Date',
        'Violation Time',
        'Amount Due',
        'Status'
      ];
      
      // Prepare table data with proper formatting
      const tableData = violationsData.map((violation: NYCViolationDisplay) => [
        violation.plate || 'N/A',
        violation.state || 'N/A',
        violation.license_type || 'N/A',
        violation.summons_number || 'N/A',
        violation.formattedDate || 'N/A',
        violation.violation_time || 'N/A',
        violation.amount_due ? `$${parseFloat(violation.amount_due).toFixed(2)}` : '$0.00',
        violation.violation_status || 'Unknown'
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
          0: { cellWidth: 25 }, // Plate
          1: { cellWidth: 20 }, // State
          2: { cellWidth: 25 }, // License Type
          3: { cellWidth: 30 }, // Summons Number
          4: { cellWidth: 25 }, // Issue Date
          5: { cellWidth: 25 }, // Violation Time
          6: { cellWidth: 25, halign: 'right' }, // Amount Due (right-aligned)
          7: { cellWidth: 25 } // Status
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
      const totalAmount = violationsData.reduce((sum: number, violation: NYCViolationDisplay) => sum + (parseFloat(violation.amount_due || '0')), 0);
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, finalY + 15);
      doc.text(`Total Records: ${violationsData.length}`, 14, finalY + 25);
      
      // Save the PDF
      const filename = `NYC_Violations_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
      doc.save(`${filename}.pdf`);
      
      return true;
      
    } catch (error) {
      console.error('PDF export error:', error);
      
      // Manual table creation fallback (no autoTable dependency)
      try {
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text('NYC Violations', 14, 20);
        doc.setFontSize(10);
        doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 28);
        
        // Manual table creation
        let yPosition = 50;
        const lineHeight = 6;
        const pageHeight = doc.internal.pageSize.height;
        
        // Headers
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const headers = ['Plate', 'State', 'License Type', 'Summons', 'Issue Date', 'Time', 'Amount', 'Status'];
        const columnPositions = [14, 39, 59, 84, 114, 139, 164, 189];
        
        headers.forEach((header, index: number) => {
          doc.text(header, columnPositions[index], yPosition);
        });
        
        // Line under headers
        doc.line(14, yPosition + 2, 254, yPosition + 2);
        yPosition += 8;
        
        // Data rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        violationsData.forEach((violation: NYCViolationDisplay, index: number) => {
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
            (violation.plate || 'N/A').substring(0, 8),
            (violation.state || 'N/A').substring(0, 8),
            (violation.license_type || 'N/A').substring(0, 8),
            (violation.summons_number || 'N/A').substring(0, 8),
            violation.formattedDate ? violation.formattedDate.substring(0, 8) : 'N/A',
            (violation.violation_time || 'N/A').substring(0, 8),
            violation.amount_due ? `$${parseFloat(violation.amount_due).toFixed(2)}` : '$0.00',
            (violation.violation_status || 'Unknown').substring(0, 8)
          ];
          
          rowData.forEach((data, dataIndex: number) => {
            doc.text(data, columnPositions[dataIndex], yPosition);
          });
          
          yPosition += lineHeight;
        });
        
        // Total
        yPosition += 10;
        const totalAmount = violationsData.reduce((sum: number, violation: NYCViolationDisplay) => sum + (parseFloat(violation.amount_due || '0')), 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, yPosition);
        doc.text(`Total Records: ${violationsData.length}`, 14, yPosition + 10);
        
        const filename = `NYC_Violations_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
        doc.save(`${filename}.pdf`);
        
        return true;
        
      } catch (fallbackError) {
        console.error('Manual PDF generation failed:', fallbackError);
        toast.error('PDF export failed completely. Please try again or contact support.');
        return false;
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const _handlePaySelected = () => {
  //   if (selectedViolations.length === 0) {
  //     toast.error('Please select violations to pay.');
  //     return;
  //   }
  //   toast.success(`Processing payment for ${selectedViolations.length} violation(s)...`);
  //   // Implement payment logic here
  // };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const _handleDisputeSelected = () => {
  //   if (selectedViolations.length === 0) {
  //     toast.error('Please select violations to dispute.');
  //     return;
  //   }
  //   toast.success(`Processing dispute for ${selectedViolations.length} violation(s)...`);
  //   // Implement dispute logic here
  // };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const _handleViewDetails = (violation: NYCViolationDisplay) => {
  //   const details = `
  // Summons: ${violation.summons_number}
  // Plate: ${violation.plate} (${violation.state})
  // Date: ${violation.formattedDate}
  // Time: ${violation.violation_time}
  // Location: ${violation.precinct || 'Unknown'}
  // Violation: ${violation.violation}
  // Fine Amount: ${violation.formattedAmount}
  // Status: ${violation.violation_status || 'Unknown'}
  //   `.trim();
  //   
  //   alert(details);
  // };

  const handleToggleFilter = () => {
    if (showAllRecords) {
      // Switch to showing only unpaid (amount > 0)
      const unpaidViolations = allViolationsData.filter(violation => {
        const amountDue = parseFloat(violation.amount_due || '0');
        return amountDue > 0;
      });
      setViolationsData(unpaidViolations);
      setShowAllRecords(false);
    } else {
      // Switch to showing ALL records (including $0.00 amounts)
      setViolationsData(allViolationsData);
      setShowAllRecords(true);
    }
  };

  // Define table columns in the specified order
  const columns = useMemo<ColumnDef<NYCViolationDisplay>[]>(
    () => [
      {
        accessorKey: 'plate',
        header: 'Plate',
        cell: ({ getValue }) => getValue<string>() || '-',
      },
      {
        accessorKey: 'state',
        header: 'State',
        cell: ({ getValue }) => getValue<string>() || '-',
      },
      {
        accessorKey: 'license_type',
        header: 'License Type',
        cell: ({ getValue }) => getValue<string>() || '-',
      },
      {
        accessorKey: 'summons_number',
        header: 'Summons Number',
        cell: ({ getValue }) => getValue<string>() || '-',
      },
      {
        accessorKey: 'formattedDate',
        header: 'Issue Date',
        cell: ({ getValue }) => getValue<string>(),
      },
      {
        accessorKey: 'violation_time',
        header: 'Violation Time',
        cell: ({ getValue }) => getValue<string>() || '-',
      },
      {
        accessorKey: 'amount_due',
        header: 'Amount Due',
        cell: ({ getValue }) => {
          const amount = getValue<string>();
          const formattedAmount = amount ? `$${parseFloat(amount).toFixed(2)}` : '$0.00';
          return <span className="font-medium text-danger">{formattedAmount}</span>;
        },
      },
      {
        accessorKey: 'summons_image',
        header: 'Summons Image',
        cell: ({ getValue, row }) => {
          const imageUrl = getValue<string>();
          const violation = row.original;
          
          // NYC violation images are typically accessed via the summons number
          // Try multiple approaches for getting the image URL
          let fullImageUrl: string | null = null;
          
          // Ensure imageUrl is a string before calling startsWith
          if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
            // Direct URL provided
            fullImageUrl = imageUrl;
          } else if (violation.summons_number) {
            // Construct URL using summons number (common NYC pattern)
            fullImageUrl = `https://nycserv.nyc.gov/NYCServWeb/ShowImage?ALT_FINE_AMT=0&PLATE=${violation.plate}&BLOX=A&IMG_TYP=P.jpg&SUMMONS_NUMBER=${violation.summons_number}`;
          }
          
          return fullImageUrl ? (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => {
                // Try to open the image, with fallback error handling
                if (fullImageUrl) {
                  try {
                    window.open(fullImageUrl, '_blank');
                  } catch (error) {
                    alert('Unable to open image. The image may not be available.');
                  }
                }
              }}
            >
              View Image
            </button>
          ) : (
            <span className="text-muted">No Image</span>
          );
        },
      },
      {
        accessorKey: 'violation_status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue<string>() || 'Unknown';
          const statusClass = status.toLowerCase().includes('paid') ? 'text-success' : 
                             status.toLowerCase().includes('disputed') ? 'text-warning' : 'text-danger';
          return <span className={statusClass}>{status}</span>;
        },
      },
    ],
    []
  );

  const isLoading = carsLoading || isLoadingViolations;
  const hasError = carsError || violationsError;

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">
          {carsLoading ? 'Loading your vehicles...' : 'Fetching NYC violations...'}
        </p>
      </div>
    );
  }

  return (
    <section className="authenticated-page">
      <div className="container">
        {/* Page Title - First Line */}
        <div style={{ marginBottom: '8px' }}>
          <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#333' }}>NYC Violations</h1>
        </div>

        {/* Controls Line - Dates, Search */}
        <div className="search-controls" style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', marginBottom: '8px', width: '100%' }}>
          
          {/* Search Form */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <label htmlFor="nyc-date-from" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Date from</label>
              <input 
                id="nyc-date-from" 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ fontSize: '16px', height: '38px', minWidth: '150px' }} 
              />
            </div>
            <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <label htmlFor="nyc-date-to" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Date to</label>
              <input 
                id="nyc-date-to" 
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
        </div>


        {/* Error Display */}
        {hasError && (
          <div className="alert alert-danger" style={{ marginTop: '12px' }}>
            {carsError ? 'Failed to load vehicles' : violationsError}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading NYC violations...</p>
          </div>
        ) : violationsData.length > 0 ? (
          <>
            <DataTable
            data={violationsData}
            columns={columns}
            searchable={true}
            exportable={true}
            selectable={false}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            additionalButtons={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleToggleFilter}
                  className="mr-2"
                >
                  {showAllRecords ? 'Show Unpaid' : 'Show All'}
                </Button>
                <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                  {showAllRecords ? 'Showing all records' : 'Showing unpaid only'}
                </span>
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
            Total Amount: ${violationsData.reduce((sum: number, row: any) => sum + (parseFloat(row.amount_due?.toString() || '0')), 0).toFixed(2)}
            {' '}({violationsData.length} record{violationsData.length !== 1 ? 's' : ''})
          </div>
          </>
        ) : hasSearched ? (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <p>No NYC violations found for your vehicles.</p>
          </div>
        ) : (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <p>Please select date range and click Search to view NYC violations.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default NYCViolations;
