/**
 * Currency Conversion Utility
 * 
 * Provides simple USD to INR conversion for stock prices.
 * Uses a fixed exchange rate for now (can be made dynamic later).
 * 
 * @author Dhaniverse Team
 * @date 2025-10-03
 */

// Fixed exchange rate: 1 USD = 88 INR (approximate)
const USD_TO_INR_RATE = 88;

/**
 * Convert USD price to INR
 * @param usdPrice - Price in USD
 * @returns Price in INR (rounded to 2 decimal places)
 */
export function convertUsdToInr(usdPrice: number): number {
    return Math.round(usdPrice * USD_TO_INR_RATE * 100) / 100;
}

/**
 * Convert INR price to USD
 * @param inrPrice - Price in INR
 * @returns Price in USD (rounded to 2 decimal places)
 */
export function convertInrToUsd(inrPrice: number): number {
    return Math.round((inrPrice / USD_TO_INR_RATE) * 100) / 100;
}

/**
 * Format price with currency symbol
 * @param price - Price value
 * @param currency - Currency code ('INR' or 'USD')
 * @returns Formatted price string with currency symbol
 */
export function formatPrice(price: number, currency: 'INR' | 'USD' = 'INR'): string {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get current exchange rate
 * @returns Current USD to INR exchange rate
 */
export function getExchangeRate(): number {
    return USD_TO_INR_RATE;
}

/**
 * Convert and format USD price to INR
 * @param usdPrice - Price in USD
 * @returns Formatted INR price string
 */
export function convertAndFormatToInr(usdPrice: number): string {
    const inrPrice = convertUsdToInr(usdPrice);
    return formatPrice(inrPrice, 'INR');
}
