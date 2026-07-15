'use client';

interface WelcomeScreenProps {
  onStart: () => void;
  isLoading: boolean;
}

export default function WelcomeScreen({ onStart, isLoading }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8 animate-in">
        {/* Logo */}
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent-600 to-accent-800 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            DarkTalk
          </h1>
          <p className="text-gray-400 text-sm">
            Anonymous chat. No accounts. No tracking.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 py-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-lg bg-dark-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">Private</p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-lg bg-dark-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">Fast</p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-lg bg-dark-800 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">2h Session</p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <button
            onClick={onStart}
            disabled={isLoading}
            className="w-full btn btn-primary text-lg py-6 rounded-xl shadow-lg shadow-accent-600/25 hover:shadow-accent-500/30 transition-all"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating session...
              </span>
            ) : (
              'Start Chatting'
            )}
          </button>

          <p className="text-xs text-gray-600">
            Your session will expire in 2 hours. All data will be deleted.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="pt-8 border-t border-dark-800">
          <p className="text-xs text-gray-600">
            By starting, you agree to chat responsibly. No harassment, no spam.
          </p>
        </div>
      </div>
    </div>
  );
}
