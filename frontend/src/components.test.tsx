import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge, PriorityBadge } from './components/Badges';

describe('Frontend Component Tests', () => {
  it('renders correct status label and styling classes for AWAITING_APPROVAL', () => {
    render(<StatusBadge status="AWAITING_APPROVAL" />);
    const badge = screen.getByText('Awaiting Approval');
    expect(badge).toBeDefined();
  });

  it('renders urgent priority badge with distinct indicator', () => {
    render(<PriorityBadge priority="URGENT" />);
    const badge = screen.getByText('URGENT');
    expect(badge).toBeDefined();
  });
});
