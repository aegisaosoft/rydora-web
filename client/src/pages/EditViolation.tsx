import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { rydoraApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { renderStateOptions } from '../constants/statesAndProvinces';
import toast from 'react-hot-toast';
import './EditViolation.css';

interface Company {
  id: string;
  name: string;
  stateId: string;
  createdBy: string;
  userId: string;
  hqToken: string;
  isActive: boolean;
}

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

const EditViolation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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

  // Fetch violation data by ID
  const { data: violationData, isLoading, error } = useQuery({
    queryKey: ['violation', id],
    queryFn: () => rydoraApi.getViolationById(id!),
    enabled: !!id
  });

  // Fetch companies for dropdown
  const { data: companiesData, error: companiesError } = useQuery({
    queryKey: ['companies'],
    queryFn: () => rydoraApi.getActiveCompanies(),
    enabled: true,
    retry: 1
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (updatedData: ViolationFormData) => {
      console.log('=== MUTATION FUNCTION CALLED ===');
      console.log('Updated data:', updatedData);
      console.log('Violation ID:', id);
      return rydoraApi.updateViolation(id!, updatedData);
    },
    onSuccess: (response) => {
      console.log('=== VIOLATION UPDATE SUCCESS ===');
      console.log('Response:', response);
      toast.success('Violation updated successfully');
      
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
      console.error('=== VIOLATION UPDATE ERROR ===');
      console.error('Error:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to update violation';
      
      toast.error(errorMessage);
    }
  });

  // Populate form when data is loaded
  useEffect(() => {
    if (violationData) {
      // Extract data from the result field if it exists, otherwise use the data directly
      const data = violationData.result || violationData;
      
      // Convert datetime strings to date format for date inputs
      const processedData = {
        ...data,
        issueDate: data.issueDate ? new Date(data.issueDate).toISOString().slice(0, 16) : '',
        startDate: data.startDate ? new Date(data.startDate).toISOString().slice(0, 16) : '',
        endDate: data.endDate ? new Date(data.endDate).toISOString().slice(0, 16) : '',
        // Ensure all string fields have default empty string instead of null
        citationNumber: data.citationNumber || '',
        noticeNumber: data.noticeNumber || '',
        agency: data.agency || '',
        address: data.address || '',
        tag: data.tag || '',
        state: data.state || '',
        currency: data.currency || 'USD',
        note: data.note || '',
        link: data.link || '',
        companyId: data.companyId || ''
      };
      
      setFormData(processedData);
    }
  }, [violationData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
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

    console.log('=== VIOLATION UPDATE REQUEST ===');
    console.log('Violation ID:', id);
    console.log('Transformed data:', JSON.stringify(transformedData, null, 2));
    console.log('Original form data:', JSON.stringify(formData, null, 2));

    console.log('=== CALLING UPDATE MUTATION ===');
    updateMutation.mutate(transformedData);
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

  if (isLoading) {
    return (
      <div className="edit-violation-container">
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading violation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="edit-violation-container">
        <div className="message-container">
          <div className="alert alert-danger">
            <h4>Error Loading Violation</h4>
            <p>Failed to load violation data. Please try again.</p>
            <div style={{ marginTop: '1rem' }}>
              <Button onClick={handleCancel}>Back to Violations</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-violation-container">
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="edit-violation-header">
              <div className="d-flex justify-content-between align-items-center">
                <h1 className="h3 mb-0">Edit Violation</h1>
                <div className="header-actions">
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={handleCancel}
                  >
                    ← Back to Violations
                  </button>
                </div>
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
                      readOnly
                      disabled
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
                      readOnly
                      disabled
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
                    <select
                      id="companyId"
                      name="companyId"
                      value={formData.companyId || ''}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value="">Select Company</option>
                      {companiesData?.result?.map((company: Company) => (
                        <option key={company.id} value={company.id}>
                          {company.name} ({company.stateId})
                        </option>
                      ))}
                    </select>
                    {companiesError && (
                      <small className="text-danger">
                        Failed to load companies. Please refresh the page.
                      </small>
                    )}
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
                      readOnly
                      disabled
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
                      disabled
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
                      readOnly
                      disabled
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
                      rows={4}
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
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Updating...' : 'Update Violation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditViolation;

