import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Award, Search, UserCheck, UserMinus, ChevronDown, ChevronUp, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { adminAPI } from '../../api/admin';

const PARTICIPATION_KEYWORDS = ['participation', 'attendee', 'attended', 'participant'];

const isParticipationType = (certType) =>
  PARTICIPATION_KEYWORDS.some(kw => certType.toLowerCase().includes(kw));

// Get a unique identifier for each registration (works for both individual and team)
const getRegId = (reg) => reg.registration_id || reg.enrollment_no || reg.student_id || reg._id || '';

// Determine display name and subtitle for a registration
const getDisplayInfo = (reg) => {
  const isTeam = reg.registration_type === 'team';
  const name = isTeam
    ? (reg.team_name || reg.name || 'Unnamed Team')
    : (reg.student_name || reg.full_name || reg.name || 'Unknown');
  const subtitle = isTeam
    ? `Team · ${reg.team_size || reg.member_count || reg.team_members?.length || '?'} members`
    : (reg.enrollment_no || reg.student_id || reg.email || '');
  return { name, subtitle, isTeam };
};

const CertificateAssignmentModal = ({ isOpen, onClose, eventId, certificateTemplates = {}, registrations = [] }) => {
  // State
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCertType, setActiveCertType] = useState('');
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [expandedType, setExpandedType] = useState('');

  // Derive special certificate types (non-participation)
  const specialTypes = useMemo(() => {
    return Object.keys(certificateTemplates).filter(ct => !isParticipationType(ct));
  }, [certificateTemplates]);

  // Load existing assignments
  useEffect(() => {
    if (isOpen && eventId) {
      loadAssignments();
    }
  }, [isOpen, eventId]);

  // Set default active cert type
  useEffect(() => {
    if (specialTypes.length > 0 && !activeCertType) {
      setActiveCertType(specialTypes[0]);
      setExpandedType(specialTypes[0]);
    }
  }, [specialTypes]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getCertificateAssignments(eventId);
      if (response.data.success) {
        setAssignments(response.data.assignments || {});
      }
    } catch (err) {
      console.error('Failed to load certificate assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter registrations based on search term
  const filteredRegistrations = useMemo(() => {
    if (!searchTerm.trim()) return registrations;
    const term = searchTerm.toLowerCase();
    return registrations.filter(reg => {
      const { name } = getDisplayInfo(reg);
      const enrollment = (reg.enrollment_no || reg.student_id || '').toLowerCase();
      const email = (reg.email || '').toLowerCase();
      const teamName = (reg.team_name || '').toLowerCase();
      return name.toLowerCase().includes(term) || enrollment.includes(term) || email.includes(term) || teamName.includes(term);
    });
  }, [registrations, searchTerm]);

  // Check if a registration is assigned to a specific cert type
  const isAssignedTo = useCallback((certType, regId) => {
    return (assignments[certType] || []).includes(regId);
  }, [assignments]);

  // Check if a registration is assigned to ANY special cert type
  const getAssignedType = useCallback((regId) => {
    for (const [certType, ids] of Object.entries(assignments)) {
      if (ids.includes(regId)) return certType;
    }
    return null;
  }, [assignments]);

  // Toggle registration assignment
  const toggleAssignment = useCallback((certType, regId) => {
    setAssignments(prev => {
      const updated = { ...prev };
      if (!updated[certType]) updated[certType] = [];

      if (updated[certType].includes(regId)) {
        // Remove from this cert type
        updated[certType] = updated[certType].filter(e => e !== regId);
        if (updated[certType].length === 0) delete updated[certType];
      } else {
        // Remove from any other cert type first
        for (const ct of Object.keys(updated)) {
          updated[ct] = updated[ct].filter(e => e !== regId);
          if (updated[ct].length === 0) delete updated[ct];
        }
        // Add to this cert type
        updated[certType] = [...(updated[certType] || []), regId];
      }
      return updated;
    });
    setSaveMessage({ type: '', text: '' });
  }, []);

  // Save assignments
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage({ type: '', text: '' });
    try {
      const response = await adminAPI.saveCertificateAssignments(eventId, assignments);
      if (response.data.success) {
        setSaveMessage({ type: 'success', text: response.data.message || 'Assignments saved successfully!' });
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
      } else {
        setSaveMessage({ type: 'error', text: 'Failed to save assignments' });
      }
    } catch (err) {
      console.error('Failed to save assignments:', err);
      setSaveMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save assignments' });
    } finally {
      setSaving(false);
    }
  };

  // Count total assigned students
  const totalAssigned = useMemo(() => {
    return Object.values(assignments).reduce((sum, students) => sum + students.length, 0);
  }, [assignments]);

  if (!isOpen) return null;

  return (
    // Fixed overlay with backdrop blur - covers everything including AdminLayout sidebar
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop - black blurred overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container - vertical rectangle, centered */}
      <div className="relative w-full max-w-lg mx-4 max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Assign Certificates</h2>
              <p className="text-xs text-gray-500">
                {totalAssigned} assigned · {registrations.length} registered
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="ml-3 text-gray-500">Loading...</span>
          </div>
        ) : (
          <>
            {/* Certificate Type Tabs */}
            <div className="px-6 pt-4 pb-2">
              {specialTypes.length > 1 ? (
                <div className="flex gap-2 flex-wrap">
                  {specialTypes.map(ct => {
                    const count = (assignments[ct] || []).length;
                    const isActive = activeCertType === ct;
                    return (
                      <button
                        key={ct}
                        onClick={() => {
                          setActiveCertType(ct);
                          setExpandedType(ct);
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {ct} {count > 0 && <span className="ml-1 text-xs opacity-80">({count})</span>}
                      </button>
                    );
                  })}
                </div>
              ) : specialTypes.length === 1 ? (
                <div className="px-3 py-1.5 bg-indigo-50 rounded-lg text-sm font-medium text-indigo-700 inline-block">
                  {specialTypes[0]}
                  {(assignments[specialTypes[0]] || []).length > 0 && (
                    <span className="ml-2 text-xs bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full">
                      {(assignments[specialTypes[0]] || []).length} assigned
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 py-2">No special certificate types found for this event.</div>
              )}
            </div>

            {/* Search Box */}
            <div className="px-6 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, ID, or email..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1 px-1">
                Showing {filteredRegistrations.length} of {registrations.length}
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
              {filteredRegistrations.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No results found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredRegistrations.map((reg) => {
                    const regId = getRegId(reg);
                    const { name: displayName, subtitle, isTeam } = getDisplayInfo(reg);
                    const existingAssignment = getAssignedType(regId);
                    const isAssignedToActive = isAssignedTo(activeCertType, regId);
                    const isAssignedElsewhere = existingAssignment && existingAssignment !== activeCertType;

                    return (
                      <div
                        key={regId}
                        onClick={() => toggleAssignment(activeCertType, regId)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                          isAssignedToActive
                            ? 'bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'
                            : isAssignedElsewhere
                            ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
                            : 'bg-white border border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        {/* Checkbox indicator */}
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                          isAssignedToActive
                            ? 'bg-indigo-600'
                            : isAssignedElsewhere
                            ? 'bg-amber-500'
                            : 'border-2 border-gray-300 group-hover:border-indigo-400'
                        }`}>
                          {(isAssignedToActive || isAssignedElsewhere) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Registration info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                            {isAssignedElsewhere && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                {existingAssignment}
                              </span>
                            )}
                          </div>
                          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
                        </div>

                        {/* Action indicator */}
                        <div className="flex-shrink-0">
                          {isAssignedToActive ? (
                            <UserMinus className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assigned Summary Sections */}
            {Object.keys(assignments).length > 0 && (
              <div className="px-6 py-2 border-t border-gray-100">
                {specialTypes.map(ct => {
                  const assigned = assignments[ct] || [];
                  if (assigned.length === 0) return null;
                  const isExpanded = expandedType === ct;
                  return (
                    <div key={ct} className="mb-1">
                      <button
                        onClick={() => setExpandedType(isExpanded ? '' : ct)}
                        className="w-full flex items-center justify-between py-1.5 text-xs text-gray-600 hover:text-gray-900"
                      >
                        <span className="font-medium">
                          {ct}: <span className="text-indigo-600">{assigned.length}</span> selected
                        </span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {isExpanded && (
                        <div className="flex flex-wrap gap-1 pb-1">
                          {assigned.map(regId => {
                            const reg = registrations.find(r => getRegId(r) === regId);
                            const chipLabel = reg ? (reg.team_name || reg.student_name || reg.full_name || reg.name || regId) : regId;
                            return (
                              <span
                                key={regId}
                                className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full"
                              >
                                {chipLabel}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAssignment(ct, regId);
                                  }}
                                  className="hover:text-red-500 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save Message */}
            {saveMessage.text && (
              <div className={`mx-6 mb-2 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                saveMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {saveMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                {saveMessage.text}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                {registrations.length - totalAssigned} will receive the participation certificate
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CertificateAssignmentModal;
