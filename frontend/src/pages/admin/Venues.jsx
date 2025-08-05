import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../api/axios';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  UsersIcon,
  TagIcon,
  PencilIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';

const Venues = () => {
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // 'active', 'inactive', or '' for all
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const venueTypes = [
    'auditorium',
    'classroom',
    'conference_hall',
    'seminar_hall',
    'laboratory',
    'sports_ground',
    'library_hall',
    'cafeteria',
    'outdoor_space',
    'multipurpose_hall',
    'other'
  ];

  const commonFacilities = [
    'projector',
    'sound_system',
    'microphone',
    'air_conditioning',
    'wifi',
    'whiteboard',
    'smart_board',
    'stage',
    'seating_arrangement',
    'parking',
    'accessibility_features',
    'catering_facility'
  ];

  const [newVenue, setNewVenue] = useState({
    name: '',
    location: '',
    description: '',
    capacity: '',
    venue_type: '',
    facilities: []
  });

  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    filterVenues();
  }, [venues, searchTerm, selectedType, selectedStatus]);

  const fetchVenues = async () => {
    try {
      const response = await adminAPI.getAllVenues(); // Changed to getAllVenues to include soft-deleted venues
      console.log('API Response:', response); // Debug log
      
      // The API returns { success: true, data: [venues], message: "..." }
      // So we need to access response.data.data, not just response.data
      const venuesData = response.data?.data || response.data || [];
      console.log('Venues data:', venuesData); // Debug log
      setVenues(Array.isArray(venuesData) ? venuesData : []);
    } catch (error) {
      console.error('Error fetching venues:', error);
      setError('Failed to load venues');
      setVenues([]); // Ensure venues is always an array
    } finally {
      setLoading(false);
    }
  };

  const filterVenues = () => {
    // Ensure venues is always an array
    const venuesArray = Array.isArray(venues) ? venues : [];
    let filtered = venuesArray;

    if (searchTerm) {
      filtered = filtered.filter(venue =>
        venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (venue.description && venue.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedType) {
      filtered = filtered.filter(venue => venue.venue_type === selectedType);
    }

    if (selectedStatus) {
      if (selectedStatus === 'active') {
        filtered = filtered.filter(venue => venue.is_active === true);
      } else if (selectedStatus === 'inactive') {
        filtered = filtered.filter(venue => venue.is_active === false);
      }
    }

    setFilteredVenues(filtered);
  };

  const handleCreateVenue = async (e) => {
    e.preventDefault();
    
    try {
      const venueData = {
        ...newVenue,
        capacity: newVenue.capacity ? parseInt(newVenue.capacity) : null
      };

      const response = await adminAPI.createVenue(venueData);
      
      if (response.data.success) {
        setSuccess('Venue created successfully!');
        setTimeout(() => setSuccess(''), 3000);
        setShowCreateModal(false);
        setNewVenue({
          name: '',
          location: '',
          description: '',
          capacity: '',
          venue_type: '',
          facilities: []
        });
        fetchVenues();
      } else {
        setError(response.data.message || 'Failed to create venue');
      }
    } catch (error) {
      console.error('Error creating venue:', error);
      setError(error.response?.data?.detail || 'Failed to create venue');
    }
  };

  const handleEditVenue = async (e) => {
    e.preventDefault();
    
    try {
      const venueData = {
        ...newVenue,
        capacity: newVenue.capacity ? parseInt(newVenue.capacity) : null
      };

      const response = await adminAPI.updateVenue(editingVenue.venue_id, venueData);
      
      if (response.data.success) {
        setSuccess('Venue updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
        setShowEditModal(false);
        setEditingVenue(null);
        setNewVenue({
          name: '',
          location: '',
          description: '',
          capacity: '',
          venue_type: '',
          facilities: []
        });
        fetchVenues();
      } else {
        setError(response.data.message || 'Failed to update venue');
      }
    } catch (error) {
      console.error('Error updating venue:', error);
      setError(error.response?.data?.detail || 'Failed to update venue');
    }
  };

  const handleDeleteVenue = async (venueId) => {
    if (!confirm('Are you sure you want to delete this venue?')) {
      return;
    }

    try {
      const response = await adminAPI.deleteVenue(venueId);
      
      if (response.data.success) {
        setSuccess('Venue deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
        fetchVenues();
      } else {
        setError(response.data.message || 'Failed to delete venue');
      }
    } catch (error) {
      console.error('Error deleting venue:', error);
      setError(error.response?.data?.detail || 'Failed to delete venue');
    }
  };

  const handleRestoreVenue = async (venueId) => {
    if (!confirm('Are you sure you want to restore this venue?')) {
      return;
    }

    try {
      const response = await adminAPI.restoreVenue(venueId);
      
      if (response.data.success) {
        setSuccess('Venue restored successfully!');
        setTimeout(() => setSuccess(''), 3000);
        fetchVenues();
      } else {
        setError(response.data.message || 'Failed to restore venue');
      }
    } catch (error) {
      console.error('Error restoring venue:', error);
      setError(error.response?.data?.detail || 'Failed to restore venue');
    }
  };

  const openEditModal = (venue) => {
    setEditingVenue(venue);
    setNewVenue({
      name: venue.name,
      location: venue.location,
      description: venue.description || '',
      capacity: venue.capacity ? venue.capacity.toString() : '',
      venue_type: venue.venue_type,
      facilities: venue.facilities || []
    });
    setError('');
    setSuccess('');
    setShowEditModal(true);
  };

  const formatVenueType = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleFacilityToggle = (facility) => {
    setNewVenue(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">University Venues</h1>
              <p className="text-gray-600 mt-1">Available venues across the university campus</p>
            </div>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setError('');
                setSuccess('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add Venue
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search venues by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="w-full sm:w-64">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {venueTypes.map(type => (
                  <option key={type} value={type}>
                    {formatVenueType(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-64">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive (Deleted)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Venues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.isArray(filteredVenues) && filteredVenues.map((venue) => (
            <div key={venue.venue_id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${venue.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50'}`}>
              {!venue.is_active && (
                <div className="bg-red-100 border-b border-red-200 px-4 py-2">
                  <span className="text-red-700 text-sm font-medium">
                    <i className="fas fa-exclamation-triangle mr-1"></i>
                    This venue has been deleted
                  </span>
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className={`text-xl font-semibold ${venue.is_active ? 'text-gray-900' : 'text-gray-500'}`}>{venue.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${venue.is_active ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                    {formatVenueType(venue.venue_type)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className={`flex items-center gap-2 ${venue.is_active ? 'text-gray-600' : 'text-gray-400'}`}>
                    <MapPinIcon className="w-4 h-4" />
                    <span className="text-sm">{venue.location}</span>
                  </div>

                  {venue.capacity && (
                    <div className={`flex items-center gap-2 ${venue.is_active ? 'text-gray-600' : 'text-gray-400'}`}>
                      <UsersIcon className="w-4 h-4" />
                      <span className="text-sm">Capacity: {venue.capacity}</span>
                    </div>
                  )}

                  {venue.description && (
                    <p className={`text-sm line-clamp-2 ${venue.is_active ? 'text-gray-600' : 'text-gray-400'}`}>{venue.description}</p>
                  )}

                  {venue.facilities && venue.facilities.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-1 mb-2">
                        <TagIcon className={`w-4 h-4 ${venue.is_active ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${venue.is_active ? 'text-gray-700' : 'text-gray-400'}`}>Facilities</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {venue.facilities.slice(0, 3).map((facility) => (
                          <span
                            key={facility}
                            className={`px-2 py-1 text-xs rounded ${venue.is_active ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}
                          >
                            {facility.replace('_', ' ')}
                          </span>
                        ))}
                        {venue.facilities.length > 3 && (
                          <span className={`px-2 py-1 text-xs rounded ${venue.is_active ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                            +{venue.facilities.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    {venue.is_active ? (
                      <>
                        <button
                          onClick={() => openEditModal(venue)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVenue(venue.venue_id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRestoreVenue(venue.venue_id)}
                        className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <i className="fas fa-undo w-4 h-4"></i>
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredVenues.length === 0 && (
          <div className="text-center py-12">
            <MapPinIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No venues found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedType || selectedStatus ? 'Try adjusting your search criteria.' : 'Add your first venue to get started.'}
            </p>
          </div>
        )}

        {/* Create Venue Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Venue</h2>
                
                <form onSubmit={handleCreateVenue} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Venue Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newVenue.name}
                        onChange={(e) => setNewVenue({...newVenue, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Venue Type *
                      </label>
                      <select
                        required
                        value={newVenue.venue_type}
                        onChange={(e) => setNewVenue({...newVenue, venue_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="">Select Type</option>
                        {venueTypes.map(type => (
                          <option key={type} value={type}>
                            {formatVenueType(type)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={newVenue.location}
                      onChange={(e) => setNewVenue({...newVenue, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Building name, floor, room number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={newVenue.capacity}
                      onChange={(e) => setNewVenue({...newVenue, capacity: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Maximum number of people"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newVenue.description}
                      onChange={(e) => setNewVenue({...newVenue, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Brief description of the venue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Available Facilities
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {commonFacilities.map((facility) => (
                        <label key={facility} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newVenue.facilities.includes(facility)}
                            onChange={() => handleFacilityToggle(facility)}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">
                            {facility.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Create Venue
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Venue Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Venue</h2>
                
                <form onSubmit={handleEditVenue} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Venue Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newVenue.name}
                        onChange={(e) => setNewVenue({...newVenue, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Venue Type *
                      </label>
                      <select
                        required
                        value={newVenue.venue_type}
                        onChange={(e) => setNewVenue({...newVenue, venue_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      >
                        <option value="">Select Type</option>
                        {venueTypes.map(type => (
                          <option key={type} value={type}>
                            {formatVenueType(type)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={newVenue.location}
                      onChange={(e) => setNewVenue({...newVenue, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Building name, floor, room number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacity
                    </label>
                    <input
                      type="number"
                      value={newVenue.capacity}
                      onChange={(e) => setNewVenue({...newVenue, capacity: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Maximum number of people"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newVenue.description}
                      onChange={(e) => setNewVenue({...newVenue, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Brief description of the venue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Available Facilities
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {commonFacilities.map((facility) => (
                        <label key={facility} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newVenue.facilities.includes(facility)}
                            onChange={() => handleFacilityToggle(facility)}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm text-gray-700">
                            {facility.replace('_', ' ')}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingVenue(null);
                        setNewVenue({
                          name: '',
                          location: '',
                          description: '',
                          capacity: '',
                          venue_type: '',
                          facilities: []
                        });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      Update Venue
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Venues;
