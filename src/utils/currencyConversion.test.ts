/**
 * Currency Conversion Tests
 * 
 * Run these tests to verify USD to INR conversion works correctly.
 * 
 * @author Dhaniverse Team
 * @date 2025-10-03
 */

import { describe, it, expect } from 'vitest';
import { 
    convertUsdToInr, 
    convertInrToUsd, 
    formatPrice, 
    getExchangeRate,
    convertAndFormatToInr 
} from '../utils/currencyConversion';

describe('Currency Conversion', () => {
    describe('convertUsdToInr', () => {
        it('should convert USD to INR at rate of 88.76', () => {
            expect(convertUsdToInr(1)).toBe(88.76);
            expect(convertUsdToInr(100)).toBe(8876);
            expect(convertUsdToInr(175.50)).toBe(15444);
        });

        it('should handle decimal values correctly', () => {
            expect(convertUsdToInr(0.50)).toBe(44);
            expect(convertUsdToInr(2.25)).toBe(198);
        });

        it('should round to 2 decimal places', () => {
            expect(convertUsdToInr(1.234)).toBe(108.59);
            expect(convertUsdToInr(5.678)).toBe(499.66);
        });

        it('should handle zero', () => {
            expect(convertUsdToInr(0)).toBe(0);
        });
    });

    describe('convertInrToUsd', () => {
        it('should convert INR to USD', () => {
            expect(convertInrToUsd(88)).toBe(1);
            expect(convertInrToUsd(8800)).toBe(100);
            expect(convertInrToUsd(15444)).toBe(175.50);
        });

        it('should be inverse of convertUsdToInr', () => {
            const usd = 175.50;
            const inr = convertUsdToInr(usd);
            const backToUsd = convertInrToUsd(inr);
            expect(backToUsd).toBe(usd);
        });
    });

    describe('formatPrice', () => {
        it('should format INR with rupee symbol', () => {
            expect(formatPrice(1000, 'INR')).toBe('₹1,000.00');
            expect(formatPrice(14566.50, 'INR')).toBe('₹14,566.50');
        });

        it('should format USD with dollar symbol', () => {
            expect(formatPrice(1000, 'USD')).toBe('$1,000.00');
            expect(formatPrice(175.50, 'USD')).toBe('$175.50');
        });

        it('should default to INR', () => {
            expect(formatPrice(1000)).toBe('₹1,000.00');
        });

        it('should handle large numbers', () => {
            // Indian numbering: 1,000,000 = 10,00,000 (10 lakhs)
            expect(formatPrice(1000000)).toBe('₹10,00,000.00');
        });
    });

    describe('getExchangeRate', () => {
        it('should return current exchange rate', () => {
            expect(getExchangeRate()).toBe(88);
        });
    });

    describe('convertAndFormatToInr', () => {
        it('should convert and format in one call', () => {
            expect(convertAndFormatToInr(100)).toBe('₹8,800.00');
            expect(convertAndFormatToInr(175.50)).toBe('₹15,444.00');
        });
    });
});

describe('Real Stock Price Conversions', () => {
    describe('Apple (AAPL)', () => {
        it('should convert typical AAPL price', () => {
            const usdPrice = 175.50;
            const inrPrice = convertUsdToInr(usdPrice);
            expect(inrPrice).toBe(15444);
            expect(formatPrice(inrPrice)).toBe('₹15,444.00');
        });

        it('should convert AAPL market cap', () => {
            const marketCapUsd = 2800000000000; // $2.8T
            const marketCapInr = convertUsdToInr(marketCapUsd);
            expect(marketCapInr).toBe(246400000000000); // ₹246.4T
        });

        it('should convert AAPL EPS', () => {
            const epsUsd = 6.42;
            const epsInr = convertUsdToInr(epsUsd);
            expect(epsInr).toBe(564.96);
        });
    });

    describe('Google (GOOGL)', () => {
        it('should convert typical GOOGL price', () => {
            const usdPrice = 140.25;
            const inrPrice = convertUsdToInr(usdPrice);
            expect(inrPrice).toBe(12342);
        });
    });

    describe('Tesla (TSLA)', () => {
        it('should convert typical TSLA price', () => {
            const usdPrice = 250.00;
            const inrPrice = convertUsdToInr(usdPrice);
            expect(inrPrice).toBe(22000);
        });
    });

    describe('Microsoft (MSFT)', () => {
        it('should convert typical MSFT price', () => {
            const usdPrice = 370.00;
            const inrPrice = convertUsdToInr(usdPrice);
            expect(inrPrice).toBe(32560);
        });
    });

    describe('NVIDIA (NVDA)', () => {
        it('should convert typical NVDA price', () => {
            const usdPrice = 480.00;
            const inrPrice = convertUsdToInr(usdPrice);
            expect(inrPrice).toBe(42240);
        });
    });
});

describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
        const trillion = 1000000000000;
        const inr = convertUsdToInr(trillion);
        expect(inr).toBe(trillion * 88);
    });

    it('should handle very small numbers', () => {
        const cent = 0.01;
        const inr = convertUsdToInr(cent);
        expect(inr).toBe(0.88);
    });

    it('should handle negative numbers', () => {
        // Although stock prices shouldn't be negative,
        // the function should still work mathematically
        expect(convertUsdToInr(-100)).toBe(-8800);
    });
});

describe('Price History Conversion', () => {
    it('should convert array of prices', () => {
        const usdPrices = [170, 172, 175, 173, 176, 178, 175.50];
        const inrPrices = usdPrices.map(convertUsdToInr);
        
        expect(inrPrices).toEqual([
            14960,
            15136,
            15400,
            15224,
            15488,
            15664,
            15444
        ]);
    });

    it('should maintain price trends after conversion', () => {
        const usdPrices = [100, 105, 110, 108, 112];
        const inrPrices = usdPrices.map(convertUsdToInr);
        
        // Check that trends are preserved
        expect(inrPrices[1] > inrPrices[0]).toBe(true); // 105 > 100
        expect(inrPrices[2] > inrPrices[1]).toBe(true); // 110 > 105
        expect(inrPrices[3] < inrPrices[2]).toBe(true); // 108 < 110
        expect(inrPrices[4] > inrPrices[3]).toBe(true); // 112 > 108
    });
});

describe('Transaction Calculations', () => {
    it('should calculate correct transaction total in INR', () => {
        const stockPriceUsd = 175.50;
        const quantity = 10;
        
        const stockPriceInr = convertUsdToInr(stockPriceUsd);
        const totalInr = stockPriceInr * quantity;
        
        expect(totalInr).toBe(154440); // ₹15,444 × 10
    });

    it('should calculate transaction fee in INR', () => {
        const totalCost = 154440;
        const feeRate = 0.001; // 0.1%
        const fee = totalCost * feeRate;
        
        expect(fee).toBe(154.44);
        expect(Math.max(fee, 1)).toBe(154.44); // Fee > minimum
    });
});
