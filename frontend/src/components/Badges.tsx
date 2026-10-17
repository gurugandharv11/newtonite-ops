import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Priority, WorkItemStatus, WorkItemType } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const StatusBadge: React.FC<{ status: WorkItemStatus }> = ({ status }) => {
  const styles: Record<WorkItemStatus, string> = {
    OPEN: 'bg-blue-100 text-blue-800 border-blue-200',
    IN_PROGRESS: 'bg-amber-100 text-amber-800 border-amber-200',
    AWAITING_APPROVAL: 'bg-purple-100 text-purple-800 border-purple-200',
    RESOLVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    CLOSED: 'bg-slate-100 text-slate-700 border-slate-300',
  };

  const labels: Record<WorkItemStatus, string> = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    AWAITING_APPROVAL: 'Awaiting Approval',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        styles[status] || 'bg-slate-100 text-slate-800'
      )}
    >
      {labels[status] || status}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const styles: Record<Priority, string> = {
    LOW: 'bg-slate-100 text-slate-700 border-slate-200',
    MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    URGENT: 'bg-red-100 text-red-800 border-red-200 animate-pulse font-bold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        styles[priority] || 'bg-slate-100 text-slate-800'
      )}
    >
      {priority}
    </span>
  );
};

export const TypeBadge: React.FC<{ type: WorkItemType }> = ({ type }) => {
  const labels: Record<WorkItemType, string> = {
    CUSTOMER_ISSUE: 'Customer Issue',
    ENGINEERING_PROBLEM: 'Engineering Problem',
    PAYMENT_INVESTIGATION: 'Payment Investigation',
    PRODUCTION_INCIDENT: 'Production Incident',
    COMPLIANCE_REQUEST: 'Compliance Request',
    GENERAL_TASK: 'General Task',
  };

  return (
    <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
      {labels[type] || type}
    </span>
  );
};
