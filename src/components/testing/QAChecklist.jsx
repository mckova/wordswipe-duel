import React from 'react';

// QA Testing Checklist Component
export default function QAChecklist() {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold mb-8 text-center">WordSwipe Duel - QA Testing Checklist</h1>
      
      <div className="space-y-8">
        {/* Onboarding Tutorial */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            🎯 Onboarding Tutorial
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Test Cases:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>Tutorial appears automatically on first app launch</li>
                <li>Can navigate through all tutorial slides</li>
                <li>"Don't show again" checkbox works correctly</li>
                <li>Tutorial doesn't appear on subsequent launches when checked</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Expected Behavior:</h3>
              <p className="text-gray-700">Tutorial should only show once unless user clears localStorage. All animations should be smooth.</p>
            </div>
          </div>
        </section>

        {/* Login Flow */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            🔐 Login Flow
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Test Cases:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>Login button triggers Google OAuth</li>
                <li>Successful login redirects to Home</li>
                <li>User data displays correctly (name, avatar, score, crystals)</li>
                <li>Failed login shows appropriate error</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Expected Behavior:</h3>
              <p className="text-gray-700">Seamless Google OAuth flow with persistent user data across sessions.</p>
            </div>
          </div>
        </section>

        {/* Single-Player Game */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            🎮 Single-Player Game
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Test Cases:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>Skeleton loader appears first, then grid fades in</li>
                <li>Local dictionary validates common words instantly</li>
                <li>API fallback works for uncommon words</li>
                <li>Invalid words show error toast</li>
                <li>Valid words show success toast with score</li>
                <li>Timer counts down correctly</li>
                <li>Word selection works (adjacent tiles only)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Expected Behavior:</h3>
              <p className="text-gray-700">Fast local validation with API fallback only when needed. Smooth animations and proper error handling.</p>
            </div>
          </div>
        </section>

        {/* Power-Ups */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            ⚡ Power-Ups
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Test Cases:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>Crystal cost deducts correctly on purchase</li>
                <li>Power-up count increases after purchase</li>
                <li>Time Freeze: Pauses timer for 10 seconds</li>
                <li>Word Hint: Shows helpful hint toast</li>
                <li>Swap Board: Generates new grid</li>
                <li>Double Score: 2x points for 30 seconds</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Expected Behavior:</h3>
              <p className="text-gray-700">Immediate visual feedback with proper state management and clear cost display.</p>
            </div>
          </div>
        </section>

        {/* XP & Leveling */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            🌟 XP & Leveling
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Test Cases:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>Solo games award 10 XP</li>
                <li>Multiplayer games award 20 XP</li>
                <li>Daily challenges award 15 XP</li>
                <li>Level-up modal appears at right time</li>
                <li>Rewards distributed correctly</li>
                <li>"Claim Reward" button works</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Expected Behavior:</h3>
              <p className="text-gray-700">Accurate XP tracking with smooth level-up experience and proper reward distribution.</p>
            </div>
          </div>
        </section>

        {/* Daily Challenge */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            📅 Daily Challenge
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Test Cases:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>New challenge appears daily</li>
                <li>3 attempts maximum per day</li>
                <li>Finding target word completes challenge</li>
                <li>Awards 30 crystals on completion</li>
                <li>Creates gift entry</li>
                <li>Attempts reset at midnight</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Expected Behavior:</h3>
              <p className="text-gray-700">Daily reset at midnight with proper attempt tracking and reward distribution on completion.</p>
            </div>
          </div>
        </section>

        {/* Shop UI */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            🛍️ Shop UI
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Test Cases:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>"Best Value" badge on correct package</li>
                <li>Different visual styles for packages</li>
                <li>Purchase buttons trigger IAP flow</li>
                <li>Google Play modal appears when IAP unavailable</li>
                <li>"Go to Play Store" button works</li>
                <li>Power-up purchase flow works</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Expected Behavior:</h3>
              <p className="text-gray-700">Clear value proposition with smooth purchase flow and proper IAP integration stubs.</p>
            </div>
          </div>
        </section>

        {/* Multiplayer Modes */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            🏆 Multiplayer Modes
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Online Matchmaking:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>Waiting spinner appears</li>
                <li>Both games start simultaneously</li>
                <li>Real-time score updates</li>
                <li>Timer synchronization</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Friend Invites:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>Share link generation works</li>
                <li>QR code displays correctly</li>
                <li>Both players see lobby</li>
                <li>Ready buttons functional</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg">Pass-and-Play:</h3>
              <ul className="list-disc ml-6 space-y-2">
                <li>Clear player turn indicators</li>
                <li>Proper game state preservation</li>
                <li>Score tracking per player</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Bug Severity Levels */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            🐛 Bug Severity Levels
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-red-600">Critical (P0)</h3>
              <ul className="list-disc ml-6 text-sm">
                <li>App crashes or won't load</li>
                <li>Login completely broken</li>
                <li>Game unplayable</li>
                <li>Data loss issues</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-orange-600">High (P1)</h3>
              <ul className="list-disc ml-6 text-sm">
                <li>Major feature broken</li>
                <li>Incorrect scoring/rewards</li>
                <li>Payment/purchase issues</li>
                <li>Multiplayer sync problems</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-yellow-600">Medium (P2)</h3>
              <ul className="list-disc ml-6 text-sm">
                <li>UI inconsistencies</li>
                <li>Minor functional issues</li>
                <li>Performance problems</li>
                <li>Notification issues</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-blue-600">Low (P3)</h3>
              <ul className="list-disc ml-6 text-sm">
                <li>Cosmetic issues</li>
                <li>Minor UX improvements</li>
                <li>Edge case behaviors</li>
                <li>Enhancement requests</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Testing Sign-off Criteria */}
        <section className="border rounded-lg p-6 bg-green-50">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            ✅ Testing Sign-off Criteria
          </h2>
          <ul className="list-disc ml-6 space-y-2">
            <li>All P0/P1 bugs resolved</li>
            <li>Core user journey works end-to-end</li>
            <li>Performance meets standards</li>
            <li>Cross-browser compatibility verified</li>
            <li>Mobile experience optimized</li>
            <li>Accessibility requirements met</li>
          </ul>
        </section>
      </div>
    </div>
  );
}