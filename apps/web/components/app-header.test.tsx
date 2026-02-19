import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { AppHeader } from './app-header';
import { renderWithProviders } from '../test/render-with-providers';

describe('AppHeader', () => {
  it('renders title, navigation and controls', () => {
    renderWithProviders(<AppHeader />);

    expect(screen.getByText('RestLab Control Center')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Services|Servicios/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /SigKill/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
  });
});
