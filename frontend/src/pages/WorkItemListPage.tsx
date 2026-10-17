import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workItemsApi, teamsApi } from '../api/endpoints';
import { StatusBadge, PriorityBadge, TypeBadge } from '../components/Badges';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { Priority, WorkItemStatus, WorkItemType } from '../types';

export const WorkItemListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filter state synced with URL query params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [teamId, setTeamId] = useState(searchParams.get('teamId') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [unassigned, setUnassigned] = useState(searchParams.get('unassigned') === 'true');
  const [overdue, setOverdue] = useState(searchParams.get('overdue') === 'true');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 0);

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.getTeams,
  });

  const queryParams: Record<string, any> = {
    page,
    size: 15,
    sortBy: 'updatedAt',
    direction: 'desc',
  };
  if (search) queryParams.search = search;
  if (teamId) queryParams.teamId = teamId;
  if (status) queryParams.status = status;
  if (priority) queryParams.priority = priority;
  if (type) queryParams.type = type;
  if (unassigned) queryParams.unassigned = true;
  if (overdue) queryParams.overdue = true;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workItems', queryParams],
    queryFn: () => workItemsApi.getItems(queryParams),
  });

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    const newParams: Record<string, string> = { page: '0' };
    if (search) newParams.search = search;
    if (teamId) newParams.teamId = teamId;
    if (status) newParams.status = status;
    if (priority) newParams.priority = priority;
    if (type) newParams.type = type;
    if (unassigned) newParams.unassigned = 'true';
    if (overdue) newParams.overdue = 'true';
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearch('');
    setTeamId('');
    setStatus('');
    setPriority('');
    setType('');
    setUnassigned(false);
    setOverdue(false);
    setPage(0);
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Work Items</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse, search, and manage all work items within your authorized teams.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/items/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Work Item
          </button>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Title or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 w-full border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Team Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Team</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full py-1.5 px-3 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Teams</option>
                {teams?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full py-1.5 px-3 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="AWAITING_APPROVAL">Awaiting Approval</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full py-1.5 px-3 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full py-1.5 px-3 border border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Types</option>
                <option value="CUSTOMER_ISSUE">Customer Issue</option>
                <option value="ENGINEERING_PROBLEM">Engineering Problem</option>
                <option value="PAYMENT_INVESTIGATION">Payment Investigation</option>
                <option value="PRODUCTION_INCIDENT">Production Incident</option>
                <option value="COMPLIANCE_REQUEST">Compliance Request</option>
                <option value="GENERAL_TASK">General Task</option>
              </select>
            </div>
          </div>

          {/* Quick Checkbox toggles and submit */}
          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-6 text-xs text-slate-700">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={unassigned}
                  onChange={(e) => setUnassigned(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="ml-2 font-medium">Unassigned Only</span>
              </label>

              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={overdue}
                  onChange={(e) => setOverdue(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <span className="ml-2 font-medium text-red-700">Overdue Only</span>
              </label>
            </div>

            <div className="flex space-x-2 mt-2 sm:mt-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
              >
                Reset
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Work Items Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading work items...</div>
        ) : isError ? (
          <div className="p-12 text-center text-sm text-red-600">Failed to load work items. Please check network.</div>
        ) : data?.content?.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No work items matched the specified criteria.
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Work Item</th>
                    <th className="px-6 py-3">Team</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">Assignee</th>
                    <th className="px-6 py-3">Due Date</th>
                    <th className="px-6 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-sm">
                  {data?.content?.map((item) => {
                    const isItemOverdue =
                      item.dueDate &&
                      new Date(item.dueDate) < new Date() &&
                      ['OPEN', 'IN_PROGRESS', 'AWAITING_APPROVAL'].includes(item.status);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => navigate(`/items/${item.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
                          #{item.id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 hover:text-indigo-600">
                            {item.title}
                          </div>
                          <div className="mt-1 flex items-center space-x-2">
                            <TypeBadge type={item.type} />
                            <span className="text-xs text-slate-400">v{item.version}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium text-xs">
                          {item.teamName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PriorityBadge priority={item.priority} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-xs">
                          {item.assignee ? (
                            <span className="font-medium text-slate-800">{item.assignee.fullName}</span>
                          ) : (
                            <span className="text-red-500 font-semibold italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          {item.dueDate ? (
                            <span className={isItemOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}>
                              {new Date(item.dueDate).toLocaleDateString()}
                              {isItemOverdue && ' (Overdue)'}
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing page <span className="font-semibold">{(data?.page ?? 0) + 1}</span> of{' '}
                <span className="font-semibold">{Math.max(data?.totalPages ?? 1, 1)}</span> ({data?.totalElements ?? 0} total items)
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={data?.first ?? true}
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                <button
                  disabled={data?.last ?? true}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
