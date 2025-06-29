import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';

function Venue() {
  return (
    <AdminLayout pageTitle="Venue Management">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="fas fa-map-marker-alt text-white text-2xl"></i>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    Venue Management
                  </h1>
                  <p className="text-gray-600 mt-1 text-lg">Manage event venues, locations and facilities</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Under Development Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <i className="fas fa-hammer mr-3"></i>
                Under Development
              </h2>
            </div>
            
            <div className="p-12">
              <div className="text-center">
                {/* Construction Icon */}
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full">
                    <i className="fas fa-tools text-6xl text-teal-600"></i>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Venue Management System
                </h3>

                {/* Description */}
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                  We're building a comprehensive venue management system that will allow you to manage event locations, 
                  facilities, capacity, and booking schedules efficiently.
                </p>

                {/* Features List */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200">
                    <div className="text-teal-600 mb-3">
                      <i className="fas fa-building text-3xl"></i>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Venue Registry</h4>
                    <p className="text-gray-600 text-sm">
                      Complete database of all available venues and their details
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200">
                    <div className="text-teal-600 mb-3">
                      <i className="fas fa-calendar-check text-3xl"></i>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Booking System</h4>
                    <p className="text-gray-600 text-sm">
                      Advanced scheduling and conflict resolution
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200">
                    <div className="text-teal-600 mb-3">
                      <i className="fas fa-users text-3xl"></i>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Capacity Management</h4>
                    <p className="text-gray-600 text-sm">
                      Track seating arrangements and attendance limits
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200">
                    <div className="text-teal-600 mb-3">
                      <i className="fas fa-cogs text-3xl"></i>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Facilities Tracking</h4>
                    <p className="text-gray-600 text-sm">
                      Monitor available equipment and amenities
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200">
                    <div className="text-teal-600 mb-3">
                      <i className="fas fa-map text-3xl"></i>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Location Mapping</h4>
                    <p className="text-gray-600 text-sm">
                      Interactive maps and navigation assistance
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200">
                    <div className="text-teal-600 mb-3">
                      <i className="fas fa-chart-line text-3xl"></i>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Usage Analytics</h4>
                    <p className="text-gray-600 text-sm">
                      Venue utilization reports and optimization insights
                    </p>
                  </div>
                </div>

                {/* Additional Features */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <i className="fas fa-list-check mr-2 text-teal-600"></i>
                      Venue Features
                    </h4>
                    <ul className="text-gray-600 text-sm space-y-2 text-left">
                      <li>• Audio/Visual equipment tracking</li>
                      <li>• Accessibility features documentation</li>
                      <li>• Wi-Fi and power outlet availability</li>
                      <li>• Parking information and capacity</li>
                      <li>• Climate control and lighting specs</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <i className="fas fa-shield-alt mr-2 text-teal-600"></i>
                      Safety & Compliance
                    </h4>
                    <ul className="text-gray-600 text-sm space-y-2 text-left">
                      <li>• Fire safety and emergency protocols</li>
                      <li>• Maximum occupancy enforcement</li>
                      <li>• Health and safety compliance tracking</li>
                      <li>• Insurance and liability management</li>
                      <li>• Regular maintenance scheduling</li>
                    </ul>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-gradient-to-r from-teal-100 to-cyan-100 rounded-xl p-6 border border-teal-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center justify-center">
                    <i className="fas fa-calendar-alt mr-2 text-teal-600"></i>
                    Expected Release
                  </h4>
                  <p className="text-gray-700">
                    The Venue Management System is currently in development and will be available in the next major update.
                    This system will integrate seamlessly with the existing event management workflow.
                  </p>
                </div>

                {/* Contact Info */}
                <div className="mt-8 text-center">
                  <p className="text-gray-600">
                    For immediate venue booking needs, please contact the facility management team directly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Venue;
