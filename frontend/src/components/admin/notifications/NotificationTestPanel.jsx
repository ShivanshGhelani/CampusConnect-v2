import React, { useState } from 'react';
import { useNotifications } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { 
  BeakerIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

const NotificationTestPanel = () => {
  const { user } = useAuth();
  const { createNotification, triggerPendingNotifications } = useNotifications();
  const [isCreating, setIsCreating] = useState(false);
  const [isTriggeringPending, setIsTriggeringPending] = useState(false);
  const [testResults, setTestResults] = useState([]);

  const addTestResult = (type, message) => {
    const result = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
  };

  // Test creating a notification
  const testCreateNotification = async () => {
    setIsCreating(true);
    try {
      const testNotification = {
        type: 'event_approval_request',
        title: `Test Event Approval Request - ${new Date().toLocaleTimeString()}`,
        message: 'This is a test notification created for testing purposes. This event requires approval.',
        recipient_username: user.username, // Send to self for testing
        priority: 'high',
        action_required: true,
        action_type: 'approve_event',
        related_entity_type: 'event',
        related_entity_id: `test_event_${Date.now()}`,
        expires_in_hours: 24
      };

      const result = await createNotification(testNotification);
      if (result.success) {
        addTestResult('success', `Test notification created successfully (ID: ${result.notificationId})`);
      } else {
        addTestResult('error', `Failed to create test notification: ${result.error}`);
      }
    } catch (error) {
      addTestResult('error', `Error creating test notification: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Test triggering pending notifications
  const testTriggerPending = async () => {
    setIsTriggeringPending(true);
    try {
      const result = await triggerPendingNotifications();
      if (result.success) {
        addTestResult('success', `Pending notifications triggered: ${result.data?.notifications_sent || 0} notifications sent for ${result.data?.events_processed || 0} events`);
      } else {
        addTestResult('error', `Failed to trigger pending notifications: ${result.error}`);
      }
    } catch (error) {
      addTestResult('error', `Error triggering pending notifications: ${error.message}`);
    } finally {
      setIsTriggeringPending(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return null; // Only show for super admins
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <BeakerIcon className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Notification System Test Panel</h3>
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Super Admin Only</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Test Create Notification */}
        <button
          onClick={testCreateNotification}
          disabled={isCreating}
          className="flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-blue-300 hover:border-blue-400 rounded-lg transition-colors disabled:opacity-50"
        >
          <BeakerIcon className={`h-5 w-5 text-blue-600 ${isCreating ? 'animate-pulse' : ''}`} />
          <span className="font-medium text-blue-600">
            {isCreating ? 'Creating Test Notification...' : 'Create Test Notification'}
          </span>
        </button>

        {/* Test Trigger Pending */}
        <button
          onClick={testTriggerPending}
          disabled={isTriggeringPending}
          className="flex items-center justify-center space-x-3 p-4 border-2 border-dashed border-green-300 hover:border-green-400 rounded-lg transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 text-green-600 ${isTriggeringPending ? 'animate-spin' : ''}`} />
          <span className="font-medium text-green-600">
            {isTriggeringPending ? 'Triggering Pending...' : 'Trigger Pending Events'}
          </span>
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Test Results</h4>
          <div className="space-y-2">
            {testResults.map((result) => (
              <div
                key={result.id}
                className={`flex items-start space-x-3 p-3 rounded-lg text-sm ${
                  result.type === 'success' 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {result.type === 'success' ? (
                  <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <ExclamationCircleIcon className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{result.message}</p>
                  <p className="text-xs opacity-75 mt-1">{result.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Testing Instructions:</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• <strong>Create Test Notification:</strong> Creates a test approval notification for yourself</li>
              <li>• <strong>Trigger Pending Events:</strong> Scans database for events with status 'pending_approval' and creates notifications</li>
              <li>• Check the notification list after running tests to verify functionality</li>
              <li>• Test notifications will appear in your notification center</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationTestPanel;
