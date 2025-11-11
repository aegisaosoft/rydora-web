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

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { rydoraApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import { exportToExcel } from '../utils/exportUtils';
import toast from 'react-hot-toast';
import './Invoice.css';

interface Company {
  id: string;
  name: string;
  stateId: string;
  createdBy: string;
  userId: string;
  hqToken: string;
  isActive: boolean;
}

interface Payment {
  id: string;
  table: string;
  name: string;
  amount: number;
  originalPaymentStatus: number;
  originalNumber: string;
}

// interface InvoiceData {
//   id: string;
//   companyId: string;
//   invoiceDate: string;
//   status: number;
//   totalAmount: number;
//   number: string;
//   payments: Payment[];
// }

const Invoice: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  // Get URL parameters
  const invoiceId = searchParams.get('invoiceId');
  const urlCompanyId = searchParams.get('companyId');
  const urlDate = searchParams.get('date');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const _fromAllInvoices = searchParams.get('from') === 'allinvoices';
  
  const [dateFrom, setDateFrom] = useState(urlDate || new Date().toISOString().split('T')[0]);
  const [hasSearched, setHasSearched] = useState(Boolean(urlCompanyId && urlDate));
  const [selectedCompanyId, setSelectedCompanyId] = useState(urlCompanyId || '');

  // Check if user is admin or owner (fallback to isOwner if isAdmin is null, but respect explicit false)
  const isAdmin = user?.isAdmin ?? false;
  const isOwner = user?.isOwner ?? false;
  const canAccessAdminFeatures = isAdmin || isOwner;

  // Helper function to get invoice status label and styling
  const getInvoiceStatusLabel = (status: number): { label: string; className: string } => {
    const statuses: Record<number, { label: string; className: string }> = {
      0: { label: 'Done', className: 'badge bg-primary' },
      1: { label: 'New (finalized)', className: 'badge bg-warning text-dark' },
      2: { label: 'PaymentRequested', className: 'badge bg-info' },
      3: { label: 'Paid', className: 'badge bg-success' },
      4: { label: 'Failed', className: 'badge bg-danger' }
    };
    return statuses[status] || { label: 'Unknown', className: 'badge bg-secondary' };
  };

  // Helper function to get payment status label and styling
  const getPaymentStatusLabel = (status: number): { label: string; className: string } => {
    const statuses: Record<number, { label: string; className: string }> = {
      0: { label: 'Pending', className: 'badge bg-warning text-dark' },
      1: { label: 'Paid', className: 'badge bg-success' },
      2: { label: 'Failed', className: 'badge bg-danger' },
      3: { label: 'Refunded', className: 'badge bg-info' }
    };
    return statuses[status] || { label: 'Unknown', className: 'badge bg-secondary' };
  };
  
  // Fetch active companies (only if user is admin or owner)
  const { data: companiesData, isLoading: companiesLoading, error: companiesError, refetch: refetchCompanies } = useQuery({
    queryKey: ['activeCompanies'],
    queryFn: rydoraApi.getActiveCompanies,
    enabled: canAccessAdminFeatures, // Only fetch if user is admin or owner
    retry: 3, // Retry up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  const { data: invoiceData, isLoading, error, refetch } = useQuery({
    queryKey: (urlCompanyId && urlDate) ? ['invoice-by-company', urlCompanyId, urlDate] : 
              invoiceId ? ['invoice-details', invoiceId] : 
              ['invoice-by-company', selectedCompanyId, dateFrom],
    queryFn: async () => {
      try {
        let result;
        
        // Priority 1: URL parameters (companyId + date) - use invoice by company
        if (urlCompanyId && urlDate) {
          console.log('Fetching invoice by URL parameters (company and date):', urlCompanyId, urlDate);
          result = await rydoraApi.getInvoiceByCompany(urlCompanyId, urlDate);
        }
        // Priority 2: invoiceId - use invoice details
        else if (invoiceId) {
          console.log('Fetching invoice by ID:', invoiceId);
          result = await rydoraApi.getExternalDailyInvoiceDetails(invoiceId);
          console.log('Invoice by ID result:', result);
        }
        // Priority 3: Manual search - use invoice by company
        else {
          console.log('Fetching invoice by manual search (company and date):', selectedCompanyId, dateFrom);
          result = await rydoraApi.getInvoiceByCompany(selectedCompanyId, dateFrom);
        }
        
        // Check if the response indicates "Invoice not found for date"
        if (result && typeof result === 'string' && 
            result.includes('Invoice not found for date')) {
          // Return null to indicate no data, but not an error
          return null;
        }
        
        // Also check if it's an object with a message property
        if (result && typeof result === 'object' && result.message && 
            result.message.includes('Invoice not found for date')) {
          // Return null to indicate no data, but not an error
          return null;
        }
        
        return result;
      } catch (err: any) {
        console.log('Invoice API Error:', err);
        console.log('Error response:', err.response);
        console.log('Error response data:', err.response?.data);
        console.log('Error response message:', err.response?.data?.message);
        
        // Check if it's a 404 with the specific "Invoice not found for date" message
        if (err.response?.status === 404 && 
            err.response?.data && 
            err.response.data.includes('Invoice not found for date')) {
          console.log('404 with "Invoice not found for date" message - treating as no data');
          // This is not an error, just no data found for this date
          return null;
        }
        
        // Only treat other 404s and HTTP errors as actual errors
        if (err.response?.status === 404 || err.response?.status >= 500) {
          console.log('Treating as actual error');
          throw err;
        }
        // For other cases, return null
        return null;
      }
    },
    enabled: Boolean(canAccessAdminFeatures && ((urlCompanyId && urlDate) || invoiceId || (hasSearched && selectedCompanyId))),
    retry: 1
  });

  // Update invoice status mutation
  const updateInvoiceStatusMutation = useMutation({
    mutationFn: ({ invoiceId, status }: { invoiceId: string; status: number }) => 
      rydoraApi.updateInvoiceStatus(invoiceId, status),
    onSuccess: async (data) => {
      console.log('Invoice status updated successfully:', data);
      toast.success('Invoice status updated successfully!');
      // Invalidate and refetch the invoice data to get updated status
      await queryClient.invalidateQueries({ 
        queryKey: ['invoice-by-company', selectedCompanyId, dateFrom] 
      });
      await refetch();
    },
    onError: (error: any) => {
      console.error('Failed to update invoice status:', error);
      toast.error(`Failed to update invoice status: ${error.response?.data?.message || error.message}`);
    }
  });

  // Submit invoice mutation (legacy - keeping for backward compatibility)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useMutation({
    mutationFn: (invoiceId: string) => rydoraApi.submitInvoice(invoiceId),
    onSuccess: async (data) => {
      console.log('Invoice submitted successfully:', data);
      toast.success('Invoice submitted successfully!');
      // Invalidate and refetch the invoice data to get updated status
      await queryClient.invalidateQueries({ 
        queryKey: ['invoice-by-company', selectedCompanyId, dateFrom] 
      });
      await refetch();
    },
    onError: (error: any) => {
      console.error('Failed to submit invoice:', error);
      toast.error(`Failed to submit invoice: ${error.response?.data?.message || error.message}`);
    }
  });

  // Fail invoice mutation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useMutation({
    mutationFn: (invoiceId: string) => rydoraApi.failInvoice(invoiceId),
    onSuccess: async (data) => {
      console.log('Invoice marked as failed successfully:', data);
      toast.success('Invoice marked as failed!');
      // Invalidate and refetch the invoice data to get updated status
      await queryClient.invalidateQueries({ 
        queryKey: ['invoice-by-company', selectedCompanyId, dateFrom] 
      });
      await refetch();
    },
    onError: (error: any) => {
      console.error('Failed to mark invoice as failed:', error);
      toast.error(`Failed to mark invoice as failed: ${error.response?.data?.message || error.message}`);
    }
  });

  // Handle URL parameters when page loads (for returning from details page)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    const companyIdParam = urlParams.get('companyId');
    
    if (dateParam) {
      setDateFrom(dateParam);
    }
    if (companyIdParam) {
      setSelectedCompanyId(companyIdParam);
    }
  }, []);

  // Set first company as selected when companies data loads
  useEffect(() => {
    console.log('=== COMPANY SELECTION DEBUG ===');
    console.log('companiesData:', companiesData);
    console.log('companiesLoading:', companiesLoading);
    console.log('companiesError:', companiesError);
    console.log('selectedCompanyId:', selectedCompanyId);
    
    if (companiesData?.result && companiesData.result.length > 0 && !selectedCompanyId) {
      const firstCompany = companiesData.result[0];
      console.log('Setting first company as selected:', firstCompany);
      setSelectedCompanyId(firstCompany.id);
    }
  }, [companiesData, selectedCompanyId, companiesLoading, companiesError]);

  // Refetch data when company selection changes
  useEffect(() => {
    if (hasSearched && selectedCompanyId) {
      refetch();
    }
  }, [selectedCompanyId, refetch, hasSearched]);

  // Auto-search when returning from details page with URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlParams = urlParams.get('date') || urlParams.get('companyId');
    
    if (hasUrlParams && dateFrom && selectedCompanyId && !hasSearched) {
      setHasSearched(true);
      refetch();
    }
  }, [dateFrom, selectedCompanyId, hasSearched, refetch]);

  // Auto-load data when page loads (if company is selected and date is set)
  useEffect(() => {
    if (selectedCompanyId && dateFrom && !hasSearched) {
      setHasSearched(true);
      refetch();
    }
  }, [selectedCompanyId, dateFrom, hasSearched, refetch]);

  const handleSearch = () => {
    if (dateFrom && selectedCompanyId) {
      setHasSearched(true);
      refetch();
    }
  };

  const handleSubmit = () => {
    // Handle status change action
    console.log('Change Status button clicked');
    
    if (!invoiceData?.id) {
      toast.error('No invoice data available to change status. Please search for an invoice first.');
      return;
    }
    
    if (!dateFrom || !selectedCompanyId) {
      toast.error('Please select a date and company before changing status.');
      return;
    }
    
    // Determine the next status based on current status
    let nextStatus: number;
    let confirmMessage: string;
    
    switch (invoiceData.status) {
      case 1: // New (finalized) -> Request Payment (send status 2)
        nextStatus = 2;
        confirmMessage = `Are you sure you want to change invoice ${invoiceData.id} status to PaymentRequested?`;
        break;
      case 2: // PaymentRequested -> Paid (send status 3)
        nextStatus = 3;
        confirmMessage = `Are you sure you want to change invoice ${invoiceData.id} status to Paid?`;
        break;
      case 3: // Paid -> Done (send status 0)
        nextStatus = 0;
        confirmMessage = `Are you sure you want to change invoice ${invoiceData.id} status to Done?`;
        break;
      case 4: // Failed -> Request Payment (can resubmit, send status 2)
        nextStatus = 2;
        confirmMessage = `Are you sure you want to change invoice ${invoiceData.id} status to PaymentRequested?`;
        break;
      default:
        toast.error('Invalid invoice status for status change.');
        return;
    }
    
    // Confirm status change
    if (window.confirm(confirmMessage)) {
      updateInvoiceStatusMutation.mutate({ invoiceId: invoiceData.id, status: nextStatus });
    }
  };

  const handleFailed = () => {
    // Handle failed action - always send status 2 (PaymentRequested) regardless of current status
    console.log('Failed button clicked');
    
    if (!invoiceData?.id) {
      toast.error('No invoice data available. Please search for an invoice first.');
      return;
    }
    
    if (!dateFrom || !selectedCompanyId) {
      toast.error('Please select a date and company before marking as failed.');
      return;
    }
    
    // Confirm marking as failed
    if (window.confirm(`Are you sure you want to mark invoice ${invoiceData.id} as Failed?`)) {
      updateInvoiceStatusMutation.mutate({ invoiceId: invoiceData.id, status: 2 }); // Always send status 2 (PaymentRequested)
    }
  };


  // Get the status button label based on current invoice status
  const getStatusButtonLabel = () => {
    if (!invoiceData) return 'Request Payment';
    
    switch (invoiceData.status) {
      case 0: // Done -> already done
        return 'Done';
      case 1: // New (finalized) -> Request Payment (send status 2)
        return 'Request Payment';
      case 2: // PaymentRequested -> Paid (send status 3)
        return 'Paid';
      case 3: // Paid -> Done (send status 0)
        return 'Done';
      case 4: // Failed -> Request Payment (can resubmit, send status 2)
        return 'Request Payment';
      default:
        return 'Request Payment';
    }
  };

  // Get the status button color based on current invoice status
  const getStatusButtonColor = () => {
    if (!invoiceData) return 'btn-warning';
    
    switch (invoiceData.status) {
      case 0: // Done -> primary/blue
        return 'btn-primary';
      case 1: // New (finalized) -> yellow/warning
        return 'btn-warning';
      case 2: // PaymentRequested -> info/blue
        return 'btn-info';
      case 3: // Paid -> success/green
        return 'btn-success';
      case 4: // Failed -> Request Payment -> yellow/warning
        return 'btn-warning';
      default:
        return 'btn-warning';
    }
  };

  const handleDetails = () => {
    // Debug logging for Azure troubleshooting
    console.log('=== INVOICE DETAILS DEBUG ===');
    console.log('selectedCompanyId:', selectedCompanyId);
    console.log('companiesData:', companiesData);
    console.log('invoiceData:', invoiceData);
    console.log('dateFrom:', dateFrom);
    
    // Get selected company name with enhanced debugging
    console.log('Available companies:', companiesData?.result);
    console.log('Looking for company ID:', selectedCompanyId);
    console.log('Full companies data structure:', JSON.stringify(companiesData, null, 2));
    
    // Try multiple lookup strategies
    let selectedCompany = null;
    let companyName = '';
    
    // Strategy 1: Direct ID match
    selectedCompany = companiesData?.result?.find((company: Company) => {
      const companyId = String(company.id || '');
      const searchId = String(selectedCompanyId || '');
      const isMatch = companyId === searchId;
      console.log('Strategy 1 - Checking company:', companyId, 'against:', searchId, 'match:', isMatch);
      return isMatch;
    });
    
    // Strategy 2: Try with trimmed IDs
    if (!selectedCompany) {
      selectedCompany = companiesData?.result?.find((company: Company) => {
        const companyId = String(company.id || '').trim();
        const searchId = String(selectedCompanyId || '').trim();
        const isMatch = companyId === searchId;
        console.log('Strategy 2 - Checking company (trimmed):', companyId, 'against:', searchId, 'match:', isMatch);
        return isMatch;
      });
    }
    
    // Strategy 3: Try case-insensitive match
    if (!selectedCompany) {
      selectedCompany = companiesData?.result?.find((company: Company) => {
        const companyId = String(company.id || '').toLowerCase();
        const searchId = String(selectedCompanyId || '').toLowerCase();
        const isMatch = companyId === searchId;
        console.log('Strategy 3 - Checking company (case-insensitive):', companyId, 'against:', searchId, 'match:', isMatch);
        return isMatch;
      });
    }
    
    // Strategy 4: Use first company if only one exists and IDs don't match
    if (!selectedCompany && companiesData?.result?.length === 1) {
      console.log('Strategy 4 - Using first (and only) company as fallback');
      selectedCompany = companiesData.result[0];
    }
    
    companyName = selectedCompany ? selectedCompany.name : '';
    
    console.log('Final selectedCompany:', selectedCompany);
    console.log('Final companyName:', companyName);
    
    // Check if invoice data exists
    if (!invoiceData?.id) {
      console.log('ERROR: No invoice data found');
      toast.error('Please search for an invoice first.');
      return;
    }
    
    // Check if companies are still loading
    if (companiesLoading) {
      console.log('ERROR: Companies still loading');
      toast.error('Please wait for companies to load.');
      return;
    }
    
    // Check if companies failed to load
    if (companiesError) {
      console.log('ERROR: Companies failed to load:', companiesError);
      toast.error('Failed to load companies. Please refresh the page.');
      return;
    }
    
    // Check if a company is selected
    if (!selectedCompanyId) {
      console.log('ERROR: No company selected');
      toast.error('Please select a company before viewing details.');
      return;
    }
    
    // Check if company name is available - with comprehensive fallback
    if (!companyName) {
      console.log('ERROR: Company name not found for ID:', selectedCompanyId);
      
      // Try multiple fallback strategies
      let fallbackCompanyName = 'Unknown Company';
      
      // Fallback 1: URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const companyNameFromUrl = urlParams.get('companyName');
      if (companyNameFromUrl) {
        fallbackCompanyName = companyNameFromUrl;
        console.log('Fallback 1 - Using company name from URL:', fallbackCompanyName);
      }
      
      // Fallback 2: Use any available company name from the list
      else if (companiesData?.result?.length > 0) {
        fallbackCompanyName = companiesData.result[0].name || 'Company';
        console.log('Fallback 2 - Using first available company name:', fallbackCompanyName);
      }
      
      // Fallback 3: Use company ID as name
      else {
        fallbackCompanyName = `Company ${selectedCompanyId.substring(0, 8)}`;
        console.log('Fallback 3 - Using company ID as name:', fallbackCompanyName);
      }
      
      console.log('Using fallback company name:', fallbackCompanyName);
      
      // Navigate with fallback company name
      navigate(`/invoice-details?invoiceId=${invoiceData.id}&companyId=${selectedCompanyId}&companyName=${encodeURIComponent(fallbackCompanyName)}&date=${dateFrom}`);
      return;
    }
    
    console.log('SUCCESS: Navigating to invoice details');
    // Navigate using React Router to preserve authentication
    navigate(`/invoice-details?invoiceId=${invoiceData.id}&companyId=${selectedCompanyId}&companyName=${encodeURIComponent(companyName)}&date=${dateFrom}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const _handlePaymentDetails = (payment: Payment) => {
  //   // Handle payment details - you can customize this based on your requirements
  //   console.log('Payment details clicked:', payment);
  //   alert(`Payment Details:\nID: ${payment.id}\nTable: ${payment.table}\nName: ${payment.name}\nAmount: $${payment.amount}\nOriginal Payment Status: ${payment.originalPaymentStatus}\nOriginal Number: ${payment.originalNumber}`);
  // };

  const handleExportExcel = () => {
    const dataToExport = invoiceData?.payments || invoiceData?.fees || [];
    if (!dataToExport || dataToExport.length === 0) {
      toast.error('No payment data to export');
      return;
    }
    
    const success = exportToExcel(
      dataToExport,
      `Invoice_${invoiceData.number || invoiceData.id}_Payments_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`
    );
    
    if (success) {
      toast.success('Data exported to Excel successfully');
    } else {
      toast.error('Failed to export data to Excel');
    }
  };

  const handleExportPdf = async () => {
    const dataToExport = invoiceData?.payments || invoiceData?.fees || [];
    if (!dataToExport || dataToExport.length === 0) {
      toast.error('No payment data to export');
      return;
    }
    
    try {
      // Import jsPDF and autoTable plugin
      const jsPDF = (await import('jspdf')).default;
      await import('jspdf-autotable'); // Import plugin to register it with jsPDF
      
      // Create PDF in portrait mode
      const doc = new jsPDF('portrait');
      
      // Add title
      doc.setFontSize(18);
      doc.text(`Invoice ${invoiceData.number || invoiceData.id}`, 14, 20);
      
      // Company and Invoice Date
      const selectedCompany = companiesData?.result?.find((company: Company) => company.id === selectedCompanyId);
      const companyNameForPdf = selectedCompany?.name || 'Unknown Company';
      const invoiceDateForPdf = invoiceData?.invoiceDate
        ? new Date(invoiceData.invoiceDate).toLocaleDateString()
        : (dateFrom || '');
      doc.setFontSize(10);
      doc.text(`Company: ${companyNameForPdf}`, 14, 28);
      if (invoiceDateForPdf) {
        doc.text(`Invoice Date: ${invoiceDateForPdf}`, 14, 34);
      }
      
      // Define column headers
      const headers = ['Name', 'Amount'];
      
      // Prepare table data with proper formatting
      const tableData = dataToExport.map((item: any) => [
        item.name || item.bookingNumber ? `Booking: ${item.bookingNumber}` : 'N/A',
        item.amount ? `$${item.amount.toFixed(2)}` : 'N/A'
      ]);
      
      // Generate table with headers
      doc.autoTable({
        head: [headers], // Array of headers
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 12,
          cellPadding: 5,
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
          fontSize: 12,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          // Adjusted column widths for portrait A4 (210mm width)
          0: { cellWidth: 120 }, // Name
          1: { cellWidth: 60, halign: 'right' } // Amount (right-aligned)
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
      const totalAmount = dataToExport.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Payments: $${totalAmount.toFixed(2)}`, 14, finalY + 15);
      doc.text(`Total Records: ${dataToExport.length}`, 14, finalY + 25);
      
      // Save the PDF
      const filename = `Invoice_Payments_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
      doc.save(`${filename}.pdf`);
      
      return true;
      
    } catch (error) {
      console.error('PDF export error:', error);
      
      // Manual table creation fallback (no autoTable dependency)
      try {
        const jsPDF = (await import('jspdf')).default;
        const doc = new jsPDF('portrait');
        
        doc.setFontSize(18);
        doc.text(`Invoice ${invoiceData.number || invoiceData.id}`, 14, 20);
        // Company and Invoice Date
        const selectedCompany = companiesData?.result?.find((company: Company) => company.id === selectedCompanyId);
        const companyNameForPdf = selectedCompany?.name || 'Unknown Company';
        const invoiceDateForPdf = invoiceData?.invoiceDate
          ? new Date(invoiceData.invoiceDate).toLocaleDateString()
          : (dateFrom || '');
        doc.setFontSize(10);
        doc.text(`Company: ${companyNameForPdf}`, 14, 28);
        if (invoiceDateForPdf) {
          doc.text(`Invoice Date: ${invoiceDateForPdf}`, 14, 34);
        }
        
        // Manual table creation
        let yPosition = 50;
        const lineHeight = 6;
        const pageHeight = doc.internal.pageSize.height;
        
        // Headers
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const headers = ['Name', 'Amount'];
        const columnPositions = [14, 134];
        
        headers.forEach((header, index: number) => {
          doc.text(header, columnPositions[index], yPosition);
        });
        
        // Line under headers
        doc.line(14, yPosition + 2, 194, yPosition + 2);
        yPosition += 8;
        
        // Data rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        invoiceData.payments.forEach((payment: Payment, index: number) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 30;
            // Repeat headers on new page
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            headers.forEach((header, headerIndex: number) => {
              doc.text(header, columnPositions[headerIndex], yPosition);
            });
            doc.line(14, yPosition + 2, 194, yPosition + 2);
            yPosition += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
          }
          
          const rowData = [
            (payment.name || 'N/A').substring(0, 50),
            payment.amount ? `$${payment.amount.toFixed(2)}` : 'N/A'
          ];
          
          rowData.forEach((data, dataIndex: number) => {
            doc.text(data, columnPositions[dataIndex], yPosition);
          });
          
          yPosition += lineHeight;
        });
        
        // Total
        yPosition += 10;
        const totalAmount = invoiceData.payments.reduce((sum: number, payment: Payment) => sum + (payment.amount || 0), 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Total Payments: $${totalAmount.toFixed(2)}`, 14, yPosition);
        doc.text(`Total Records: ${invoiceData.payments.length}`, 14, yPosition + 10);
        
        const filename = `Invoice_Payments_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`;
        doc.save(`${filename}.pdf`);
        
        return true;
        
      } catch (fallbackError) {
        console.error('Manual PDF generation failed:', fallbackError);
        toast.error('PDF export failed completely. Please try again or contact support.');
        return false;
      }
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ getValue, row }) => {
        const name = getValue<string>();
        if (!name && row.original.bookingNumber) {
          return `Booking: ${row.original.bookingNumber}`;
        }
        return name || 'N/A';
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => {
        const value = getValue<number>();
        return value ? `$${value.toFixed(2)}` : 'N/A';
      },
    },
    {
      accessorKey: 'feeType',
      header: 'Type',
      cell: ({ getValue }) => {
        const feeType = getValue<number>();
        if (feeType === 1) return 'Fee Type 1';
        if (feeType === 2) return 'Fee Type 2';
        return feeType ? `Type ${feeType}` : 'N/A';
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Payment Status',
      cell: ({ getValue }) => {
        const status = getValue<number>();
        const statusInfo = getPaymentStatusLabel(status);
        return (
          <span className={statusInfo.className} style={{ fontSize: '12px', padding: '4px 8px' }}>
            {statusInfo.label}
          </span>
        );
      },
    },
  ];

  return (
    <section className="authenticated-page">
      <div className="container">
        {/* Page Title - First Line */}
        <div style={{ marginBottom: '8px' }}>
          <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#333' }}>Invoice</h1>
        </div>

        {/* Controls Line - Company, Date, Search, Submit */}
        <div>
          <div className="search-controls" style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', marginBottom: '8px', width: '100%' }}>
            
            {/* Company Selection (Admin/Owner Only) */}
            {canAccessAdminFeatures && (
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
                  {!companiesLoading && (!companiesData?.result || companiesData.result.length === 0) ? (
                    <option value="">No companies available</option>
                  ) : (
                    <>
                      <option value="">Select a company</option>
                      {companiesData?.result?.map((company: Company) => (
                        <option key={company.id} value={company.id}>
                          {company.name} ({company.stateId})
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {companiesError && canAccessAdminFeatures && (
                  <div style={{ marginLeft: '8px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <small className="text-danger">
                      Failed to load companies.
                    </small>
                    <button 
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        console.log('Retrying companies load...');
                        refetchCompanies();
                      }}
                      style={{ fontSize: '12px', padding: '2px 8px' }}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {companiesLoading && canAccessAdminFeatures && (
                  <small className="text-info" style={{ marginLeft: '8px', whiteSpace: 'nowrap' }}>
                    Loading companies...
                  </small>
                )}
              </div>
            )}
          
            {/* Search Form */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                <label htmlFor="invoice-date" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Date</label>
                <input 
                  id="invoice-date" 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ fontSize: '16px', height: '38px', minWidth: '150px' }} 
                />
              </div>
              <button type="button" onClick={handleSearch} className="btn btn-primary" style={{ height: '32px', padding: '4px 12px' }} disabled={isLoading || !dateFrom || !selectedCompanyId}>
                {isLoading ? 'Searching...' : 'Search'}
              </button>
              {invoiceData && (
                <button 
                  type="button" 
                  onClick={handleDetails} 
                  className="btn btn-info"
                  style={{ height: '32px', padding: '4px 12px' }}
                  disabled={!invoiceData?.id}
                >
                  Details
                </button>
              )}
              {invoiceData && isAdmin && (
                <>
                  <button 
                    type="button" 
                    onClick={handleSubmit} 
                    className={`btn ${getStatusButtonColor()}`}
                    style={{ height: '32px', padding: '4px 12px' }}
                    disabled={isLoading || updateInvoiceStatusMutation.isPending || !invoiceData?.id || invoiceData.status === 0}
                  >
                    {updateInvoiceStatusMutation.isPending ? 'Processing...' : getStatusButtonLabel()}
                  </button>
                  {invoiceData.status === 3 && (
                    <button 
                      type="button" 
                      onClick={handleFailed} 
                      className="btn btn-danger"
                      style={{ height: '32px', padding: '4px 12px' }}
                      disabled={isLoading || updateInvoiceStatusMutation.isPending || !invoiceData?.id}
                    >
                      {updateInvoiceStatusMutation.isPending ? 'Processing...' : 'Failed'}
                    </button>
                  )}
                </>
              )}
              {invoiceData && invoiceData.status === 0 && (
                <>
                  <button 
                    type="button" 
                    onClick={handleExportExcel} 
                    className="btn btn-primary"
                    style={{ height: '32px', padding: '4px 12px' }}
                    disabled={(!invoiceData?.payments && !invoiceData?.fees) || ((invoiceData?.payments?.length || 0) + (invoiceData?.fees?.length || 0)) === 0}
                  >
                    Export Excel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleExportPdf} 
                    className="btn btn-primary"
                    style={{ height: '32px', padding: '4px 12px' }}
                    disabled={(!invoiceData?.payments && !invoiceData?.fees) || ((invoiceData?.payments?.length || 0) + (invoiceData?.fees?.length || 0)) === 0}
                  >
                    Export PDF
                  </button>
                </>
              )}
              <button 
                type="button" 
                onClick={() => navigate('/allinvoices')} 
                className="btn btn-secondary"
                style={{ height: '32px', padding: '4px 12px' }}
              >
                Invoices List
              </button>
            </div>
          </div>
        </div>

        {/* Error Display - Only show for actual errors (404, 500, etc.) */}
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
            <p className="mt-2">Loading invoices...</p>
          </div>
        ) : invoiceData ? (
          <div>
            {/* Invoice Header Information */}
            <div className="invoice-header" style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '20px', 
              marginBottom: '20px', 
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <div className="row">
                <div className="col-md-4">
                  <strong>Invoice Number:</strong> {invoiceData.number || 'N/A'}
                </div>
                <div className="col-md-4">
                  <strong>Status:</strong> 
                  <span className={getInvoiceStatusLabel(invoiceData.status).className} style={{ marginLeft: '5px', fontSize: '16px', padding: '8px 12px' }}>
                    {getInvoiceStatusLabel(invoiceData.status).label}
                  </span>
                </div>
                <div className="col-md-4">
                  <strong>Total Amount:</strong> 
                  <span style={{ color: '#007bff', marginLeft: '5px' }}>
                    ${invoiceData.totalAmount ? invoiceData.totalAmount.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Payments Table */}
            <DataTable
              data={invoiceData.payments || invoiceData.fees || []}
              columns={columns}
              searchable={true}
              exportable={false}
              selectable={false}
            />
          </div>
        ) : hasSearched && !isLoading && !error ? (
          <div className="text-center py-4">
            <p>Invoice not found for <strong>{dateFrom}</strong></p>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default Invoice;
