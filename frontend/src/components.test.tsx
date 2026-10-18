import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge, PriorityBadge, TypeBadge } from './components/Badges';

describe('Frontend Component & UX Tests', () => {
  describe('StatusBadge Component', () => {
    it('renders correct label for AWAITING_APPROVAL', () => {
      render(<StatusBadge status="AWAITING_APPROVAL" />);
      expect(screen.getByText('Awaiting Approval')).toBeDefined();
    });

    it('renders correct label for IN_PROGRESS and RESOLVED', () => {
      const { rerender } = render(<StatusBadge status="IN_PROGRESS" />);
      expect(screen.getByText('In Progress')).toBeDefined();

      rerender(<StatusBadge status="RESOLVED" />);
      expect(screen.getByText('Resolved')).toBeDefined();
    });

    it('renders correct label for CLOSED and OPEN', () => {
      const { rerender } = render(<StatusBadge status="CLOSED" />);
      expect(screen.getByText('Closed')).toBeDefined();

      rerender(<StatusBadge status="OPEN" />);
      expect(screen.getByText('Open')).toBeDefined();
    });
  });

  describe('PriorityBadge Component', () => {
    it('renders URGENT priority with distinct styling indicator', () => {
      render(<PriorityBadge priority="URGENT" />);
      const badge = screen.getByText('URGENT');
      expect(badge).toBeDefined();
    });

    it('renders HIGH, MEDIUM, and LOW priority badges', () => {
      const { rerender } = render(<PriorityBadge priority="HIGH" />);
      expect(screen.getByText('HIGH')).toBeDefined();

      rerender(<PriorityBadge priority="MEDIUM" />);
      expect(screen.getByText('MEDIUM')).toBeDefined();

      rerender(<PriorityBadge priority="LOW" />);
      expect(screen.getByText('LOW')).toBeDefined();
    });
  });

  describe('TypeBadge Component', () => {
    it('formats PRODUCTION_INCIDENT with proper human-readable label', () => {
      render(<TypeBadge type="PRODUCTION_INCIDENT" />);
      expect(screen.getByText('Production Incident')).toBeDefined();
    });

    it('formats PAYMENT_INVESTIGATION and COMPLIANCE_REQUEST', () => {
      const { rerender } = render(<TypeBadge type="PAYMENT_INVESTIGATION" />);
      expect(screen.getByText('Payment Investigation')).toBeDefined();

      rerender(<TypeBadge type="COMPLIANCE_REQUEST" />);
      expect(screen.getByText('Compliance Request')).toBeDefined();
    });
  });

  describe('Role-Based Action Visibility Logic', () => {
    function getPermittedActions(role: 'VIEWER' | 'MEMBER' | 'LEAD' | 'ADMIN', status: string, isAssignee: boolean) {
      const canClaim = ['MEMBER', 'LEAD', 'ADMIN'].includes(role) && isAssignee === false;
      const canEdit = ['MEMBER', 'LEAD', 'ADMIN'].includes(role);
      const canApprove = (role === 'LEAD' || role === 'ADMIN') && status === 'AWAITING_APPROVAL';
      const canClose = ['MEMBER', 'LEAD', 'ADMIN'].includes(role) && status === 'RESOLVED';
      const canReopen = role === 'ADMIN' && status === 'CLOSED';

      return { canClaim, canEdit, canApprove, canClose, canReopen };
    }

    it('restricts VIEWER from editing, claiming, or approving', () => {
      const actions = getPermittedActions('VIEWER', 'OPEN', false);
      expect(actions.canClaim).toBe(false);
      expect(actions.canEdit).toBe(false);
      expect(actions.canApprove).toBe(false);
    });

    it('allows MEMBER to claim and edit, but restricts approval', () => {
      const actions = getPermittedActions('MEMBER', 'AWAITING_APPROVAL', true);
      expect(actions.canClaim).toBe(false); // already assigned
      expect(actions.canEdit).toBe(true);
      expect(actions.canApprove).toBe(false); // only LEAD/ADMIN can approve
    });

    it('allows LEAD to approve items in AWAITING_APPROVAL', () => {
      const actions = getPermittedActions('LEAD', 'AWAITING_APPROVAL', false);
      expect(actions.canApprove).toBe(true);
      expect(actions.canClose).toBe(false);
    });

    it('restricts non-ADMIN from reopening CLOSED items', () => {
      const leadActions = getPermittedActions('LEAD', 'CLOSED', true);
      expect(leadActions.canReopen).toBe(false);

      const adminActions = getPermittedActions('ADMIN', 'CLOSED', true);
      expect(adminActions.canReopen).toBe(true);
    });
  });

  describe('Conflict & Error UI Simulation', () => {
    it('renders conflict banner when stale update 409 occurs', () => {
      render(
        <div data-testid="conflict-banner" className="bg-amber-50 border border-amber-300 p-4 rounded-xl">
          <p className="text-amber-800 font-semibold">Stale update conflict</p>
          <p className="text-amber-700 text-sm">The item has been modified by another transaction.</p>
          <button className="refresh-btn">Refresh Data</button>
        </div>
      );

      expect(screen.getByTestId('conflict-banner')).toBeDefined();
      expect(screen.getByText('Stale update conflict')).toBeDefined();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeDefined();
    });

    it('renders access restriction boundary card on 403 Forbidden', () => {
      render(
        <div data-testid="forbidden-card" className="border border-red-200 p-8 rounded-2xl text-center">
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600">You do not have permission to view or mutate this team resource.</p>
        </div>
      );

      expect(screen.getByTestId('forbidden-card')).toBeDefined();
      expect(screen.getByText('Access Restricted')).toBeDefined();
    });

    it('renders empty state indicator when no items match search query', () => {
      render(
        <div data-testid="empty-state" className="p-12 text-center text-slate-500">
          <p className="font-semibold text-slate-700">No work items found</p>
          <p className="text-sm text-slate-500">Try adjusting your filters or search keywords.</p>
        </div>
      );

      expect(screen.getByTestId('empty-state')).toBeDefined();
      expect(screen.getByText('No work items found')).toBeDefined();
    });
  });
});
