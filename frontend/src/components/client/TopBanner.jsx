import React from 'react';
import { Link } from 'react-router-dom';

function TopBanner() {
  return (
    <div className="bg-gradient-to-r from-teal-800 to-sky-900 text-white py-2 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm">
        <i className="fas fa-bullhorn mr-2"></i>
        Stay updated with the latest campus events and activities!
        <Link to="/client/events?filter=upcoming" className="underline hover:text-teal-200 ml-2">
          Check upcoming events
        </Link>
      </div>
    </div>
  );
}

export default TopBanner;
