import React, { useState } from 'react';
import PixelButton from '../atoms/PixelButton';

interface UsernameModalProps {
  isOpen: boolean;
  onSubmit: (username: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

const UsernameModal: React.FC<UsernameModalProps> = ({
  isOpen,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }
    
    setError('');
    onSubmit(username.trim());
  };

  const handleCancel = () => {
    setUsername('');
    setError('');
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-dhani-darkgray p-6 rounded-2xl shadow-lg shadow-dhani-gold/20 w-full max-w-md mx-4">
        <h2 className="text-xl font-tickerbit text-dhani-text text-center mb-4">
          Choose Your <span className="text-dhani-gold">Game Username</span>
        </h2>
        
        <p className="text-dhani-text/70 text-sm text-center mb-6">
          This will be your display name in the game world.
        </p>

        {error && (
          <div className="text-red-400 text-sm font-tickerbit p-2 mb-4 border border-red-400 rounded bg-red-900/20">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) setError('');
            }}
            placeholder="Enter your game username"
            required
            minLength={3}
            maxLength={20}
            className="w-full bg-dhani-dark border rounded-2xl border-dhani-gold/30 py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold"
            autoFocus
            disabled={loading}
          />
          
          <div className="flex space-x-3">
            <PixelButton
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </PixelButton>
            <PixelButton
              type="submit"
              disabled={loading || username.trim().length < 3}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Continue'}
            </PixelButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsernameModal;
