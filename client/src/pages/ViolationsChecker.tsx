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

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rydoraApi } from '../services/api';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { exportToExcel } from '../utils/exportUtils';
import { Button } from '../components/ui/Button';
import './ViolationsChecker.css';

interface ViolationRecord {
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
  companyId: string;
  companyName: string;
}

const ViolationsChecker: React.FC = () => {
  const navigate = useNavigate();
  const tableRef = useRef<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRows, setSelectedRows] = useState<ViolationRecord[]>([]);
  const [initialPageIndex] = useState(0);
  const [initialGlobalFilter] = useState('');

  // Calculate date range based on current month
  const getDateRange = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    if (currentMonth >= 2 && currentMonth <= 12) {
      // Feb - Dec: Start from January of current year
      return {
        startDate: `${now.getFullYear()}-01-01`,
        endDate: now.toISOString().split('T')[0]
      };
    } else {
      // January: Start from December of previous year
      const lastYear = now.getFullYear() - 1;
      return {
        startDate: `${lastYear}-12-01`,
        endDate: now.toISOString().split('T')[0]
      };
    }
  };

  const dateRange = getDateRange();

  // Fetch violations data
  const { data: violationsData, isLoading: dataLoading, error } = useQuery({
    queryKey: ['violations-checker', dateRange.startDate, dateRange.endDate],
    queryFn: () => rydoraApi.getParkingViolations(dateRange.startDate, dateRange.endDate, 1),
    enabled: true
  });

  // Filter data based on search and filter criteria
  const filteredData = React.useMemo(() => {
    if (!violationsData?.data) return [];

    let filtered = violationsData.data;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((violation: ViolationRecord) => 
        violation.citationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violation.noticeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violation.tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violation.agency?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((violation: ViolationRecord) => {
        switch (filterStatus) {
          case 'unpaid':
            return violation.paymentStatus === 1;
          case 'paid':
            return violation.paymentStatus === 0;
          case 'overdue':
            return violation.paymentStatus === 1 && violation.endDate && new Date(violation.endDate) < new Date();
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [violationsData, searchTerm, filterStatus]);

  // Handle row selection
  const handleSelectionChange = useCallback((selectedRows: ViolationRecord[]) => {
    setSelectedRows(selectedRows);
  }, []);

  // Handle row double click
  const handleRowDoubleClick = useCallback((row: ViolationRecord) => {
    // Navigate to violation details or edit page
    navigate(`/violation-details/${row.id}`);
  }, [navigate]);

  // Handle Excel export
  const handleExportExcel = useCallback(async () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      const tableData = filteredData.map((row: ViolationRecord) => [
        row.citationNumber || 'N/A',
        row.noticeNumber || 'N/A',
        `${row.tag}-${row.state}`,
        `${row.currency || 'USD'} ${row.amount.toFixed(2)}`,
        row.issueDate ? new Date(row.issueDate).toLocaleDateString() : 'N/A',
        row.endDate ? new Date(row.endDate).toLocaleDateString() : 'N/A',
        row.agency || 'N/A',
        row.address || 'N/A',
        row.paymentStatus === 1 ? 'Unpaid' : row.paymentStatus === -5 ? 'Paid by others' : row.paymentStatus === 0 ? 'Paid' : 'Unknown',
        row.fineType === 0 ? 'Parking Violation' : 'Other',
        row.companyName || 'N/A',
        row.note || 'N/A'
      ]);

      await exportToExcel(tableData, 'Violations_Checker_Data');
      toast.success('Excel file exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel file');
    }
  }, [filteredData]);

  // Handle PDF export
  const handleExportPdf = useCallback(async () => {
    if (filteredData.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // PDF export logic would go here
      toast.success('PDF export functionality coming soon');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF file');
    }
  }, [filteredData]);

  // Define table columns
  const columns: ColumnDef<ViolationRecord>[] = useMemo(() => [
    {
      accessorKey: 'citationNumber',
      header: 'Citation #',
      cell: ({ getValue }) => getValue<string | null>() || 'N/A',
    },
    {
      accessorKey: 'noticeNumber',
      header: 'Notice #',
      cell: ({ getValue }) => getValue<string>(),
    },
    {
      accessorKey: 'tag',
      header: 'License Plate',
      cell: ({ getValue, row }) => {
        const tag = getValue<string>();
        const state = row.original.state;
        return `${tag}-${state}`;
      },
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
      accessorKey: 'endDate',
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
      accessorKey: 'companyName',
      header: 'Company',
      cell: ({ getValue }) => getValue<string>() || 'N/A',
    },
    {
      accessorKey: 'note',
      header: 'Note',
      cell: ({ getValue }) => getValue<string | null>() || 'N/A',
    },
  ], []);

  return (
    <section className="authenticated-page">
      <div className="container">
        {/* Page Title - First Line */}
        <div>
          <h1>Violations Checker</h1>
        </div>

        {/* Controls Line - Search, Filter, Actions */}
        <div className="search-controls" style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', marginBottom: '8px', width: '100%' }}>
          
          {/* Search Input */}
          <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
            <label htmlFor="search-input" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Search</label>
            <input
              id="search-input"
              type="text"
              placeholder="Enter citation number, license plate, or notice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ fontSize: '16px', height: '38px', minWidth: '200px' }}
            />
          </div>

          {/* Filter Dropdown */}
          <div className="form-group" style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
            <label htmlFor="filter-select" style={{ fontWeight: '700', fontSize: '16px', margin: '0', whiteSpace: 'nowrap' }}>Filter</label>
            <select
              id="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ fontSize: '16px', height: '38px', minWidth: '150px' }}
            >
              <option value="all">All Violations</option>
              <option value="unpaid">Unpaid Only</option>
              <option value="paid">Paid Only</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Search Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsLoading(true)}
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Find New'}
          </button>

          {/* Export Button */}
          <button
            type="button"
            className="btn btn-success"
          >
            Save
          </button>
        </div>

        {/* Results Section */}
        <div>
          <h3>
            Violations Data ({filteredData.length} records)
          </h3>
          
          {dataLoading ? (
            <div className="text-center py-4">
              <p>Loading violations data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-danger">Error loading violations data. Please try again.</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-4">
              <p>No violations found for the selected criteria.</p>
            </div>
          ) : (
            <DataTable
              data={filteredData as ViolationRecord[]}
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
                  {selectedRows.length > 0 && (
                    <div className="d-flex gap-2 mb-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          // Handle bulk actions
                          toast.success(`${selectedRows.length} rows selected`);
                        }}
                      >
                        Bulk Actions ({selectedRows.length})
                      </Button>
                    </div>
                  )}
                </>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default ViolationsChecker;

