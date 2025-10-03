/**
 * Currency Display Hook
 * 
 * Provides formatted currency display with INR symbol.
 * All prices in the app are already in INR from the service layer.
 * 
 * @author Dhaniverse Team
 * @date 2025-10-03
 */

import { useMemo } from 'react';

/**
 * Format a number as INR currency
 * @param amount - Amount in INR
 * @param options - Formatting options
 */
export function formatCurrency(
    amount: number,
    options: {
        decimals?: number;
        compact?: boolean;
    } = {}
): string {
    const { decimals = 2, compact = false } = options;

    if (compact) {
        // Format large numbers compactly (e.g., ₹1.2M, ₹45.5K)
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(1)}Cr`; // Crores
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`; // Lakhs
        } else if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(1)}K`;
        }
    }

    return `₹${amount.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })}`;
}

/**
 * React hook for currency formatting
 * @param amount - Amount in INR
 * @param options - Formatting options
 */
export function useCurrency(
    amount: number,
    options: {
        decimals?: number;
        compact?: boolean;
    } = {}
) {
    return useMemo(() => formatCurrency(amount, options), [amount, options.decimals, options.compact]);
}

/**
 * Format percentage change with color coding
 * @param change - Percentage change value
 */
export function formatPercentage(change: number): {
    text: string;
    color: string;
    symbol: string;
} {
    const absChange = Math.abs(change);
    const color = change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-yellow-400';
    const symbol = change > 0 ? '↗' : change < 0 ? '↘' : '→';
    const prefix = change > 0 ? '+' : '';

    return {
        text: `${prefix}${change.toFixed(2)}%`,
        color,
        symbol
    };
}
