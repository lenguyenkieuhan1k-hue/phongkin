'use client';

import { useState } from 'react';

interface InviteLinkProps {
  darkId: string;
}

export default function InviteLink({ darkId }: InviteLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(darkId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-dark-800 rounded-lg px-4 py-3">
        <p className="text-xs text-gray-500 mb-1">Share your Dark ID</p>
        <p className="font-mono text-lg text-accent-400 tracking-wider">
          {darkId}
        </p>
      </div>
      <button
        onClick={handleCopy}
        className="btn btn-primary"
      >
        {copied ? (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  );
}
