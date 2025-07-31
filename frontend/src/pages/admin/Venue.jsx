import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, venueApi } from '../../api/axios';
import VenueAdminDashboard from '../../components/admin/venues/VenueAdminDashboard';

function Venue() {
  const { user } = useAuth();
  
  // If user is a venue admin, show the specialized dashboard
  if (user && user.role === 'venue_admin') {
    return (
      <AdminLayout pageTitle="Venue Management Dashboard">
        <VenueAdminDashboard />
      </AdminLayout>
    );
  }

  // Otherwise, show the regular venue management interface for other admin roles
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

  // Form state for booking
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

  useEffect(() => {
    loadVenues();
    loadStatistics();
  }, []);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const response = await venueApi.list();
      
      console.log('Venues API response:', response);
      
      if (response.data) {
        // Handle both array response and object with venues property
        const venueArray = Array.isArray(response.data) ? response.data : response.data.venues || [];
        setVenues(venueArray);
        console.log(`Loaded ${venueArray.length} venues`);
      } else {
        console.error('No data received from venues API');
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
      <div className="min-h-screen bg-gray-50">
        {/* Modern Header - No Gradients */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Venue Management</h1>
                <p className="mt-2 text-gray-600">Manage campus venues, facilities, and bookings</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
              >
                <i className="fas fa-plus mr-2"></i>
                Add New Venue
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <i className="fas fa-exclamation-circle text-red-500 mr-3"></i>
                  <span className="text-red-700">{error}</span>
                  <button
                    onClick={() => setError('')}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>
            )}

            {/* Modern Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-building text-blue-600 text-xl"></i>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Venues</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalVenues || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-check-circle text-green-600 text-xl"></i>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Venues</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.activeVenues || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-calendar-check text-orange-600 text-xl"></i>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalBookings || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-chart-line text-purple-600 text-xl"></i>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.utilizationRate || 0}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fas fa-search text-gray-400"></i>
                    </div>
                    <input
                      type="text"
                      placeholder="Search venues by name, location, or type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    />
                  </div>
                </div>
                
                <div className="lg:w-48">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Venues Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 text-lg">Loading venues...</p>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-map-marker-alt text-2xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No venues found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your search criteria or add a new venue</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Your First Venue
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredVenues.map((venue) => (
                <div key={venue.venue_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  {/* Modern Venue Header - No Gradient */}
                  <div className="h-48 bg-slate-100 relative overflow-hidden">
                    {venue.images && venue.images.length > 0 ? (
                      <img 
                        src={venue.images[0]} 
                        alt={venue.venue_name || venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <div className="text-center">
                          <i className={`text-5xl text-slate-400 mb-2 ${
                            venue.venue_type === 'auditorium' ? 'fas fa-building' :
                            venue.venue_type === 'laboratory' ? 'fas fa-flask' :
                            venue.venue_type === 'conference_room' ? 'fas fa-users' :
                            venue.venue_type === 'outdoor' ? 'fas fa-tree' :
                            venue.venue_type === 'sports' ? 'fas fa-dumbbell' :
                            'fas fa-door-open'
                          }`}></i>
                          <p className="text-slate-500 text-sm font-medium">{venue.venue_type?.replace('_', ' ').toUpperCase()}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                        (venue.status === 'active' || venue.is_active) 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : venue.status === 'maintenance' 
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {(venue.status === 'active' || venue.is_active) ? 'Active' : 
                         venue.status === 'maintenance' ? 'Maintenance' : 'Inactive'}
                      </span>
                    </div>

                    {/* Capacity Badge */}
                    <div className="absolute top-4 left-4">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm border border-white/20">
                        <span className="text-sm font-semibold text-gray-700">
                          <i className="fas fa-users mr-1 text-gray-500"></i>
                          {venue.capacity || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Venue Information */}
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors duration-200">
                        {venue.venue_name || venue.name}
                      </h3>
                      <div className="flex items-center text-gray-600 mb-2">
                        <i className="fas fa-map-marker-alt mr-2 text-gray-400"></i>
                        <span className="text-sm">{venue.location}</span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {venue.description || 'No description available'}
                      </p>
                    </div>

                    {/* Facilities */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {venue.facilities?.has_projector && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            <i className="fas fa-video mr-1"></i> Projector
                          </span>
                        )}
                        {venue.facilities?.has_microphone && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            <i className="fas fa-microphone mr-1"></i> Audio
                          </span>
                        )}
                        {venue.facilities?.has_ac && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
                            <i className="fas fa-snowflake mr-1"></i> AC
                          </span>
                        )}
                        {venue.facilities?.has_wifi && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <i className="fas fa-wifi mr-1"></i> WiFi
                          </span>
                        )}
                        {venue.facilities?.additional_facilities && venue.facilities.additional_facilities.length > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                            +{venue.facilities.additional_facilities.length} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact Info */}
                    {venue.contact_person && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center text-sm text-gray-600">
                          <i className="fas fa-user-circle mr-2 text-gray-400"></i>
                          <span className="font-medium">{venue.contact_person.name}</span>
                        </div>
                        {venue.contact_person.email && (
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <i className="fas fa-envelope mr-2 text-gray-400"></i>
                            <span>{venue.contact_person.email}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          setSelectedVenue(venue);
                          setShowViewModal(true);
                        }}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                      >
                        <i className="fas fa-eye mr-2"></i>
                        View Details
                      </button>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(venue)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                          title="Edit Venue"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedVenue(venue);
                            setShowDeleteModal(true);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                          title="Delete Venue"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Venue Modal */}
        {showAddModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add New Venue</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              <form onSubmit={handleAddVenue} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name</label>
                    <input
                      type="text"
                      required
                      value={newVenue.venue_name}
                      onChange={(e) => setNewVenue({...newVenue, venue_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue Type</label>
                    <select
                      required
                      value={newVenue.venue_type}
                      onChange={(e) => setNewVenue({...newVenue, venue_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Building</label>
                    <input
                      type="text"
                      value={newVenue.building}
                      onChange={(e) => setNewVenue({...newVenue, building: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
                    <input
                      type="text"
                      value={newVenue.floor}
                      onChange={(e) => setNewVenue({...newVenue, floor: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows="3"
                    value={newVenue.description}
                    onChange={(e) => setNewVenue({...newVenue, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                      <input
                        type="text"
                        value={newVenue.contact_designation}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          contact_designation: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={newVenue.contact_phone}
                        onChange={(e) => setNewVenue({
                          ...newVenue,
                          contact_phone: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Venue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedVenue && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Venue Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Venue Name</label>
                    <p className="text-gray-900 font-medium">{selectedVenue.venue_name || selectedVenue.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Type</label>
                    <p className="text-gray-900">{selectedVenue.venue_type?.replace('_', ' ').toUpperCase()}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Location</label>
                  <p className="text-gray-900">{selectedVenue.location}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Capacity</label>
                    <p className="text-gray-900">{selectedVenue.capacity || 'N/A'} people</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      (selectedVenue.status === 'active' || selectedVenue.is_active) 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(selectedVenue.status === 'active' || selectedVenue.is_active) ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                {selectedVenue.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-900">{selectedVenue.description}</p>
                  </div>
                )}
                
                {selectedVenue.facilities && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Facilities</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedVenue.facilities.has_projector && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Projector</span>
                      )}
                      {selectedVenue.facilities.has_microphone && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Microphone</span>
                      )}
                      {selectedVenue.facilities.has_ac && (
                        <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded-full">AC</span>
                      )}
                      {selectedVenue.facilities.has_wifi && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">WiFi</span>
                      )}
                      {selectedVenue.facilities.additional_facilities?.map((facility, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          {facility}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedVenue.contact_person && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Contact Person</label>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="font-medium text-gray-900">{selectedVenue.contact_person.name}</p>
                      {selectedVenue.contact_person.email && (
                        <p className="text-gray-600">{selectedVenue.contact_person.email}</p>
                      )}
                      {selectedVenue.contact_person.phone && (
                        <p className="text-gray-600">{selectedVenue.contact_person.phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal - Similar to Add Modal but with editVenue state */}
        {showEditModal && selectedVenue && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Edit Venue</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              <form onSubmit={handleEditVenue} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name</label>
                    <input
                      type="text"
                      required
                      value={editVenue.venue_name}
                      onChange={(e) => setEditVenue({...editVenue, venue_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Venue Type</label>
                    <select
                      required
                      value={editVenue.venue_type}
                      onChange={(e) => setEditVenue({...editVenue, venue_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      required
                      value={editVenue.location}
                      onChange={(e) => setEditVenue({...editVenue, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows="3"
                    value={editVenue.description}
                    onChange={(e) => setEditVenue({...editVenue, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  ></textarea>
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
