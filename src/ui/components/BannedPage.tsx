import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, Clock, Mail } from 'lucide-react';
import PixelButton from './atoms/PixelButton';

interface BannedPageProps {
  reason?: string;
  banType?: string;
  expiresAt?: string;
}

const BannedPage: React.FC<BannedPageProps> = ({ 
  reason = "You have been banned from the game", 
  banType = "account",
  expiresAt 
}) => {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    navigate('/');
  };

  const isTemporary = expiresAt && new Date(expiresAt) > new Date();
  const expiryDate = expiresAt ? new Date(expiresAt) : null;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Ban Notice Card */}
        <div className="bg-gradient-to-br from-red-900/20 via-black to-red-800/10 border border-red-500/30 rounded-2xl p-8 backdrop-blur-sm">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/40">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-vcr text-white text-center mb-2">
            Access Restricted
          </h1>
          
          {/* Ban Type Badge */}
          <div className="flex justify-center mb-4">
            <span className="px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-sm text-red-300 font-vcr uppercase tracking-wide">
              {banType} {isTemporary ? 'Temporary Ban' : 'Ban'}
            </span>
          </div>

          {/* Reason */}
          <div className="bg-black/40 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-white/80 text-center font-robert leading-relaxed">
              {reason}
            </p>
          </div>

          {/* Expiry Info (if temporary) */}
          {isTemporary && expiryDate && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-vcr text-orange-300 uppercase tracking-wide">
                  Temporary Ban
                </span>
              </div>
              <p className="text-white/70 text-sm font-robert mb-2">
                Your access will be restored on:
              </p>
              <p className="text-orange-300 font-vcr text-lg mb-2">
                {expiryDate.toLocaleString()}
              </p>
              <div className="text-xs text-orange-400/70 font-robert">
                {(() => {
                  const timeRemaining = expiryDate.getTime() - Date.now();
                  const hours = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60)));
                  const days = Math.floor(hours / 24);
                  const remainingHours = hours % 24;
                  
                  if (days > 0) {
                    return `Time remaining: ${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
                  } else {
                    return `Time remaining: ${hours} hour${hours !== 1 ? 's' : ''}`;
                  }
                })()}
              </div>
            </div>
          )}

          {/* Permanent Ban Info */}
          {!isTemporary && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-vcr text-red-300 uppercase tracking-wide">
                  Permanent Ban
                </span>
              </div>
              <p className="text-white/70 text-sm font-robert">
                This is a permanent restriction on your account. Contact support if you believe this was issued in error.
              </p>
            </div>
          )}

          {/* Appeal Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-vcr text-blue-300 uppercase tracking-wide">
                Need Help?
              </span>
            </div>
            <p className="text-white/70 text-sm font-robert">
              If you believe this ban was issued in error, please contact our support team at{' '}
              <a 
                href="mailto:support@dhaniverse.in" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                support@dhaniverse.in
              </a>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <PixelButton
              onClick={handleReturnHome}
              variant="outline"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} />
              Return to Home
            </PixelButton>
            
            {isTemporary && (
              <PixelButton
                onClick={() => window.location.reload()}
                variant="cta"
                size="sm"
                className="w-full"
                disabled={new Date() < expiryDate!}
              >
                {new Date() < expiryDate! ? 'Ban Still Active' : 'Try Again'}
              </PixelButton>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-white/40 text-sm font-robert">
            Ban ID: {Date.now().toString(36).toUpperCase()}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default BannedPage;
