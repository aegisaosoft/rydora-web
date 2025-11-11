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

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { rydoraApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DataTable from '../components/DataTable';
import { exportToExcel } from '../utils/exportUtils';
import toast from 'react-hot-toast';
import './AllInvoices.css';

interface ExternalDailyInvoice {
  id: string;
  companyId: string;
  companyName?: string;
  invoiceDate: string;
  status: number;
  totalAmount: number;
  number: string;
  createdDate: string;
  updatedDate?: string;
  paymentStatus?: number;
  description?: string;
}

const AllInvoices: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filteredData, setFilteredData] = useState<ExternalDailyInvoice[]>([]);
  // Set default dates (week ago to tomorrow)
  const getDefaultDates = () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    return {
      from: weekAgo.toISOString().split('T')[0],
      to: tomorrow.toISOString().split('T')[0]
    };
  };

  const defaultDates = getDefaultDates();
  const [dateFrom, setDateFrom] = useState<string>(defaultDates.from);
  const [dateTo, setDateTo] = useState<string>(defaultDates.to);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(true); // Auto-search with default dates

  // Check if user is admin (required for accessing invoices list)
  const isAdmin = user?.isAdmin ?? false;

  // Fetch companies for the dropdown
  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: rydoraApi.getActiveCompanies,
    enabled: isAdmin,
    retry: 1
  });

  // Fetch all external daily invoices (Admin only)
  const { data: invoicesData, isLoading, error } = useQuery({
    queryKey: ['allExternalDailyInvoices', dateFrom, dateTo, selectedCompanyId],
    queryFn: () => rydoraApi.getAllExternalDailyInvoices(dateFrom, dateTo, selectedCompanyId),
    enabled: isAdmin && hasSearched, // Only fetch if user is admin and has searched
    retry: 1
  });

  // Handle companies data
  useEffect(() => {
    if (companiesData?.result) {
      setCompanies(companiesData.result);
      // Auto-select the first company if none is selected
      if (companiesData.result.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(companiesData.result[0].id);
      }
    }
  }, [companiesData, selectedCompanyId]);

  // Handle data updates when invoicesData changes
  useEffect(() => {
    if (invoicesData) {
      console.log('Invoices data loaded:', invoicesData);
      if (invoicesData?.invoices) {
        setFilteredData(invoicesData.invoices);
      } else if (invoicesData?.result) {
        setFilteredData(invoicesData.result);
      } else if (Array.isArray(invoicesData)) {
        setFilteredData(invoicesData);
      }
    }
  }, [invoicesData]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error(`Failed to load invoices: ${(error as any).response?.data?.message || (error as any).message}`);
    }
  }, [error]);

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
  // const getPaymentStatusLabel = (status?: number): { label: string; className: string } => {
  //   if (status === undefined || status === null) {
  //     return { label: 'N/A', className: 'badge bg-secondary' };
  //   }
  //   
  //   const statuses: Record<number, { label: string; className: string }> = {
  //     0: { label: 'Pending', className: 'badge bg-warning text-dark' },
  //     1: { label: 'Paid', className: 'badge bg-success' },
  //     2: { label: 'Failed', className: 'badge bg-danger' },
  //     3: { label: 'Cancelled', className: 'badge bg-secondary' }
  //   };
  //   return statuses[status] || { label: 'Unknown', className: 'badge bg-secondary' };
  // };

  const handleSearch = () => {
    if (!dateFrom && !dateTo && !selectedCompanyId) {
      toast.error('Please select at least one filter criteria');
      return;
    }
    setHasSearched(true);
  };


  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      toast.error('No invoice data to export');
      return;
    }
    
    const success = exportToExcel(
      filteredData,
      `All_Invoices_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}`
    );
    
    if (success) {
      toast.success('Data exported to Excel successfully');
    } else {
      toast.error('Failed to export data to Excel');
    }
  };


  const columns: ColumnDef<ExternalDailyInvoice>[] = [
    {
      accessorKey: 'number',
      header: 'Invoice #',
      cell: ({ getValue, row }) => {
        const value = getValue<string>();
        const invoiceData = row.original;
        const invoiceNumber = value || invoiceData.id || 'N/A';
        
        const handleInvoiceClick = () => {
          // Extract invoice date and company ID from the invoice data
          const invoiceDate = invoiceData.invoiceDate;
          const companyId = invoiceData.companyId;
          
          if (invoiceDate && companyId) {
            // Format the date to YYYY-MM-DD for the URL parameter
            const formattedDate = new Date(invoiceDate).toISOString().split('T')[0];
            
            // Navigate to invoice page with company ID and date parameters
            navigate(`/invoice?companyId=${companyId}&date=${formattedDate}&from=allinvoices`);
          }
        };
        
        return (
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none"
            onClick={handleInvoiceClick}
            style={{ 
              color: '#007bff', 
              border: 'none', 
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer'
            }}
            title="Click to view invoice by company and date"
          >
            {invoiceNumber}
          </button>
        );
      },
    },
    {
      accessorKey: 'companyName',
      header: 'Company',
      cell: ({ getValue, row }) => {
        const companyName = getValue<string>();
        const companyId = row.original.companyId;
        
        if (companyName) {
          return companyName;
        }
        
        // Try to find company name from companies list
        const company = companies.find(c => c.id === companyId);
        return company ? company.name : 'N/A';
      },
    },
    {
      accessorKey: 'invoiceDate',
      header: 'Date',
      cell: ({ getValue }) => {
        const value = getValue<string>();
        return value ? new Date(value).toLocaleDateString() : 'N/A';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue<number>();
        const statusInfo = getInvoiceStatusLabel(status);
        return (
          <span className={statusInfo.className} style={{ fontSize: '12px', padding: '4px 8px' }}>
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Amount',
      cell: ({ getValue }) => {
        const value = getValue<number>();
        return value ? `$${value.toFixed(2)}` : 'N/A';
      },
    },
    {
      accessorKey: 'createdDate',
      header: 'Created',
      cell: ({ getValue }) => {
        const value = getValue<string>();
        return value ? new Date(value).toLocaleDateString() : 'N/A';
      },
    },
  ];

  // Show access denied if user is not admin
  if (!isAdmin) {
    return (
      <section className="authenticated-page">
        <div className="container">
          <div className="message-container">
            <div className="alert alert-danger">
              <h4>Access Denied</h4>
              <p>You do not have permission to access the invoices list. Admin privileges are required.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="authenticated-page">
      <div className="container">
        {/* Page Title - First Line */}
        <div style={{ marginBottom: '8px' }}>
          <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
            All Invoices
          </h1>
        </div>

        {/* Controls Line - Company, Dates, Search */}
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
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                style={{ fontSize: '16px', height: '38px', minWidth: '200px', margin: '0', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                disabled={companiesLoading}
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Search Form */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', textAlign: 'left', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <label htmlFor="invoices-date-from" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Date from</label>
              <input 
                id="invoices-date-from" 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ fontSize: '16px', height: '38px', minWidth: '150px' }} 
              />
            </div>
            <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              <label htmlFor="invoices-date-to" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Date to</label>
              <input 
                id="invoices-date-to" 
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
            <p className="mt-2">Loading invoices...</p>
          </div>
        ) : filteredData.length > 0 ? (
          <>
            <DataTable
              data={filteredData}
              columns={columns}
              searchable={true}
              exportable={true}
              selectable={false}
              onExportExcel={handleExportExcel}
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
              Total Amount: ${filteredData.reduce((sum, row) => sum + (parseFloat(row.totalAmount?.toString() || '0')), 0).toFixed(2)}
              {' '}({filteredData.length} record{filteredData.length !== 1 ? 's' : ''})
            </div>
          </>
        ) : hasSearched ? (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <p>No data available. Please select date range and click Search.</p>
          </div>
        ) : (
          <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <p>Loading invoices with default date range (last week to tomorrow)...</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AllInvoices;

