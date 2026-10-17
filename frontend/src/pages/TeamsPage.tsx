import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teamsApi } from '../api/endpoints';
import { Users, Shield, Layers, UserCheck } from 'lucide-react';
import { TeamRole } from '../types';

export const TeamsPage: React.FC = () => {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const { data: teams, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.getTeams,
  });

  const activeTeamId = selectedTeamId || (teams && teams.length > 0 ? teams[0].id : null);

  const { data: members, isLoading: isMembersLoading } = useQuery({
    queryKey: ['teamMembers', activeTeamId],
    queryFn: () => (activeTeamId ? teamsApi.getTeamMembers(activeTeamId) : Promise.resolve([])),
    enabled: !!activeTeamId,
  });

  const getRoleBadge = (role: TeamRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'LEAD':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEMBER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VIEWER':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teams & Membership Rosters</h1>
        <p className="mt-1 text-sm text-slate-500">
          Governance structure, role segregation (LEAD vs MEMBER vs VIEWER), and member assignment scopes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
            Authorized Teams
          </h2>
          {isTeamsLoading ? (
            <div className="p-4 text-xs text-slate-400">Loading teams...</div>
          ) : (
            <div className="space-y-1">
              {teams?.map((team) => {
                const isSelected = team.id === activeTeamId;
                return (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-xs'
                        : 'border-transparent hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm">{team.name}</span>
                      <span
                        className={`text-3xs px-2 py-0.5 rounded font-bold border ${getRoleBadge(
                          team.currentUserRole
                        )}`}
                      >
                        {team.currentUserRole}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{team.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Team Members Roster */}
        <div className="md:col-span-2 bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Team Members & Access Rights
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {members?.length || 0} Members in Roster
            </span>
          </div>

          {isMembersLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading members...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Team Role</th>
                    <th className="px-4 py-3">Capabilities</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-sm">
                  {members?.map((m) => (
                    <tr key={m.userId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {m.fullName}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        @{m.username}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadge(
                            m.role
                          )}`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {m.role === 'LEAD'
                          ? 'Approve items, reassign, claim, edit, view'
                          : m.role === 'MEMBER'
                          ? 'Create, claim, transition, comment, view'
                          : 'Read-only item & timeline access'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
