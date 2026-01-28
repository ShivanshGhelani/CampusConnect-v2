import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, Minus, Trophy, FileText, Image as ImageIcon, Users, Calendar, Clock, IndianRupee, CheckCircle } from 'lucide-react';

const EventReportModal = ({ isOpen, onClose, eventId, eventName, eventData, eventStats, attendanceStats, registrations = [], onGenerate }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 3: Images & Winners (stored in memory as base64)
  const [eventImages, setEventImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [winners, setWinners] = useState([]);

  // Step 2: Outcomes & Budget
  const [outcomes, setOutcomes] = useState([{ title: '', description: '' }]);
  const [resultsComparison, setResultsComparison] = useState('');
  const [actualDuration, setActualDuration] = useState('');
  const [budgetUtilization, setBudgetUtilization] = useState('');
  const [resourcesUsed, setResourcesUsed] = useState('');
  const [postEventSummary, setPostEventSummary] = useState('');

  // Step 4: Additional Reports
  const [includeSignSheet, setIncludeSignSheet] = useState(false);
  const [includeFeedbackReport, setIncludeFeedbackReport] = useState(false);
  const [statistics, setStatistics] = useState({
    totalRegistrations: 0,
    totalAttendance: 0,
    attendancePercentage: 0,
    feedbacksReceived: 0,
    presentCount: 0,
    partialCount: 0,
    absentCount: 0
  });

  // Calculate statistics when modal opens or data changes
  useEffect(() => {
    if (isOpen) {
      // Total registrations from multiple sources
      const totalRegs = eventStats?.registrations_count || 
                       eventStats?.total_registrations || 
                       registrations?.length || 0;

      // Total attendance calculation
      // attendanceStats uses present_count + partial_count as total attendance
      const presentCount = attendanceStats?.present_count || 0;
      const partialCount = attendanceStats?.partial_count || 0;
      const absentCount = attendanceStats?.absent_count || 0;
      const pendingCount = attendanceStats?.pending_count || 0;
      
      const totalAtt = attendanceStats ? (presentCount + partialCount) : (eventStats?.attendance_count || 0);
      const attPercent = attendanceStats?.attendance_percentage || 
                        (totalRegs > 0 ? Math.round((totalAtt / totalRegs) * 100) : 0);

      // Count feedbacks - from eventStats.feedback_count or registrations array
      const feedbackCount = eventStats?.feedback_count || 
                           registrations?.filter(reg => 
                             reg.feedback_status === 'submitted' || reg.feedback_submitted
                           ).length || 0;

      setStatistics({
        totalRegistrations: totalRegs,
        totalAttendance: totalAtt,
        attendancePercentage: attPercent,
        feedbacksReceived: feedbackCount,
        presentCount,
        partialCount,
        absentCount
      });
    }
  }, [isOpen, eventStats, attendanceStats, registrations]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    // Store images as base64 in memory (no backend storage)
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        setEventImages(prev => [...prev, base64Data]);
        setImagePreviews(prev => [...prev, {
          preview: base64Data,
          caption: `Event Image ${imagePreviews.length + files.indexOf(file) + 1}`,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setEventImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const updateImageCaption = (index, caption) => {
    setImagePreviews(prev => prev.map((img, i) =>
      i === index ? { ...img, caption } : img
    ));
  };

  const addOutcome = () => {
    setOutcomes(prev => [...prev, { title: '', description: '' }]);
  };

  const removeOutcome = (index) => {
    if (outcomes.length > 1) {
      setOutcomes(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index, field, value) => {
    setOutcomes(prev => prev.map((outcome, i) =>
      i === index ? { ...outcome, [field]: value } : outcome
    ));
  };

  const addWinner = () => {
    setWinners(prev => [...prev, { position: '', name: '', department: '', id: '' }]);
  };

  const removeWinner = (index) => {
    setWinners(prev => prev.filter((_, i) => i !== index));
  };

  const updateWinner = (index, field, value) => {
    setWinners(prev => prev.map((winner, i) =>
      i === index ? { ...winner, [field]: value } : winner
    ));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const reportData = {
        // Event data
        eventData,
        eventStats,
        attendanceStats,
        registrations,
        // Step 2: Outcomes & Budget
        outcomes: outcomes.filter(o => o.title.trim() || o.description.trim()),
        resultsComparison,
        actualDuration,
        budgetUtilization,
        resourcesUsed,
        postEventSummary,
        // Step 3: Images & Winners (base64 stored in memory)
        images: eventImages, // Array of base64 strings
        imageCaptions: imagePreviews.map(img => img.caption),
        winners: winners.filter(w => w.name.trim() || w.position.trim()),
        // Step 4: Additional Reports & Statistics
        includeSignSheet,
        includeFeedbackReport,
        statistics
      };

      await onGenerate(reportData);
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error generating event report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setEventImages([]);
    setImagePreviews([]);
    setOutcomes([{ title: '', description: '' }]);
    setWinners([]);
    setResultsComparison('');
    setActualDuration('');
    setBudgetUtilization('');
    setResourcesUsed('');
    setPostEventSummary('');
    setIncludeSignSheet(false);
    setIncludeFeedbackReport(false);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-99999 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Generate Event Report</h2>
            <p className="text-sm text-gray-600 mt-1">{eventName}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <div className={`flex flex-col items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="mt-2 text-xs font-medium hidden sm:block">Event Details</span>
            </div>
            <div className={`flex-1 h-px mx-2 ${currentStep > 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

            {/* Step 2 */}
            <div className={`flex flex-col items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                {currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="mt-2 text-xs font-medium hidden sm:block">Outcomes & Budget</span>
            </div>
            <div className={`flex-1 h-px mx-2 ${currentStep > 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

            {/* Step 3 */}
            <div className={`flex flex-col items-center ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                {currentStep > 3 ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
              <span className="mt-2 text-xs font-medium hidden sm:block">Images & Winners</span>
            </div>
            <div className={`flex-1 h-px mx-2 ${currentStep > 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>

            {/* Step 4 */}
            <div className={`flex flex-col items-center ${currentStep >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                4
              </div>
              <span className="mt-2 text-xs font-medium hidden sm:block">Reports & Stats</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Event Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  Event Details Overview
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Review the basic event information that will be included in the report.
                </p>

                {/* Event Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500 mb-1">Event Name</div>
                    <div className="text-base font-semibold text-gray-900">{eventName || 'N/A'}</div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500 mb-1">Event ID</div>
                    <div className="text-base font-mono text-gray-900">{eventId || 'N/A'}</div>
                  </div>

                  {eventData?.event_type && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-500 mb-1">Category</div>
                      <div className="text-base text-gray-900 capitalize">{eventData.event_type}</div>
                    </div>
                  )}

                  {eventData?.start_datetime && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-500 mb-1">Date</div>
                      <div className="text-base text-gray-900">
                        {new Date(eventData.start_datetime).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}

                  {eventData?.start_datetime && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-500 mb-1">Time</div>
                      <div className="text-base text-gray-900">
                        {new Date(eventData.start_datetime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {eventData.end_datetime && ` - ${new Date(eventData.end_datetime).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}`}
                      </div>
                    </div>
                  )}

                  {eventData?.venue && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-gray-500 mb-1">Venue</div>
                      <div className="text-base text-gray-900">{eventData.venue}</div>
                    </div>
                  )}
                </div>

                {eventData?.short_description && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500 mb-2">Description</div>
                    <div className="text-sm text-gray-700 leading-relaxed">{eventData.short_description}</div>
                  </div>
                )}

                {/* Check if organizers exist */}
                {(() => {
                  const hasOrganizers = (eventData?.organizer_details && eventData.organizer_details.length > 0) || 
                                       (eventData?.contacts && eventData.contacts.length > 0);
                  
                  if (!hasOrganizers) return null;
                  
                  return (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm font-medium text-blue-700 mb-2">Organizers</div>
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {eventData.organizer_details && eventData.organizer_details.length > 0 ? (
                          eventData.organizer_details.map((org, idx) => {
                            const name = org.full_name || org.name || org.faculty_name || 'N/A';
                            const phone = org.contact_no || org.phone || org.contact || '';
                            return (
                              <div key={idx} className="mb-1">
                                • {name} {phone && `(${phone})`}
                              </div>
                            );
                          })
                        ) : eventData.contacts && eventData.contacts.length > 0 ? (
                          eventData.contacts.map((contact, idx) => {
                            const name = contact.name || contact.faculty_name || 'N/A';
                            const phone = contact.contact || contact.phone || '';
                            return (
                              <div key={idx} className="mb-1">
                                • {name} {phone && `(${phone})`}
                              </div>
                            );
                          })
                        ) : 'N/A'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Step 2: Outcomes & Budget */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Event Outcomes */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Event Outcomes
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Document the key outcomes and achievements from the event.
                </p>
                <div className="space-y-4">
                  {outcomes.map((outcome, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700">Outcome {index + 1}</h4>
                        {outcomes.length > 1 && (
                          <button
                            onClick={() => removeOutcome(index)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={outcome.title}
                        onChange={(e) => updateOutcome(index, 'title', e.target.value)}
                        placeholder="Outcome title..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
                      />
                      <textarea
                        value={outcome.description}
                        onChange={(e) => updateOutcome(index, 'description', e.target.value)}
                        placeholder="Describe this outcome..."
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                      />
                    </div>
                  ))}
                  <button
                    onClick={addOutcome}
                    className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Another Outcome
                  </button>
                </div>
              </div>

              {/* Budget & Additional Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <IndianRupee className="w-5 h-5 mr-2 text-blue-600" />
                  Budget & Additional Details
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected vs Actual Results
                  </label>
                  <textarea
                    value={resultsComparison}
                    onChange={(e) => setResultsComparison(e.target.value)}
                    placeholder="Compare expected outcomes with actual results..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Actual Duration
                    </label>
                    <input
                      type="text"
                      value={actualDuration}
                      onChange={(e) => setActualDuration(e.target.value)}
                      placeholder="e.g., 3 hours 45 minutes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <IndianRupee className="w-4 h-4 inline mr-1" />
                      Budget Utilization
                    </label>
                    <input
                      type="text"
                      value={budgetUtilization}
                      onChange={(e) => setBudgetUtilization(e.target.value)}
                      placeholder="e.g., 85% of allocated budget"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resources Used
                  </label>
                  <textarea
                    value={resourcesUsed}
                    onChange={(e) => setResourcesUsed(e.target.value)}
                    placeholder="List resources, equipment, materials used during the event..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post-Event Summary
                  </label>
                  <textarea
                    value={postEventSummary}
                    onChange={(e) => setPostEventSummary(e.target.value)}
                    placeholder="Overall summary, lessons learned, future recommendations..."
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Images & Winners */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Event Images */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
                  Event Images (Optional)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload images from the event to include in the report. These will be displayed in a gallery format.
                </p>

                {/* Image Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload images or drag and drop</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB each</p>
                  </label>
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Uploaded Images ({imagePreviews.length})</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {imagePreviews.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img.preview}
                            alt={`Event ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 group-hover:border-blue-400 transition-colors"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            value={img.caption}
                            onChange={(e) => updateImageCaption(index, e.target.value)}
                            placeholder="Image caption..."
                            className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Winners */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                  Winners & Recognition (Optional)
                </h3>
                {winners.length === 0 ? (
                  <button
                    onClick={addWinner}
                    className="flex items-center text-blue-600 hover:text-blue-700 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Winner
                  </button>
                ) : (
                  <div className="space-y-4">
                    {winners.map((winner, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center">
                            <Trophy className="w-4 h-4 mr-1 text-yellow-500" />
                            Winner {index + 1}
                          </h4>
                          <button
                            onClick={() => removeWinner(index)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={winner.position}
                            onChange={(e) => updateWinner(index, 'position', e.target.value)}
                            placeholder="Position (e.g., 1st Place, Best Performance)"
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={winner.name}
                            onChange={(e) => updateWinner(index, 'name', e.target.value)}
                            placeholder="Winner name..."
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={winner.department}
                            onChange={(e) => updateWinner(index, 'department', e.target.value)}
                            placeholder="Department..."
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            value={winner.id}
                            onChange={(e) => updateWinner(index, 'id', e.target.value)}
                            placeholder="Student/Employee ID..."
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addWinner}
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors font-medium"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Another Winner
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Reports & Statistics */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Event Statistics
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Review event statistics that will be included in the report.
                </p>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{statistics.totalRegistrations}</div>
                    <div className="text-xs text-gray-600 mt-1">Total Registrations</div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{statistics.totalAttendance}</div>
                    <div className="text-xs text-gray-600 mt-1">Total Attendance</div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{statistics.attendancePercentage}%</div>
                    <div className="text-xs text-gray-600 mt-1">Attendance Rate</div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{statistics.feedbacksReceived}</div>
                    <div className="text-xs text-gray-600 mt-1">Feedbacks Received</div>
                  </div>
                </div>

                {/* Attendance Breakdown */}
                {statistics.totalAttendance > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-green-600">{statistics.presentCount}</div>
                      <div className="text-xs text-gray-600 mt-1">Present</div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-yellow-600">{statistics.partialCount}</div>
                      <div className="text-xs text-gray-600 mt-1">Partial</div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-red-600">{statistics.absentCount}</div>
                      <div className="text-xs text-gray-600 mt-1">Absent</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Reports */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Include Additional Reports
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select which additional reports to include in the final PDF. These will be formatted tables similar to attendance and feedback reports.
                </p>

                <div className="space-y-3">
                  {/* Attendance Report Table */}
                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeSignSheet}
                        onChange={(e) => setIncludeSignSheet(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">Attendance Report Table</div>
                        <div className="text-sm text-gray-500">
                          Include detailed attendance table with stats (Present, Partial, Absent counts) -
                          Separate tables for Faculty, Individual Students, and Team Registrations
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Feedback Report Table */}
                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeFeedbackReport}
                        onChange={(e) => setIncludeFeedbackReport(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        disabled={statistics.feedbacksReceived === 0}
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">
                          Feedback Report Table
                          {statistics.feedbacksReceived === 0 && (
                            <span className="ml-2 text-xs text-gray-400">(No feedbacks received)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Include feedback summary table with ratings and stats -
                          Available only if feedbacks have been submitted
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Summary Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-blue-900">Ready to Generate Report</div>
                    <div className="text-sm text-blue-700 mt-1">
                      Review all the information and click "Generate Report" to create your comprehensive event report PDF.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <div>
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                ← Previous
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>

            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventReportModal;
