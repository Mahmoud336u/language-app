import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Foundation } from '../../src/app/Foundation';

describe('approved neutral foundation harness', () => {
  it('identifies the product and the absence of available courses honestly', () => {
    render(<Foundation />);
    expect(screen.getByRole('heading', { name: 'Engineering foundations' }).textContent).toBe('Engineering foundations');
    expect(screen.getByText('No courses are available in this foundation build.').textContent).toBe('No courses are available in this foundation build.');
    expect(screen.queryByRole('link', { name: /start learning/i })).toBeNull();
  });

  it('lets a user preview their sample through labeled controls', async () => {
    const user = userEvent.setup();
    render(<Foundation />);
    await user.type(screen.getByRole('textbox', { name: 'Sample text' }), 'A calm place to begin.');
    await user.click(screen.getByRole('button', { name: 'Preview sample' }));
    expect(screen.getByRole('status').textContent).toBe('A calm place to begin.');
  });

  it('associates a visible validation message with an empty sample field', async () => {
    const user = userEvent.setup();
    render(<Foundation />);
    await user.click(screen.getByRole('button', { name: 'Preview sample' }));
    const field = screen.getByRole('textbox', { name: 'Sample text' });
    const error = screen.getByRole('alert');
    expect(error.textContent).toBe('Enter sample text to preview.');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
    expect(document.activeElement).toBe(field);
  });
});
