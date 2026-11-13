import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BuyerBrief from '../../components/BuyerBrief';
import ListingChecklist from '../../components/ListingChecklist';

test('the buyer brief exposes missing facts and renders seller text safely', () => {
  render(<BuyerBrief details={{ included_assets: '<script>unsafe()</script>', running_costs: '$12/month hosting' }} />);
  expect(screen.getByText('$12/month hosting')).toBeInTheDocument();
  expect(screen.getByText('<script>unsafe()</script>')).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
  expect(screen.getByText('Not provided yet — ask the seller.')).toBeInTheDocument();
});

test('readiness guidance reflects entered facts and takes a seller to the missing field', () => {
  render(<><ListingChecklist project={{ name: 'Project', description: 'Description', category: 'analytics', tech_stack: ['React'] }} />
    <input id="demo_url" aria-label="Demo" /></>);
  expect(screen.getByText('3/7 filled in')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add a demo or repository' }));
  expect(screen.getByLabelText('Demo')).toHaveFocus();
});

test('missing buyer-brief facts lead to a specific question while supplied facts do not', () => {
  const ask = jest.fn();
  render(<BuyerBrief details={{ included_assets: 'Code and documentation' }} onAsk={ask} />);
  expect(screen.queryByRole('button', { name: 'Ask about included assets' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ask about running costs' }));
  expect(ask).toHaveBeenCalledWith('What are the monthly running costs, including paid services and free-tier limits?');
});
