import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { rydoraApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { exportToExcel } from '../utils/exportUtils';
import toast from 'react-hot-toast';
import './InvoiceDetails.css';

interface Company {
  id: string;
  name: string;
  stateId: string;
  createdBy: string;
  userId: string;
  hqToken: string;
  isActive: boolean;
}

interface Toll {
  id: string;
  amount: number;
  paymentStatus: number;
  licensePlate: string;
  state: string;
  tollId: number;
  bookingNumber: string;
  tollDate?: string;
  tollTime?: string;
  tollAuthority?: string;
  driver?: string | null;
}

interface Fee {
  id: string;
  amount: number;
  paymentStatus: number;
  feeType: number;
  bookingNumber: string;
  description?: string;
  driver?: string | null;
}

interface Violation {
  id: string;
  citation: string;
  amount: number;
  paymentStatus: number;
  feeType: number;
  bookingNumber: string;
  licensePlate: string;
  state: string;
  driver?: string | null;
}

interface InvoiceData {
  id: string;
  companyId: string;
  invoiceDate: string;
  status: number;
  totalAmount: number;
  number: string;
  tolls: Toll[];
  fees: Fee[];
  violations: Violation[];
}

const InvoiceDetails: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [companyName, setCompanyName] = useState('');
  

  // Booking-level expand/collapse state
  const [expandedBookings, setExpandedBookings] = useState<Record<string, boolean>>({});

  // Check if user is admin or owner
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isAdmin = user?.isAdmin ?? false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isOwner = user?.isOwner ?? false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const _canAccessAdminFeatures = isAdmin || isOwner;

  // Get invoiceId from URL params
  const invoiceId = searchParams.get('invoiceId');
  const companyIdFromUrl = searchParams.get('companyId');
  const companyNameFromUrl = searchParams.get('companyName');
  const dateFromUrl = searchParams.get('date');

  // Fetch active companies (always fetch to resolve company name)
  const { data: companiesData } = useQuery({
    queryKey: ['activeCompanies'],
    queryFn: rydoraApi.getActiveCompanies,
    enabled: true, // Always fetch to resolve company names
    retry: 1
  });

  // Initialize state from URL params
  useEffect(() => {
    if (companyIdFromUrl) {
      setSelectedCompanyId(companyIdFromUrl);
    }
    if (companyNameFromUrl) {
      setCompanyName(companyNameFromUrl);
    }
    if (dateFromUrl) {
      setSelectedDate(dateFromUrl);
    } else {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, [companyIdFromUrl, companyNameFromUrl, dateFromUrl]);

  // Fetch invoice data
  const { data: invoiceData, isLoading, error, refetch } = useQuery<InvoiceData>({
    queryKey: ['invoice-details', invoiceId, selectedCompanyId, selectedDate],
    queryFn: async () => {
      // If we have an invoiceId, fetch that specific invoice with full details
      if (invoiceId) {
        const response = await rydoraApi.getInvoiceDetailsById(invoiceId);
        // The API response already matches our InvoiceData interface
        return response;
      }
      
      // Fallback: Fetch invoice by company and date
      const response = await rydoraApi.getInvoiceByCompany(selectedCompanyId, selectedDate);
      
      // Transform the response to match our InvoiceData interface
      // The API returns payments array, we need to separate into tolls and fees
      return {
        id: response.id || '',
        companyId: response.companyId || selectedCompanyId,
        invoiceDate: response.invoiceDate || selectedDate,
        status: response.status ?? 0,
        totalAmount: response.totalAmount || 0,
        tolls: response.tolls || [],
        fees: response.fees || []
      };
    },
    enabled: Boolean(invoiceId || selectedCompanyId),
    retry: 1
  });

  // Auto-set company name from companies data if not already set
  useEffect(() => {
    if (companiesData?.result && !companyName) {
      const companyIdToFind = invoiceData?.companyId || selectedCompanyId || companyIdFromUrl;
      if (companyIdToFind) {
        const company = companiesData.result.find((c: Company) => 
          c.id.toLowerCase() === companyIdToFind.toLowerCase()
        );
        if (company) {
          setCompanyName(company.name);
        }
      }
    }
  }, [companiesData, companyName, invoiceData, selectedCompanyId, companyIdFromUrl]);

  

  const toggleBooking = (bookingKey: string) => {
    setExpandedBookings(prev => ({
      ...prev,
      [bookingKey]: !prev[bookingKey]
    }));
  };

  // Helper function to get company name
  const getCompanyName = (): string => {
    if (!invoiceData) return '';
    
    // First try to find company by invoice's companyId
    let company = companiesData?.result?.find((c: Company) => 
      c.id.toLowerCase() === invoiceData.companyId.toLowerCase()
    );
    
    // If not found, try by selectedCompanyId
    if (!company && selectedCompanyId) {
      company = companiesData?.result?.find((c: Company) => 
        c.id.toLowerCase() === selectedCompanyId.toLowerCase()
      );
    }
    
    if (company) {
      return `${company.name}${company.stateId ? ` (${company.stateId})` : ''}`;
    }
    
    // If company name from URL, use it
    if (companyName) {
      return companyName;
    }
    
    // Last resort: show "Loading..." if companies are still loading
    if (!companiesData) {
      return 'Loading...';
    }
    
    return 'Unknown Company';
  };

  const calculateTotal = (): number => {
    if (!invoiceData) return 0;
    const tollsTotal = invoiceData.tolls?.reduce((sum, toll) => sum + Number(toll.amount || 0), 0) || 0;
    const feesTotal = invoiceData.fees?.reduce((sum, fee) => sum + Number(fee.amount || 0), 0) || 0;
    const violationsTotal = invoiceData.violations?.reduce((sum, violation) => sum + Number(violation.amount || 0), 0) || 0;
    return tollsTotal + feesTotal + violationsTotal;
  };

  

  // Group items by booking number. Null/empty booking numbers go to UNASSIGNED.
  const bookingGroups = useMemo(() => {
    if (!invoiceData) return [] as Array<{
      key: string;
      label: string;
      tolls: Toll[];
      violations: Violation[];
      fees: Fee[];
    }>;

    const map = new Map<string, { key: string; label: string; tolls: Toll[]; violations: Violation[]; fees: Fee[] }>();

    const keyFromBooking = (booking?: string | null) => {
      const b = (booking || '').trim();
      return b !== '' ? b : 'UNASSIGNED';
    };

    const ensureGroup = (key: string) => {
      if (!map.has(key)) {
        const label = key === 'UNASSIGNED' ? 'No Booking' : key;
        map.set(key, { key, label: `Booking: ${label}`, tolls: [], violations: [], fees: [] });
      }
      return map.get(key)!;
    };

    for (const toll of (invoiceData.tolls || [])) {
      const key = keyFromBooking(toll.bookingNumber);
      const group = ensureGroup(key);
      group.tolls.push(toll);
    }
    for (const violation of (invoiceData.violations || [])) {
      const key = keyFromBooking(violation.bookingNumber);
      const group = ensureGroup(key);
      group.violations.push(violation);
    }
    for (const fee of (invoiceData.fees || [])) {
      const key = keyFromBooking(fee.bookingNumber);
      const group = ensureGroup(key);
      group.fees.push(fee);
    }

    // Sort: non-unassigned booking numbers alphabetically, UNASSIGNED last
    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      if (a.key === 'UNASSIGNED') return 1;
      if (b.key === 'UNASSIGNED') return -1;
      return a.key.localeCompare(b.key);
    });
    return groups;
  }, [invoiceData]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPaymentStatusLabel = (status: number): { label: string; className: string } => {
    const statuses: Record<number, { label: string; className: string }> = {
      0: { label: 'Paid', className: 'badge bg-success' },
      1: { label: 'Unpaid', className: 'badge bg-warning text-dark' },
      2: { label: 'Processing', className: 'badge bg-info' },
      3: { label: 'Failed', className: 'badge bg-danger' },
      [-5]: { label: 'Paid by others', className: 'badge bg-info' }
    };
    return statuses[status] || statuses[1];
  };

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

  const getFeeTypeLabel = (type: number): string => {
    const types: Record<number, string> = {
      0: 'Administrative',
      1: 'Late Payment',
      2: 'Processing',
      3: 'Service'
    };
    return types[type] || 'Unknown';
  };

  const handleBackToInvoice = () => {
    // Use the same mechanism as AllInvoices page - navigate with company ID and date
    const companyId = invoiceData?.companyId || selectedCompanyId || companyIdFromUrl;
    const date = invoiceData?.invoiceDate || selectedDate || dateFromUrl;
    
    if (companyId && date) {
      // Format the date to YYYY-MM-DD for the URL parameter (same as AllInvoices)
      const formattedDate = new Date(date).toISOString().split('T')[0];
      navigate(`/invoice?companyId=${companyId}&date=${formattedDate}`);
    } else {
      // Fallback to invoice page without parameters
      navigate('/invoice');
    }
  };

  const handleExportExcel = () => {
    if (!invoiceData) {
      toast.error('No invoice data to export');
      return;
    }

    // Combine tolls, fees, and violations into a single export
    const exportData = [
      ...invoiceData.tolls.map(toll => ({
        Type: 'Toll',
        'License Plate': toll.licensePlate,
        State: toll.state,
        'Toll ID': toll.tollId,
        'Booking Number': toll.bookingNumber,
        Amount: toll.amount,
        'Payment Status': getPaymentStatusLabel(toll.paymentStatus).label
      })),
      ...invoiceData.fees.map(fee => ({
        Type: 'Fee',
        'Fee Type': getFeeTypeLabel(fee.feeType),
        'Booking Number': fee.bookingNumber,
        Amount: fee.amount,
        'Payment Status': getPaymentStatusLabel(fee.paymentStatus).label
      })),
      ...invoiceData.violations.map(violation => ({
        Type: 'Violation',
        Citation: violation.citation,
        'License Plate': violation.licensePlate,
        State: violation.state,
        'Fee Type': getFeeTypeLabel(violation.feeType),
        'Booking Number': violation.bookingNumber,
        Amount: violation.amount,
        'Payment Status': getPaymentStatusLabel(violation.paymentStatus).label
      }))
    ];

    const success = exportToExcel(
      exportData,
      `Invoice_Details_${invoiceData.number || invoiceData.id}_${new Date().toISOString().slice(0,10)}`
    );

    if (success) {
      toast.success('Data exported to Excel successfully');
    } else {
      toast.error('Failed to export data to Excel');
    }
  };

  const handleExportPdf = async () => {
    if (!invoiceData) {
      toast.error('No invoice data to export');
      return;
    }

    try {
      const loadingToast = toast.loading('Generating PDF...');

      // Dynamically import jsPDF
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (heightNeeded: number) => {
        if (yPosition + heightNeeded > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Calculate totals
      const tollsTotal = invoiceData.tolls?.reduce((sum, toll) => sum + Number(toll.amount || 0), 0) || 0;
      const feesTotal = invoiceData.fees?.reduce((sum, fee) => sum + Number(fee.amount || 0), 0) || 0;
      const violationsTotal = invoiceData.violations?.reduce((sum, violation) => sum + Number(violation.amount || 0), 0) || 0;
      const totalAmount = tollsTotal + feesTotal + violationsTotal;

      // Title
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Invoice ${invoiceData.number || invoiceData.id}`, margin, yPosition);
      yPosition += 12;

      // Invoice Header Information
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice Number:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(invoiceData.number || invoiceData.id.substring(0, 24), margin + 30, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Company:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(getCompanyName(), margin + 30, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice Date:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(invoiceData.invoiceDate), margin + 30, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Status:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(getInvoiceStatusLabel(invoiceData.status).label, margin + 30, yPosition);
      yPosition += 10;

      // Total Amount
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total Amount: $${totalAmount.toFixed(2)}`, margin, yPosition);
      yPosition += 12;

      // Draw line
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // GROUPED BY BOOKING AND DRIVER SECTION
      if (bookingGroups.length > 0) {
        bookingGroups.forEach((group, gIndex) => {
          // Group header with booking and driver
          const groupSubtotal = [
            ...group.tolls.map(t => Number(t.amount || 0)),
            ...group.violations.map(v => Number(v.amount || 0)),
            ...group.fees.map(f => Number(f.amount || 0))
          ].reduce((a, b) => a + b, 0);
          const driverFromGroup = (
            [
              ...group.tolls.map(t => t.driver),
              ...group.violations.map(v => v.driver),
              ...group.fees.map(f => f.driver)
            ].find(d => typeof d === 'string' && d.trim() !== '') || null
          );
          const driverDisplay = driverFromGroup && typeof driverFromGroup === 'string' && driverFromGroup.trim() !== ''
            ? driverFromGroup
            : 'N/A';

          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${group.label} — Driver: ${driverDisplay}`, margin, yPosition);
          pdf.setFontSize(12);
          pdf.text(`Subtotal: $${groupSubtotal.toFixed(2)}`, pageWidth - margin - 40, yPosition);
          yPosition += 8;

          // Table header: Type | Details | Booking # | Amount | Status
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          const headerY = yPosition;
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, headerY - 5, pageWidth - 2 * margin, 7, 'F');
          pdf.text('Type', margin + 2, headerY);
          pdf.text('Details', margin + 25, headerY);
          pdf.text('Booking #', margin + 110, headerY);
          pdf.text('Amount', margin + 150, headerY);
          pdf.text('Status', margin + 175, headerY);
          yPosition += 5;

          // Combine rows in order Toll -> Violation -> Fee
          const rows = [
            ...group.tolls.map(toll => ({
              type: 'Toll',
              details: `Plate: ${toll.licensePlate || '-'} | State: ${toll.state || '-'}${toll.tollId ? ` | Toll ID: ${toll.tollId}` : ''}`,
              booking: toll.bookingNumber || '-',
              amount: Number(toll.amount || 0),
              statusLabel: getPaymentStatusLabel(toll.paymentStatus).label
            })),
            ...group.violations.map(violation => ({
              type: 'Violation',
              details: `Citation: ${violation.citation || '-'} | Plate: ${violation.licensePlate || '-'} | State: ${violation.state || '-'} | Fee: ${getFeeTypeLabel(violation.feeType)}`,
              booking: violation.bookingNumber || '-',
              amount: Number(violation.amount || 0),
              statusLabel: getPaymentStatusLabel(violation.paymentStatus).label
            })),
            ...group.fees.map(fee => ({
              type: 'Fee',
              details: `Fee Type: ${getFeeTypeLabel(fee.feeType)}${fee.description ? ` | ${fee.description}` : ''}`,
              booking: fee.bookingNumber || '-',
              amount: Number(fee.amount || 0),
              statusLabel: getPaymentStatusLabel(fee.paymentStatus).label
            }))
          ];

          pdf.setFont('helvetica', 'normal');
          rows.forEach((row, rIndex) => {
            checkPageBreak(8);
            if ((rIndex % 2) === 0) {
              pdf.setFillColor(250, 250, 250);
              pdf.rect(margin, yPosition - 4, pageWidth - 2 * margin, 7, 'F');
            }
            pdf.text(row.type, margin + 2, yPosition);
            // Truncate details to fit
            const detailsText = String(row.details || '').substring(0, 80);
            pdf.text(detailsText, margin + 25, yPosition);
            pdf.text(String(row.booking).substring(0, 18), margin + 110, yPosition);
            pdf.text(`$${row.amount.toFixed(2)}`, margin + 150, yPosition);
            pdf.text(row.statusLabel, margin + 175, yPosition);
            yPosition += 7;
          });

          yPosition += 8;
          checkPageBreak(20);
        });
      }

      // Save PDF
      const fileName = `Invoice_${invoiceData.number || invoiceData.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.dismiss(loadingToast);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleEmailInvoice = async () => {
    if (!invoiceData) {
      toast.error('No invoice data to email');
      return;
    }

    try {
      const loadingToast = toast.loading('Generating PDF and sending email...');

      // Dynamically import jsPDF
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (heightNeeded: number) => {
        if (yPosition + heightNeeded > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Calculate totals
      const tollsTotal = invoiceData.tolls?.reduce((sum, toll) => sum + Number(toll.amount || 0), 0) || 0;
      const feesTotal = invoiceData.fees?.reduce((sum, fee) => sum + Number(fee.amount || 0), 0) || 0;
      const violationsTotal = invoiceData.violations?.reduce((sum, violation) => sum + Number(violation.amount || 0), 0) || 0;
      const totalAmount = tollsTotal + feesTotal + violationsTotal;

      // Title
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Invoice ${invoiceData.number || invoiceData.id}`, margin, yPosition);
      yPosition += 12;

      // Invoice Header Information
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice Number:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(invoiceData.number || invoiceData.id.substring(0, 24), margin + 30, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Company:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(getCompanyName(), margin + 30, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice Date:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(invoiceData.invoiceDate), margin + 30, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Status:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(getInvoiceStatusLabel(invoiceData.status).label, margin + 30, yPosition);
      yPosition += 10;

      // Total Amount
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total Amount: $${totalAmount.toFixed(2)}`, margin, yPosition);
      yPosition += 12;

      // Draw line
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // GROUPED BY BOOKING AND DRIVER SECTION
      if (bookingGroups.length > 0) {
        bookingGroups.forEach((group, gIndex) => {
          // Group header with booking and driver
          const groupSubtotal = [
            ...group.tolls.map(t => Number(t.amount || 0)),
            ...group.violations.map(v => Number(v.amount || 0)),
            ...group.fees.map(f => Number(f.amount || 0))
          ].reduce((a, b) => a + b, 0);
          const driverFromGroup = (
            [
              ...group.tolls.map(t => t.driver),
              ...group.violations.map(v => v.driver),
              ...group.fees.map(f => f.driver)
            ].find(d => typeof d === 'string' && d.trim() !== '') || null
          );
          const driverDisplay = driverFromGroup && typeof driverFromGroup === 'string' && driverFromGroup.trim() !== ''
            ? driverFromGroup
            : 'N/A';

          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${group.label} — Driver: ${driverDisplay}`, margin, yPosition);
          pdf.setFontSize(12);
          pdf.text(`Subtotal: $${groupSubtotal.toFixed(2)}`, pageWidth - margin - 40, yPosition);
          yPosition += 8;

          // Table header: Type | Details | Booking # | Amount | Status
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          const headerY = yPosition;
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, headerY - 5, pageWidth - 2 * margin, 7, 'F');
          pdf.text('Type', margin + 2, headerY);
          pdf.text('Details', margin + 25, headerY);
          pdf.text('Booking #', margin + 110, headerY);
          pdf.text('Amount', margin + 150, headerY);
          pdf.text('Status', margin + 175, headerY);
          yPosition += 5;

          // Combine rows in order Toll -> Violation -> Fee
          const rows = [
            ...group.tolls.map(toll => ({
              type: 'Toll',
              details: `Plate: ${toll.licensePlate || '-'} | State: ${toll.state || '-'}${toll.tollId ? ` | Toll ID: ${toll.tollId}` : ''}`,
              booking: toll.bookingNumber || '-',
              amount: Number(toll.amount || 0),
              statusLabel: getPaymentStatusLabel(toll.paymentStatus).label
            })),
            ...group.violations.map(violation => ({
              type: 'Violation',
              details: `Citation: ${violation.citation || '-'} | Plate: ${violation.licensePlate || '-'} | State: ${violation.state || '-'} | Fee: ${getFeeTypeLabel(violation.feeType)}`,
              booking: violation.bookingNumber || '-',
              amount: Number(violation.amount || 0),
              statusLabel: getPaymentStatusLabel(violation.paymentStatus).label
            })),
            ...group.fees.map(fee => ({
              type: 'Fee',
              details: `Fee Type: ${getFeeTypeLabel(fee.feeType)}${fee.description ? ` | ${fee.description}` : ''}`,
              booking: fee.bookingNumber || '-',
              amount: Number(fee.amount || 0),
              statusLabel: getPaymentStatusLabel(fee.paymentStatus).label
            }))
          ];

          pdf.setFont('helvetica', 'normal');
          rows.forEach((row, rIndex) => {
            checkPageBreak(8);
            if ((rIndex % 2) === 0) {
              pdf.setFillColor(250, 250, 250);
              pdf.rect(margin, yPosition - 4, pageWidth - 2 * margin, 7, 'F');
            }
            pdf.text(row.type, margin + 2, yPosition);
            // Truncate details to fit
            const detailsText = String(row.details || '').substring(0, 80);
            pdf.text(detailsText, margin + 25, yPosition);
            pdf.text(String(row.booking).substring(0, 18), margin + 110, yPosition);
            pdf.text(`$${row.amount.toFixed(2)}`, margin + 150, yPosition);
            pdf.text(row.statusLabel, margin + 175, yPosition);
            yPosition += 7;
          });

          yPosition += 8;
          checkPageBreak(20);
        });
      }

      // Convert PDF to blob for email
      const pdfBlob = pdf.output('blob');

      // Get invoice ID
      const invoiceId = invoiceData.id;

      // Send email via API
      await rydoraApi.sendInvoiceEmail(invoiceId, pdfBlob);

      toast.dismiss(loadingToast);
      toast.success('Invoice PDF sent via email successfully');
    } catch (error: any) {
      console.error('Error sending invoice email:', error);
      toast.error(error.response?.data?.message || 'Failed to send invoice email');
    }
  };

  if (isLoading) {
    return (
      <div className="container mt-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <h4>Error Loading Invoice</h4>
          <p>{error instanceof Error ? error.message : 'Failed to load invoice data'}</p>
          <button className="btn btn-primary" onClick={() => refetch()}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <section className="authenticated-page">
      <div className="container">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h2 mb-0">Invoice Details</h1>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-primary" 
              style={{ height: '32px', padding: '4px 12px' }} 
              onClick={handleExportExcel}
              disabled={!invoiceData || (((invoiceData.tolls?.length || 0) + (invoiceData.fees?.length || 0) + (invoiceData.violations?.length || 0)) === 0)}
            >
              Export to Excel
            </button>
            <button 
              className="btn btn-primary" 
              style={{ height: '32px', padding: '4px 12px' }} 
              onClick={handleExportPdf}
              disabled={!invoiceData || (((invoiceData.tolls?.length || 0) + (invoiceData.fees?.length || 0) + (invoiceData.violations?.length || 0)) === 0)}
            >
              Export to PDF
            </button>
            <button 
              className="btn btn-success" 
              style={{ height: '32px', padding: '4px 12px' }} 
              onClick={handleEmailInvoice}
              disabled={!invoiceData || (((invoiceData.tolls?.length || 0) + (invoiceData.fees?.length || 0) + (invoiceData.violations?.length || 0)) === 0)}
              title="Email invoice PDF"
            >
              📧 Email Invoice
            </button>
            <button className="btn btn-secondary" style={{ height: '32px', padding: '4px 12px' }} onClick={handleBackToInvoice}>
              ← Back to Invoice
            </button>
          </div>
        </div>

        {/* Invoice Content Container for PDF Export */}
        <div className="invoice-details-container">
          {/* Company Information */}
          {invoiceData && (
            <div className="mb-3">
              <p className="mb-0">
                <strong>Company:</strong>{' '}
                <span className="text-muted">{getCompanyName()}</span>
              </p>
            </div>
          )}

          {invoiceData && (
            <>
            {/* Invoice Header */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <p className="mb-2">
                      <strong>Invoice Number:</strong>{' '}
                      <span className="text-muted">{invoiceData.number || 'N/A'}</span>
                    </p>
                    <p className="mb-2">
                      <strong>Company Name:</strong>{' '}
                      <span className="text-muted">{getCompanyName()}</span>
                    </p>
                  </div>
                  <div className="col-md-6">
                    <p className="mb-2">
                      <strong>Invoice Date:</strong>{' '}
                      <span className="text-muted">{formatDate(invoiceData.invoiceDate)}</span>
                    </p>
                    <p className="mb-2">
                      <strong>Status:</strong>{' '}
                      <span className={getInvoiceStatusLabel(invoiceData.status).className}>
                        {getInvoiceStatusLabel(invoiceData.status).label}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-top">
                  <h3 className="mb-0">
                    <strong>Total Amount: </strong>
                    <span className="text-success">${calculateTotal().toFixed(2)}</span>
                  </h3>
                </div>
              </div>
            </div>

            {/* Invoice Details Table grouped by Booking Number */}
            <div className="card">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '15%' }}>Type</th>
                        <th style={{ width: '35%' }}>Details</th>
                        <th style={{ width: '15%' }}>Booking Number</th>
                        <th style={{ width: '15%' }} className="text-end">Amount</th>
                        <th style={{ width: '20%' }}>Payment Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookingGroups.map(group => {
                        const subtotal = [
                          ...group.tolls.map(t => Number(t.amount || 0)),
                          ...group.violations.map(v => Number(v.amount || 0)),
                          ...group.fees.map(f => Number(f.amount || 0))
                        ].reduce((a, b) => a + b, 0);
                        const itemCount = group.tolls.length + group.violations.length + group.fees.length;
                        const isExpanded = !!expandedBookings[group.key];
                        const driverFromGroup = (
                          [
                            ...group.tolls.map(t => t.driver),
                            ...group.violations.map(v => v.driver),
                            ...group.fees.map(f => f.driver)
                          ].find(d => typeof d === 'string' && d.trim() !== '') || null
                        );
                        const driverDisplay = driverFromGroup && typeof driverFromGroup === 'string' && driverFromGroup.trim() !== ''
                          ? driverFromGroup
                          : 'N/A';
                        return (
                          <React.Fragment key={group.key}>
                            <tr
                              className="table-secondary cursor-pointer"
                              onClick={() => toggleBooking(group.key)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td colSpan={5}>
                                <div className="d-flex justify-content-between align-items-center py-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold">
                                      {isExpanded ? '▼' : '▶'} {group.label} — Driver: {driverDisplay}
                                    </span>
                                    <span className="text-muted small">({itemCount} items)</span>
                                  </div>
                                  <span className="fw-bold" style={{ fontSize: '16px' }}>
                                    Subtotal: ${subtotal.toFixed(2)}
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <>
                                {/* Tolls under driver */}
                                {group.tolls.map((toll) => {
                                  const status = getPaymentStatusLabel(toll.paymentStatus);
                                  return (
                                    <tr key={`toll-${toll.id}`}>
                                      <td className="ps-4">
                                        <span className="badge bg-info">Toll</span>
                                      </td>
                                      <td>
                                        <div className="small">
                                          <div><strong>License Plate:</strong> {toll.licensePlate || '-'}</div>
                                          <div><strong>State:</strong> {toll.state || '-'}</div>
                                          <div><strong>Toll ID:</strong> {toll.tollId}</div>
                                          {toll.tollDate && (
                                            <div><strong>Date:</strong> {new Date(toll.tollDate).toLocaleDateString()}</div>
                                          )}
                                        </div>
                                      </td>
                                      <td>
                                        <span className="text-primary">{toll.bookingNumber || 'N/A'}</span>
                                      </td>
                                      <td className="text-end">
                                        <strong>${Number(toll.amount || 0).toFixed(2)}</strong>
                                      </td>
                                      <td>
                                        <span className={status.className}>{status.label}</span>
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* Violations under driver */}
                                {group.violations.map((violation) => {
                                  const status = getPaymentStatusLabel(violation.paymentStatus);
                                  return (
                                    <tr key={`violation-${violation.id}`}>
                                      <td className="ps-4">
                                        <span className="badge bg-danger">Violation</span>
                                      </td>
                                      <td>
                                        <div className="small">
                                          <div><strong>Citation:</strong> {violation.citation}</div>
                                          <div><strong>License Plate:</strong> {violation.licensePlate || '-'}</div>
                                          <div><strong>State:</strong> {violation.state || '-'}</div>
                                          <div><strong>Fee Type:</strong> {getFeeTypeLabel(violation.feeType)}</div>
                                        </div>
                                      </td>
                                      <td>
                                        <span className="text-primary">{violation.bookingNumber || 'N/A'}</span>
                                      </td>
                                      <td className="text-end">
                                        <strong>${Number(violation.amount || 0).toFixed(2)}</strong>
                                      </td>
                                      <td>
                                        <span className={status.className}>{status.label}</span>
                                      </td>
                                    </tr>
                                  );
                                })}

                                {/* Fees under driver */}
                                {group.fees.map((fee) => {
                                  const status = getPaymentStatusLabel(fee.paymentStatus);
                                  return (
                                    <tr key={`fee-${fee.id}`}>
                                      <td className="ps-4">
                                        <span className="badge bg-warning text-dark">Fee</span>
                                      </td>
                                      <td>
                                        <div className="small">
                                          <div><strong>Fee Type:</strong> {getFeeTypeLabel(fee.feeType)}</div>
                                          {fee.description && (
                                            <div><strong>Description:</strong> {fee.description}</div>
                                          )}
                                        </div>
                                      </td>
                                      <td>
                                        <span className="text-primary">{fee.bookingNumber || 'N/A'}</span>
                                      </td>
                                      <td className="text-end">
                                        <strong>${Number(fee.amount || 0).toFixed(2)}</strong>
                                      </td>
                                      <td>
                                        <span className={status.className}>{status.label}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Show message if no data */}
                      {bookingGroups.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-muted">
                            No invoice items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

          {!invoiceData && !isLoading && (
            <div className="alert alert-info">
              <p className="mb-0">Please select a company and date to view invoice details.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default InvoiceDetails;


