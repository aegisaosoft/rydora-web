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

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { EnvironmentProvider } from './contexts/EnvironmentContext';
import Header from './components/Header';
import Footer from './components/Footer';
import SharedLayout from './components/SharedLayout';
import useDeviceDetection from './hooks/useDeviceDetection';
import './styles/authenticated-pages.css';
import Home from './pages/Home';
import Login from './pages/Login';
import ControlPanel from './pages/ControlPanel';
import Application from './pages/Application';
import Company from './pages/Company';
import Product from './pages/Product';
import EzPass from './pages/EzPass';
import ParkingViolations from './pages/ParkingViolations';
import ViolationsChecker from './pages/ViolationsChecker';
import Tolls from './pages/Tolls';
import Invoice from './pages/Invoice';
import AllInvoices from './pages/AllInvoices';
import InvoiceDetails from './pages/InvoiceDetails';
import PendingPayments from './pages/PendingPayments';
import NYCViolations from './pages/NYCViolations';
import FailedPayments from './pages/FailedPayments';
import CompletedPayments from './pages/CompletedPayments';
import NewViolation from './pages/NewViolation';
import NewToll from './pages/NewToll';
import EditToll from './pages/EditToll';
import EditViolation from './pages/EditViolation';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  const { isMobile, isTablet } = useDeviceDetection();

  return (
    <QueryClientProvider client={queryClient}>
      <EnvironmentProvider>
        <AuthProvider>
          <div className={`App ${isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'}`}>
        <Header />
        <main role="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/application" element={<Application />} />
            <Route path="/company" element={<Company />} />
            <Route path="/product" element={<Product />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            
            {/* Protected Routes */}
            <Route path="/control-panel" element={
              <ProtectedRoute>
                <SharedLayout>
                  <ControlPanel />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/ezpass" element={
              <ProtectedRoute>
                <SharedLayout>
                  <EzPass />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/parking-violations" element={
              <ProtectedRoute>
                <SharedLayout>
                  <ParkingViolations />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/violations-checker" element={
              <ProtectedRoute>
                <SharedLayout>
                  <ViolationsChecker />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/tolls" element={
              <ProtectedRoute>
                <SharedLayout>
                  <Tolls />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/invoice" element={
              <ProtectedRoute>
                <SharedLayout>
                  <Invoice />
                </SharedLayout>
              </ProtectedRoute>
            } />
        <Route path="/allinvoices" element={
          <ProtectedRoute>
            <SharedLayout>
              <AllInvoices />
            </SharedLayout>
          </ProtectedRoute>
        } />
            <Route path="/invoice-details" element={
              <ProtectedRoute>
                <SharedLayout>
                  <InvoiceDetails />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/pending-payments" element={
              <ProtectedRoute>
                <SharedLayout>
                  <PendingPayments />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/nyc-violations" element={
              <ProtectedRoute>
                <SharedLayout>
                  <NYCViolations />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/failed-payments" element={
              <ProtectedRoute>
                <SharedLayout>
                  <FailedPayments />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/completed-payments" element={
              <ProtectedRoute>
                <SharedLayout>
                  <CompletedPayments />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/new-violation" element={
              <ProtectedRoute>
                <SharedLayout>
                  <NewViolation />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/new-toll" element={
              <ProtectedRoute>
                <SharedLayout>
                  <NewToll />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/edit-toll/:id" element={
              <ProtectedRoute>
                <SharedLayout>
                  <EditToll />
                </SharedLayout>
              </ProtectedRoute>
            } />
            <Route path="/edit-violation/:id" element={
              <ProtectedRoute>
                <SharedLayout>
                  <EditViolation />
                </SharedLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </main>
        <Footer />
        {/* Toast notifications - centered */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              fontSize: '14px',
              borderRadius: '8px',
              padding: '12px 20px',
              maxWidth: '500px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
            success: {
              style: {
                background: '#10b981',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
                color: '#fff',
              },
              iconTheme: {
                primary: '#fff',
                secondary: '#ef4444',
              },
            },
          }}
        />
          </div>
        </AuthProvider>
      </EnvironmentProvider>
    </QueryClientProvider>
  );
}

export default App;
