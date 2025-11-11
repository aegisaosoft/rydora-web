import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ControlPanel.css';

const HomeControlPanelCards: React.FC = () => {
  return (
    <section className="home-dashboard-section">
      <div className="control-panel-content">
        <div className="content-header home-content-header">
          <h2 className="home-section-title">Manage Your Operations</h2>
          <p className="home-section-description">
            Quick access to tolls, violations, and reporting tools.
          </p>
        </div>

        <div className="dashboard-grid">
          <Link to="/allinvoices" className="dashboard-card-link">
            <article className="dashboard-card">
              <div className="card-icon">
                <i className="fas fa-list"></i>
              </div>
              <div className="card-content">
                <h3>All Invoices</h3>
                <p>View all invoices across the system</p>
                <span className="card-action">View All Invoices</span>
              </div>
            </article>
          </Link>

          <Link to="/tolls" className="dashboard-card-link">
            <article className="dashboard-card">
              <div className="card-icon">
                <i className="fas fa-dollar-sign"></i>
              </div>
              <div className="card-content">
                <h3>Tolls</h3>
                <p>Manage toll payments and transactions</p>
                <span className="card-action">Manage Tolls</span>
              </div>
            </article>
          </Link>

          <Link to="/parking-violations" className="dashboard-card-link">
            <article className="dashboard-card">
              <div className="card-icon">
                <i className="fas fa-car"></i>
              </div>
              <div className="card-content">
                <h3>Parking Violations</h3>
                <p>View and manage parking violations</p>
                <span className="card-action">View Violations</span>
              </div>
            </article>
          </Link>

          <Link to="/ezpass" className="dashboard-card-link">
            <article className="dashboard-card">
              <div className="card-icon">
                <i className="fas fa-road"></i>
              </div>
              <div className="card-content">
                <h3>EZ Pass</h3>
                <p>Manage your EZ Pass account and view toll transactions</p>
                <span className="card-action">Go to EZ Pass</span>
              </div>
            </article>
          </Link>

          <Link to="/nyc-violations" className="dashboard-card-link">
            <article className="dashboard-card">
              <div className="card-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="card-content">
                <h3>NYC Violations</h3>
                <p>View and pay NYC parking and traffic violations</p>
                <span className="card-action">View Violations</span>
              </div>
            </article>
          </Link>

        </div>
      </div>
    </section>
  );
};

export default HomeControlPanelCards;

