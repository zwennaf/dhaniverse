import React, { useState } from 'react';

interface BankNameInputProps {
  onSubmit: (name: string) => void;
  onCancel?: () => void;
}

const BankNameInput: React.FC<BankNameInputProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    setIsValid(value.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(value.trim()));
  };

  const handleSubmit = () => {
    if (isValid) {
      onSubmit(name.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      
      {/* Input modal */}
      <div className="relative bg-gradient-to-br from-gray-900 to-black border border-dhani-gold/30 rounded-2xl shadow-2xl shadow-dhani-gold/20 p-8 max-w-md w-full mx-4 transform scale-100 animate-scale-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-dhani-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-dhani-gold">
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Account Registration</h2>
          <p className="text-gray-300 text-sm">Please enter your full name to create your bank account</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              id="fullName"
              type="text"
              value={name}
              onChange={handleNameChange}
              onKeyPress={handleKeyPress}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-dhani-gold focus:ring-1 focus:ring-dhani-gold transition-colors"
              autoFocus
              maxLength={50}
            />
            {name && !isValid && (
              <p className="text-red-400 text-xs mt-2">
                Name must be at least 2 characters and contain only letters and spaces
              </p>
            )}
          </div>

          <div className="flex space-x-3 mt-6">
            {onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                isValid
                  ? 'bg-dhani-gold hover:bg-dhani-gold/90 text-black hover:shadow-lg hover:shadow-dhani-gold/30'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-6 p-3 bg-dhani-gold/10 border border-dhani-gold/30 rounded-lg">
          <div className="flex items-start space-x-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-dhani-gold mt-0.5 flex-shrink-0">
              <path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className="text-xs text-dhani-gold font-medium">Secure Registration</p>
              <p className="text-xs text-gray-300 mt-1">Your information is encrypted and stored securely</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankNameInput;
