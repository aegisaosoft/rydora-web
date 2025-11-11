import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { rydoraApi } from '../services/api';
import { renderStateOptions } from '../constants/statesAndProvinces';
import toast from 'react-hot-toast';
import './NewToll.css';

interface ExternalTollDailyInvoiceData {
  sourceTable: string | null;
  sourceId: string | null;
  tollId: number;
  plateNumber: string;
  plateState: string;
  plateTag: string | null;
  agency: string;
  amount: number;
  amountWithFee?: number | null;
  newAmount: number | null;
  postingDate: string;
  transactionDate: string;
  transactionDateTime: string;
  entryTime: string | null;
  exitTime: string | null;
  entryPlaza: string | null;
  entryLane: string | null;
  exitPlaza: string | null;
  exitLane: string | null;
  plazaDescription: string | null;
  axle: string | null;
  vehicleTypeCode: string | null;
  vehicleClass: string | null;
  description: string | null;
  prepaid: string | null;
  planRate: string | null;
  fareType: string | null;
  balanceText: string | null;
  debitText: string | null;
  creditText: string | null;
  dateCreated: string;
  dateUpdated: string;
  note: string | null;
  exception: string | null;
  isException: boolean | null;
  completed: boolean;
  dateCompleted: string | null;
  tollPlanType: number | null;
  tollPlanDescription: string | null;
}

const NewToll: React.FC = () => {
  const navigate = useNavigate();
  const generateGuid = () => {
    // Simple GUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
  };
  const [formData, setFormData] = useState<ExternalTollDailyInvoiceData>({
    sourceTable: '',
    sourceId: '',
    tollId: 0,
    plateNumber: '',
    plateState: '',
    plateTag: '',
    agency: '',
    amount: 0,
    amountWithFee: null,
    newAmount: null,
    postingDate: '',
    transactionDate: '',
    transactionDateTime: '',
    entryTime: '',
    exitTime: '',
    entryPlaza: '',
    entryLane: '',
    exitPlaza: '',
    exitLane: '',
    plazaDescription: '',
    axle: '',
    vehicleTypeCode: '',
    vehicleClass: '',
    description: '',
    prepaid: '',
    planRate: '',
    fareType: '',
    balanceText: '',
    debitText: '',
    creditText: '',
    dateCreated: new Date().toISOString(),
    dateUpdated: new Date().toISOString(),
    note: '',
    exception: '',
    isException: null,
    completed: false,
    dateCompleted: '',
    tollPlanType: null,
    tollPlanDescription: ''
  });

  const createTollMutation = useMutation({
    mutationFn: (data: ExternalTollDailyInvoiceData) => rydoraApi.createExternalTollDailyInvoice(data),
    onSuccess: (response) => {
      toast.success('Toll created successfully!');
      
      // Get URL parameters to preserve filters when going back
      const urlParams = new URLSearchParams(window.location.search);
      const dateFrom = urlParams.get('dateFrom');
      const dateTo = urlParams.get('dateTo');
      const companyId = urlParams.get('companyId');
      const pageIndex = urlParams.get('pageIndex');
      const globalFilter = urlParams.get('globalFilter');
      
      // Build the return URL with preserved filters
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (companyId) params.append('companyId', companyId);
      if (pageIndex) params.append('pageIndex', pageIndex);
      if (globalFilter) params.append('globalFilter', globalFilter);
      
      const returnUrl = params.toString() 
        ? `/tolls?${params.toString()}`
        : '/tolls';
      
      navigate(returnUrl);
    },
    onError: (error: any) => {
      console.error('Error creating toll:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(error.response?.data?.message || error.message || 'Failed to create toll');
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Transform the data to match the expected format
    const transformedData = {
      ...formData,
      // Convert empty strings to null for ID fields
      sourceId: formData.sourceId && formData.sourceId.trim() !== '' ? formData.sourceId : generateGuid(),
      // Ensure dates are in the correct format
      postingDate: formData.postingDate ? new Date(formData.postingDate).toISOString() : new Date().toISOString(),
      transactionDate: formData.transactionDate ? new Date(formData.transactionDate).toISOString() : new Date().toISOString(),
      transactionDateTime: formData.transactionDateTime ? new Date(formData.transactionDateTime).toISOString() : new Date().toISOString(),
      dateCompleted: formData.dateCompleted ? new Date(formData.dateCompleted).toISOString() : null,
      // Force unpaid status for new tolls
      paymentStatus: 1,
      // Ensure numbers are properly formatted
      amount: parseFloat(formData.amount.toString()) || 0,
      newAmount: formData.newAmount == null ? null : (parseFloat(formData.newAmount.toString()) || 0),
      tollId: parseInt(formData.tollId.toString()) || 0,
      tollPlanType: formData.tollPlanType == null ? null : (parseInt(formData.tollPlanType.toString()) || null),
      // Convert empty strings to null for optional text fields
      sourceTable: formData.sourceTable && formData.sourceTable.trim() !== '' ? formData.sourceTable : 'SunPassFlInvoice',
      plateTag: formData.plateTag || null,
      entryTime: formData.entryTime || null,
      exitTime: formData.exitTime || null,
      entryPlaza: formData.entryPlaza || null,
      entryLane: formData.entryLane || null,
      exitPlaza: formData.exitPlaza || null,
      exitLane: formData.exitLane || null,
      plazaDescription: formData.plazaDescription || null,
      axle: formData.axle || null,
      vehicleTypeCode: formData.vehicleTypeCode || null,
      vehicleClass: formData.vehicleClass || null,
      description: formData.description || null,
      prepaid: formData.prepaid || null,
      planRate: formData.planRate || null,
      fareType: formData.fareType || null,
      balanceText: formData.balanceText || null,
      debitText: formData.debitText || null,
      creditText: formData.creditText || null,
      note: formData.note || null,
      exception: formData.exception || null,
      tollPlanDescription: formData.tollPlanDescription || null
    };
    
    createTollMutation.mutate(transformedData);
  };

  const handleCancel = () => {
    // Get URL parameters to preserve filters when going back
    const urlParams = new URLSearchParams(window.location.search);
    const dateFrom = urlParams.get('dateFrom');
    const dateTo = urlParams.get('dateTo');
    const companyId = urlParams.get('companyId');
    const pageIndex = urlParams.get('pageIndex');
    const globalFilter = urlParams.get('globalFilter');
    
    // Build the return URL with preserved filters
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (companyId) params.append('companyId', companyId);
    if (pageIndex) params.append('pageIndex', pageIndex);
    if (globalFilter) params.append('globalFilter', globalFilter);
    
    const returnUrl = params.toString() 
      ? `/tolls?${params.toString()}`
      : '/tolls';
    
    navigate(returnUrl);
  };

  return (
    <div className="new-toll-container">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="page-header">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h1>Add New Toll</h1>
                  <p>Create a new toll record</p>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-outline-secondary"
                >
                  ← Back to Tolls
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="toll-form">
              {/* Required Fields */}
              <div className="form-section">
                <h3>Required Information</h3>
                <div className="form-row">
                  <div className="form-group col-md-3">
                    <label htmlFor="plateNumber">Plate Number *</label>
                    <input
                      type="text"
                      id="plateNumber"
                      name="plateNumber"
                      value={formData.plateNumber}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="form-group col-md-3">
                    <label htmlFor="plateState">Plate State/Province *</label>
                    <select
                      id="plateState"
                      name="plateState"
                      value={formData.plateState}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    >
                      {renderStateOptions()}
                    </select>
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="agency">Agency *</label>
                    <input
                      type="text"
                      id="agency"
                      name="agency"
                      value={formData.agency}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="amount">Amount *</label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      className="form-control"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-3">
                    <label htmlFor="postingDate">Posting Date *</label>
                    <input
                      type="datetime-local"
                      id="postingDate"
                      name="postingDate"
                      value={formData.postingDate || ''}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="form-group col-md-3">
                    <label htmlFor="transactionDate">Transaction Date *</label>
                    <input
                      type="datetime-local"
                      id="transactionDate"
                      name="transactionDate"
                      value={formData.transactionDate || ''}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="plateTag">Plate Tag</label>
                    <input
                      type="text"
                      id="plateTag"
                      name="plateTag"
                      value={formData.plateTag || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="newAmount">New Amount</label>
                    <input
                      type="number"
                      id="newAmount"
                      name="newAmount"
                      value={formData.newAmount ?? ''}
                      onChange={handleInputChange}
                      className="form-control"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              {/* Location & Vehicle */}
              <div className="form-section">
                <h3>Location & Vehicle Details</h3>
                <div className="form-row">
                  <div className="form-group col-md-3">
                    <label htmlFor="entryPlaza">Entry Plaza</label>
                    <input
                      type="text"
                      id="entryPlaza"
                      name="entryPlaza"
                      value={formData.entryPlaza || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group col-md-3">
                    <label htmlFor="exitPlaza">Exit Plaza</label>
                    <input
                      type="text"
                      id="exitPlaza"
                      name="exitPlaza"
                      value={formData.exitPlaza || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="entryTime">Entry Time</label>
                    <input
                      type="time"
                      id="entryTime"
                      name="entryTime"
                      value={formData.entryTime || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group col-md-3">
                    <label htmlFor="exitTime">Exit Time</label>
                    <input
                      type="time"
                      id="exitTime"
                      name="exitTime"
                      value={formData.exitTime || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-3">
                    <label htmlFor="entryLane">Entry Lane</label>
                    <input
                      type="text"
                      id="entryLane"
                      name="entryLane"
                      value={formData.entryLane || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group col-md-3">
                    <label htmlFor="exitLane">Exit Lane</label>
                    <input
                      type="text"
                      id="exitLane"
                      name="exitLane"
                      value={formData.exitLane || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="vehicleTypeCode">Vehicle Type</label>
                    <input
                      type="text"
                      id="vehicleTypeCode"
                      name="vehicleTypeCode"
                      value={formData.vehicleTypeCode || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="vehicleClass">Vehicle Class</label>
                    <input
                      type="text"
                      id="vehicleClass"
                      name="vehicleClass"
                      value={formData.vehicleClass || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label htmlFor="plazaDescription">Plaza Description</label>
                    <input
                      type="text"
                      id="plazaDescription"
                      name="plazaDescription"
                      value={formData.plazaDescription || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="axle">Axle</label>
                    <input
                      type="text"
                      id="axle"
                      name="axle"
                      value={formData.axle || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="tollPlanType">Toll Plan Type</label>
                    <input
                      type="number"
                      id="tollPlanType"
                      name="tollPlanType"
                      value={formData.tollPlanType ?? ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              {/* Financial & Plan Details */}
              <div className="form-section">
                <h3>Financial & Plan Details</h3>
                <div className="form-row">
                  <div className="form-group col-md-3">
                    <label htmlFor="planRate">Plan Rate</label>
                    <input
                      type="text"
                      id="planRate"
                      name="planRate"
                      value={formData.planRate || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group col-md-3">
                    <label htmlFor="fareType">Fare Type</label>
                    <input
                      type="text"
                      id="fareType"
                      name="fareType"
                      value={formData.fareType || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="prepaid">Prepaid</label>
                    <input
                      type="text"
                      id="prepaid"
                      name="prepaid"
                      value={formData.prepaid || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="tollPlanDescription">Plan Description</label>
                    <input
                      type="text"
                      id="tollPlanDescription"
                      name="tollPlanDescription"
                      value={formData.tollPlanDescription || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label htmlFor="balanceText">Balance Text</label>
                    <input
                      type="text"
                      id="balanceText"
                      name="balanceText"
                      value={formData.balanceText || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group col-md-4">
                    <label htmlFor="debitText">Debit Text</label>
                    <input
                      type="text"
                      id="debitText"
                      name="debitText"
                      value={formData.debitText || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group col-md-4">
                    <label htmlFor="creditText">Credit Text</label>
                    <input
                      type="text"
                      id="creditText"
                      name="creditText"
                      value={formData.creditText || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="form-section">
                <h3>Additional Information</h3>
                <div className="form-row">
                  <div className="form-group col-md-3">
                    <label htmlFor="transactionDateTime">Transaction DateTime</label>
                    <input
                      type="datetime-local"
                      id="transactionDateTime"
                      name="transactionDateTime"
                      value={formData.transactionDateTime || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="tollId">Toll ID</label>
                    <input
                      type="number"
                      id="tollId"
                      name="tollId"
                      value={formData.tollId}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <label htmlFor="sourceTable">Source Table</label>
                    <input
                      type="text"
                      id="sourceTable"
                      name="sourceTable"
                      value={formData.sourceTable || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  
                </div>

                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description || ''}
                      onChange={handleInputChange}
                      className="form-control"
                      rows={2}
                      placeholder="Additional description about the toll..."
                    />
                  </div>

                  <div className="form-group col-md-6">
                    <label htmlFor="note">Notes</label>
                    <textarea
                      id="note"
                      name="note"
                      value={formData.note || ''}
                      onChange={handleInputChange}
                      className="form-control"
                      rows={2}
                      placeholder="Additional notes about the toll..."
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label htmlFor="exception">Exception</label>
                    <input
                      type="text"
                      id="exception"
                      name="exception"
                      value={formData.exception || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-3">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="isException"
                        name="isException"
                        checked={!!formData.isException}
                        onChange={handleInputChange}
                        className="form-check-input"
                      />
                      <label htmlFor="isException" className="form-check-label">
                        Is Exception
                      </label>
                    </div>
                  </div>
                  
                  <div className="form-group col-md-3">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        id="completed"
                        name="completed"
                        checked={formData.completed}
                        onChange={handleInputChange}
                        className="form-check-input"
                      />
                      <label htmlFor="completed" className="form-check-label">
                        Completed
                      </label>
                    </div>
                  </div>
                </div>

                {formData.completed && (
                  <div className="form-row">
                    <div className="form-group col-md-6">
                      <label htmlFor="dateCompleted">Date Completed</label>
                      <input
                        type="datetime-local"
                        id="dateCompleted"
                        name="dateCompleted"
                        value={formData.dateCompleted || ''}
                        onChange={handleInputChange}
                        className="form-control"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary"
                  disabled={createTollMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createTollMutation.isPending}
                >
                  {createTollMutation.isPending ? 'Creating...' : 'Create Toll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewToll;

