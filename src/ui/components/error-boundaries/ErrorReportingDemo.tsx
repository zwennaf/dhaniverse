import React, { useState } from 'react';
import { ErrorReportingService, ErrorSeverity, ErrorCategory } from './ErrorReportingService';

/**
 * Demo component to showcase ErrorReportingService functionality
 * This component allows testing different error scenarios and viewing error reports
 */
export const ErrorReportingDemo: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const errorReportingService = ErrorReportingService.getInstance();

  const refreshData = () => {
    setReports(errorReportingService.getReports());
    setStats(errorReportingService.getErrorStats());
  };

  const simulateError = (type: string) => {
    const errorInfo = {
      componentStack: '\n    in ErrorReportingDemo\n    in App',
    };

    let error: Error;
    let context: any = {
      componentName: 'ErrorReportingDemo',
      routePath: '/demo',
      userSession: {
        isAuthenticated: true,
        walletConnected: false,
      },
    };

    switch (type) {
      case 'critical':
        error = new ReferenceError('Cannot read property of undefined');
        break;
      case 'network':
        error = new Error('Network timeout occurred');
        context.componentName = 'NetworkComponent';
        break;
      case 'web3':
        error = new Error('Wallet connection failed');
        context.componentName = 'WalletComponent';
        context.userSession.walletConnected = true;
        break;
      case 'game':
        error = new Error('Phaser scene initialization failed');
        context.componentName = 'GameComponent';
        context.gameState = { isGameActive: true, currentScene: 'MainScene' };
        break;
      case 'auth':
        error = new Error('Authentication token expired');
        context.componentName = 'AuthComponent';
        break;
      default:
        error = new Error('Generic UI error');
    }

    errorReportingService.reportError(error, errorInfo, context);
    refreshData();
  };

  const clearReports = () => {
    errorReportingService.clearReports();
    refreshData();
  };

  React.useEffect(() => {
    refreshData();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h2>Error Reporting Service Demo</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Simulate Errors</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => simulateError('critical')}
            style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Critical Error
          </button>
          <button 
            onClick={() => simulateError('network')}
            style={{ padding: '8px 16px', backgroundColor: '#fd7e14', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Network Error
          </button>
          <button 
            onClick={() => simulateError('web3')}
            style={{ padding: '8px 16px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Web3 Error
          </button>
          <button 
            onClick={() => simulateError('game')}
            style={{ padding: '8px 16px', backgroundColor: '#20c997', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Game Error
          </button>
          <button 
            onClick={() => simulateError('auth')}
            style={{ padding: '8px 16px', backgroundColor: '#0dcaf0', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Auth Error
          </button>
          <button 
            onClick={() => simulateError('ui')}
            style={{ padding: '8px 16px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            UI Error
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={clearReports}
          style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Clear All Reports
        </button>
        <button 
          onClick={refreshData}
          style={{ padding: '8px 16px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '4px', marginLeft: '10px' }}
        >
          Refresh Data
        </button>
      </div>

      {stats && (
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Error Statistics</h3>
          <p><strong>Total Errors:</strong> {stats.totalErrors}</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h4>By Severity</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Critical: {stats.errorsBySeverity.critical}</li>
                <li>High: {stats.errorsBySeverity.high}</li>
                <li>Medium: {stats.errorsBySeverity.medium}</li>
                <li>Low: {stats.errorsBySeverity.low}</li>
              </ul>
            </div>
            
            <div>
              <h4>By Category</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>UI: {stats.errorsByCategory.ui}</li>
                <li>Network: {stats.errorsByCategory.network}</li>
                <li>Web3: {stats.errorsByCategory.web3}</li>
                <li>Game: {stats.errorsByCategory.game}</li>
                <li>Auth: {stats.errorsByCategory.auth}</li>
                <li>Storage: {stats.errorsByCategory.storage}</li>
              </ul>
            </div>
          </div>
          
          {stats.mostFrequentComponent && (
            <p><strong>Most Frequent Component:</strong> {stats.mostFrequentComponent}</p>
          )}
        </div>
      )}

      <div>
        <h3>Error Reports ({reports.length})</h3>
        {reports.length === 0 ? (
          <p style={{ color: '#6c757d' }}>No error reports yet. Click the buttons above to simulate errors.</p>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {reports.map((report, index) => (
              <div 
                key={report.id} 
                style={{ 
                  marginBottom: '15px', 
                  padding: '15px', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '8px',
                  backgroundColor: getSeverityColor(report.severity)
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <strong>{report.error.name}: {report.error.message}</strong>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                      {new Date(report.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px' }}>
                    <div style={{ 
                      padding: '2px 8px', 
                      backgroundColor: getSeverityBadgeColor(report.severity), 
                      color: 'white', 
                      borderRadius: '12px',
                      marginBottom: '4px'
                    }}>
                      {report.severity.toUpperCase()}
                    </div>
                    <div style={{ 
                      padding: '2px 8px', 
                      backgroundColor: getCategoryBadgeColor(report.category), 
                      color: 'white', 
                      borderRadius: '12px'
                    }}>
                      {report.category.toUpperCase()}
                    </div>
                  </div>
                </div>
                
                <div style={{ fontSize: '14px', color: '#495057' }}>
                  <p><strong>Component:</strong> {report.context.componentName}</p>
                  <p><strong>Route:</strong> {report.context.routePath}</p>
                  {report.context.userSession && (
                    <p>
                      <strong>User:</strong> 
                      {report.context.userSession.isAuthenticated ? ' Authenticated' : ' Not Authenticated'}
                      {report.context.userSession.walletConnected ? ', Wallet Connected' : ', Wallet Disconnected'}
                    </p>
                  )}
                  {report.context.gameState?.isGameActive && (
                    <p><strong>Game:</strong> Active (Scene: {report.context.gameState.currentScene || 'Unknown'})</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#fff5f5';
    case 'high': return '#fff8f1';
    case 'medium': return '#fffbf0';
    case 'low': return '#f8f9fa';
    default: return '#ffffff';
  }
}

function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#dc3545';
    case 'high': return '#fd7e14';
    case 'medium': return '#ffc107';
    case 'low': return '#6c757d';
    default: return '#6c757d';
  }
}

function getCategoryBadgeColor(category: string): string {
  switch (category) {
    case 'ui': return '#0d6efd';
    case 'network': return '#fd7e14';
    case 'web3': return '#6f42c1';
    case 'game': return '#20c997';
    case 'auth': return '#0dcaf0';
    case 'storage': return '#198754';
    default: return '#6c757d';
  }
}