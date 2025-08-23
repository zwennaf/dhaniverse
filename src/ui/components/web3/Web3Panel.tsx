import React, { useState, useEffect } from 'react';
import { 
    Wallet, 
    Globe, 
    Coins, 
    TrendingUp, 
    Settings, 
    RefreshCw, 
    ExternalLink,
    Copy,
    CheckCircle,
    AlertTriangle,
    Plus,
    ArrowUpDown,
    History,
    Lock,
    Unlock,
    User
} from 'lucide-react';
import { icpIntegration, ICPConnectionStatus } from '../../../services/ICPIntegrationManager';
import { ICPToken } from '../../../services/TestnetBalanceManager';

interface Web3PanelProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const Web3Panel: React.FC<Web3PanelProps> = ({ isOpen = false, onClose }) => {
    const [activeTab, setActiveTab] = useState<'wallet' | 'faucet' | 'transactions'>('wallet');
    const [tokens, setTokens] = useState<ICPToken[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<ICPConnectionStatus>({
        isConnected: false,
        isAuthenticated: false,
        walletAddress: '',
        connectionType: 'none',
        network: 'Internet Computer'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null);
    const [faucetAmounts, setFaucetAmounts] = useState<Record<string, string>>({});
    const [copiedAddress, setCopiedAddress] = useState(false);
    const [dualBalance, setDualBalance] = useState<any>(null);
    
    // Legacy wallet state for compatibility
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');

    // Initialize data
    useEffect(() => {
        const initializeData = async () => {
            await icpIntegration.initialize();
            
            setTokens(icpIntegration.getTokens());
            setConnectionStatus(icpIntegration.getConnectionStatus());
            
            // Load dual balance
            const balance = await icpIntegration.getDualBalance();
            setDualBalance(balance);
        };

        initializeData();
    }, []);

    // Subscribe to updates
    useEffect(() => {
        const unsubscribeBalance = icpIntegration.onBalanceUpdate(setTokens);
        const unsubscribeConnection = icpIntegration.onConnectionChange(setConnectionStatus);
        
        return () => {
            unsubscribeBalance();
            unsubscribeConnection();
        };
    }, []);

    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const connectWallet = async () => {
        setIsLoading(true);
        try {
            // Connect using ICP integration
            const success = await icpIntegration.authenticateWithInternetIdentity();
            
            if (success) {
                const status = icpIntegration.getConnectionStatus();
                setConnectionStatus(status);
                setWalletAddress(status.walletAddress || 'ii-authenticated-user');
                setWalletConnected(true);
                
                // Load tokens and balance
                setTokens(icpIntegration.getTokens());
                const balance = await icpIntegration.getDualBalance();
                setDualBalance(balance);
                
                localStorage.setItem('wallet_address', status.walletAddress || 'ii-authenticated-user');
                showNotification('success', 'Wallet connected successfully!');
            } else {
                showNotification('error', 'Failed to connect wallet');
            }
        } catch (error) {
            console.error('Connection error:', error);
            showNotification('error', 'Failed to connect wallet');
        } finally {
            setIsLoading(false);
        }
    };

    const disconnectWallet = () => {
        setWalletAddress('');
        setWalletConnected(false);
        setConnectionStatus({
            isConnected: false,
            isAuthenticated: false,
            walletAddress: '',
            connectionType: 'none',
            network: 'Internet Computer'
        });
        localStorage.removeItem('wallet_address');
        showNotification('info', 'Wallet disconnected');
    };

    const requestFaucetTokens = async (tokenSymbol: string) => {
        const amount = faucetAmounts[tokenSymbol] || '100';
        setIsLoading(true);
        
        try {
            // For ICP, we simulate faucet by giving tokens (in a real implementation, this would be through the canister)
            showNotification('info', 'ICP faucet functionality not implemented in testnet mode');
        } catch (error) {
            showNotification('error', 'Faucet request failed');
        } finally {
            setIsLoading(false);
        }
    };

    const copyAddress = () => {
        navigator.clipboard.writeText(walletAddress);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
        showNotification('success', 'Address copied to clipboard');
    };

    const refreshBalances = async () => {
        setIsLoading(true);
        try {
            if (connectionStatus.isConnected) {
                await icpIntegration.syncWithCanister();
                const balance = await icpIntegration.getDualBalance();
                setDualBalance(balance);
                setTokens(icpIntegration.getTokens());
            }
            showNotification('success', 'Balances refreshed');
        } catch (error) {
            console.error('Refresh error:', error);
            showNotification('error', 'Failed to refresh balances');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper functions
    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const getMockTransactionHistory = () => {
        return [
            {
                id: '1',
                type: 'transfer',
                amount: '100',
                symbol: 'ICP',
                timestamp: Date.now() - 86400000,
                status: 'completed'
            },
            {
                id: '2',
                type: 'faucet',
                amount: '5.2',
                symbol: 'ICP',
                timestamp: Date.now() - 43200000,
                status: 'completed'
            }
        ];
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl h-5/6 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Wallet className="h-8 w-8" />
                                <div>
                                    <h2 className="text-2xl font-bold">Web3 Dashboard</h2>
                                    <p className="text-blue-200">Manage your testnet assets and DeFi activities</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-colors"
                            >
                                ×
                            </button>
                        </div>

                        {/* Wallet Status */}
                        <div className="mt-6 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                {walletConnected ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                        <span className="text-sm">Connected</span>
                                        <button
                                            onClick={copyAddress}
                                            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded px-2 py-1 text-sm flex items-center space-x-1 transition-colors"
                                        >
                                            <span>{formatAddress(walletAddress)}</span>
                                            {copiedAddress ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                        <span className="text-sm">Not Connected</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <div className="bg-white bg-opacity-20 rounded px-3 py-1 text-sm">
                                    {connectionStatus.network}
                                </div>
                                <button
                                    onClick={connectionStatus.isConnected ? disconnectWallet : connectWallet}
                                    disabled={isLoading}
                                    className="bg-white hover:bg-gray-100 text-blue-600 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : connectionStatus.isConnected ? (
                                        'Disconnect'
                                    ) : (
                                        'Connect Wallet'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Notification */}
                    {notification && (
                        <div className={`mx-6 mt-4 p-4 rounded-lg flex items-center space-x-2 ${
                            notification.type === 'success' ? 'bg-green-900 text-green-100' :
                            notification.type === 'error' ? 'bg-red-900 text-red-100' :
                            'bg-blue-900 text-blue-100'
                        }`}>
                            {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
                            {notification.type === 'error' && <AlertTriangle className="h-5 w-5" />}
                            <span>{notification.message}</span>
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="border-b border-gray-700">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { id: 'wallet', label: 'Wallet', icon: Wallet },
                                { id: 'faucet', label: 'Faucet', icon: Plus },
                                // staking removed
                                { id: 'transactions', label: 'History', icon: History }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`py-4 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-400'
                                            : 'border-transparent text-gray-400 hover:text-gray-300'
                                    }`}
                                >
                                    <tab.icon className="h-4 w-4" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'wallet' && (
                            <div className="space-y-6">
                                {/* Portfolio Overview */}
                                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-white">Portfolio Overview</h3>
                                        <button
                                            onClick={refreshBalances}
                                            disabled={isLoading}
                                            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                    <div className="text-2xl font-bold text-white mb-2">
                                        ${dualBalance ? (dualBalance.game_tokens + dualBalance.icp_tokens).toFixed(2) : '0.00'}
                                    </div>
                                    <p className="text-gray-400">Total Portfolio Value</p>
                                </div>

                                {/* Token Balances */}
                                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                    <h3 className="text-lg font-semibold text-white mb-4">Token Balances</h3>
                                    <div className="space-y-3">
                                        {tokens.map(token => (
                                            <div key={token.symbol} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-sm font-bold">
                                                            {token.symbol.charAt(0)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-medium">{token.symbol}</div>
                                                        <div className="text-gray-400 text-sm">{token.name}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-white font-medium">
                                                        {parseFloat(token.balance).toFixed(4)}
                                                    </div>
                                                    {token.usdValue && (
                                                        <div className="text-gray-400 text-sm">
                                                            ${(parseFloat(token.balance) * token.usdValue).toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Network Information */}
                                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                    <h3 className="text-lg font-semibold text-white mb-4">Network</h3>
                                    <div className="p-4 rounded-lg border border-blue-500 bg-blue-900 bg-opacity-30">
                                        <div className="text-white font-medium">{connectionStatus.network}</div>
                                        <div className="text-gray-400 text-sm">Internet Computer Protocol</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'faucet' && (
                            <div className="space-y-6">
                                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                    <h3 className="text-lg font-semibold text-white mb-4">Testnet Faucet</h3>
                                    <p className="text-gray-400 mb-6">Request free testnet tokens for development and testing purposes.</p>
                                    
                                    <div className="space-y-4">
                                        {tokens.map(token => (
                                            <div key={token.symbol} className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="text-white font-medium">{token.symbol}</div>
                                                    <div className="text-gray-400 text-sm">Current: {parseFloat(token.balance).toFixed(4)}</div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Amount"
                                                        value={faucetAmounts[token.symbol] || ''}
                                                        onChange={(e) => setFaucetAmounts(prev => ({
                                                            ...prev,
                                                            [token.symbol]: e.target.value
                                                        }))}
                                                        className="w-24 bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
                                                    />
                                                    <button
                                                        onClick={() => requestFaucetTokens(token.symbol)}
                                                        disabled={isLoading}
                                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-1 rounded text-sm transition-colors"
                                                    >
                                                        Request
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <Globe className="h-5 w-5 text-blue-400" />
                                            <span className="text-blue-400 font-medium">ICP Testnet Mode</span>
                                        </div>
                                        <p className="text-gray-300 mt-2">
                                            Faucet functionality is not available in ICP testnet mode. Use the canister methods to manage tokens.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* staking removed */}

                        {activeTab === 'transactions' && (
                            <div className="space-y-6">
                                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                    <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
                                    <div className="space-y-3">
                                        {getMockTransactionHistory().map(tx => (
                                            <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-b-0">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                        tx.type === 'faucet' ? 'bg-blue-500' :
                                                        tx.type === 'transfer' ? 'bg-gray-600' :
                                                        'bg-gray-500'
                                                    }`}>
                                                        {tx.type === 'faucet' && <Plus className="h-4 w-4 text-white" />}
                                                        {tx.type === 'transfer' && <ArrowUpDown className="h-4 w-4 text-white" />}
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-medium capitalize">
                                                            {tx.type.replace('_', ' ')}
                                                        </div>
                                                        <div className="text-gray-400 text-sm">
                                                            {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`font-medium ${
                                                        tx.type === 'faucet' ? 'text-green-400' :
                                                        'text-white'
                                                    }`}>
                                                        {tx.type === 'faucet' ? '+' : ''}
                                                        {tx.amount} {tx.symbol}
                                                    </div>
                                                    <div className={`text-sm ${
                                                        tx.status === 'confirmed' ? 'text-green-400' :
                                                        tx.status === 'pending' ? 'text-yellow-400' :
                                                        'text-red-400'
                                                    }`}>
                                                        {tx.status}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Staking Panel */}
                        {/* staking panel removed */}
        </>
    );
};

export default Web3Panel;
