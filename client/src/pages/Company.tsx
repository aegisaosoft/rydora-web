import React from 'react';
import { useQuery } from '@tanstack/react-query';
import './Company.css';

const Company: React.FC = () => {
  // Example of how to use TanStack React Query for future company data
  // This could be used to fetch company information, team members, or other dynamic content
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useQuery({
    queryKey: ['company-info'],
    queryFn: async () => {
      // This is a placeholder for future API calls
      // For now, return static data since there's no company API
      return { 
        data: {
          name: 'Rydora',
          description: 'Learn more about Rydora and our mission to simplify toll management.',
          mission: 'Simplifying toll management for fleets and drivers'
        }
      };
    },
    enabled: false // Disabled for now since there's no company API
  });

  return (
    <>
      {/* Fixed side image like Product page */}
      <div id="fixed-side-image" className="RYDORA-fixed-image">
        <img src="/images/_img101.jpg" alt="Company visual" />
      </div>

      {/* Center text matching Product page layout */}
      <section className="company-center with-side">
        <div className="container narrow">
          <article>
            <div className="content-div">
              <h1>RYDORA Toll – Built for Car Rental Companies</h1>

              <p className="quote">"We take the toll problems off your shoulders — so you can focus on running your rental business."</p>

              <p>As a rental operator, tolls are one of the biggest hidden risks you deal with:</p>
              <ul>
                <li>Toll bills showing up weeks after the car is returned</li>
                <li>Drivers refusing to pay</li>
                <li>Hours wasted tracking charges, disputing fees, or updating billing info</li>
                <li>Surprise penalties, chargebacks, and transponder misuse</li>
              </ul>
              <p>RYDORA Toll was built to eliminate all of that.</p>

              <h2>What is RYDORA Toll?</h2>
              <p>RYDORA Toll is a complete toll management system designed for car rental companies. We handle:</p>
              <ul>
                <li>Tracking every toll by driver and vehicle</li>
                <li>Charging the renter directly for each toll (plus fees, if applicable)</li>
                <li>Sending real-time notifications and receipts to the driver</li>
                <li>Providing toll history and payment logs to you, instantly</li>
                <li>Protecting your company from loss — <strong>you'll never get stuck with unpaid tolls again</strong></li>
              </ul>

              <h2>Who Pays? The Driver Does.</h2>
              <p>When you use RYDORA Toll:</p>
              <ul>
                <li>You add the renter's name, contact info, and card when assigning the vehicle</li>
                <li>We take it from there — we bill them directly for every toll</li>
                <li>If they don't pay, you'll be notified immediately, and we give you the option to recover or reassign</li>
              </ul>
              <p><strong>You're always in control — without doing the work.</strong></p>

              <h2>Why Rental Companies Love RYDORA Toll</h2>
              <ul>
                <li>No more toll surprises weeks after the rental</li>
                <li>No more chasing drivers or dealing with unpaid balances</li>
                <li>No charge to you as the company — <strong>we charge the driver directly</strong></li>
                <li>100% visibility into tolls, driver confirmations, and payments</li>
                <li>Legally protected terms that make sure the renter is on the hook</li>
              </ul>

              <h2>How It Works (in 30 seconds)</h2>
              <ol>
                <li>Add your vehicle to RYDORA Toll</li>
                <li>When the renter picks up the car, enter their name, phone, and card info</li>
                <li>We handle tolls from that point on</li>
                <li>You see the record, but you're not stuck collecting</li>
                <li>We notify you and the renter if a toll is unpaid</li>
              </ol>
              <p><strong>It's automated, trackable, and driver-funded.</strong></p>

              <h2>The Bottom Line</h2>
              <p>You rent cars. We handle the tolls.</p>
              <p>No charge to you. No surprise fees.</p>
              <p>No driver payment? You're notified, and we'll help recover.</p>

              <p>Let's take toll management off your plate — and put it where it belongs.</p>

              <p className="final-statement">That's RYDORA Toll.</p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
};

export default Company;

