import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, AlertCircle, ServerCrash, Search, BookOpen, Lock, ShieldAlert, Clock, Coffee, Wrench } from 'lucide-react';

const ErrorPage = ({ error: errorProp, status: statusProp }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get error from props, location state, or default to 404
  const error = errorProp || location.state?.error || {};
  const status = statusProp || error?.status || location.state?.status || 404;
  const is404 = status === 404 || error?.message?.includes('404');
  const is401 = status === 401;
  const is403 = status === 403;
  const is408 = status === 408;
  const is429 = status === 429;
  const is503 = status === 503;
  const is500 = status === 500 || status >= 500;
  
  // Error configurations for different HTTP status codes
  let errorConfig;
  
  if (is404) {
    errorConfig = {
      code: '404',
      icon: Search,
      iconColor: 'text-blue-500',
      bgGradient: 'from-blue-50 to-indigo-50',
      title: 'Oops! Wrong Classroom! 🎓',
      message: "Looks like you wandered into the wrong class. This page doesn't exist in our campus!",
      suggestions: [
        { text: 'Return to Homepage', icon: Home, action: () => navigate('/'), color: 'bg-blue-600 hover:bg-blue-700' },
        { text: 'Go Back', icon: ArrowLeft, action: () => navigate(-1), color: 'bg-gray-600 hover:bg-gray-700' },
        { text: 'View All Events', icon: BookOpen, action: () => navigate('/client/events'), color: 'bg-indigo-600 hover:bg-indigo-700' }
      ],
      funFact: "💡 Fun Fact: You're the 404th student to visit this non-existent class today! (Just kidding, but you get the point.)"
    };
  } else if (is401) {
    errorConfig = {
      code: '401',
      icon: Lock,
      iconColor: 'text-yellow-500',
      bgGradient: 'from-yellow-50 to-amber-50',
      title: 'Show Your ID Card First! 🔒',
      message: "You need to log in to access this area of campus. Please authenticate yourself to continue.",
      suggestions: [
        { text: 'Go to Login', icon: Lock, action: () => navigate('/auth/login'), color: 'bg-yellow-600 hover:bg-yellow-700' },
        { text: 'Return to Homepage', icon: Home, action: () => navigate('/'), color: 'bg-amber-600 hover:bg-amber-700' },
        { text: 'Go Back', icon: ArrowLeft, action: () => navigate(-1), color: 'bg-gray-600 hover:bg-gray-700' }
      ],
      funFact: "🎫 Tip: Make sure you're logged in with your student or faculty credentials!"
    };
  } else if (is403) {
    errorConfig = {
      code: '403',
      icon: ShieldAlert,
      iconColor: 'text-orange-500',
      bgGradient: 'from-orange-50 to-red-50',
      title: 'Faculty Only Area! 🚫',
      message: "Sorry, this section is restricted. You don't have permission to enter this classroom.",
      suggestions: [
        { text: 'Return to Homepage', icon: Home, action: () => navigate('/'), color: 'bg-orange-600 hover:bg-orange-700' },
        { text: 'Go Back', icon: ArrowLeft, action: () => navigate(-1), color: 'bg-gray-600 hover:bg-gray-700' }
      ],
      funFact: "🔐 Access Denied: This area requires special permissions. Contact your admin if you believe this is an error."
    };
  } else if (is408) {
    errorConfig = {
      code: '408',
      icon: Clock,
      iconColor: 'text-purple-500',
      bgGradient: 'from-purple-50 to-pink-50',
      title: "Oops! You're Late to Class! ⏰",
      message: "Your request took too long to complete. The server timed out waiting for your response.",
      suggestions: [
        { text: 'Try Again', icon: ArrowLeft, action: () => window.location.reload(), color: 'bg-purple-600 hover:bg-purple-700' },
        { text: 'Return to Homepage', icon: Home, action: () => navigate('/'), color: 'bg-pink-600 hover:bg-pink-700' }
      ],
      funFact: "⏱️ Pro Tip: Check your internet connection and try again. Sometimes the campus WiFi needs a moment!"
    };
  } else if (is429) {
    errorConfig = {
      code: '429',
      icon: Coffee,
      iconColor: 'text-brown-500',
      bgGradient: 'from-amber-50 to-yellow-50',
      title: 'Whoa! Slow Down There! 🐌',
      message: "You're asking too many questions at once. Take a coffee break and try again in a minute.",
      suggestions: [
        { text: 'Take a Break', icon: Coffee, action: () => navigate('/'), color: 'bg-amber-600 hover:bg-amber-700' },
        { text: 'Go Back', icon: ArrowLeft, action: () => navigate(-1), color: 'bg-gray-600 hover:bg-gray-700' }
      ],
      funFact: "☕ Rate Limited: Too many requests! Wait a moment before trying again. Our servers need to catch their breath!"
    };
  } else if (is503) {
    errorConfig = {
      code: '503',
      icon: Wrench,
      iconColor: 'text-teal-500',
      bgGradient: 'from-teal-50 to-cyan-50',
      title: 'Campus Under Maintenance! 🔧',
      message: "Our services are temporarily down for scheduled maintenance. We'll be back soon with improvements!",
      suggestions: [
        { text: 'Try Again Later', icon: ArrowLeft, action: () => window.location.reload(), color: 'bg-teal-600 hover:bg-teal-700' },
        { text: 'Return to Homepage', icon: Home, action: () => navigate('/'), color: 'bg-cyan-600 hover:bg-cyan-700' }
      ],
      funFact: "🛠️ Under Construction: Our tech team is upgrading the system. Thanks for your patience!"
    };
  } else {
    errorConfig = {
      code: is500 ? '500' : 'ERROR',
      icon: ServerCrash,
      iconColor: 'text-red-500',
      bgGradient: 'from-red-50 to-orange-50',
      title: 'Uh-oh! Our Server Needs a Break! ☕',
      message: "Don't worry, it's not you—it's us! Our servers are taking a quick study break. We're working hard to get things back on track!",
      suggestions: [
        { text: 'Return to Homepage', icon: Home, action: () => navigate('/'), color: 'bg-red-600 hover:bg-red-700' },
        { text: 'Try Again', icon: ArrowLeft, action: () => window.location.reload(), color: 'bg-orange-600 hover:bg-orange-700' }
      ],
      funFact: "🔧 Our tech team is probably debugging this right now with lots of coffee and determination!"
    };
  }

  const { code, icon: Icon, iconColor, bgGradient, title, message, suggestions, funFact } = errorConfig;

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${bgGradient} flex items-center justify-center p-4 overflow-hidden`}>
      <div className="max-w-2xl w-full">
        {/* Error Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-12 text-center">
          {/* Error Icon & Code */}
          <div className="flex justify-center mb-6">
            <div className={`relative`}>
              <div className={`absolute inset-0 ${iconColor} opacity-20 blur-2xl rounded-full`}></div>
              <Icon className={`w-24 h-24 sm:w-32 sm:h-32 ${iconColor} relative z-10`} />
            </div>
          </div>
          
          <div className={`inline-block ${iconColor} text-6xl sm:text-8xl font-bold mb-4`}>
            {code}
          </div>
          
          {/* Error Title */}
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h1>
          
          {/* Error Message */}
          <p className="text-gray-600 text-base sm:text-lg mb-8 max-w-lg mx-auto">
            {message}
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={suggestion.action}
                className={`${suggestion.color} text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium text-sm sm:text-base`}
              >
                <suggestion.icon className="w-4 h-4" />
                <span>{suggestion.text}</span>
              </button>
            ))}
          </div>
          
          {/* Fun Fact */}
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 border border-gray-200">
            {funFact}
          </div>
          
          {/* Campus Connect Branding */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <img src="/logo/ksv.png" alt="Campus Logo" className="w-6 h-6" />
              <span className="text-sm font-medium">CampusConnect</span>
            </div>
          </div>
        </div>
        
        {/* Technical Details (for developers) */}
        {error && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-auto max-h-48">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold">Dev Mode Error Details:</span>
            </div>
            <pre className="text-gray-300">
              {JSON.stringify({
                status: error.status,
                statusText: error.statusText,
                message: error.message,
                data: error.data
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorPage;
