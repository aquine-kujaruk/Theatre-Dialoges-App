import { useState } from 'react';
import { setActorName } from '../../../lib/identity';

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setActorName(trimmed);
    onComplete();
  };

  return (
    <div className="onboarding-backdrop">
      <form className="onboarding-modal" onSubmit={handleSubmit}>
        <label className="onboarding-label" htmlFor="actor-name">
          How should we call you?
        </label>
        <input
          id="actor-name"
          className="onboarding-input"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={40}
        />
        <button
          className="onboarding-btn"
          type="submit"
          disabled={!name.trim()}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
