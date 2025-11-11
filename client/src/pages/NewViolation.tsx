import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { rydoraApi } from '../services/api';
import toast from 'react-hot-toast';
import { renderStateOptions } from '../constants/statesAndProvinces';
import './NewViolation.css';

interface ViolationFormData {
  citationNumber: string;
  noticeNumber: string;
  agency: string;
  address: string;
  tag: string;
  state: string;
  issueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  amount: number;
  currency: string;
  paymentStatus: number;
  fineType: number;
  note: string;
  link: string;
  companyId: string;
}

const NewViolation: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ViolationFormData>({
    citationNumber: '',
    noticeNumber: '',
    agency: '',
    address: '',
    tag: '',
    state: '',
    issueDate: '',
    startDate: '',
    endDate: '',
    amount: 0,
    currency: 'USD',
    paymentStatus: 0,
    fineType: 0,
    note: '',
    link: '',
    companyId: ''
  });

  const createViolationMutation = useMutation({
    mutationFn: (data: ViolationFormData) => {
      console.log('=== CREATE VIOLATION MUTATION CALLED ===');
      console.log('Payload:', data);
      return rydoraApi.createViolation(data);
    },
    onSuccess: (response) => {
      console.log('=== CREATE VIOLATION SUCCESS ===');
      console.log('Response:', response);
      toast.success('Violation created successfully!');
      
      // Get URL parameters to preserve filters when going back
      const urlParams = new URLSearchParams(window.location.search);
      const dateFrom = urlParams.get('dateFrom');
      const dateTo = urlParams.get('dateTo');
      const companyId = urlParams.get('companyId');
      
      // Build the return URL with preserved filters
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (companyId) params.append('companyId', companyId);
      
      const returnUrl = params.toString() 
        ? `/parking-violations?${params.toString()}`
        : '/parking-violations';
      
      navigate(returnUrl);
    },
    onError: (error: any) => {
      console.error('Error creating violation:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(error.response?.data?.message || error.message || 'Failed to create violation');
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== FORM SUBMISSION TRIGGERED ===');
    console.log('Form data:', formData);
    
    // Validate required fields - at least one of citation or notice number is required
    const hasCitation = formData.citationNumber && formData.citationNumber.trim() !== '';
    const hasNotice = formData.noticeNumber && formData.noticeNumber.trim() !== '';
    
    if (!hasCitation && !hasNotice) {
      toast.error('Either Citation Number or Notice Number is required');
      return;
    }
    
    if (!formData.agency || formData.agency.trim() === '') {
      toast.error('Agency is required');
      return;
    }
    
    if (!formData.issueDate || formData.issueDate.trim() === '') {
      toast.error('Issue Date is required');
      return;
    }

    // Transform the data to match the expected format
    const transformedData = {
      citationNumber: formData.citationNumber?.trim() || '',
      noticeNumber: formData.noticeNumber?.trim() || '',
      agency: formData.agency?.trim() || '',
      address: formData.address?.trim() || '',
      tag: formData.tag?.trim() || '',
      state: formData.state?.trim() || '',
      issueDate: formData.issueDate ? new Date(formData.issueDate).toISOString() : null,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      amount: parseFloat((formData.amount || 0).toString()) || 0,
      currency: formData.currency?.trim() || 'USD',
      paymentStatus: parseInt((formData.paymentStatus || 0).toString()) || 0,
      fineType: parseInt((formData.fineType || 0).toString()) || 0,
      note: formData.note?.trim() || '',
      link: formData.link?.trim() || '',
      companyId: formData.companyId?.trim() || ''
    };

    console.log('Transformed payload:', transformedData);
    createViolationMutation.mutate(transformedData);
  };

  const handleCancel = () => {
    // Get URL parameters to preserve filters when going back
    const urlParams = new URLSearchParams(window.location.search);
    const dateFrom = urlParams.get('dateFrom');
    const dateTo = urlParams.get('dateTo');
    const companyId = urlParams.get('companyId');
    
    // Build the return URL with preserved filters
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (companyId) params.append('companyId', companyId);
    
    const returnUrl = params.toString() 
      ? `/parking-violations?${params.toString()}`
      : '/parking-violations';
    
    navigate(returnUrl);
  };

  return (
    <div className="new-violation-container">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="page-header">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h1>Add New Violation</h1>
                  <p>Create a new parking violation record</p>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-outline-secondary"
                >
                  ← Back to Violations
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="violation-form" noValidate>
              {/* Basic Information */}
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-row">
                  <div className="form-group col-md-2">
                    <label htmlFor="citationNumber">Citation Number <span className="text-muted">(or Notice)</span></label>
                    <input
                      type="text"
                      id="citationNumber"
                      name="citationNumber"
                      value={formData.citationNumber || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group col-md-2">
                    <label htmlFor="noticeNumber">Notice Number <span className="text-muted">(or Citation)</span></label>
                    <input
                      type="text"
                      id="noticeNumber"
                      name="noticeNumber"
                      value={formData.noticeNumber || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>

                  <div className="form-group col-md-7">
                    <label htmlFor="link">Payment Link</label>
                    <input
                      type="url"
                      id="link"
                      name="link"
                      value={formData.link || ''}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="form-group col-md-5">
                    <label htmlFor="agency">Agency *</label>
                    <input
                      type="text"
                      id="agency"
                      name="agency"
                      value={formData.agency || ''}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'none' }}>
                  <div className="form-group col-md-6">
                    <label htmlFor="companyId">Company</label>
                    <input
                      type="text"
                      id="companyId"
                      name="companyId"
                      value={formData.companyId || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-12">
                    <label htmlFor="address">Address</label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="form-section">
                <h3>Vehicle Information</h3>
                <div className="form-row">
                  <div className="form-group col-md-3">
                    <label htmlFor="tag">Tag/License Plate *</label>
                    <input
                      type="text"
                      id="tag"
                      name="tag"
                      value={formData.tag || ''}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="form-group col-md-3">
                    <label htmlFor="state">State/Province *</label>
                    <select
                      id="state"
                      name="state"
                      value={formData.state || ''}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    >
                      {renderStateOptions()}
                    </select>
                  </div>
                </div>
              </div>

              {/* Date Information */}
              <div className="form-section">
                <h3>Date Information</h3>
                <div className="form-row">
                  <div className="form-group col-md-2">
                    <label htmlFor="issueDate">Issue Date *</label>
                    <input
                      type="datetime-local"
                      id="issueDate"
                      name="issueDate"
                      value={formData.issueDate || ''}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>
                  
                  <div className="form-group col-md-2">
                    <label htmlFor="startDate">Start Date</label>
                    <input
                      type="datetime-local"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  
                  <div className="form-group col-md-2">
                    <label htmlFor="endDate">End Date</label>
                    <input
                      type="datetime-local"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="form-section">
                <h3>Financial Information</h3>
                <div className="form-row">
                  <div className="form-group col-md-3">
                    <label htmlFor="amount">Amount *</label>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      value={formData.amount || 0}
                      onChange={handleInputChange}
                      className="form-control"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div className="form-group col-md-3">
                    <label htmlFor="currency">Currency</label>
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency || 'USD'}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  
                  <div className="form-group col-md-3">
                    <label htmlFor="paymentStatus">Payment Status</label>
                    <select
                      id="paymentStatus"
                      name="paymentStatus"
                      value={formData.paymentStatus || 0}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value={0}>Unpaid</option>
                      <option value={1}>Paid</option>
                      <option value={2}>Partial</option>
                      <option value={3}>Refunded</option>
                      <option value={-5}>Paid by others</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label htmlFor="fineType">Fine Type</label>
                    <select
                      id="fineType"
                      name="fineType"
                      value={formData.fineType || 0}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value={0}>Parking Violation</option>
                      <option value={1}>Traffic Violation</option>
                      <option value={2}>Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="form-section">
                <h3>Additional Information</h3>
                <div className="form-row">
                  <div className="form-group col-12">
                    <label htmlFor="note">Notes</label>
                    <textarea
                      id="note"
                      name="note"
                      value={formData.note || ''}
                      onChange={handleInputChange}
                      className="form-control"
                      rows={3}
                      placeholder="Additional notes about the violation..."
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-secondary"
                  disabled={createViolationMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createViolationMutation.isPending}
                >
                  {createViolationMutation.isPending ? 'Creating...' : 'Create Violation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewViolation;

