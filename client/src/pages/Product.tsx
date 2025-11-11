import React from 'react';
import { useQuery } from '@tanstack/react-query';
import './Product.css';

const Product: React.FC = () => {
  // Example of how to use TanStack React Query for future product data
  // This could be used to fetch product features, pricing, or other dynamic content
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useQuery({
    queryKey: ['product-info'],
    queryFn: async () => {
      // This is a placeholder for future API calls
      // For now, return static data since there's no product API
      return { 
        data: {
          name: 'RYDORA Toll Management',
          description: 'Discover our comprehensive toll management solutions.',
          features: ['Real-time Tracking', 'Automated Billing', 'Multi-State Support']
        }
      };
    },
    enabled: false // Disabled for now since there's no product API
  });

  return (
    <>
      {/* Fixed side image like Application page */}
      <div id="fixed-side-image" className="RYDORA-fixed-image">
        <img src="/images/_img101.jpg" alt="Product visual" />
      </div>

      {/* Center text matching Application page layout */}
      <section className="product-center with-side">
        <div className="container narrow">
          <article>
            <h1>Product</h1>
            <p>Here's what you will get!</p>
            <table>
              <tbody>
                <tr>
                  <th>Maximize Revenue by Minimizing Downtimes</th>
                  <td>
                    <ul>
                      <li>It will be much easier for drivers to find you - You will be just a click away regardless of where the driver is</li>
                      <li>Rent your vehicles for future dates ahead of time (pre-reservation scheduling)</li>
                      <li>Get alerts to see upcoming, ending reservations</li>
                      <li>Publish your medallions available for rent</li>
                      <li>Optimize renting your vehicles per shift</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th>Reduce Costs</th>
                  <td>
                    <ul>
                      <li>All communication will be online and you won't need too big office space for employees (all employees will have option to work from home)</li>
                      <li>Less workers you need -</li>
                      <li>All payments will be processed via a bank and sent to your account in a due date automatically – you won't need to be a collector any more</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th>Get Visibility & Control</th>
                  <td>
                    <ul>
                      <li>Full financial statement daily, weekly, monthly, and yearly</li>
                      <li>Earnings report per car, per week/month/year</li>
                      <li>You would know what cars were rented and which was not</li>
                      <li>Owner can monitor all the conversations btw employees and customers</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th>Have most Interactions on-line</th>
                  <td>
                    <ul>
                      <li>All pre-agreement communication could be done through the application without physical appearance</li>
                      <li>As agreement is made a legal contract will be sent to both sides</li>
                      <li>Ability to extend the agreement through the "RYDORA" application</li>
                      <li>Communicate with your drivers via RYDORA and keep the communication history for your records</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th>Market Reach</th>
                  <td>
                    <ul>
                      <li>Bigger audience that could see your listings</li>
                      <li>Publish your medallions available for lease-out</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th>Market Insight</th>
                  <td>
                    <ul>
                      <li>Owner will have Analytical function to grow your business such as what cars are desired in the market, what price is expected for particular type of a car etc.</li>
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th>Minimize your risks</th>
                  <td>
                    <ul>
                      <li>Having record of all the conversations btw the parties</li>
                      <li>Providing a proof of the condition of the car at the time of check-in and as well as check-out</li>
                      <li>Communication history kept for your records</li>
                      <li>See drivers' ratings and reviews – work only with good ones</li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </article>
        </div>
      </section>
    </>
  );
};

export default Product;

