import React from 'react';
import { 
  Star, 
  MessageSquare
} from 'lucide-react';

const FeedbackResponseCard = ({ 
  response, 
  feedbackForm,
  showStudentInfo = true,
  className = '' 
}) => {
  // Helper function to format date/time
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Recently';
    }
  };

  // Helper function to render response value in compact format
  const renderCompactResponse = (element, value) => {
    if (!value && value !== 0) return null;

    switch (element.type) {
      case 'rating':
      case 'star_rating':
        const rating = parseInt(value);
        const maxRating = element.props?.max || element.properties?.max || 5;
        return (
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-md">
            <div className="flex">
              {[...Array(maxRating)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-yellow-700 ml-1">
              {rating}/{maxRating}
            </span>
          </div>
        );

      case 'checkbox':
      case 'checkboxes':
        const selectedOptions = Array.isArray(value) ? value : [value];
        if (selectedOptions.length === 0) return null;
        
        return (
          <div className="bg-blue-50 px-2 py-1 rounded-md">
            <div className="flex items-center gap-1 mb-1">
              <CheckSquare className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">
                {selectedOptions.length} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedOptions.slice(0, 3).map((option, index) => (
                <span
                  key={index}
                  className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded"
                >
                  {option.length > 12 ? option.substring(0, 12) + '...' : option}
                </span>
              ))}
              {selectedOptions.length > 3 && (
                <span className="text-xs text-blue-600">+{selectedOptions.length - 3}</span>
              )}
            </div>
          </div>
        );

      case 'radio':
      case 'radio_buttons':
      case 'select':
      case 'dropdown':
        return (
          <div className="bg-green-50 px-2 py-1 rounded-md flex items-center gap-1">
            <Circle className="w-3 h-3 text-green-600" />
            <span className="text-xs font-medium text-green-700 truncate max-w-24">
              {value}
            </span>
          </div>
        );

      case 'textarea':
        const truncatedText = value.length > 80 ? value.substring(0, 80) + '...' : value;
        return (
          <div className="bg-gray-50 px-2 py-1 rounded-md">
            <div className="flex items-start gap-1">
              <Quote className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-700 leading-relaxed">
                {truncatedText}
              </p>
            </div>
          </div>
        );

      case 'text':
      case 'text_input':
        return (
          <div className="bg-purple-50 px-2 py-1 rounded-md flex items-center gap-1">
            <Type className="w-3 h-3 text-purple-600" />
            <span className="text-xs text-purple-700 truncate max-w-32">
              {value}
            </span>
          </div>
        );

      case 'number':
      case 'number_input':
        return (
          <div className="bg-indigo-50 px-2 py-1 rounded-md flex items-center gap-1">
            <Hash className="w-3 h-3 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700">
              {value}
            </span>
          </div>
        );

      case 'date':
      case 'date_input':
        return (
          <div className="bg-teal-50 px-2 py-1 rounded-md flex items-center gap-1">
            <Calendar className="w-3 h-3 text-teal-600" />
            <span className="text-xs text-teal-700">
              {new Date(value).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        );

      default:
        return (
          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {value}
          </span>
        );
    }
  };

  // Get overall sentiment based on ratings
  const getOverallSentiment = () => {
    if (!feedbackForm?.elements) return null;
    
    const ratingElements = feedbackForm.elements.filter(el => 
      el.type === 'rating' || el.type === 'star_rating'
    );
    
    if (ratingElements.length === 0) return null;
    
    const ratings = ratingElements.map(el => {
      const value = response.responses?.[el.id];
      const max = el.props?.max || el.properties?.max || 5;
      return value ? (parseInt(value) / max) * 100 : 0;
    });
    
    const avgRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    
    if (avgRating >= 80) return { label: '😍', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-800' };
    if (avgRating >= 60) return { label: '😊', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
    if (avgRating >= 40) return { label: '😐', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' };
    return { label: '😞', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-800' };
  };

  const sentiment = getOverallSentiment();
  const respondentName = response.student_info?.name || response.faculty_info?.name || 'Anonymous';
  const respondentId = response.student_info?.enrollment_no || response.faculty_info?.employee_id || 'N/A';
  const responseElements = feedbackForm?.elements?.filter(element => {
    const value = response.responses?.[element.id];
    return value !== null && value !== undefined && value !== '' && 
           (Array.isArray(value) ? value.length > 0 : true);
  }) || [];

  // Calculate completion percentage
  const totalElements = feedbackForm?.elements?.length || 1;
  const completedElements = responseElements.length;
  const completionPercentage = Math.round((completedElements / totalElements) * 100);

  // Helper function to categorize and group responses
  const categorizeResponses = () => {
    const categories = {
      ratings: [],
      choices: [],
      text: [],
      other: []
    };

    responseElements.forEach((element) => {
      const value = response.responses[element.id];
      if (!value && value !== 0) return;

      if (element.type === 'rating' || element.type === 'star_rating') {
        categories.ratings.push({ element, value });
      } else if (element.type === 'radio' || element.type === 'radio_buttons' || 
                 element.type === 'select' || element.type === 'dropdown' ||
                 element.type === 'checkbox' || element.type === 'checkboxes') {
        categories.choices.push({ element, value });
      } else if (element.type === 'textarea' || element.type === 'text' || element.type === 'text_input') {
        categories.text.push({ element, value });
      } else {
        categories.other.push({ element, value });
      }
    });

    return categories;
  };

  const categories = categorizeResponses();
  const hasContent = Object.values(categories).some(cat => cat.length > 0);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg hover:shadow-sm hover:border-blue-200 transition-all duration-200 ${className}`}>
      {/* Header with User Info */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
            {response.student_info?.avatar_url ? (
              <img 
                src={response.student_info.avatar_url} 
                alt={respondentName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-blue-700">
                {respondentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </span>
            )}
          </div>
          
          {/* User Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {showStudentInfo ? respondentName : 'Anonymous User'}
                </div>
                <div className="text-xs text-gray-500">
                  {showStudentInfo && response.student_info?.department && (
                    <span>{response.student_info.department}</span>
                  )}
                </div>
              </div>
              
              {/* Ratings Summary */}
              <div className="flex items-center gap-2">
                {categories.ratings.length > 0 && (
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.round(categories.ratings.reduce((acc, {value}) => acc + parseInt(value), 0) / categories.ratings.length) 
                            ? 'fill-current text-yellow-400' 
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
                {completionPercentage === 100 && (
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-4 space-y-3">
        {/* Individual Ratings (excluding overall_rating which is shown in header) */}
        {categories.ratings.filter(r => r.element.id !== 'overall_rating').length > 0 && (
          <div className="space-y-2">
            {categories.ratings.filter(r => r.element.id !== 'overall_rating').map(({ element, value }) => (
              <div key={element.id} className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600 truncate flex-shrink-0 max-w-[120px]">
                  {element.label?.length > 20 ? element.label.substring(0, 20) + '...' : element.label}
                </span>
                <div className="flex items-center gap-1">
                  {[...Array(element.props?.max || element.properties?.max || 5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < parseInt(value) ? 'fill-current text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Text Responses */}
        {categories.text.length > 0 && (
          <div className="space-y-2">
            {categories.text.map(({ element, value }) => (
              <div key={element.id}>
                {element.label && (
                  <div className="text-xs font-medium text-gray-500 mb-1 truncate">
                    {element.label.length > 35 ? element.label.substring(0, 35) + '...' : element.label}
                  </div>
                )}
                <div className="text-sm text-gray-800 leading-relaxed">
                  {element.type === 'textarea' ? (
                    <div className="whitespace-pre-wrap">{value}</div>
                  ) : (
                    <span>{value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Choices as Tags */}
        {categories.choices.length > 0 && (
          <div className="space-y-2">
            {categories.choices.map(({ element, value }) => (
              <div key={element.id} className="space-y-1">
                {element.label && (
                  <div className="text-xs text-gray-500 truncate">
                    {element.label.length > 30 ? element.label.substring(0, 30) + '...' : element.label}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {element.type === 'checkbox' || element.type === 'checkboxes' ? (
                    (Array.isArray(value) ? value : [value]).map((option, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-xs font-medium text-blue-700">
                        {option}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700">
                      {value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Other Data (compact) */}
        {categories.other.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            {categories.other.map(({ element, value }) => (
              <span key={element.id}>
                {element.type === 'date' || element.type === 'date_input' ? (
                  new Date(value).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                ) : (
                  value
                )}
              </span>
            ))}
          </div>
        )}

        {/* No Content State */}
        {!hasContent && (
          <div className="flex items-center justify-center py-4 text-gray-400">
            <MessageSquare className="h-5 w-5 mr-2" />
            <span className="text-sm">No responses available</span>
          </div>
        )}
      </div>

      {/* Timestamp at bottom right */}
      <div className="px-4 pb-3 flex justify-end">
        <span className="text-xs text-gray-400">
          {formatDateTime(response.submitted_at)}
        </span>
      </div>
    </div>
  );
};

export default FeedbackResponseCard;
