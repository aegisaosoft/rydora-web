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

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ControlPanel.css';

const ControlPanel: React.FC = () => {
  const { user } = useAuth();

  // Check if user is admin or owner
  const isAdmin = user?.isAdmin || false;
  const isOwner = user?.isOwner || false;
  const canAccessAdminFeatures = isAdmin || isOwner;

  return (
    <div className="control-panel-content">
      <div className="content-header">
        <h1>Welcome to your Control Panel</h1>
        <p>Manage your EZ Pass, violations, and payments from one central location.</p>
      </div>

      <div className="dashboard-grid">
        {/* External Section Cards - Match navigation logic exactly */}
        {/* All Invoices - Admin OR Owner */}
        {canAccessAdminFeatures && (
          <div className="dashboard-card">
            <div className="card-icon">
              <i className="fas fa-list"></i>
            </div>
            <div className="card-content">
              <h3>All Invoices</h3>
              <p>View all invoices across the system</p>
              <Link to="/allinvoices" className="card-action">View All Invoices</Link>
            </div>
          </div>
        )}

        {/* Tolls - Admin or Owner */}
        {canAccessAdminFeatures && (
          <div className="dashboard-card">
            <div className="card-icon">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div className="card-content">
              <h3>Tolls</h3>
              <p>Manage toll payments and transactions</p>
              <Link to="/tolls" className="card-action">Manage Tolls</Link>
            </div>
          </div>
        )}

        {/* Parking Violations - Admin or Owner */}
        {canAccessAdminFeatures && (
          <div className="dashboard-card">
            <div className="card-icon">
              <i className="fas fa-car"></i>
            </div>
            <div className="card-content">
              <h3>Parking Violations</h3>
              <p>View and manage parking violations</p>
              <Link to="/parking-violations" className="card-action">View Violations</Link>
            </div>
          </div>
        )}

        {/* NYC Section Cards - Always visible */}
        <div className="dashboard-card">
          <div className="card-icon">
            <i className="fas fa-road"></i>
          </div>
          <div className="card-content">
            <h3>EZ Pass</h3>
            <p>Manage your EZ Pass account and view toll transactions</p>
            <Link to="/ezpass" className="card-action">Go to EZ Pass</Link>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="card-content">
            <h3>NYC Violations</h3>
            <p>View and pay NYC parking and traffic violations</p>
            <Link to="/nyc-violations" className="card-action">View Violations</Link>
          </div>
        </div>

        {/* Administration Section Cards - Admin only */}
        {isAdmin && (
          <div className="dashboard-card">
            <div className="card-icon">
              <i className="fas fa-search"></i>
            </div>
            <div className="card-content">
              <h3>Violations Checker</h3>
              <p>Check and monitor violations across the system</p>
              <Link to="/violations-checker" className="card-action">Open Checker</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;