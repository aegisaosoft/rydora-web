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

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  PaginationState,
} from '@tanstack/react-table';
import './DataTable.css';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import useDeviceDetection from '../hooks/useDeviceDetection';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: boolean;
  exportable?: boolean;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  initialSelectedIds?: (string | number)[];
  additionalButtons?: React.ReactNode;
  tableRef?: React.MutableRefObject<any>;
  pageSize?: number;
  className?: string;
  onRowDoubleClick?: (row: T) => void;
  initialPageIndex?: number;
  initialGlobalFilter?: string;
}

function DataTable<T>({
  data,
  columns,
  searchable = true,
  onRowDoubleClick,
  exportable = false,
  onExportExcel,
  onExportPdf,
  selectable = false,
  onSelectionChange,
  initialSelectedIds = [],
  additionalButtons,
  tableRef,
  pageSize = 10,
  className = '',
  initialPageIndex = 0,
  initialGlobalFilter = '',
}: DataTableProps<T>) {
  const { isMobile } = useDeviceDetection();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialGlobalFilter);
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialPageIndex,
    pageSize: pageSize,
  });

  // Debug data structure (temporary)
  React.useEffect(() => {
    if (data && data.length > 0) {
    }
  }, [data]);
  

  // Set initial row selection based on initialSelectedIds (only when explicitly provided)
  React.useEffect(() => {
    if (initialSelectedIds.length > 0 && data.length > 0) {
      const selectionMap: Record<string, boolean> = {};
      data.forEach((row: any, index) => {
        if (initialSelectedIds.includes(row.id)) {
          selectionMap[String(index)] = true;
        }
      });
      setRowSelection(selectionMap);
    }
    // Don't clear selection automatically - preserve manual selections
  }, [initialSelectedIds, data]); // Include data dependency

  // Add selection column if selectable
  const tableColumns = useMemo(() => {
    if (!selectable) return columns;
    
    const selectionColumn: ColumnDef<T> = {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
          className="form-check-input"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => {
            row.toggleSelected(!!e.target.checked);
          }}
          className="form-check-input"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    };
    
    return [selectionColumn, ...columns];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      pagination,
    },
    enableRowSelection: selectable,
    getRowId: (row: any, index: number) => {
      // Try multiple ways to get a unique ID
      if (row.id !== undefined && row.id !== null) {
        return String(row.id);
      }
      if (row.violationId !== undefined && row.violationId !== null) {
        return String(row.violationId);
      }
      // Fallback to index
      return String(index);
    },
    onRowSelectionChange: (updater) => {
      setRowSelection(updater);
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableFilters: true,
    enableGlobalFilter: true,
  });

  // Handle selection change
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange, table]);

  // Expose table instance via ref
  React.useEffect(() => {
    if (tableRef) {
      tableRef.current = table;
    }
  }, [tableRef, table]);

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className={`data-table w-full ${className}`}>
      {/* Table Controls */}
      <div className="table-controls mb-3">
        <div className="d-flex flex-wrap gap-3 align-items-center">
          {/* Search */}
          {searchable && (
            <div className="search-control" style={{ minWidth: '200px' }}>
              <Input
                placeholder="Search..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          )}

          {/* Export Buttons and Additional Buttons */}
          {(exportable || additionalButtons) && (
            <div className="export-controls d-flex gap-2">
              {additionalButtons}
              {exportable && onExportExcel && (
                <Button variant="outline" size="sm" type="button" onClick={onExportExcel}>
                  Export Excel
                </Button>
              )}
              {exportable && onExportPdf && (
                <Button variant="outline" size="sm" type="button" onClick={onExportPdf}>
                  Export PDF
                </Button>
              )}
            </div>
          )}

          {/* Selection Info */}
          {selectable && selectedCount > 0 && (
            <div className="selection-info">
              <span className="badge bg-primary">
                {selectedCount} selected
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={`${isMobile ? 'table-container' : ''} table-responsive w-full`}>
        {isMobile && (
          <div style={{
            background: '#e3f2fd',
            padding: '8px 12px',
            marginBottom: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#1976d2',
            textAlign: 'center',
            border: '1px solid #bbdefb'
          }}>
            💡 Swipe left/right to see more columns
          </div>
        )}
        <table className="table table-striped table-hover w-100" style={{ width: '100%' }}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={header.column.getCanSort() ? 'sortable' : ''}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                  >
                    <div className="d-flex align-items-center">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getCanSort() && (
                        <span className="ms-1">
                          {{
                            asc: '↑',
                            desc: '↓',
                          }[header.column.getIsSorted() as string] ?? '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr 
                key={row.id}
                onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(row.original)}
                style={onRowDoubleClick ? { cursor: 'pointer' } : undefined}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="table-pagination mt-3">
        <div className="d-flex justify-content-between align-items-center">
          <div className="pagination-info">
            <span className="text-muted">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              of {table.getFilteredRowModel().rows.length} entries
            </span>
          </div>

          <div className="pagination-controls">
            <div className="btn-group" role="group">
              <Button variant="outline" size="sm" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                First
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                Last
              </Button>
            </div>
          </div>
        </div>

        {/* Page Size Selector */}
        <div className="mt-2 d-flex justify-content-center">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted">Show</span>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={table.getState().pagination.pageSize}
              onChange={e => {
                table.setPageSize(Number(e.target.value))
              }}
            >
              {[10, 20, 30, 40, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
            <span className="text-muted">entries</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
