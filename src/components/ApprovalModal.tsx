'use client';

import { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Database,
  Users,
  Shield,
  Eye,
  Info
} from 'lucide-react';

interface ApprovalRequest {
  id: string;
  agent: string;
  tool: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high';
  recommendation: string;
  arguments: any;
  details?: {
    affectedRecords?: number;
    estimatedImpact?: string;
    reversible?: boolean;
  };
}

interface ApprovalModalProps {
  isOpen: boolean;
  requests: ApprovalRequest[];
  onApprove: (approvedIds: string[]) => void;
  onReject: (rejectedIds: string[]) => void;
  onClose: () => void;
  loading?: boolean;
}

export default function ApprovalModal({ 
  isOpen, 
  requests, 
  onApprove, 
  onReject, 
  onClose, 
  loading = false 
}: ApprovalModalProps) {
  const [selectedActions, setSelectedActions] = useState<Record<string, 'approve' | 'reject' | null>>({});
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getToolIcon = (tool: string) => {
    if (tool.includes('duplicate') || tool.includes('merge')) {
      return <Users className="w-4 h-4" />;
    } else if (tool.includes('clean') || tool.includes('quality')) {
      return <Database className="w-4 h-4" />;
    } else {
      return <Shield className="w-4 h-4" />;
    }
  };

  const handleActionSelect = (requestId: string, action: 'approve' | 'reject') => {
    setSelectedActions(prev => ({
      ...prev,
      [requestId]: prev[requestId] === action ? null : action
    }));
  };

  const handleSubmit = () => {
    const approved: string[] = [];
    const rejected: string[] = [];

    Object.entries(selectedActions).forEach(([id, action]) => {
      if (action === 'approve') approved.push(id);
      else if (action === 'reject') rejected.push(id);
    });

    if (approved.length > 0) onApprove(approved);
    if (rejected.length > 0) onReject(rejected);
  };

  const toggleDetails = (requestId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  const hasSelections = Object.values(selectedActions).some(action => action !== null);
  const allActioned = requests.every(req => selectedActions[req.id] !== undefined && selectedActions[req.id] !== null);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Human-in-the-Loop Approval</h2>
                <p className="text-blue-100">Review and approve critical data operations</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center hover:bg-opacity-30 transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <span className="font-medium">
                {requests.length} operation{requests.length !== 1 ? 's' : ''} require{requests.length === 1 ? 's' : ''} your approval
              </span>
            </div>
            <p className="text-gray-600 text-sm">
              These operations may modify or clean your data. Please review each action carefully before proceeding.
            </p>
          </div>

          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className={`border-2 rounded-xl p-4 transition-all ${
                selectedActions[request.id] === 'approve' ? 'border-green-300 bg-green-50' :
                selectedActions[request.id] === 'reject' ? 'border-red-300 bg-red-50' :
                'border-gray-200 hover:border-gray-300'
              }`}>
                {/* Request Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      {getToolIcon(request.tool)}
                      {getRiskIcon(request.risk_level)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{request.tool}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(request.risk_level)}`}>
                          {request.risk_level.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm mb-2">{request.description}</p>
                      <p className="text-gray-600 text-sm">{request.recommendation}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleDetails(request.id)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {showDetails[request.id] ? 'Hide' : 'Details'}
                  </button>
                </div>

                {/* Details Panel */}
                {showDetails[request.id] && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium text-gray-800 mb-2">Operation Details:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Agent:</span>
                        <span className="ml-1 text-gray-600">{request.agent}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Tool:</span>
                        <span className="ml-1 text-gray-600">{request.tool}</span>
                      </div>
                      {request.details?.affectedRecords && (
                        <div>
                          <span className="font-medium text-gray-700">Affected Records:</span>
                          <span className="ml-1 text-gray-600">{request.details.affectedRecords}</span>
                        </div>
                      )}
                      {request.details?.reversible !== undefined && (
                        <div>
                          <span className="font-medium text-gray-700">Reversible:</span>
                          <span className={`ml-1 ${request.details.reversible ? 'text-green-600' : 'text-red-600'}`}>
                            {request.details.reversible ? 'Yes' : 'No'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {request.arguments && (
                      <div className="mt-3">
                        <span className="font-medium text-gray-700">Parameters:</span>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(request.arguments, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleActionSelect(request.id, 'approve')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      selectedActions[request.id] === 'approve'
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                    disabled={loading}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  
                  <button
                    onClick={() => handleActionSelect(request.id, 'reject')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      selectedActions[request.id] === 'reject'
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                    disabled={loading}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {hasSelections ? (
                <span>
                  {Object.values(selectedActions).filter(a => a === 'approve').length} approved, {' '}
                  {Object.values(selectedActions).filter(a => a === 'reject').length} rejected
                </span>
              ) : (
                'Please review and select actions for each operation'
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={!hasSelections || loading}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Submit Decisions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
