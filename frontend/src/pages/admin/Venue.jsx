import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI, venueApi } from '../../api/axios';

function Venue() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [statistics, setStatistics] = useState({});

  // Form state for adding new venue
  const [newVenue, setNewVenue] = useState({
    venue_name: '',
    venue_type: '',
    location: '',
    building: '',
    floor: '',
    room_number: '',
    description: '',
    capacity: '',
    has_projector: false,
    has_audio_system: false,
    has_microphone: false,
    has_whiteboard: false,
    has_air_conditioning: false,
    has_wifi: false,
    has_parking: false,
    additional_facilities: [],
    contact_name: '',
    contact_designation: 'Venue Manager',
    contact_email: '',
    contact_phone: '',
    contact_department: ''
  });

  // Form state for editing venue
  const [editVenue, setEditVenue] = useState({
    venue_name: '',
    venue_type: '',
    location: '',
    building: '',
    floor: '',
    room_number: '',
    description: '',
    capacity: '',
    has_projector: false,
    has_audio_system: false,
    has_microphone: false,
    has_whiteboard: false,
    has_air_conditioning: false,
    has_wifi: false,
    has_parking: false,
    additional_facilities: [],
    contact_name: '',
    contact_designation: '',
    contact_email: '',
    contact_phone: '',
    contact_department: ''
  });

  // Booking form state
  const [newBooking, setNewBooking] = useState({
    eventName: '',
    organizerName: '',
    organizerEmail: '',
    startTime: '',
    endTime: '',
    date: '',
    attendees: '',
    purpose: ''
  });

  // Load venues and statistics on component mount
  useEffect(() => {
    loadVenues();
    loadStatistics();
  }, []);

  const loadVenues = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const response = await venueApi.list();
      
      if (response.data) {
        setVenues(Array.isArray(response.data) ? response.data : response.data.venues || []);
      } else {
        setError('No data received from server');
      }
    } catch (err) {
      console.error('Error loading venues:', err);
      setError(`Network error loading venues: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await venueApi.getStatistics();
      if (response.data) {
        const data = response.data;
        setStatistics({
          totalVenues: data.total_venues,
          activeVenues: data.active_venues,
          totalBookings: data.total_bookings,
          utilizationRate: Math.round((data.active_bookings / Math.max(data.total_venues, 1)) * 100)
        });
      } else {
        console.error('Failed to load statistics: No data received');
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
    }
  };

  // Filter venues based on search and status
  const filteredVenues = venues.filter(venue => {
    const venueName = venue.venue_name || venue.name || '';
    const venueLocation = venue.location || '';
    const matchesSearch = venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venueLocation.toLowerCase().includes(searchTerm.toLowerCase());
    const venueStatus = venue.status || (venue.is_active ? 'active' : 'inactive');
    const matchesStatus = filterStatus === 'all' || venueStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddVenue = async (e) => {
    e.preventDefault();
    try {
      const response = await venueApi.create(newVenue);

      if (response.data) {
        await loadVenues();
        await loadStatistics();
        setShowAddModal(false);
        setNewVenue({
          venue_name: '',
          venue_type: '',
          location: '',
          building: '',
          floor: '',
          room_number: '',
          description: '',
          capacity: '',
          has_projector: false,
          has_audio_system: false,
          has_microphone: false,
          has_whiteboard: false,
          has_air_conditioning: false,
          has_wifi: false,
          has_parking: false,
          additional_facilities: [],
          contact_name: '',
          contact_designation: 'Venue Manager',
          contact_email: '',
          contact_phone: '',
          contact_department: ''
        });
        setError('');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to add venue';
      setError(errorMessage);
      console.error('Error adding venue:', err);
    }
  };

  const handleEditVenue = async (e) => {
    e.preventDefault();
    try {
      const response = await venueApi.update(selectedVenue.venue_id, editVenue);

      if (response.data) {
        await loadVenues();
        await loadStatistics();
        setShowEditModal(false);
        setSelectedVenue(null);
        setError('');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to update venue';
      setError(errorMessage);
      console.error('Error updating venue:', err);
    }
  };

  const handleDeleteVenue = async () => {
    try {
      const response = await venueApi.delete(selectedVenue.venue_id);

      if (response.data) {
        await loadVenues();
        await loadStatistics();
        setShowDeleteModal(false);
        setSelectedVenue(null);
        setError('');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete venue';
      setError(errorMessage);
      console.error('Error deleting venue:', err);
    }
  };

  const openEditModal = (venue) => {
    setSelectedVenue(venue);
    setEditVenue({
      venue_name: venue.venue_name || '',
      venue_type: venue.venue_type || '',
      location: venue.location || '',
      building: venue.building || '',
      floor: venue.floor || '',
      room_number: venue.room_number || '',
      description: venue.description || '',
      capacity: venue.facilities?.capacity || venue.capacity || '',
      has_projector: venue.facilities?.has_projector || false,
      has_audio_system: venue.facilities?.has_audio_system || false,
      has_microphone: venue.facilities?.has_microphone || false,
      has_whiteboard: venue.facilities?.has_whiteboard || false,
      has_air_conditioning: venue.facilities?.has_air_conditioning || false,
      has_wifi: venue.facilities?.has_wifi || false,
      has_parking: venue.facilities?.has_parking || false,
      additional_facilities: venue.facilities?.additional_facilities || [],
      contact_name: venue.contact_person?.name || '',
      contact_designation: venue.contact_person?.designation || '',
      contact_email: venue.contact_person?.email || '',
      contact_phone: venue.contact_person?.phone || '',
      contact_department: venue.contact_person?.department || ''
    });
    setShowEditModal(true);
  };

  const handleBookVenue = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/v1/admin/venues/${selectedVenue.venue_id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBooking),
      });

      if (response.ok) {
        await loadVenues();
        await loadStatistics();
        setShowBookingModal(false);
        setNewBooking({
          eventName: '',
          organizerName: '',
          organizerEmail: '',
          startTime: '',
          endTime: '',
          date: '',
          attendees: '',
          purpose: ''
        });
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to book venue');
      }
    } catch (err) {
      setError('Error booking venue');
      console.error('Error booking venue:', err);
    }
  };

  const toggleVenueStatus = async (venueId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const response = await venueApi.update(venueId, { status: newStatus });

      if (response.data) {
        await loadVenues();
        await loadStatistics();
      } else {
        setError('Failed to update venue status');
      }
    } catch (err) {
      setError('Error updating venue status');
      console.error('Error updating venue status:', err);
    }
  };

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
              
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
              >
                <i className="fas fa-plus"></i>
                <span>Add Venue</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-building text-teal-600 text-xl"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Venues</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalVenues || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600 text-xl"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Active Venues</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.activeVenues || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-calendar text-blue-600 text-xl"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalBookings || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="fas fa-percentage text-purple-600 text-xl"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Utilization</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.utilizationRate || 0}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Search venues by name or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="md:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Venues Grid */}
          {loading ? (
            <div className="text-center py-12">
              <i className="fas fa-spinner fa-spin text-4xl text-teal-600 mb-4"></i>
              <p className="text-gray-600">Loading venues...</p>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-lg border border-gray-100">
              <i className="fas fa-map-marker-alt text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-600 text-lg">No venues found</p>
              <p className="text-gray-500">Try adjusting your search criteria or add a new venue</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVenues.map((venue) => (
                <div key={venue.venue_id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-200">
                  {/* Venue Image */}
                  <div className="h-48 bg-gradient-to-br from-teal-400 to-cyan-500 relative">
                    {venue.images && venue.images.length > 0 ? (
                      <img 
                        src={venue.images[0]} 
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="fas fa-building text-white text-6xl"></i>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        venue.status === 'active' ? 'bg-green-100 text-green-800' :
                        venue.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {venue.status?.charAt(0).toUpperCase() + venue.status?.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Venue Details */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{venue.venue_name || venue.name}</h3>
                    <p className="text-gray-600 mb-2 flex items-center">
                      <i className="fas fa-map-marker-alt mr-2 text-teal-600"></i>
                      {venue.location}
                    </p>
                    <p className="text-gray-600 mb-4 flex items-center">
                      <i className="fas fa-users mr-2 text-teal-600"></i>
                      Capacity: {venue.facilities?.capacity || venue.capacity || 'N/A'}
                    </p>
                    
                    {/* Venue Type */}
                    {venue.venue_type && (
                      <p className="text-gray-600 mb-2 flex items-center">
                        <i className="fas fa-tag mr-2 text-teal-600"></i>
                        {venue.venue_type.charAt(0).toUpperCase() + venue.venue_type.slice(1).replace('_', ' ')}
                      </p>
                    )}
                    
                    {/* Facilities */}
                    {venue.facilities && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {venue.facilities.has_projector && (
                            <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">Projector</span>
                          )}
                          {venue.facilities.has_audio_system && (
                            <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">Audio System</span>
                          )}
                          {venue.facilities.has_wifi && (
                            <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">WiFi</span>
                          )}
                          {venue.facilities.has_air_conditioning && (
                            <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">AC</span>
                          )}
                          {venue.facilities.additional_facilities && venue.facilities.additional_facilities.length > 0 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{venue.facilities.additional_facilities.length} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Active Bookings */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        <i className="fas fa-calendar-check mr-1 text-green-600"></i>
                        {venue.bookings?.filter(b => new Date(b.date) >= new Date()).length || 0} upcoming bookings
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedVenue(venue);
                          setShowViewModal(true);
                        }}
                        className="bg-teal-100 hover:bg-teal-200 text-teal-700 px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm font-medium"
                      >
                        <i className="fas fa-eye mr-1"></i>
                        View
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedVenue(venue);
                          setShowBookingModal(true);
                        }}
                        className="bg-cyan-100 hover:bg-cyan-200 text-cyan-700 px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm font-medium"
                      >
                        <i className="fas fa-calendar-plus mr-1"></i>
                        Book
                      </button>
                      
                      <button
                        onClick={() => openEditModal(venue)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm font-medium"
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Edit
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedVenue(venue);
                          setShowDeleteModal(true);
                        }}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center text-sm font-medium"
                      >
                        <i className="fas fa-trash mr-1"></i>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Venue Modal */}
        {showAddModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Add New Venue</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleAddVenue} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name</label>
                    <input
                      type="text"
                      required
                      value={newVenue.venue_name}
                      onChange={(e) => setNewVenue({...newVenue, venue_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue Type</label>
                    <select
                      required
                      value={newVenue.venue_type}
                      onChange={(e) => setNewVenue({...newVenue, venue_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="">Select Type</option>
                      <option value="auditorium">Auditorium</option>
                      <option value="classroom">Classroom</option>
                      <option value="laboratory">Laboratory</option>
                      <option value="seminar_hall">Seminar Hall</option>
                      <option value="conference_room">Conference Room</option>
                      <option value="outdoor_ground">Outdoor Ground</option>
                      <option value="cafeteria">Cafeteria</option>
                      <option value="library_hall">Library Hall</option>
                      <option value="sports_complex">Sports Complex</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      required
                      value={newVenue.location}
                      onChange={(e) => setNewVenue({...newVenue, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
                    <input
                      type="text"
                      value={newVenue.building}
                      onChange={(e) => setNewVenue({...newVenue, building: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                    <input
                      type="text"
                      value={newVenue.floor}
                      onChange={(e) => setNewVenue({...newVenue, floor: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                    <input
                      type="text"
                      value={newVenue.room_number}
                      onChange={(e) => setNewVenue({...newVenue, room_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                    <input
                      type="number"
                      required
                      value={newVenue.capacity}
                      onChange={(e) => setNewVenue({
                        ...newVenue, 
                        capacity: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows="3"
                    value={newVenue.description}
                    onChange={(e) => setNewVenue({...newVenue, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  ></textarea>
                </div>

                {/* Facilities Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Facilities Available</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newVenue.has_projector}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          has_projector: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Projector
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newVenue.has_audio_system}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          has_audio_system: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Audio System
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newVenue.has_microphone}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          has_microphone: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Microphone
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newVenue.has_whiteboard}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          has_whiteboard: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Whiteboard
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newVenue.has_air_conditioning}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          has_air_conditioning: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Air Conditioning
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newVenue.has_wifi}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          has_wifi: e.target.checked
                        })}
                        className="mr-2"
                      />
                      WiFi
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newVenue.has_parking}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          has_parking: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Parking
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Person</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        required
                        value={newVenue.contact_name}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          contact_name: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                      <input
                        type="text"
                        required
                        value={newVenue.contact_designation}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          contact_designation: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        required
                        value={newVenue.contact_email}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          contact_email: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        required
                        value={newVenue.contact_phone}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          contact_phone: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department (Optional)</label>
                      <input
                        type="text"
                        value={newVenue.contact_department || ''}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          contact_department: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700"
                  >
                    Add Venue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Venue Modal */}
        {showViewModal && selectedVenue && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedVenue.venue_name || selectedVenue.name}</h2>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Location:</span> {selectedVenue.location}</p>
                      {selectedVenue.building && (
                        <p><span className="font-medium">Building:</span> {selectedVenue.building}</p>
                      )}
                      {selectedVenue.floor && (
                        <p><span className="font-medium">Floor:</span> {selectedVenue.floor}</p>
                      )}
                      {selectedVenue.room_number && (
                        <p><span className="font-medium">Room:</span> {selectedVenue.room_number}</p>
                      )}
                      <p><span className="font-medium">Capacity:</span> {selectedVenue.facilities?.capacity || selectedVenue.capacity}</p>
                      <p><span className="font-medium">Type:</span> {selectedVenue.venue_type?.replace('_', ' ') || 'N/A'}</p>
                      <p><span className="font-medium">Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                          selectedVenue.status === 'active' || selectedVenue.is_active ? 'bg-green-100 text-green-800' :
                          selectedVenue.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedVenue.status?.charAt(0).toUpperCase() + selectedVenue.status?.slice(1) || 
                           (selectedVenue.is_active ? 'Active' : 'Inactive')}
                        </span>
                      </p>
                      {selectedVenue.description && (
                        <p><span className="font-medium">Description:</span> {selectedVenue.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Person</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {selectedVenue.contact_person?.name || selectedVenue.contactPersonName}</p>
                      <p><span className="font-medium">Email:</span> {selectedVenue.contact_person?.email || selectedVenue.contactPersonEmail}</p>
                      <p><span className="font-medium">Phone:</span> {selectedVenue.contact_person?.phone || selectedVenue.contactPersonPhone}</p>
                    </div>
                  </div>
                </div>

                {/* Facilities */}
                {selectedVenue.facilities && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Facilities</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedVenue.facilities.has_projector && (
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">Projector</span>
                      )}
                      {selectedVenue.facilities.has_audio_system && (
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">Audio System</span>
                      )}
                      {selectedVenue.facilities.has_microphone && (
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">Microphone</span>
                      )}
                      {selectedVenue.facilities.has_whiteboard && (
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">Whiteboard</span>
                      )}
                      {selectedVenue.facilities.has_air_conditioning && (
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">Air Conditioning</span>
                      )}
                      {selectedVenue.facilities.has_wifi && (
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">WiFi</span>
                      )}
                      {selectedVenue.facilities.has_parking && (
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">Parking</span>
                      )}
                      {selectedVenue.facilities.additional_facilities && selectedVenue.facilities.additional_facilities.map((facility, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {facility}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bookings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Recent Bookings 
                    <span className="ml-2 text-sm text-gray-600">
                      ({selectedVenue.bookings?.length || 0} total)
                    </span>
                  </h3>
                  
                  {selectedVenue.bookings && selectedVenue.bookings.length > 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <div className="space-y-3">
                        {selectedVenue.bookings.slice(0, 5).map((booking, index) => (
                          <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{booking.eventName}</p>
                                <p className="text-sm text-gray-600">Organizer: {booking.organizerName}</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(booking.date).toLocaleDateString()} | {booking.startTime} - {booking.endTime}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                new Date(booking.date) > new Date() ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {new Date(booking.date) > new Date() ? 'Upcoming' : 'Completed'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {selectedVenue.bookings.length > 5 && (
                          <p className="text-center text-sm text-gray-600">
                            ... and {selectedVenue.bookings.length - 5} more bookings
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600 bg-gray-50 rounded-lg p-4">No bookings found for this venue.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && selectedVenue && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Book {selectedVenue.venue_name || selectedVenue.name}</h2>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleBookVenue} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Name</label>
                    <input
                      type="text"
                      required
                      value={newBooking.eventName}
                      onChange={(e) => setNewBooking({...newBooking, eventName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={newBooking.date}
                      onChange={(e) => setNewBooking({...newBooking, date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      required
                      value={newBooking.startTime}
                      onChange={(e) => setNewBooking({...newBooking, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      required
                      value={newBooking.endTime}
                      onChange={(e) => setNewBooking({...newBooking, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organizer Name</label>
                    <input
                      type="text"
                      required
                      value={newBooking.organizerName}
                      onChange={(e) => setNewBooking({...newBooking, organizerName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Organizer Email</label>
                    <input
                      type="email"
                      required
                      value={newBooking.organizerEmail}
                      onChange={(e) => setNewBooking({...newBooking, organizerEmail: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Attendees</label>
                  <input
                    type="number"
                    required
                    max={selectedVenue.facilities?.capacity || selectedVenue.capacity}
                    value={newBooking.attendees}
                    onChange={(e) => setNewBooking({...newBooking, attendees: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-600 mt-1">Maximum capacity: {selectedVenue.facilities?.capacity || selectedVenue.capacity}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                  <textarea
                    rows="3"
                    value={newBooking.purpose}
                    onChange={(e) => setNewBooking({...newBooking, purpose: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Brief description of the event purpose..."
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBookingModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700"
                  >
                    Book Venue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Venue Modal */}
        {showEditModal && selectedVenue && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Edit Venue</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleEditVenue} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name</label>
                    <input
                      type="text"
                      required
                      value={editVenue.venue_name}
                      onChange={(e) => setEditVenue({...editVenue, venue_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue Type</label>
                    <select
                      required
                      value={editVenue.venue_type}
                      onChange={(e) => setEditVenue({...editVenue, venue_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      <option value="">Select Type</option>
                      <option value="auditorium">Auditorium</option>
                      <option value="classroom">Classroom</option>
                      <option value="laboratory">Laboratory</option>
                      <option value="seminar_hall">Seminar Hall</option>
                      <option value="conference_room">Conference Room</option>
                      <option value="outdoor_ground">Outdoor Ground</option>
                      <option value="cafeteria">Cafeteria</option>
                      <option value="library_hall">Library Hall</option>
                      <option value="sports_complex">Sports Complex</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      required
                      value={editVenue.location}
                      onChange={(e) => setEditVenue({...editVenue, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
                    <input
                      type="text"
                      value={editVenue.building}
                      onChange={(e) => setEditVenue({...editVenue, building: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                    <input
                      type="text"
                      value={editVenue.floor}
                      onChange={(e) => setEditVenue({...editVenue, floor: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Room Number</label>
                    <input
                      type="text"
                      value={editVenue.room_number}
                      onChange={(e) => setEditVenue({...editVenue, room_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                    <input
                      type="number"
                      required
                      value={editVenue.capacity}
                      onChange={(e) => setEditVenue({
                        ...editVenue, 
                        capacity: parseInt(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows="3"
                    value={editVenue.description}
                    onChange={(e) => setEditVenue({...editVenue, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  ></textarea>
                </div>

                {/* Facilities Section */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Facilities Available</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editVenue.has_projector}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          has_projector: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Projector
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editVenue.has_audio_system}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          has_audio_system: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Audio System
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editVenue.has_microphone}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          has_microphone: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Microphone
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editVenue.has_whiteboard}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          has_whiteboard: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Whiteboard
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editVenue.has_air_conditioning}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          has_air_conditioning: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Air Conditioning
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editVenue.has_wifi}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          has_wifi: e.target.checked
                        })}
                        className="mr-2"
                      />
                      WiFi
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editVenue.has_parking}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          has_parking: e.target.checked
                        })}
                        className="mr-2"
                      />
                      Parking
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Person</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                      <input
                        type="text"
                        required
                        value={editVenue.contact_name}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          contact_name: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                      <input
                        type="text"
                        required
                        value={editVenue.contact_designation}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          contact_designation: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        required
                        value={editVenue.contact_email}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          contact_email: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        required
                        value={editVenue.contact_phone}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          contact_phone: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Department (Optional)</label>
                      <input
                        type="text"
                        value={editVenue.contact_department || ''}
                        onChange={(e) => setEditVenue({
                          ...editVenue,
                          contact_department: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700"
                  >
                    Update Venue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedVenue && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                  </div>
                  <h3 className="ml-4 text-lg font-semibold text-gray-900">Delete Venue</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete "<span className="font-medium">{selectedVenue.venue_name || selectedVenue.name}</span>"? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteVenue}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Venue;
