import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workItemsApi, teamsApi } from '../api/endpoints';
import { Priority, WorkItem } from '../types';
import { ArrowLeft, Save, AlertTriangle, RefreshCw } from 'lucide-react';

export const EditWorkItemPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const itemId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [version, setVersion] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: item, isLoading, refetch } = useQuery({
    queryKey: ['workItem', itemId],
    queryFn: () => workItemsApi.getItemById(itemId),
    enabled: !!itemId,
  });

  const { data: members } = useQuery({
    queryKey: ['teamMembers', item?.teamId],
    queryFn: () => (item?.teamId ? teamsApi.getTeamMembers(item.teamId) : Promise.resolve([])),
    enabled: !!item?.teamId,
  });

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
      setPriority(item.priority);
      setAssigneeId(item.assignee ? item.assignee.id : '');
      setDueDate(item.dueDate ? item.dueDate.slice(0, 16) : '');
      setVersion(item.version);
      setIsConflict(false);
      setError(null);
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConflict(false);
    setIsSubmitting(true);

    try {
      await workItemsApi.updateItem(itemId, {
        version,
        title,
        description: description || undefined,
        priority,
        assigneeId: assigneeId ? Number(assigneeId) : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workItem', itemId] }),
        queryClient.invalidateQueries({ queryKey: ['workItemActivity', itemId] }),
        queryClient.invalidateQueries({ queryKey: ['workItems'] }),
      ]);

      navigate(`/items/${itemId}`);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setIsConflict(true);
        setError(
          err.response?.data?.message ||
            'Stale update conflict: This item was modified by another user. Please refresh and review latest changes before saving.'
        );
      } else {
        setError(err.response?.data?.message || 'Failed to update work item');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshData = async () => {
    await refetch();
  };

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading work item...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(`/items/${itemId}`)}
          className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Work Item #{itemId}</h1>
          <p className="text-xs text-slate-500">
            Protected with Optimistic Concurrency Control (Version {version})
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-sm font-bold text-red-800">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>{isConflict ? 'Optimistic Lock Conflict (HTTP 409)' : 'Update Failed'}</span>
              </div>
              <p className="text-xs text-red-700">{error}</p>
              {isConflict && (
                <button
                  type="button"
                  onClick={handleRefreshData}
                  className="mt-2 inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Reload Latest Version from Server
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Priority *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs text-sm"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs text-sm"
              >
                <option value="">Unassigned</option>
                {members?.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.fullName} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Due Date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs text-sm"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(`/items/${itemId}`)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-5 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
