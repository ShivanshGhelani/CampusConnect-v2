import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Eye, 
  FileText, 
  MessageSquare, 
  Star, 
  CheckSquare, 
  Circle, 
  Hash, 
  Calendar,
  Clock,
  Type, 
  AlignLeft, 
  List, 
  Edit3, 
  Trash2, 
  X, 
  GripVertical 
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminAPI } from '../../api/admin';
import DateRangePicker from '../../components/common/DateRangePicker';

// Reusable Action Button Component
const ActionButton = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  icon: Icon, 
  disabled = false, 
  loading = false,
  className = '' 
}) => {
  const baseClasses = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {loading ? 'Loading...' : children}
    </button>
  );
};

function FeedbackSetup() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  // Form state
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formTitle, setFormTitle] = useState('Event Feedback Form');
  const [formDescription, setFormDescription] = useState('Please share your feedback about this event.');
  const [formElements, setFormElements] = useState([]);
  const [feedbackEndDate, setFeedbackEndDate] = useState('');
  const [selectedElement, setSelectedElement] = useState(null);
  const [showElementSelector, setShowElementSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Element types configuration
  const elementTypes = [
    {
      type: 'text',
      label: 'Text Input',
      description: 'Single line text field',
      icon: Type,
      defaultProps: { placeholder: 'Enter your response...' }
    },
    {
      type: 'textarea',
      label: 'Text Area',
      description: 'Multi-line text field',
      icon: AlignLeft,
      defaultProps: { placeholder: 'Enter your detailed response...', rows: 4 }
    },
    {
      type: 'rating',
      label: 'Star Rating',
      description: 'Star rating scale',
      icon: Star,
      defaultProps: { max: 5 }
    },
    {
      type: 'select',
      label: 'Dropdown',
      description: 'Single choice dropdown',
      icon: List,
      defaultProps: { options: ['Excellent', 'Good', 'Average', 'Poor'] }
    },
    {
      type: 'radio',
      label: 'Radio Buttons',
      description: 'Single choice options',
      icon: Circle,
      defaultProps: { options: ['Yes', 'No', 'Maybe'] }
    },
    {
      type: 'checkbox',
      label: 'Checkboxes',
      description: 'Multiple choice options',
      icon: CheckSquare,
      defaultProps: { options: ['Option 1', 'Option 2', 'Option 3'] }
    },
    {
      type: 'number',
      label: 'Number Input',
      description: 'Numeric input field',
      icon: Hash,
      defaultProps: { min: 0, max: 100 }
    },
    {
      type: 'date',
      label: 'Date Picker',
      description: 'Date selection field',
      icon: Calendar,
      defaultProps: {}
    }
  ];

  // Form Element Card Component
  const FormElementCard = ({ element, index, isSelected, onSelect, onUpdate, onDelete }) => {
    const elementType = elementTypes.find(et => et.type === element.type);
    const Icon = elementType?.icon || FileText;

    return (
      <div 
        className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
        }`}
        onClick={() => onSelect(element)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-blue-600">{elementType?.label}</span>
                {element.required && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                    Required
                  </span>
                )}
              </div>
              <p className="text-gray-900 font-medium">{element.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-1 text-gray-400 hover:text-gray-600 cursor-grab"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(element.id);
              }}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete element"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Element Selector Component
  const ElementSelector = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Form Element</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {elementTypes.map((elementType) => {
          const Icon = elementType.icon;
          return (
            <button
              key={elementType.type}
              onClick={() => addElement(elementType)}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">{elementType.label}</div>
                <div className="text-xs text-gray-600">{elementType.description}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end mt-4">
        <ActionButton
          onClick={() => setShowElementSelector(false)}
          variant="secondary"
          icon={X}
        >
          Cancel
        </ActionButton>
      </div>
    </div>
  );

  // Element Editor Component
  const ElementEditor = ({ element, onUpdate, onClose }) => {
    const [localElement, setLocalElement] = useState({ ...element });

    const handleSave = () => {
      onUpdate(element.id, localElement);
      onClose();
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Edit Element</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label *
            </label>
            <input
              type="text"
              value={localElement.label}
              onChange={(e) => setLocalElement({ ...localElement, label: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter element label..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={localElement.required}
              onChange={(e) => setLocalElement({ ...localElement, required: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Required field
            </label>
          </div>

          {/* Type-specific props */}
          {element.type === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placeholder
              </label>
              <input
                type="text"
                value={localElement.props?.placeholder || ''}
                onChange={(e) => setLocalElement({ 
                  ...localElement, 
                  props: { ...localElement.props, placeholder: e.target.value }
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {element.type === 'textarea' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placeholder
                </label>
                <input
                  type="text"
                  value={localElement.props?.placeholder || ''}
                  onChange={(e) => setLocalElement({ 
                    ...localElement, 
                    props: { ...localElement.props, placeholder: e.target.value }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rows
                </label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={localElement.props?.rows || 4}
                  onChange={(e) => setLocalElement({ 
                    ...localElement, 
                    props: { ...localElement.props, rows: parseInt(e.target.value) }
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {element.type === 'rating' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Rating
              </label>
              <select
                value={localElement.props?.max || 5}
                onChange={(e) => setLocalElement({ 
                  ...localElement, 
                  props: { ...localElement.props, max: parseInt(e.target.value) }
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num} Stars</option>
                ))}
              </select>
            </div>
          )}

          {(element.type === 'select' || element.type === 'radio' || element.type === 'checkbox') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options (one per line)
              </label>
              <textarea
                value={(localElement.props?.options || []).join('\n')}
                onChange={(e) => setLocalElement({ 
                  ...localElement, 
                  props: { ...localElement.props, options: e.target.value.split('\n').filter(o => o.trim()) }
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <ActionButton onClick={handleSave} variant="success" icon={Save}>
              Save Changes
            </ActionButton>
            <ActionButton onClick={onClose} variant="secondary" icon={X}>
              Cancel
            </ActionButton>
          </div>
        </div>
      </div>
    );
  };

  // Form Preview Component
  const FormPreview = ({ elements }) => {
    const [formData, setFormData] = useState({});

    const handleInputChange = (elementId, value) => {
      setFormData(prev => ({ ...prev, [elementId]: value }));
    };

    const renderElement = (element) => {
      const commonClasses = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
      
      switch (element.type) {
        case 'text':
          return (
            <input
              type="text"
              placeholder={element.props?.placeholder}
              value={formData[element.id] || ''}
              onChange={(e) => handleInputChange(element.id, e.target.value)}
              className={commonClasses}
            />
          );
        
        case 'textarea':
          return (
            <textarea
              placeholder={element.props?.placeholder}
              rows={element.props?.rows || 4}
              value={formData[element.id] || ''}
              onChange={(e) => handleInputChange(element.id, e.target.value)}
              className={commonClasses}
            />
          );
        
        case 'rating':
          const maxRating = element.props?.max || 5;
          return (
            <div className="flex gap-1">
              {[...Array(maxRating)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleInputChange(element.id, i + 1)}
                  className={`p-1 ${formData[element.id] > i ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
          );
        
        case 'select':
          return (
            <select
              value={formData[element.id] || ''}
              onChange={(e) => handleInputChange(element.id, e.target.value)}
              className={commonClasses}
            >
              <option value="">Select an option...</option>
              {(element.props?.options || []).map((option, i) => (
                <option key={i} value={option}>{option}</option>
              ))}
            </select>
          );
        
        case 'radio':
          return (
            <div className="space-y-2">
              {(element.props?.options || []).map((option, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={element.id}
                    value={option}
                    checked={formData[element.id] === option}
                    onChange={(e) => handleInputChange(element.id, e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          );
        
        case 'checkbox':
          return (
            <div className="space-y-2">
              {(element.props?.options || []).map((option, i) => (
                <label key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    value={option}
                    checked={(formData[element.id] || []).includes(option)}
                    onChange={(e) => {
                      const currentValues = formData[element.id] || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter(v => v !== option);
                      handleInputChange(element.id, newValues);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          );
        
        case 'number':
          return (
            <input
              type="number"
              min={element.props?.min}
              max={element.props?.max}
              value={formData[element.id] || ''}
              onChange={(e) => handleInputChange(element.id, e.target.value)}
              className={commonClasses}
            />
          );
        
        case 'date':
          return (
            <input
              type="date"
              value={formData[element.id] || ''}
              onChange={(e) => handleInputChange(element.id, e.target.value)}
              className={commonClasses}
            />
          );
        
        default:
          return <div className="text-gray-500">Unknown element type: {element.type}</div>;
      }
    };

    return (
      <div className="space-y-6">
        {elements.map((element) => (
          <div key={element.id}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {element.label}
              {element.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderElement(element)}
          </div>
        ))}
        
        {elements.length > 0 && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => alert('This is a preview. Form submission is disabled.')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Feedback
            </button>
          </div>
        )}
      </div>
    );
  };

  // Functions
  const addElement = (elementType) => {
    const newElement = {
      id: `element_${Date.now()}`,
      type: elementType.type,
      label: elementType.label,
      required: false,
      props: { ...elementType.defaultProps }
    };

    setFormElements(prev => [...prev, newElement]);
    setShowElementSelector(false);
    setSelectedElement(newElement);
  };

  const updateElement = (elementId, updatedElement) => {
    setFormElements(prev => 
      prev.map(element => 
        element.id === elementId ? { ...element, ...updatedElement } : element
      )
    );
  };

  const deleteElement = (elementId) => {
    setFormElements(prev => prev.filter(element => element.id !== elementId));
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }
  };

  const saveForm = async () => {
    try {
      setIsSaving(true);
      
      // Basic validation
      if (!formTitle.trim()) {
        alert('Please enter a form title');
        return;
      }

      if (formElements.length === 0) {
        alert('Please add at least one form element');
        return;
      }

      const formData = {
        title: formTitle,
        description: formDescription,
        elements: formElements,
        is_active: true
      };

      // Add feedback_end_date for non-certificate events
      if (event && !event.is_certificate_based && feedbackEndDate) {
        formData.feedback_end_date = feedbackEndDate;
      }

      
      
      // Call the API to save the feedback form
      const response = await adminAPI.createFeedbackForm(eventId, formData);
      
      if (response.data.success) {
        alert('Feedback form saved successfully!');
        navigate(`/admin/events/${eventId}/feedback`);
      } else {
        throw new Error(response.data.message || 'Failed to save form');
      }
      
    } catch (error) {
      
      alert(`Failed to save form: ${error.response?.data?.detail || error.message || 'Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Load existing feedback form or add default elements on component mount
  useEffect(() => {
    const loadEventAndFeedbackForm = async () => {
      try {
        setIsLoading(true);
        console.log('🔍 Loading event details for:', eventId);
        
        // Load event details first
        const eventResponse = await adminAPI.getEvent(eventId);
        console.log('📦 Event API response:', eventResponse);
        console.log('📦 Event data:', eventResponse.data);
        
        if (eventResponse.data.success && eventResponse.data.event) {
          const eventData = eventResponse.data.event;
          setEvent(eventData);
          
          console.log('✅ Event loaded:', eventData.event_name);
          console.log('📋 is_certificate_based:', eventData.is_certificate_based);
          console.log('🎯 Should show feedback end date field:', !eventData.is_certificate_based);
          
          // Set feedback_end_date if it exists
          if (eventData.feedback_end_date) {
            // Convert to YYYY-MM-DD format for input
            const date = new Date(eventData.feedback_end_date);
            const formattedDate = date.toISOString().split('T')[0];
            setFeedbackEndDate(formattedDate);
            console.log('📅 Loaded existing feedback end date:', formattedDate);
          } else if (!eventData.is_certificate_based && eventData.end_datetime) {
            // Default to 7 days after event end for non-certificate events
            const eventEnd = new Date(eventData.end_datetime);
            eventEnd.setDate(eventEnd.getDate() + 7);
            const formattedDate = eventEnd.toISOString().split('T')[0];
            setFeedbackEndDate(formattedDate);
            console.log('📅 Set default feedback end date:', formattedDate);
          }
        } else {
          console.error('❌ Event response did not have success or event data');
          console.error('Response:', eventResponse.data);
        }
        
        // Load feedback form
        const response = await adminAPI.getFeedbackForm(eventId);
        
        
        if (response.data.success && response.data.feedback_form) {
          const feedbackForm = response.data.feedback_form;
          
          
          setFormTitle(feedbackForm.title || 'Event Feedback Form');
          setFormDescription(feedbackForm.description || 'Please share your feedback about this event.');
          setFormElements(feedbackForm.elements || []);
        } else {
          
          createDefaultElements();
        }
      } catch (error) {
        console.error('❌ Error loading event or feedback form:', error);
        console.error('Error details:', error.response?.data || error.message);
        
        createDefaultElements();
      } finally {
        setIsLoading(false);
      }
    };

    const createDefaultElements = () => {
      if (formElements.length === 0) {
        const defaultElements = [
          {
            id: 'overall_rating',
            type: 'rating',
            label: 'Overall Rating',
            required: true,
            props: { max: 5 }
          },
          {
            id: 'feedback_text',
            type: 'textarea',
            label: 'What did you think about this event?',
            required: true,
            props: { placeholder: 'Please share your thoughts and feedback...', rows: 4 }
          },
          {
            id: 'recommend',
            type: 'radio',
            label: 'Would you recommend this event to others?',
            required: true,
            props: { options: ['Definitely', 'Probably', 'Not Sure', 'Probably Not', 'Definitely Not'] }
          }
        ];
        setFormElements(defaultElements);
      }
    };

    loadEventAndFeedbackForm();
  }, [eventId]);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(`/admin/events/${eventId}/feedback`)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Setup Feedback Form</h1>
                  <p className="text-sm text-gray-600">Create and customize your feedback form</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ActionButton
                  onClick={() => setShowPreview(!showPreview)}
                  variant="secondary"
                  icon={Eye}
                >
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </ActionButton>
                <ActionButton
                  onClick={saveForm}
                  variant="success"
                  icon={Save}
                  loading={isSaving}
                  disabled={formElements.length === 0}
                >
                  Save Form
                </ActionButton>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className={`grid gap-8 ${showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
            {/* Form Builder */}
            <div className="space-y-6">
              {/* Form Settings */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Form Title *
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter form title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Enter form description..."
                    />
                  </div>
                  
                  {/* Feedback End Date - Only for non-certificate events */}
                  {!isLoading && event && !event.is_certificate_based && (
                    <DateRangePicker
                      label="Feedback Collection Deadline"
                      description="Since this event doesn't distribute certificates, set a deadline for feedback collection. Participants can submit feedback until this date. Recommended: 7-14 days after event ends."
                      startDate={feedbackEndDate ? new Date(feedbackEndDate) : null}
                      endDate={null}
                      startTime="23:59"
                      endTime={null}
                      onDateChange={(date) => {
                        if (date) {
                          setFeedbackEndDate(date.toISOString().split('T')[0]);
                        } else {
                          setFeedbackEndDate('');
                        }
                      }}
                      onTimeChange={null}
                      minDate={event.end_datetime ? new Date(event.end_datetime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                      singleDate={true}
                      includeTime={false}
                      theme="green"
                      placeholder="Select feedback deadline date"
                      required={true}
                    />
                  )}
                </div>
              </div>

              {/* Form Elements */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Form Elements</h2>
                  <ActionButton
                    onClick={() => setShowElementSelector(true)}
                    variant="primary"
                    icon={Plus}
                  >
                    Add Element
                  </ActionButton>
                </div>

                {showElementSelector && (
                  <div className="mb-6">
                    <ElementSelector />
                  </div>
                )}

                <div className="space-y-4">
                  {formElements.map((element, index) => (
                    <FormElementCard
                      key={element.id}
                      element={element}
                      index={index}
                      isSelected={selectedElement?.id === element.id}
                      onSelect={setSelectedElement}
                      onUpdate={updateElement}
                      onDelete={deleteElement}
                    />
                  ))}
                </div>

                {formElements.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No elements added yet</h3>
                    <p className="text-gray-600 mb-4">
                      Start building your form by adding elements like text fields, ratings, or multiple choice questions.
                    </p>
                    <ActionButton
                      onClick={() => setShowElementSelector(true)}
                      variant="primary"
                      icon={Plus}
                    >
                      Add Your First Element
                    </ActionButton>
                  </div>
                )}
              </div>

              {/* Element Editor */}
              {selectedElement && (
                <ElementEditor
                  element={selectedElement}
                  onUpdate={updateElement}
                  onClose={() => setSelectedElement(null)}
                />
              )}
            </div>

            {/* Form Preview */}
            {showPreview && (
              <div className="lg:sticky lg:top-8">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Form Preview</h2>
                    <Eye className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    {formTitle && (
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{formTitle}</h3>
                        {formDescription && (
                          <p className="text-gray-600">{formDescription}</p>
                        )}
                      </div>
                    )}
                    
                    {formElements.length > 0 ? (
                      <FormPreview elements={formElements} />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Add elements to see the preview</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default FeedbackSetup;
