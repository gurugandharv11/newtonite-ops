import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { teamsApi, workItemsApi } from '../api/endpoints';
import { WorkItemType, Priority } from '../types';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';

export const CreateWorkItemPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<WorkItemType>('CUSTOMER_ISSUE');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [teamId, setTeamId] = useState<number | ''>('');
  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(`idem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.getTeams,
  });

  const { data: members } = useQuery({
    queryKey: ['teamMembers', teamId],
    queryFn: () => (teamId ? teamsApi.getTeamMembers(Number(teamId)) : Promise.resolve([])),
    enabled: !!teamId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) {
      setError('Please select a team');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await workItemsApi.createItem(
        {
          title,
          description: description || undefined,
          type,
          priority,
          teamId: Number(teamId),
          assigneeId: assigneeId ? Number(assigneeId) : undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        },
        idempotencyKey
      );

      navigate(`/items/${res.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create work item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 border border-slate-300 rounded-lg bg-white text-slate-600 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Work Item</h1>
          <p className="text-xs text-slate-500">
            Submit a new operational issue, incident, or task with persistent idempotency protection.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Idempotency Key Banner */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Idempotency-Key Header:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700">
                {idempotencyKey}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIdempotencyKey(`idem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`)}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Regenerate Key
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Production database connection pool spike"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">Description</label>
            <textarea
              rows={4}
              placeholder="Provide background, steps to reproduce, or operational context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WorkItemType)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs text-sm"
              >
                <option value="CUSTOMER_ISSUE">Customer Issue</option>
                <option value="ENGINEERING_PROBLEM">Engineering Problem</option>
                <option value="PAYMENT_INVESTIGATION">Payment Investigation</option>
                <option value="PRODUCTION_INCIDENT">Production Incident</option>
                <option value="COMPLIANCE_REQUEST">Compliance Request</option>
                <option value="GENERAL_TASK">General Task</option>
              </select>
            </div>

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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">Team *</label>
              <select
                required
                value={teamId}
                onChange={(e) => {
                  setTeamId(Number(e.target.value));
                  setAssigneeId('');
                }}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs text-sm"
              >
                <option value="">Select Team</option>
                {teams?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.currentUserRole})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Assignee (Optional)</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}
                disabled={!teamId}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-xs text-sm disabled:bg-slate-100"
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
            <label className="block text-sm font-semibold text-slate-700">Due Date (Optional)</label>
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
              onClick={() => navigate(-1)}
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
              {isSubmitting ? 'Creating Item...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
