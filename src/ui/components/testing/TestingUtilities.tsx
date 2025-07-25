import React, { useState, useEffect } from 'react';

// Visual regression testing component
interface VisualTestingProps {
  componentName: string;
  children: React.ReactNode;
  variants?: string[];
}

export const VisualTesting: React.FC<VisualTestingProps> = ({
  componentName,
  children,
  variants = ['default']
}) => {
  const [currentVariant, setCurrentVariant] = useState(0);

  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  return (
    <div className="border-2 border-yellow-500 p-4 m-2 bg-yellow-50/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-vcr text-sm font-bold text-yellow-400 tracking-wider">
          TEST: {componentName.toUpperCase()}
        </h3>
        <div className="flex space-x-2">
          {variants.map((variant, index) => (
            <button
              key={variant}
              onClick={() => setCurrentVariant(index)}
              className={`px-2 py-1 text-xs font-vcr font-bold tracking-wider border ${
                currentVariant === index
                  ? 'bg-yellow-500 text-black border-yellow-500'
                  : 'bg-transparent text-yellow-400 border-yellow-400 hover:bg-yellow-400/10'
              }`}
            >
              {variant.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="border border-white/20 p-4">
        {children}
      </div>
      <div className="mt-2 text-xs text-yellow-300 font-vcr">
        Variant: {variants[currentVariant]} | Breakpoint: {window.innerWidth}px
      </div>
    </div>
  );
};

// Performance monitoring component
interface PerformanceMonitorProps {
  children: React.ReactNode;
  componentName: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  children,
  componentName
}) => {
  const [renderTime, setRenderTime] = useState<number>(0);
  const [renderCount, setRenderCount] = useState<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    setRenderCount(prev => prev + 1);
    
    const endTime = performance.now();
    setRenderTime(endTime - startTime);

    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} render #${renderCount + 1} took ${(endTime - startTime).toFixed(2)}ms`);
    }
  });

  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div className="absolute top-0 right-0 bg-blue-900/80 text-blue-200 px-2 py-1 text-xs font-vcr">
        R: {renderCount} | {renderTime.toFixed(1)}ms
      </div>
    </div>
  );
};

// Accessibility testing overlay
interface A11yTestingProps {
  children: React.ReactNode;
  showOutlines?: boolean;
}

export const A11yTesting: React.FC<A11yTestingProps> = ({
  children,
  showOutlines = false
}) => {
  const [showA11y, setShowA11y] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        setShowA11y(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  return (
    <div className={showA11y || showOutlines ? 'a11y-testing-active' : ''}>
      {children}
      {showA11y && (
        <div className="fixed top-4 left-4 bg-purple-900/90 text-purple-200 p-4 font-vcr text-sm z-50 max-w-sm">
          <h4 className="font-bold mb-2">A11Y TESTING MODE</h4>
          <ul className="space-y-1 text-xs">
            <li>• Tab through focusable elements</li>
            <li>• Check ARIA labels</li>
            <li>• Test keyboard navigation</li>
            <li>• Verify color contrast</li>
            <li>• Press Ctrl+Shift+A to toggle</li>
          </ul>
        </div>
      )}
      <style jsx>{`
        .a11y-testing-active *:focus {
          outline: 3px solid #F1CD36 !important;
          outline-offset: 2px !important;
        }
        .a11y-testing-active [role] {
          border: 1px dashed #8B5CF6 !important;
        }
        .a11y-testing-active [aria-label]:not([aria-label=""]) {
          position: relative;
        }
        .a11y-testing-active [aria-label]:not([aria-label=""]):after {
          content: attr(aria-label);
          position: absolute;
          top: -20px;
          left: 0;
          background: #8B5CF6;
          color: white;
          padding: 2px 4px;
          font-size: 10px;
          white-space: nowrap;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
};

// Responsive testing component
interface ResponsiveTestingProps {
  children: React.ReactNode;
}

export const ResponsiveTesting: React.FC<ResponsiveTestingProps> = ({ children }) => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState('desktop');
  const [showGrid, setShowGrid] = useState(false);

  const breakpoints = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ];

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) setCurrentBreakpoint('mobile');
      else if (width < 1024) setCurrentBreakpoint('tablet');
      else setCurrentBreakpoint('desktop');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {showGrid && (
        <div 
          className="fixed inset-0 pointer-events-none z-40 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(241, 205, 54, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(241, 205, 54, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
      )}
      
      <div className="fixed bottom-4 right-4 bg-green-900/90 text-green-200 p-3 font-vcr text-xs z-50">
        <div className="flex items-center space-x-4 mb-2">
          <span className="font-bold">BREAKPOINT: {currentBreakpoint.toUpperCase()}</span>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className="px-2 py-1 bg-green-700 hover:bg-green-600 text-green-100"
          >
            {showGrid ? 'HIDE' : 'SHOW'} GRID
          </button>
        </div>
        <div className="text-xs opacity-80">
          {window.innerWidth}x{window.innerHeight}px
        </div>
      </div>
      
      {children}
    </div>
  );
};

// Banking operation testing component
interface BankingTestingProps {
  children: React.ReactNode;
  operations?: string[];
}

export const BankingTesting: React.FC<BankingTestingProps> = ({
  children,
  operations = ['deposit', 'withdraw', 'transfer', 'balance']
}) => {
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});
  const [showTests, setShowTests] = useState(false);

  const runTest = (operation: string) => {
    setTestResults(prev => ({ ...prev, [operation]: 'pending' }));
    
    // Simulate test execution
    setTimeout(() => {
      const result = Math.random() > 0.2 ? 'pass' : 'fail';
      setTestResults(prev => ({ ...prev, [operation]: result }));
    }, 1000);
  };

  const runAllTests = () => {
    operations.forEach(op => runTest(op));
  };

  if (process.env.NODE_ENV !== 'development') {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      
      <button
        onClick={() => setShowTests(!showTests)}
        className="fixed bottom-20 right-4 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 font-vcr text-xs font-bold z-50"
      >
        {showTests ? 'HIDE' : 'SHOW'} TESTS
      </button>

      {showTests && (
        <div className="fixed bottom-4 right-4 bg-orange-900/90 text-orange-200 p-4 font-vcr text-xs z-50 w-64">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold">BANKING TESTS</h4>
            <button
              onClick={runAllTests}
              className="px-2 py-1 bg-orange-700 hover:bg-orange-600 text-orange-100"
            >
              RUN ALL
            </button>
          </div>
          
          <div className="space-y-2">
            {operations.map(operation => (
              <div key={operation} className="flex items-center justify-between">
                <span className="capitalize">{operation}</span>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 ${
                    testResults[operation] === 'pass' ? 'bg-green-500' :
                    testResults[operation] === 'fail' ? 'bg-red-500' :
                    testResults[operation] === 'pending' ? 'bg-yellow-500 animate-pulse' :
                    'bg-gray-500'
                  }`} />
                  <button
                    onClick={() => runTest(operation)}
                    className="px-1 py-0.5 bg-orange-700 hover:bg-orange-600 text-orange-100 text-xs"
                  >
                    TEST
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Polish and final touches component
interface PolishComponentProps {
  children: React.ReactNode;
  showAnimations?: boolean;
  showTransitions?: boolean;
}

export const PolishComponent: React.FC<PolishComponentProps> = ({
  children,
  showAnimations = true,
  showTransitions = true
}) => {
  const [isPolished, setIsPolished] = useState(false);

  useEffect(() => {
    // Add final polish effects
    const timer = setTimeout(() => setIsPolished(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`
      ${isPolished ? 'animate-fade-in-up' : 'opacity-0'}
      ${showTransitions ? 'transition-all duration-300 ease-out' : ''}
      ${showAnimations ? 'hover:scale-105' : ''}
      transform-gpu
    `}>
      {children}
    </div>
  );
};

// Final testing suite wrapper
interface TestingSuiteProps {
  children: React.ReactNode;
  enableAll?: boolean;
}

export const TestingSuite: React.FC<TestingSuiteProps> = ({
  children,
  enableAll = false
}) => {
  if (process.env.NODE_ENV !== 'development' && !enableAll) {
    return <>{children}</>;
  }

  return (
    <ResponsiveTesting>
      <A11yTesting>
        <BankingTesting>
          <PolishComponent>
            {children}
          </PolishComponent>
        </BankingTesting>
      </A11yTesting>
    </ResponsiveTesting>
  );
};