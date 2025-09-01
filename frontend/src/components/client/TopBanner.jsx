import React from 'react';
import { Link } from 'react-router-dom';

function TopBanner() {
  return (
    <div className="bg-gradient-to-r from-teal-800 to-sky-900 text-white py-2 fixed top-0 left-0 right-0 z-50 h-10">
      <div className="max-w-7xl mx-auto px-4 text-center text-xs sm:text-sm flex items-center justify-center h-full">
        <i className="fas fa-bullhorn mr-1 sm:mr-2 hidden sm:inline"></i>
        <span className="truncate">Stay updated with the latest campus events!</span>
        <Link to="/client/events?filter=upcoming" className="underline hover:text-teal-200 ml-1 sm:ml-2 hidden sm:inline whitespace-nowrap">
          Check events
        </Link>
      </div>
    </div>
  );
}

export default TopBanner;
