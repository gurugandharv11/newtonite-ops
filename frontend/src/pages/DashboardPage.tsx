import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { workItemsApi } from '../api/endpoints';
import { StatusBadge, PriorityBadge, TypeBadge } from '../components/Badges';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  FileCheck,
  Briefcase,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: workItemsApi.getDashboardSummary,
  });

  const { data: recentItems, isLoading: isRecentLoading } = useQuery({
    queryKey: ['recentWorkItems'],
    queryFn: () => workItemsApi.getItems({ size: 6, sortBy: 'updatedAt', direction: 'desc' }),
  });

  const statCards = [
    {
      title: 'Assigned to Me',
      count: summary?.assignedToMeCount ?? 0,
      icon: Briefcase,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      filter: { assigneeId: 'me' },
    },
    {
      title: 'Unassigned Urgent',
      count: summary?.unassignedUrgentCount ?? 0,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50 border-red-200',
      filter: { unassigned: true, priority: 'URGENT' },
    },
    {
      title: 'Awaiting My Approval',
      count: summary?.awaitingApprovalCount ?? 0,
      icon: FileCheck,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      filter: { status: 'AWAITING_APPROVAL' },
    },
    {
      title: 'Overdue Work',
      count: summary?.overdueCount ?? 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      filter: { overdue: true },
    },
    {
      title: 'All Authorized Work',
      count: summary?.totalAuthorizedCount ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      filter: {},
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Command Center</h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time operational triage, concurrent incident claiming, and multi-team governance.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Link
            to="/items/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            Create Work Item
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => {
                const params = new URLSearchParams();
                Object.entries(card.filter).forEach(([k, v]) => params.append(k, String(v)));
                navigate(`/items?${params.toString()}`);
              }}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md cursor-pointer transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-900">
                  {isSummaryLoading ? '...' : card.count}
                </span>
              </div>
              <div className="mt-3 flex items-center text-xs text-indigo-600 font-medium hover:underline">
                View filtered list <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recently Active Work Items Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Recently Updated Work Items</h2>
          </div>
          <Link to="/items" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center">
            View all work <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        {isRecentLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading active work items...</div>
        ) : recentItems?.content?.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No active work items found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Work Item</th>
                  <th className="px-6 py-3">Team</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Assignee</th>
                  <th className="px-6 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-sm">
                {recentItems?.content?.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/items/${item.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 hover:text-indigo-600">
                        {item.title}
                      </div>
                      <div className="mt-1">
                        <TypeBadge type={item.type} />
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
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                      {new Date(item.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
