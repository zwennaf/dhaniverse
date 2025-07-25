import React, { useRef, useEffect, useState } from "react";

interface AccessibleButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    variant?: "primary" | "secondary" | "danger";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    loading?: boolean;
    ariaLabel?: string;
    ariaDescribedBy?: string;
    className?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
    children,
    onClick,
    variant = "primary",
    size = "md",
    disabled = false,
    loading = false,
    ariaLabel,
    ariaDescribedBy,
    className = "",
}) => {
    const buttonRef = useRef<HTMLButtonElement>(null);

    const baseClasses = `
    font-vcr font-bold tracking-wider border-2 transition-all duration-200 
    focus:outline-none focus:ring-4 focus:ring-dhani-gold/50 focus:ring-offset-2 focus:ring-offset-black
    disabled:opacity-50 disabled:cursor-not-allowed
    hover:scale-105 active:scale-95
  `;

    const variantClasses = {
        primary:
            "bg-dhani-gold text-black border-dhani-gold hover:bg-dhani-gold/90",
        secondary:
            "bg-transparent text-dhani-gold border-dhani-gold hover:bg-dhani-gold/10",
        danger: "bg-red-500 text-white border-red-500 hover:bg-red-600",
    };

    const sizeClasses = {
        sm: "px-3 py-2 text-sm min-h-[40px]",
        md: "px-4 py-3 text-base min-h-[48px]",
        lg: "px-6 py-4 text-lg min-h-[56px]",
    };

    return (
        <button
            ref={buttonRef}
            onClick={onClick}
            disabled={disabled || loading}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-busy={loading}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        >
            {loading && (
                <span
                    className="inline-block w-4 h-4 border-2 border-current border-t-transparent animate-spin mr-2"
                    aria-hidden="true"
                />
            )}
            <span className={loading ? "sr-only" : ""}>{children}</span>
            {loading && <span className="sr-only">Loading...</span>}
        </button>
    );
};

interface AccessibleInputProps {
    label: string;
    type?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    helpText?: string;
    ariaDescribedBy?: string;
    className?: string;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
    helpText,
    ariaDescribedBy,
    className = "",
}) => {
    const inputId = useRef(`input-${Math.random().toString(36).substr(2, 9)}`);
    const errorId = useRef(`error-${inputId.current}`);
    const helpId = useRef(`help-${inputId.current}`);

    const describedBy = [
        ariaDescribedBy,
        helpText ? helpId.current : null,
        error ? errorId.current : null,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={`space-y-2 ${className}`}>
            <label
                htmlFor={inputId.current}
                className="block text-white text-sm font-vcr font-bold tracking-wider"
            >
                {label.toUpperCase()}
                {required && (
                    <span className="text-red-500 ml-1" aria-label="required">
                        *
                    </span>
                )}
            </label>

            <input
                id={inputId.current}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                aria-describedby={describedBy || undefined}
                aria-invalid={error ? "true" : "false"}
                className={`
          w-full bg-black text-white border-2 px-4 py-3 font-vcr
          transition-colors duration-200 min-h-[48px]
          focus:outline-none focus:ring-4 focus:ring-dhani-gold/50 focus:ring-offset-2 focus:ring-offset-black
          disabled:opacity-50 disabled:cursor-not-allowed
          ${
              error
                  ? "border-red-500 focus:border-red-500"
                  : "border-white/20 focus:border-dhani-gold"
          }
        `}
            />

            {helpText && (
                <p
                    id={helpId.current}
                    className="text-gray-400 text-sm font-vcr"
                >
                    {helpText}
                </p>
            )}

            {error && (
                <p
                    id={errorId.current}
                    className="text-red-400 text-sm font-vcr"
                    role="alert"
                >
                    {error}
                </p>
            )}
        </div>
    );
};

interface AccessibleModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg";
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = "md",
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement;
            modalRef.current?.focus();
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
            previousFocusRef.current?.focus();
        }

        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        const handleTabTrap = (e: KeyboardEvent) => {
            if (e.key === "Tab" && modalRef.current) {
                const focusableElements = modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[
                    focusableElements.length - 1
                ] as HTMLElement;

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        if (isOpen) {
            window.addEventListener("keydown", handleEscape);
            window.addEventListener("keydown", handleTabTrap);
        }

        return () => {
            window.removeEventListener("keydown", handleEscape);
            window.removeEventListener("keydown", handleTabTrap);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-2xl",
        lg: "max-w-4xl",
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className="absolute inset-0 bg-black/80"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                ref={modalRef}
                tabIndex={-1}
                className={`
          relative w-full ${sizeClasses[size]} max-h-[90vh] 
          bg-black border-4 border-dhani-gold overflow-hidden
          animate-scale-in focus:outline-none
        `}
            >
                <div className="flex items-center justify-between p-6 border-b-2 border-dhani-gold bg-dhani-gold/10">
                    <h2
                        id="modal-title"
                        className="font-vcr font-bold text-xl text-dhani-gold tracking-wider"
                    >
                        {title.toUpperCase()}
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        className="w-8 h-8 flex items-center justify-center text-white hover:text-dhani-gold transition-colors text-xl focus:outline-none focus:ring-2 focus:ring-dhani-gold"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {children}
                </div>
            </div>
        </div>
    );
};

interface AccessibleTabsProps {
    tabs: Array<{
        id: string;
        label: string;
        content: React.ReactNode;
        disabled?: boolean;
    }>;
    activeTab: string;
    onTabChange: (tabId: string) => void;
    className?: string;
}

export const AccessibleTabs: React.FC<AccessibleTabsProps> = ({
    tabs,
    activeTab,
    onTabChange,
    className = "",
}) => {
    const [focusedTab, setFocusedTab] = useState(activeTab);
    const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

    const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
        const tabIds = tabs.filter((tab) => !tab.disabled).map((tab) => tab.id);
        const currentIndex = tabIds.indexOf(tabId);

        switch (e.key) {
            case "ArrowLeft":
                e.preventDefault();
                const prevIndex =
                    currentIndex > 0 ? currentIndex - 1 : tabIds.length - 1;
                const prevTabId = tabIds[prevIndex];
                setFocusedTab(prevTabId);
                tabRefs.current[prevTabId]?.focus();
                break;
            case "ArrowRight":
                e.preventDefault();
                const nextIndex =
                    currentIndex < tabIds.length - 1 ? currentIndex + 1 : 0;
                const nextTabId = tabIds[nextIndex];
                setFocusedTab(nextTabId);
                tabRefs.current[nextTabId]?.focus();
                break;
            case "Home":
                e.preventDefault();
                const firstTabId = tabIds[0];
                setFocusedTab(firstTabId);
                tabRefs.current[firstTabId]?.focus();
                break;
            case "End":
                e.preventDefault();
                const lastTabId = tabIds[tabIds.length - 1];
                setFocusedTab(lastTabId);
                tabRefs.current[lastTabId]?.focus();
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                onTabChange(tabId);
                break;
        }
    };

    return (
        <div className={className}>
            <div role="tablist" className="flex border-b-2 border-white/20">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        ref={(el) => {
                            tabRefs.current[tab.id] = el;
                        }}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls={`panel-${tab.id}`}
                        tabIndex={activeTab === tab.id ? 0 : -1}
                        disabled={tab.disabled}
                        onClick={() => onTabChange(tab.id)}
                        onKeyDown={(e) => handleKeyDown(e, tab.id)}
                        className={`
              px-6 py-4 font-vcr font-bold tracking-wider text-sm border-b-4 transition-all duration-300
              focus:outline-none focus:ring-2 focus:ring-dhani-gold focus:ring-inset
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                  activeTab === tab.id
                      ? "text-dhani-gold border-dhani-gold bg-dhani-gold/10"
                      : "text-white border-transparent hover:text-dhani-gold hover:bg-white/5"
              }
            `}
                    >
                        {tab.label.toUpperCase()}
                    </button>
                ))}
            </div>

            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    id={`panel-${tab.id}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${tab.id}`}
                    hidden={activeTab !== tab.id}
                    className="p-6"
                >
                    {tab.content}
                </div>
            ))}
        </div>
    );
};

interface SkipLinkProps {
    href: string;
    children: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({ href, children }) => {
    return (
        <a
            href={href}
            className="
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
        bg-dhani-gold text-black px-4 py-2 font-vcr font-bold tracking-wider
        z-50 focus:outline-none focus:ring-4 focus:ring-dhani-gold/50
      "
        >
            {children}
        </a>
    );
};

interface LiveRegionProps {
    children: React.ReactNode;
    politeness?: "polite" | "assertive" | "off";
    atomic?: boolean;
    className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
    children,
    politeness = "polite",
    atomic = false,
    className = "",
}) => {
    return (
        <div
            aria-live={politeness}
            aria-atomic={atomic}
            className={`sr-only ${className}`}
        >
            {children}
        </div>
    );
};

interface ProgressIndicatorProps {
    value: number;
    max: number;
    label: string;
    showValue?: boolean;
    className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
    value,
    max,
    label,
    showValue = true,
    className = "",
}) => {
    const percentage = Math.round((value / max) * 100);

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex justify-between items-center">
                <label className="font-vcr text-sm font-bold tracking-wider text-white">
                    {label.toUpperCase()}
                </label>
                {showValue && (
                    <span className="font-vcr text-sm font-bold tracking-wider text-dhani-gold">
                        {percentage}%
                    </span>
                )}
            </div>
            <div
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-label={`${label}: ${percentage}% complete`}
                className="w-full h-4 bg-gray-700 border-2 border-white/20"
            >
                <div
                    className="h-full bg-dhani-gold transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};
