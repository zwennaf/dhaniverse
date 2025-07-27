import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MinimalErrorFallback } from '../MinimalErrorFallback';
import { DetailedErrorFallback } from '../DetailedErrorFallback';
import { ErrorInfo } from 'react';

// Mock error and errorInfo for testing
const mockError = new Error('Test error message');
const mockErrorInfo: ErrorInfo = {
  componentStack: '\n    in TestComponent\n    in ErrorBoundary',
};

const mockProps = {
  error: mockError,
  errorInfo: mockErrorInfo,
  retry: vi.fn(),
  canRetry: true,
  retryCount: 1,
  resetError: vi.fn(),
};

describe('MinimalErrorFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default message', () => {
    render(<MinimalErrorFallback {...mockProps} />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(
      <MinimalErrorFallback 
        {...mockProps} 
        message="Custom error message" 
      />
    );
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('shows retry button when canRetry is true', () => {
    render(<MinimalErrorFallback {...mockProps} />);
    
    const retryButton = screen.getByRole('button', { name: /retry loading component/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('hides retry button when showRetry is false', () => {
    render(
      <MinimalErrorFallback 
        {...mockProps} 
        showRetry={false} 
      />
    );
    
    expect(screen.queryByRole('button', { name: /retry loading component/i })).not.toBeInTheDocument();
  });

  it('calls retry function when retry button is clicked', () => {
    render(<MinimalErrorFallback {...mockProps} />);
    
    const retryButton = screen.getByRole('button', { name: /retry loading component/i });
    fireEvent.click(retryButton);
    
    expect(mockProps.retry).toHaveBeenCalledTimes(1);
  });

  it('calls resetError function when dismiss button is clicked', () => {
    render(<MinimalErrorFallback {...mockProps} />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss error and reset component/i });
    fireEvent.click(dismissButton);
    
    expect(mockProps.resetError).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation', () => {
    render(<MinimalErrorFallback {...mockProps} />);
    
    const retryButton = screen.getByRole('button', { name: /retry loading component/i });
    
    // Test Enter key
    fireEvent.keyDown(retryButton, { key: 'Enter' });
    expect(mockProps.retry).toHaveBeenCalledTimes(1);
    
    // Test Space key
    fireEvent.keyDown(retryButton, { key: ' ' });
    expect(mockProps.retry).toHaveBeenCalledTimes(2);
  });
});

describe('DetailedErrorFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default title and description', () => {
    render(<DetailedErrorFallback {...mockProps} />);
    
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
  });

  it('renders with custom title and description', () => {
    render(
      <DetailedErrorFallback 
        {...mockProps}
        title="Custom Title"
        description="Custom description"
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
  });

  it('shows retry progress indicator', () => {
    render(<DetailedErrorFallback {...mockProps} retryCount={2} />);
    
    expect(screen.getByText('Retry attempts: 2/3')).toBeInTheDocument();
  });

  it('shows support contact when provided', () => {
    render(
      <DetailedErrorFallback 
        {...mockProps}
        supportContact="support@test.com"
      />
    );
    
    expect(screen.getByText('Need help? Contact our support team:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'support@test.com' })).toBeInTheDocument();
  });

  it('renders custom actions', () => {
    const customActions = [
      {
        label: 'Custom Action',
        action: vi.fn(),
        variant: 'primary' as const,
      },
    ];

    render(
      <DetailedErrorFallback 
        {...mockProps}
        customActions={customActions}
      />
    );
    
    const customButton = screen.getByRole('button', { name: 'Custom Action' });
    expect(customButton).toBeInTheDocument();
    
    fireEvent.click(customButton);
    expect(customActions[0].action).toHaveBeenCalledTimes(1);
  });

  it('toggles error details visibility', () => {
    render(
      <DetailedErrorFallback 
        {...mockProps}
        showErrorDetails={true}
      />
    );
    
    const toggleButton = screen.getByRole('button', { name: /show error details/i });
    expect(toggleButton).toBeInTheDocument();
    
    // Initially details should be hidden
    expect(screen.queryByText('Error Message:')).not.toBeInTheDocument();
    
    // Click to show details
    fireEvent.click(toggleButton);
    expect(screen.getByText('Error Message:')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('handles retry with loading state', async () => {
    render(<DetailedErrorFallback {...mockProps} />);
    
    const retryButton = screen.getByRole('button', { name: /retry loading component/i });
    fireEvent.click(retryButton);
    
    // Should show loading state briefly
    expect(screen.getByText('Retrying...')).toBeInTheDocument();
    
    // Wait for retry to complete
    await new Promise(resolve => setTimeout(resolve, 600));
    
    expect(mockProps.retry).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation for all interactive elements', async () => {
    render(
      <DetailedErrorFallback 
        {...mockProps}
        showErrorDetails={true}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /retry loading component/i });
    const resetButton = screen.getByRole('button', { name: /reset component/i });
    const toggleButton = screen.getByRole('button', { name: /show error details/i });
    
    // Test Enter key on retry button
    fireEvent.keyDown(retryButton, { key: 'Enter' });
    
    // Wait for async handleRetry to complete
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(mockProps.retry).toHaveBeenCalledTimes(1);
    
    // Test Space key on reset button
    fireEvent.keyDown(resetButton, { key: ' ' });
    expect(mockProps.resetError).toHaveBeenCalledTimes(1);
    
    // Test Enter key on toggle button
    fireEvent.keyDown(toggleButton, { key: 'Enter' });
    expect(screen.getByText('Error Message:')).toBeInTheDocument();
  });
});