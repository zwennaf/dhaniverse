/**
 * Web3Integration - Component to integrate Web3 functionality into the game
 * This can be added to your GamePage or GameHUD to provide access to staking features
 */

import React, { useState } from 'react';
import { Wallet, Coins } from 'lucide-react';
import Web3Panel from './web3/Web3Panel';
import StakingPanel from './web3/StakingPanel';

interface Web3IntegrationProps {
    /** Position of the Web3 buttons in the UI */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    /** Show staking button separately */
    showStakingButton?: boolean;
    /** Custom class name for styling */
    className?: string;
}

const Web3Integration: React.FC<Web3IntegrationProps> = ({ 
    position = 'top-right',
    showStakingButton = true,
    className = ''
}) => {
    const [showWeb3Panel, setShowWeb3Panel] = useState(false);
    const [showStakingPanel, setShowStakingPanel] = useState(false);

    const getPositionClasses = () => {
        switch (position) {
            case 'top-left':
                return 'top-4 left-4';
            case 'top-right':
                return 'top-4 right-4';
            case 'bottom-left':
                return 'bottom-4 left-4';
            case 'bottom-right':
                return 'bottom-4 right-4';
            default:
                return 'top-4 right-4';
        }
    };

    return (
        <>
            {/* Web3 Action Buttons */}
            <div className={`fixed ${getPositionClasses()} z-40 flex flex-col space-y-2 ${className}`}>
                {/* Web3 Wallet Button */}
                <button
                    onClick={() => setShowWeb3Panel(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 group"
                    title="Open Web3 Dashboard"
                >
                    <Wallet className="h-5 w-5" />
                    <span className="hidden group-hover:block text-sm font-medium">Web3</span>
                </button>

                {/* Direct Staking Button */}
                {showStakingButton && (
                    <button
                        onClick={() => setShowStakingPanel(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 group"
                        title="Open Staking Dashboard"
                    >
                        <Coins className="h-5 w-5" />
                        <span className="hidden group-hover:block text-sm font-medium">Stake</span>
                    </button>
                )}
            </div>

            {/* Web3 Panel Modal */}
            {showWeb3Panel && (
                <Web3Panel 
                    isOpen={showWeb3Panel} 
                    onClose={() => setShowWeb3Panel(false)} 
                />
            )}

            {/* Staking Panel Modal */}
            {showStakingPanel && (
                <StakingPanel 
                    isOpen={showStakingPanel} 
                    onClose={() => setShowStakingPanel(false)} 
                />
            )}
        </>
    );
};

export default Web3Integration;
