import React, { useState } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';

const BulkMarkModal = ({ selectedCount, onConfirm, onCancel, registrationIds }) => {
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(registrationIds, notes.trim());
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[99999] animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Mark Physical Attendance
              </h3>
              <p className="text-sm text-gray-600">
                {selectedCount} student{selectedCount !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">Bulk Attendance Marking</div>
              <div>
                This will mark <strong>{selectedCount}</strong> student{selectedCount !== 1 ? 's' : ''} as present at the event. 
                This action cannot be undone, but you can unmark individual students later if needed.
              </div>
            </div>
          </div>

          {/* Action Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">What will happen:</div>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <span>{selectedCount} student{selectedCount !== 1 ? 's' : ''} will be marked as present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Students with prior registration will become "Present"</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                <span>Students without virtual attendance will become "Physical Only"</span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
              <span className="text-gray-500 font-normal ml-1">- Add context about this bulk marking</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., 'End of event - marking all remaining students present'"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
              disabled={isProcessing}
            />
            <div className="text-xs text-gray-500 mt-1">
              These notes will be attached to each attendance record for audit purposes.
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                Mark {selectedCount} Present
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkMarkModal;
