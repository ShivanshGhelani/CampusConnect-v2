import React from 'react';
import { Target, Calendar, Activity, Flag, Clock, Timer, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Strategy Information Component
 * Displays strategy-specific information and requirements
 */
export const StrategyInfoCard = ({ strategy, criteria, sessions = [] }) => {
  const getStrategyConfig = () => {
    switch (strategy) {
      case 'single_mark':
        return {
          icon: Target,
          name: 'Single Mark Strategy',
          color: 'blue',
          description: 'Students need to mark attendance once during the event to be considered present.',
          requirements: 'Present during the event period'
        };
      case 'session_based':
        return {
          icon: Activity,
          name: 'Session-Based Strategy',
          color: 'purple',
          description: `Students must attend at least ${criteria?.minimum_percentage || 75}% of sessions to be marked present.`,
          requirements: `${sessions.length} sessions available, ${criteria?.minimum_percentage || 75}% attendance required`
        };
      case 'day_based':
        return {
          icon: Calendar,
          name: 'Day-Based Strategy',
          color: 'green',
          description: `Students must attend at least ${criteria?.minimum_percentage || 80}% of event days to be marked present.`,
          requirements: `Multi-day event, ${criteria?.minimum_percentage || 80}% attendance required`
        };
      case 'milestone_based':
        return {
          icon: Flag,
          name: 'Milestone-Based Strategy',
          color: 'yellow',
          description: 'Students must complete all mandatory milestones to be marked present.',
          requirements: 'All mandatory milestones must be completed'
        };
      case 'continuous':
        return {
          icon: Activity,
          name: 'Continuous Monitoring Strategy',
          color: 'indigo',
          description: `Students must maintain ${criteria?.minimum_percentage || 90}% engagement throughout the event.`,
          requirements: `${criteria?.minimum_percentage || 90}% continuous engagement required`
        };
      default:
        return {
          icon: Target,
          name: 'Default Strategy',
          color: 'gray',
          description: 'Standard attendance tracking',
          requirements: 'Basic attendance required'
        };
    }
  };

  const config = getStrategyConfig();
  const Icon = config.icon;

  return (
    <div className={`bg-${config.color}-50 border border-${config.color}-200 rounded-lg p-4`}>
      <div className="flex items-center space-x-2 mb-2">
        <Icon className={`w-5 h-5 text-${config.color}-600`} />
        <h3 className={`text-sm font-medium text-${config.color}-900`}>{config.name}</h3>
      </div>
      <p className={`text-sm text-${config.color}-700 mb-2`}>{config.description}</p>
      <div className={`text-xs text-${config.color}-600 bg-${config.color}-100 rounded px-2 py-1 inline-block`}>
        📋 {config.requirements}
      </div>
    </div>
  );
};

/**
 * Session Status Component
 * Shows session status with appropriate styling
 */
export const SessionStatus = ({ status, isCompact = false }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          color: 'green',
          icon: CheckCircle,
          label: 'Active'
        };
      case 'pending':
        return {
          color: 'gray',
          icon: Clock,
          label: 'Pending'
        };
      case 'completed':
        return {
          color: 'blue',
          icon: CheckCircle,
          label: 'Completed'
        };
      default:
        return {
          color: 'gray',
          icon: AlertCircle,
          label: 'Unknown'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (isCompact) {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-${config.color}-100 text-${config.color}-800`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 bg-${config.color}-50 border border-${config.color}-200 rounded-lg`}>
      <Icon className={`w-4 h-4 text-${config.color}-600`} />
      <span className={`text-sm font-medium text-${config.color}-900`}>{config.label}</span>
    </div>
  );
};

/**
 * Session Timer Component
 * Shows countdown for active sessions
 */
export const SessionTimer = ({ endTime, onExpired }) => {
  const [timeRemaining, setTimeRemaining] = React.useState(null);

  React.useEffect(() => {
    if (!endTime) return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(endTime);
      const remaining = Math.max(0, end - now);

      if (remaining === 0 && onExpired) {
        onExpired();
      }

      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpired]);

  if (!timeRemaining) return null;

  const formatTime = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isUrgent = timeRemaining < 10 * 60 * 1000; // Less than 10 minutes

  return (
    <div className={`flex items-center space-x-2 text-sm ${isUrgent ? 'text-red-700' : 'text-green-700'}`}>
      <Timer className="w-4 h-4" />
      <span className="font-mono font-medium">
        {timeRemaining > 0 ? formatTime(timeRemaining) : 'Expired'}
      </span>
      {isUrgent && timeRemaining > 0 && (
        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
          Ending Soon
        </span>
      )}
    </div>
  );
};

/**
 * Progress Bar Component
 * Shows attendance progress for different strategies
 */
export const AttendanceProgress = ({ current, total, strategy, className = '' }) => {
  if (!total || total === 0) return null;

  const percentage = Math.round((current / total) * 100);
  const isComplete = current >= total;

  const getProgressColor = () => {
    if (isComplete) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStrategyLabel = () => {
    switch (strategy) {
      case 'session_based':
        return `${current}/${total} sessions`;
      case 'day_based':
        return `${current}/${total} days`;
      case 'milestone_based':
        return `${current}/${total} milestones`;
      default:
        return `${percentage}%`;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Progress</span>
        <span className="font-medium text-gray-900">{getStrategyLabel()}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isComplete && (
        <div className="flex items-center space-x-1 text-xs text-green-700">
          <CheckCircle className="w-3 h-3" />
          <span>Requirements met</span>
        </div>
      )}
    </div>
  );
};

/**
 * Session Grid Component
 * Displays sessions in a grid layout with status
 */
export const SessionGrid = ({ sessions = [], onSessionSelect, selectedSessionId }) => {
  if (!sessions.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>No sessions available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map((session) => (
        <div
          key={session.session_id}
          onClick={() => onSessionSelect?.(session)}
          className={`border rounded-lg p-4 cursor-pointer transition-all ${
            selectedSessionId === session.session_id
              ? 'ring-2 ring-blue-500 border-blue-300 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
          } ${session.status === 'active' ? 'bg-green-50 border-green-200' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900 truncate">{session.session_name}</h4>
            <SessionStatus status={session.status} isCompact />
          </div>
          
          <p className="text-sm text-gray-600 mb-2">
            {new Date(session.start_time).toLocaleTimeString()} - 
            {new Date(session.end_time).toLocaleTimeString()}
          </p>
          
          {session.status === 'active' && (
            <SessionTimer 
              endTime={session.end_time}
              onExpired={() => {
                // Handle session expiration
                console.log(`Session ${session.session_id} expired`);
              }}
            />
          )}
          
          {session.is_mandatory && (
            <div className="mt-2">
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                Mandatory
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Strategy Router Component
 * Routes to appropriate interface based on strategy
 */
export const StrategyRouter = ({ strategy, ...props }) => {
  // This will be implemented as we build strategy-specific interfaces
  const strategyComponents = {
    single_mark: () => null, // Will use existing interface
    session_based: () => null, // Will implement SessionBasedInterface
    day_based: () => null, // Will implement DayBasedInterface  
    milestone_based: () => null, // Will implement MilestoneInterface
    continuous: () => null // Will implement ContinuousInterface
  };

  const Component = strategyComponents[strategy] || strategyComponents.single_mark;
  return <Component {...props} />;
};
