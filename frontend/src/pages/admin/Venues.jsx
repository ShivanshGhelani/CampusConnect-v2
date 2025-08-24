import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../api/admin';
import { Dropdown, SearchBox } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  UsersIcon,
  TagIcon,
  PencilIcon,
  TrashIcon,
  Squares2X2Icon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

const Venues = () => {
  const [venues, setVenues] = useState([]);
  const [filteredVenues, setFilteredVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(''); // 'active', 'inactive', or '' for all
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
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

  const handlePermanentDeleteVenue = async (venueId) => {
    if (!confirm('⚠️ PERMANENT DELETE: This action cannot be undone! Are you absolutely sure you want to permanently delete this venue?')) {
      return;
    }

    // Double confirmation for permanent delete
    if (!confirm('This will permanently remove the venue from the database. Type "DELETE" and click OK to confirm.')) {
      return;
    }

    try {
      const response = await adminAPI.deleteVenuePermanently(venueId);
      
      if (response.data.success) {
        setSuccess('Venue permanently deleted!');
        setTimeout(() => setSuccess(''), 3000);
        fetchVenues();
      } else {
        setError(response.data.message || 'Failed to permanently delete venue');
      }
    } catch (error) {
      console.error('Error permanently deleting venue:', error);
      setError(error.response?.data?.detail || 'Failed to permanently delete venue');
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
      <AdminLayout pageTitle="Venues Management">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Venues Management">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-2xl shadow-lg mb-8">
          <div className="px-8 py-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-white">
              <h1 className="text-4xl font-bold mb-2">University Venues</h1>
              <p className="text-teal-100 text-lg">Manage and organize campus facilities</p>
              <div className="flex items-center gap-6 mt-4 text-teal-100">
                <div className="flex items-center gap-2">
                  <i className="fas fa-building text-lg"></i>
                  <span className="font-medium">{Array.isArray(filteredVenues) ? filteredVenues.filter(v => v.is_active).length : 0} Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-archive text-lg"></i>
                  <span className="font-medium">{Array.isArray(filteredVenues) ? filteredVenues.filter(v => !v.is_active).length : 0} Inactive</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setError('');
                setSuccess('');
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-teal-600 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
            >
              <PlusIcon className="w-5 h-5" />
              Add New Venue
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <i className="fas fa-exclamation-circle text-red-500"></i>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}
        {success && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 text-green-700 px-6 py-4 rounded-lg mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <i className="fas fa-check-circle text-green-500"></i>
              <span className="font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Enhanced Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <i className="fas fa-filter text-blue-600"></i>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Filters & Search</h2>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'cards' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Squares2X2Icon className="w-4 h-4" />
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'table' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TableCellsIcon className="w-4 h-4" />
                Table
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Search Input */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Venues</label>
              <SearchBox
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(value) => setSearchTerm(value)}
                showFilters={false}
                size="md"
              />
            </div>

            {/* Type Filter */}
            <div>
              <Dropdown
                label="Venue Type"
                placeholder="All Types"
                value={selectedType}
                onChange={setSelectedType}
                clearable
                options={venueTypes.map(type => ({ 
                  label: formatVenueType(type), 
                  value: type,
                  icon: <i className="fas fa-tag text-xs"></i>
                }))}
                icon={<i className="fas fa-building text-xs"></i>}
                size="md"
              />
            </div>

            {/* Status Filter */}
            <div>
              <Dropdown
                label="Status"
                placeholder="All Status"
                value={selectedStatus}
                onChange={setSelectedStatus}
                clearable
                options={[
                  { label: '✅ Active', value: 'active', icon: <i className="fas fa-check-circle text-green-500 text-xs"></i> },
                  { label: '❌ Inactive (Deleted)', value: 'inactive', icon: <i className="fas fa-times-circle text-red-500 text-xs"></i> }
                ]}
                icon={<i className="fas fa-toggle-on text-xs"></i>}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* Venues Display */}
        {viewMode === 'cards' ? (
          /* Cards View */
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.isArray(filteredVenues) && filteredVenues.map((venue) => (
              <div key={venue.venue_id} className={`group relative bg-white rounded-xl shadow-sm border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col ${venue.is_active ? 'border-gray-200' : 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50'}`}>
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${
                    venue.is_active 
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                      : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {venue.is_active ? (
                      <>
                        <i className="fas fa-check-circle mr-1"></i>
                        Active
                      </>
                    ) : (
                      <>
                        <i className="fas fa-times-circle mr-1"></i>
                        Inactive
                      </>
                    )}
                  </span>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  {/* Header */}
                  <div className="mb-4 pr-20">
                    <h3 className={`text-xl font-bold mb-2 ${venue.is_active ? 'text-gray-900' : 'text-gray-600'} group-hover:text-blue-600 transition-colors`}>
                      {venue.name}
                    </h3>
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-lg ${
                      venue.is_active 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {formatVenueType(venue.venue_type)}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 mb-6 flex-grow">
                    <div className={`flex items-center gap-3 ${venue.is_active ? 'text-gray-600' : 'text-gray-500'}`}>
                      <div className={`p-2 rounded-lg ${venue.is_active ? 'bg-gray-100' : 'bg-gray-50'}`}>
                        <MapPinIcon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium">{venue.location}</span>
                    </div>

                    {venue.capacity && (
                      <div className={`flex items-center gap-3 ${venue.is_active ? 'text-gray-600' : 'text-gray-500'}`}>
                        <div className={`p-2 rounded-lg ${venue.is_active ? 'bg-gray-100' : 'bg-gray-50'}`}>
                          <UsersIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">Capacity: {venue.capacity}</span>
                      </div>
                    )}

                    {venue.description && (
                      <div className={`p-3 rounded-lg ${venue.is_active ? 'bg-gray-50' : 'bg-gray-25'} border-l-4 ${venue.is_active ? 'border-blue-400' : 'border-gray-300'}`}>
                        <p className={`text-sm ${venue.is_active ? 'text-gray-700' : 'text-gray-500'} line-clamp-2`}>
                          {venue.description}
                        </p>
                      </div>
                    )}

                    {/* Facilities - Fixed Height */}
                    {venue.facilities && venue.facilities.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <TagIcon className={`w-4 h-4 ${venue.is_active ? 'text-gray-500' : 'text-gray-400'}`} />
                          <span className={`text-sm font-semibold ${venue.is_active ? 'text-gray-700' : 'text-gray-500'}`}>
                            Facilities
                          </span>
                        </div>
                        <div className="h-16 overflow-hidden">
                          <div className="flex flex-wrap gap-2">
                            {venue.facilities.slice(0, 6).map((facility) => (
                              <span
                                key={facility}
                                className={`px-2 py-1 text-xs rounded-md font-medium ${
                                  venue.is_active 
                                    ? 'bg-indigo-100 text-indigo-700' 
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {facility.replace('_', ' ')}
                              </span>
                            ))}
                            {venue.facilities.length > 6 && (
                              <span className={`px-2 py-1 text-xs rounded-md font-medium ${
                                venue.is_active 
                                  ? 'bg-gray-200 text-gray-700' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                +{venue.facilities.length - 6}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons - Fixed Position */}
                  <div className="border-t border-gray-100 pt-4 mt-auto">
                    {venue.is_active ? (
                      /* Active Venue Actions */
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(venue)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-105"
                        >
                          <PencilIcon className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVenue(venue.venue_id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-105"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    ) : (
                      /* Inactive Venue Actions - Same Row */
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRestoreVenue(venue.venue_id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all duration-200 hover:scale-105 border border-emerald-200"
                        >
                          <i className="fas fa-undo-alt w-4 h-4"></i>
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDeleteVenue(venue.venue_id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 rounded-lg transition-all duration-200 hover:scale-105 border border-red-300"
                        >
                          <i className="fas fa-trash-alt w-4 h-4"></i>
                          Delete Forever
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"></div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Venue
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Type & Location
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Capacity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Facilities
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(filteredVenues) && filteredVenues.map((venue, index) => (
                    <tr key={venue.venue_id} className={`transition-colors duration-200 hover:bg-gray-50 ${!venue.is_active ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className={`text-sm font-bold ${venue.is_active ? 'text-gray-900' : 'text-gray-600'}`}>
                              {venue.name}
                            </div>
                            {venue.description && (
                              <div className={`text-sm ${venue.is_active ? 'text-gray-500' : 'text-gray-400'} max-w-xs truncate`}>
                                {venue.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-md ${
                            venue.is_active 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {formatVenueType(venue.venue_type)}
                          </span>
                        </div>
                        <div className={`text-sm ${venue.is_active ? 'text-gray-500' : 'text-gray-400'} flex items-center gap-1 mt-1`}>
                          <MapPinIcon className="w-3 h-3" />
                          {venue.location}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${venue.is_active ? 'text-gray-900' : 'text-gray-600'} flex items-center gap-1`}>
                          <UsersIcon className="w-4 h-4 text-gray-400" />
                          {venue.capacity || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {venue.facilities && venue.facilities.slice(0, 3).map((facility) => (
                            <span
                              key={facility}
                              className={`px-2 py-1 text-xs rounded-md font-medium ${
                                venue.is_active 
                                  ? 'bg-indigo-100 text-indigo-700' 
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {facility.replace('_', ' ')}
                            </span>
                          ))}
                          {venue.facilities && venue.facilities.length > 3 && (
                            <span className={`px-2 py-1 text-xs rounded-md font-medium ${
                              venue.is_active 
                                ? 'bg-gray-200 text-gray-700' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              +{venue.facilities.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          venue.is_active 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {venue.is_active ? (
                            <>
                              <i className="fas fa-check-circle mr-1"></i>
                              Active
                            </>
                          ) : (
                            <>
                              <i className="fas fa-times-circle mr-1"></i>
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {venue.is_active ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(venue)}
                              className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 p-2 rounded-md transition-colors"
                              title="Edit venue"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVenue(venue.venue_id)}
                              className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-md transition-colors"
                              title="Delete venue"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleRestoreVenue(venue.venue_id)}
                              className="text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 p-2 rounded-md transition-colors"
                              title="Restore venue"
                            >
                              <i className="fas fa-undo-alt"></i>
                            </button>
                            <button
                              onClick={() => handlePermanentDeleteVenue(venue.venue_id)}
                              className="text-red-600 hover:text-red-900 hover:bg-red-50 p-2 rounded-md transition-colors"
                              title="Delete permanently"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredVenues.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <MapPinIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No venues found</h3>
            <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
              {searchTerm || selectedType || selectedStatus 
                ? 'Try adjusting your search criteria or filters to find venues.' 
                : 'Start by adding your first venue to manage campus facilities.'}
            </p>
            {!searchTerm && !selectedType && !selectedStatus && (
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setError('');
                  setSuccess('');
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
              >
                <PlusIcon className="w-5 h-5" />
                Add Your First Venue
              </button>
            )}
          </div>
        )}

        {/* Create Venue Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add New Venue"
          backdrop="blur"
          size="lg"
        >
          <div className="max-h-[70vh] overflow-y-auto">
                
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
                      <Dropdown
                        placeholder="Select Type"
                        value={newVenue.venue_type}
                        onChange={(value) => setNewVenue({...newVenue, venue_type: value})}
                        required
                        options={venueTypes.map(type => ({ 
                          label: formatVenueType(type), 
                          value: type,
                          icon: <i className="fas fa-tag text-xs"></i>
                        }))}
                        icon={<i className="fas fa-building text-xs"></i>}
                        size="md"
                      />
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
        </Modal>

        {/* Edit Venue Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
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
          title="Edit Venue"
          backdrop="blur"
          size="lg"
        >
          <div className="max-h-[70vh] overflow-y-auto">
                
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
                      <Dropdown
                        required
                        options={venueTypes.map(type => ({ value: type, label: formatVenueType(type) }))}
                        value={newVenue.venue_type}
                        onChange={(value) => setNewVenue({...newVenue, venue_type: value})}
                        placeholder="Select Type"
                      />
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
        </Modal>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Venues;
