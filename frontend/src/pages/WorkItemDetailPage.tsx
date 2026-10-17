import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workItemsApi, teamsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, TypeBadge } from '../components/Badges';
import {
  ArrowLeft,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  Send,
  History,
  MessageSquare,
  Clock,
  RefreshCw,
  Edit,
  ShieldAlert,
} from 'lucide-react';
import { WorkItemStatus, Priority } from '../types';

export const WorkItemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const itemId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, teamRoles } = useAuth();

  const [commentText, setCommentText] = useState('');
  const [transitionComment, setTransitionComment] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // Load Work Item
  const {
    data: item,
    isLoading,
    isError,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ['workItem', itemId],
    queryFn: () => workItemsApi.getItemById(itemId),
    enabled: !!itemId,
  });

  // Load Activity Timeline
  const { data: activity } = useQuery({
    queryKey: ['workItemActivity', itemId],
    queryFn: () => workItemsApi.getActivity(itemId, 0, 50),
    enabled: !!itemId,
  });

  // Load Comments
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['workItemComments', itemId],
    queryFn: () => workItemsApi.getComments(itemId),
    enabled: !!itemId,
  });

  const currentUserRole = item ? (user?.isGlobalAdmin ? 'ADMIN' : teamRoles[item.teamId] || 'VIEWER') : 'VIEWER';

  // Claim Item Mutation
  const handleClaim = async () => {
    setActionError(null);
    setIsClaiming(true);
    try {
      await workItemsApi.claimItem(itemId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workItem', itemId] }),
        queryClient.invalidateQueries({ queryKey: ['workItemActivity', itemId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }),
      ]);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to claim item');
    } finally {
      setIsClaiming(false);
    }
  };

  // Status Transition Mutation
  const handleTransition = async (targetStatus: WorkItemStatus) => {
    setActionError(null);
    try {
      await workItemsApi.transitionItem(itemId, {
        targetStatus,
        comment: transitionComment || undefined,
      });
      setTransitionComment('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workItem', itemId] }),
        queryClient.invalidateQueries({ queryKey: ['workItemActivity', itemId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }),
      ]);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to transition status');
    }
  };

  // Add Comment Mutation
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setActionError(null);
    try {
      await workItemsApi.addComment(itemId, commentText.trim());
      setCommentText('');
      await Promise.all([
        refetchComments(),
        queryClient.invalidateQueries({ queryKey: ['workItemActivity', itemId] }),
      ]);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to add comment');
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading work item details...</div>;
  }

  if (isError || !item) {
    const errorMsg = (loadError as any)?.response?.data?.message || 'Work item not found or you lack permission.';
    return (
      <div className="bg-white p-8 rounded-2xl border border-red-200 text-center space-y-4 max-w-lg mx-auto">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600">{errorMsg}</p>
        <button
          onClick={() => navigate('/items')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
        >
          Back to Work Items
        </button>
      </div>
    );
  }

  // Permitted state actions calculation based on role and current state
  const isLeadOrAdmin = currentUserRole === 'LEAD' || currentUserRole === 'ADMIN';
  const isMemberOrAbove = ['MEMBER', 'LEAD', 'ADMIN'].includes(currentUserRole);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/items')}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold text-slate-400">#{item.id}</span>
              <span className="text-xs text-slate-400">v{item.version}</span>
              <TypeBadge type={item.type} />
              <PriorityBadge priority={item.priority} />
              <StatusBadge status={item.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{item.title}</h1>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            title="Refresh item"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isMemberOrAbove && (
            <button
              onClick={() => navigate(`/items/${item.id}/edit`)}
              className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Edit className="w-4 h-4 mr-1.5" />
              Edit
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-700 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Action Rejected:</span> {actionError}
          </div>
        </div>
      )}

      {/* Main Grid: Details + Workflow Actions & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Details & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Item Details Card */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Description & Context
            </h2>
            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {item.description || <span className="italic text-slate-400">No detailed description provided.</span>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Team</span>
                <span className="font-semibold text-slate-800">{item.teamName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Creator</span>
                <span className="font-semibold text-slate-800">{item.creator.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Assignee</span>
                <span className="font-semibold text-slate-800">
                  {item.assignee ? item.assignee.fullName : <span className="text-red-500 italic">Unassigned</span>}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Due Date</span>
                <span className="font-semibold text-slate-800">
                  {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Discussion & Comments */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Discussion ({comments?.length || 0})</h2>
            </div>

            <div className="space-y-4">
              {comments?.map((c) => (
                <div key={c.id} className="p-4 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-800">{c.author.fullName}</span>
                    <span className="text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}

              {comments?.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No comments yet. Start the conversation below.
                </div>
              )}
            </div>

            {/* Comment Form */}
            {isMemberOrAbove && (
              <form onSubmit={handleAddComment} className="pt-2">
                <textarea
                  rows={3}
                  required
                  placeholder="Add an operational note or update..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-xs"
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    Post Comment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Workflow Actions & Audit Timeline */}
        <div className="space-y-6">
          {/* Workflow Action Panel */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Workflow Actions
            </h2>

            {/* Claim Button */}
            {!item.assignee && isMemberOrAbove && (
              <button
                type="button"
                disabled={isClaiming}
                onClick={handleClaim}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-xs transition"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                {isClaiming ? 'Claiming Item...' : 'Claim Work Item'}
              </button>
            )}

            {/* Transition comment box */}
            {isMemberOrAbove && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Transition Reason / Note:
                </label>
                <input
                  type="text"
                  placeholder="Optional transition context..."
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {/* State Transition Action Buttons */}
            <div className="space-y-2 pt-2">
              {item.status === 'OPEN' && isMemberOrAbove && (
                <button
                  type="button"
                  onClick={() => handleTransition('IN_PROGRESS')}
                  className="w-full py-2 px-3 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition"
                >
                  Start Investigation (IN_PROGRESS)
                </button>
              )}

              {item.status === 'IN_PROGRESS' && isMemberOrAbove && (
                <>
                  <button
                    type="button"
                    onClick={() => handleTransition('AWAITING_APPROVAL')}
                    className="w-full py-2 px-3 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition"
                  >
                    Submit for Approval (AWAITING_APPROVAL)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransition('OPEN')}
                    className="w-full py-2 px-3 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Return to Open Queue (OPEN)
                  </button>
                </>
              )}

              {item.status === 'AWAITING_APPROVAL' && (
                <div className="space-y-2">
                  {isLeadOrAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleTransition('RESOLVED')}
                      className="w-full py-2 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm transition"
                    >
                      Approve & Resolve (RESOLVED)
                    </button>
                  ) : (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <strong>Lead Sign-Off Required:</strong> Only team Leads or Administrators can approve this item.
                    </div>
                  )}

                  {isMemberOrAbove && (
                    <button
                      type="button"
                      onClick={() => handleTransition('IN_PROGRESS')}
                      className="w-full py-2 px-3 border border-red-300 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-50 transition"
                    >
                      Reject to In Progress
                    </button>
                  )}
                </div>
              )}

              {item.status === 'RESOLVED' && isMemberOrAbove && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleTransition('CLOSED')}
                    className="w-full py-2 px-3 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition"
                  >
                    Close Work Item (CLOSED)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransition('IN_PROGRESS')}
                    className="w-full py-2 px-3 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                  >
                    Reopen to In Progress
                  </button>
                </div>
              )}

              {item.status === 'CLOSED' && user?.isGlobalAdmin && (
                <button
                  type="button"
                  onClick={() => handleTransition('IN_PROGRESS')}
                  className="w-full py-2 px-3 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition"
                >
                  Admin Override: Reopen Work Item
                </button>
              )}
            </div>
          </div>

          {/* Activity Event Timeline */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <History className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Activity History</h2>
            </div>

            <div className="flow-root max-h-96 overflow-y-auto pr-1">
              <ul className="-mb-8">
                {activity?.content?.map((event, idx) => (
                  <li key={event.id}>
                    <div className="relative pb-8">
                      {idx !== (activity?.content?.length || 0) - 1 ? (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center ring-4 ring-white text-xs font-bold text-indigo-600">
                            {event.actionType.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-xs text-slate-800 font-semibold">
                              {event.actor?.fullName || 'System'}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{event.message}</p>
                            {event.oldValue && event.newValue && (
                              <div className="text-3xs text-slate-400 mt-0.5 font-mono">
                                {event.oldValue} &rarr; {event.newValue}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-3xs whitespace-nowrap text-slate-400">
                            {new Date(event.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
