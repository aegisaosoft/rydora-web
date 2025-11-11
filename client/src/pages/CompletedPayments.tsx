import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rydoraApi } from '../services/api';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { exportToExcel } from '../utils/exportUtils';

type CompletedPaymentRecord = {
  id: number;
  carPlateNumber: string;
  numberOfTolls: number;
  total: number;
  stripeAdjusted: string;
  dailyPaymentId: string;
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  ownerFirstName: string;
  ownerLastName: string;
  killSwitchId: string;
  tag: boolean;
  paymentFlowId: string;
  invoiceDateDeployed: string | null;
  vin: string;
  bookingId: string;
};

const CompletedPayments: React.FC = () => {
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['completed-payments'],
    queryFn: () => rydoraApi.getPayments('completed')
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      // Only show error if it's not a 404 (empty data is expected)
      if ((error as any).response?.status !== 404) {
        toast.error((error as any).response?.data?.message || 'Failed to load completed payments');
      }
    }
  }, [error]);

  const handleExportExcel = async () => {
    if (!payments?.data || payments.data.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const success = exportToExcel(
      payments.data, 
      `Completed_Payments_Data_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`
    );
    
    if (success) {
      toast.success('Excel file downloaded successfully');
    } else {
      toast.error('Export failed. Please try again.');
    }
  };

  const handleExportPdf = async () => {
    if (!payments?.data || payments.data.length === 0) {
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
      doc.text('Completed Payments', 14, 20);
      
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
      const tableData = payments.data.map((row: any) => [
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
      const totalAmount = payments.data.reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, finalY + 15);
      doc.text(`Total Records: ${payments.data.length}`, 14, finalY + 25);
      
      // Save the PDF
      const filename = `Completed_Payments_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
      doc.save(`${filename}.pdf`);
      
      return true;
      
    } catch (error) {
      console.error('PDF export error:', error);
      
      // Manual table creation fallback (no autoTable dependency)
      try {
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('landscape');
        
        doc.setFontSize(18);
        doc.text('Completed Payments', 14, 20);
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
        
        payments.data.forEach((row: any, index: number) => {
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
        const totalAmount = payments.data.reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 14, yPosition);
        doc.text(`Total Records: ${payments.data.length}`, 14, yPosition + 10);
        
        const filename = `Completed_Payments_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
        doc.save(`${filename}.pdf`);
        
        return true;
        
      } catch (fallbackError) {
        console.error('Manual PDF generation failed:', fallbackError);
        toast.error('PDF export failed completely. Please try again or contact support.');
        return false;
      }
    }
  };

  // Define table columns
  const columns = useMemo<ColumnDef<CompletedPaymentRecord>[]>(
    () => [
      {
        accessorKey: 'carPlateNumber',
        header: 'Car Plate Number',
        cell: ({ getValue }) => getValue<string>(),
      },
      {
        accessorKey: 'total',
        header: 'Total Amount',
        cell: ({ getValue }) => {
          const amount = getValue<number>();
          return <span className="text-success fw-bold">${amount.toFixed(2)}</span>;
        },
      },
      {
        accessorKey: 'numberOfTolls',
        header: 'Number of Tolls',
        cell: ({ getValue }) => getValue<number>(),
      },
      {
        accessorKey: 'dailyPaymentId',
        header: 'Daily Payment ID',
        cell: ({ getValue }) => {
          const id = getValue<string>();
          return <code className="text-muted">{id}</code>;
        },
      },
      {
        accessorKey: 'firstName',
        header: 'First Name',
        cell: ({ getValue }) => getValue<string>(),
      },
      {
        accessorKey: 'lastName',
        header: 'Last Name',
        cell: ({ getValue }) => getValue<string>(),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ getValue }) => getValue<string>(),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ getValue }) => getValue<string>(),
      },
      {
        accessorKey: 'invoiceDateDeployed',
        header: 'Invoice Date',
        cell: ({ getValue }) => {
          const date = getValue<string | null>();
          return date ? new Date(date).toLocaleDateString() : 'N/A';
        },
      },
      {
        accessorKey: 'tag',
        header: 'Tag Present',
        cell: ({ getValue }) => {
          const hasTag = getValue<boolean>();
          return <span className={`badge ${hasTag ? 'bg-success' : 'bg-secondary'}`}>
            {hasTag ? 'Yes' : 'No'}
          </span>;
        },
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading completed payments...</p>
      </div>
    );
  }

  return (
    <section className="authenticated-page">
      <div className="container">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', marginBottom: '16px', width: '100%' }}>
          <h2 style={{ margin: '0' }}>Completed Payments</h2>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginTop: '12px' }}>
            {error.message}
          </div>
        )}

        {payments?.data && payments.data.length > 0 ? (
          <DataTable
            data={payments.data as CompletedPaymentRecord[]}
            columns={columns}
            searchable={true}
            exportable={true}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            pageSize={10}
          />
        ) : (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <p>No completed payments data available.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CompletedPayments;

