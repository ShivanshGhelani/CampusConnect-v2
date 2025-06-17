import React from 'react';
import { useParams } from 'react-router-dom';
import ClientLayout from '../../components/client/Layout';

function EventDetail() {
  const { eventId } = useParams();

  return (
    <ClientLayout>
      <div className="container-custom">
        <div className="card">
          <div className="card-header">
            <h1 className="text-2xl font-bold">Event Details</h1>
          </div>
          <div className="card-content">
            <p>Event ID: {eventId}</p>
            <p className="text-gray-600 mt-4">
              This page will show detailed event information, registration form, 
              and event-specific actions.
            </p>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export default EventDetail;
