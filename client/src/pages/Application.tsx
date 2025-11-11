import React from 'react';
import { useQuery } from '@tanstack/react-query';
import './Application.css';

const Application: React.FC = () => {
  // Example of how to use TanStack React Query for future application data
  // This could be used to fetch application status, features, or other dynamic content
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useQuery({
    queryKey: ['application-info'],
    queryFn: async () => {
      // This is a placeholder for future API calls
      // For now, return static data since there's no application API
      return { 
        data: {
          status: 'In Development',
          version: '1.0.0',
          features: ['Toll Management', 'Fleet Tracking', 'Payment Processing']
        }
      };
    },
    enabled: false // Disabled for now since there's no application API
  });

  return (
    <>
      {/* Fixed side image like Company page */}
      <div id="fixed-side-image" className="RYDORA-fixed-image">
        <img src="/images/_img101.jpg" alt="Application visual" />
      </div>

      {/* Center text matching reference */}
      <section className="application-center with-side">
        <div className="container narrow">
          <h1>Application</h1>
          <p>It is not a final version and the application is improving for the benefit of renter and owner.</p>
          <p><em>It is our goal to operate our business with a knowledgeable staff, superior customer service and high ethical standards. However, we cannot succeed without quality vendors like you. We pledge that we will provide you with all the information you need to complete the service call in a timely and efficient manner, which will also avoid costly downtime to our drivers. You are a very important part of our success and we highly value any suggestions or comments you might have to help us reach our goals.</em></p>
          <p><strong>WE HAVE A VERY SPECIAL DEAL FOR YOU IF YOU DECIDE TO JOIN NOW (CALL FOR ACTION. TIMEFRAMES?)</strong></p>
        </div>
      </section>
    </>
  );
};

export default Application;

