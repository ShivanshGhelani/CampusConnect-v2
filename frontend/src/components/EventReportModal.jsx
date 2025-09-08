import React, { useState } from 'react';
import { X, Upload, Plus, Minus, Trophy, FileText, Image as ImageIcon, Users } from 'lucide-react';

const EventReportModal = ({ isOpen, onClose, eventId, eventName, onGenerate }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [eventImages, setEventImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [outcomes, setOutcomes] = useState([{ title: '', description: '' }]);
  const [winners, setWinners] = useState([]);
  const [resultsComparison, setResultsComparison] = useState('');
  const [actualDuration, setActualDuration] = useState('');
  const [budgetUtilization, setBudgetUtilization] = useState('');
  const [resourcesUsed, setResourcesUsed] = useState('');
  const [postEventSummary, setPostEventSummary] = useState('');

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setEventImages(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, {
          file,
          preview: e.target.result,
          caption: `Event Image ${imagePreviews.length + files.indexOf(file) + 1}`
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
        images: eventImages,
        outcomes: outcomes.filter(o => o.title.trim() || o.description.trim()),
        winners: winners.filter(w => w.name.trim() || w.position.trim()),
        resultsComparison,
        actualDuration,
        budgetUtilization,
        resourcesUsed,
        postEventSummary
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
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const nextStep = () => setCurrentStep(2);
  const prevStep = () => setCurrentStep(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-99999 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Event Images</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Outcomes & Results</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Event Images (Optional)
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload images from the event to include in the report. These will be displayed in a gallery format.
                </p>
                
                {/* Image Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Uploaded Images</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {imagePreviews.map((img, index) => (
                        <div key={index} className="relative">
                          <img
                            src={img.preview}
                            alt={`Event ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            value={img.caption}
                            onChange={(e) => updateImageCaption(index, e.target.value)}
                            placeholder="Image caption..."
                            className="mt-2 w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Event Outcomes */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Event Outcomes
                </h3>
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

              {/* Winners */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  Winners & Recognition (Optional)
                </h3>
                {winners.length === 0 ? (
                  <button
                    onClick={addWinner}
                    className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Winner
                  </button>
                ) : (
                  <div className="space-y-4">
                    {winners.map((winner, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-700">Winner {index + 1}</h4>
                          <button
                            onClick={() => removeWinner(index)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={winner.position}
                            onChange={(e) => updateWinner(index, 'position', e.target.value)}
                            placeholder="Position (e.g., 1st Place, Best Performance)"
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <input
                            type="text"
                            value={winner.name}
                            onChange={(e) => updateWinner(index, 'name', e.target.value)}
                            placeholder="Winner name..."
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <input
                            type="text"
                            value={winner.department}
                            onChange={(e) => updateWinner(index, 'department', e.target.value)}
                            placeholder="Department..."
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <input
                            type="text"
                            value={winner.id}
                            onChange={(e) => updateWinner(index, 'id', e.target.value)}
                            placeholder="Student/Employee ID..."
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={addWinner}
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Another Winner
                    </button>
                  </div>
                )}
              </div>

              {/* Additional Report Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected vs Actual Results
                  </label>
                  <textarea
                    value={resultsComparison}
                    onChange={(e) => setResultsComparison(e.target.value)}
                    placeholder="Compare expected outcomes with actual results..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Actual Duration
                    </label>
                    <input
                      type="text"
                      value={actualDuration}
                      onChange={(e) => setActualDuration(e.target.value)}
                      placeholder="e.g., 3 hours 45 minutes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget Utilization
                    </label>
                    <input
                      type="text"
                      value={budgetUtilization}
                      onChange={(e) => setBudgetUtilization(e.target.value)}
                      placeholder="e.g., 85% of allocated budget"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {currentStep === 2 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Previous
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
            
            {currentStep === 1 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
