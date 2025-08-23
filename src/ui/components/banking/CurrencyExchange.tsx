import React, { useState } from 'react';

interface CurrencyExchangeProps {
    rupeesBalance: number;
    icpTokenBalance: number;
    onExchange: (fromCurrency: 'rupees' | 'icp', toCurrency: 'rupees' | 'icp', amount: number) => Promise<boolean>;
}

const CurrencyExchange: React.FC<CurrencyExchangeProps> = ({
    rupeesBalance,
    icpTokenBalance,
    onExchange
}) => {
    const [fromCurrency, setFromCurrency] = useState<'rupees' | 'icp'>('rupees');
    const [toCurrency, setToCurrency] = useState<'rupees' | 'icp'>('icp');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const exchangeRate = 0.1; // 1 Rupee = 0.1 ICP Token

    const calculateExchangeAmount = () => {
        if (!amount) return 0;
        const inputAmount = parseFloat(amount);
        
        if (fromCurrency === 'rupees' && toCurrency === 'icp') {
            return inputAmount * exchangeRate;
        } else if (fromCurrency === 'icp' && toCurrency === 'rupees') {
            return inputAmount / exchangeRate;
        }
        return 0;
    };

    const getMaxAmount = () => {
        return fromCurrency === 'rupees' ? rupeesBalance : icpTokenBalance;
    };

    const handleSwapCurrencies = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
        setAmount('');
    };

    const handleExchange = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        const inputAmount = parseFloat(amount);
        const maxAmount = getMaxAmount();

        if (inputAmount > maxAmount) {
            setError(`Insufficient ${fromCurrency} balance`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const success = await onExchange(fromCurrency, toCurrency, inputAmount);
            if (success) {
                setAmount('');
                // Show success message
                const outputAmount = calculateExchangeAmount();
                alert(`Successfully exchanged ${inputAmount} ${fromCurrency.toUpperCase()} for ${outputAmount.toFixed(4)} ${toCurrency.toUpperCase()}`);
            } else {
                setError('Exchange failed. Please try again.');
            }
        } catch (error) {
            setError(`Exchange failed: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/5 border-2 border-white/20 p-6 rounded-lg">
            <h3 className="text-dhani-gold font-bold text-lg mb-6 tracking-wider flex items-center">
                <span className="mr-2">🔄</span>
                CURRENCY EXCHANGE
            </h3>

            {/* Exchange Rate Display */}
            <div className="bg-dhani-gold/10 border border-dhani-gold p-4 rounded mb-6">
                <div className="text-center">
                    <div className="text-dhani-gold font-bold text-sm tracking-wider">CURRENT EXCHANGE RATE</div>
                    <div className="text-white text-lg font-bold">1 RUPEE = {exchangeRate} ICP TOKEN</div>
                    <div className="text-white text-lg font-bold">1 ICP TOKEN = {(1/exchangeRate).toFixed(1)} RUPEES</div>
                </div>
            </div>

            {/* Balance Display */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-yellow-500/20 border border-yellow-400 p-4 rounded">
                    <div className="text-yellow-400 text-sm font-bold tracking-wider">RUPEES BALANCE</div>
                    <div className="text-white text-xl font-bold">₹{rupeesBalance.toLocaleString()}</div>
                </div>
                <div className="bg-blue-500/20 border border-blue-400 p-4 rounded">
                    <div className="text-blue-400 text-sm font-bold tracking-wider">ICP TOKEN BALANCE</div>
                    <div className="text-white text-xl font-bold">{icpTokenBalance.toFixed(4)}</div>
                </div>
            </div>

            {/* Exchange Form */}
            <div className="space-y-4">
                {/* From Currency */}
                <div>
                    <label className="block text-white text-sm font-bold mb-2 tracking-wider">FROM</label>
                    <div className="flex space-x-2">
                        <select
                            value={fromCurrency}
                            onChange={(e) => setFromCurrency(e.target.value as 'rupees' | 'icp')}
                            className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded font-vcr text-sm tracking-wider"
                        >
                            <option value="rupees">RUPEES (₹)</option>
                            <option value="icp">ICP TOKENS</option>
                        </select>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            max={getMaxAmount()}
                            className="flex-1 bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded font-vcr text-sm"
                        />
                        <button
                            onClick={() => setAmount(getMaxAmount().toString())}
                            className="bg-dhani-gold text-black px-3 py-2 rounded font-bold text-xs tracking-wider hover:bg-dhani-gold/80"
                        >
                            MAX
                        </button>
                    </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                    <button
                        onClick={handleSwapCurrencies}
                        className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full border-2 border-white transition-colors"
                        title="Swap currencies"
                    >
                        ⇅
                    </button>
                </div>

                {/* To Currency */}
                <div>
                    <label className="block text-white text-sm font-bold mb-2 tracking-wider">TO</label>
                    <div className="flex space-x-2">
                        <select
                            value={toCurrency}
                            onChange={(e) => setToCurrency(e.target.value as 'rupees' | 'icp')}
                            className="bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded font-vcr text-sm tracking-wider"
                        >
                            <option value="rupees">RUPEES (₹)</option>
                            <option value="icp">ICP TOKENS</option>
                        </select>
                        <div className="flex-1 bg-gray-700 border border-gray-600 text-dhani-gold px-3 py-2 rounded font-vcr text-sm font-bold">
                            {amount ? calculateExchangeAmount().toFixed(4) : '0.0000'}
                        </div>
                    </div>
                </div>

                {/* Exchange Preview */}
                {amount && (
                    <div className="bg-green-900/30 border border-green-600 p-4 rounded">
                        <div className="text-green-400 text-sm font-bold tracking-wider mb-2">EXCHANGE PREVIEW</div>
                        <div className="text-white">
                            {parseFloat(amount)} {fromCurrency.toUpperCase()} → {calculateExchangeAmount().toFixed(4)} {toCurrency.toUpperCase()}
                        </div>
                        <div className="text-green-300 text-xs mt-1">
                            Rate: 1 {fromCurrency.toUpperCase()} = {fromCurrency === 'rupees' ? exchangeRate : (1/exchangeRate).toFixed(1)} {toCurrency.toUpperCase()}
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-900/30 border border-red-600 p-4 rounded">
                        <div className="text-red-400 text-sm font-bold">{error}</div>
                    </div>
                )}

                {/* Exchange Button */}
                <button
                    onClick={handleExchange}
                    disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > getMaxAmount()}
                    className="w-full py-3 bg-dhani-gold text-black font-bold text-sm tracking-wider rounded hover:bg-dhani-gold/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'PROCESSING EXCHANGE...' : 'EXCHANGE CURRENCY'}
                </button>
            </div>

            {/* Exchange Tips */}
            <div className="mt-6 bg-blue-900/30 border border-blue-600 p-4 rounded">
                <div className="text-blue-400 text-sm font-bold tracking-wider mb-2">💡 EXCHANGE TIPS</div>
                <ul className="text-blue-200 text-xs space-y-1">
                    <li>• Exchange rates are processed via ICP canister backend</li>
                    <li>• No fees for currency exchange in this demo</li>
                    <li>• ICP Tokens can be used for staking and DeFi features</li>
                    <li>• Rupees are the traditional currency for banking operations</li>
                </ul>
            </div>
        </div>
    );
};

export default CurrencyExchange;