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
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

const ConditionalLayout: React.FC<ConditionalLayoutProps> = ({ children }) => {
  const location = useLocation();
  
  // Define routes that should not show header and footer (authenticated pages)
  const authenticatedRoutes = [
    '/control-panel',
    '/ezpass',
    '/parking-violations',
    '/violations-checker',
    '/tolls',
    '/invoice',
    '/allinvoices',
    '/invoice-details',
    '/pending-payments',
    '/nyc-violations',
    '/failed-payments',
    '/completed-payments',
    '/new-violation',
    '/new-toll',
    '/edit-toll',
    '/edit-violation'
  ];
  
  // Check if current route is an authenticated route
  const isAuthenticatedRoute = authenticatedRoutes.some(route => 
    location.pathname === route || location.pathname.startsWith(route + '/')
  );
  
  if (isAuthenticatedRoute) {
    // For authenticated routes, return only the children (no header/footer)
    return <>{children}</>;
  }
  
  // For non-authenticated routes, return with header and footer
  return (
    <>
      <Header />
      <main role="main">
        {children}
      </main>
      <Footer />
    </>
  );
};

export default ConditionalLayout;
