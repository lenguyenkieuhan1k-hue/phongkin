'use client';

import { useState, FormEvent } from 'react';

interface InviteModalProps {
  onClose: () => void;
  inviterDarkId: string;
  sessionToken: string;
}

export default function InviteModal({ onClose, inviterDarkId, sessionToken }: InviteModalProps) {
  const [darkId, setDarkId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedDarkId = darkId.toUpperCase().trim();

    if (!/^DT-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalizedDarkId)) {
      setError('Invalid Dark ID format. Expected: DT-XXXX-XXXX');
      return;
    }

    if (normalizedDarkId === inviterDarkId) {
      setError('You cannot connect with yourself');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/invite/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ targetDarkId: normalizedDarkId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send invitation');
        return;
      }

      // Success - close modal
      onClose();
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-2xl p-6 max-w-md w-full border border-dark-700 animate-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Connect with someone</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-700 text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Enter their Dark ID
            </label>
            <input
              type="text"
              value={darkId}
              onChange={(e) => {
                setDarkId(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="DT-XXXX-XXXX"
              className="w-full input font-mono text-center text-lg tracking-wider"
              autoFocus
              maxLength={12}
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          <div className="bg-dark-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">How it works:</p>
            <ol className="text-sm text-gray-400 space-y-1">
              <li>1. Share your Dark ID with someone</li>
              <li>2. Ask them to enter your ID here</li>
              <li>3. They will receive a request to connect</li>
              <li>4. Once accepted, you can start chatting</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!darkId.trim() || isLoading}
              className="flex-1 btn btn-primary disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
