import { useState } from 'react';
import TitleScreen from './components/TitleScreen';
import GameShell from './shell/GameShell';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [runKey, setRunKey] = useState(0);
  const [best, setBest] = useState(() => ({
    wave: Number(localStorage.getItem('et_best') ?? 0),
    souls: Number(localStorage.getItem('et_souls') ?? 0),
  }));

  const refreshBest = () =>
    setBest({
      wave: Number(localStorage.getItem('et_best') ?? 0),
      souls: Number(localStorage.getItem('et_souls') ?? 0),
    });

  return (
    <ErrorBoundary label="دژِ ابدیت">
      {screen === 'title' ? (
        <TitleScreen best={best} onStart={() => setScreen('game')} />
      ) : (
        <GameShell
          key={runKey}
          onRetry={() => setRunKey((k) => k + 1)}
          onExit={() => {
            refreshBest();
            setScreen('title');
          }}
        />
      )}
    </ErrorBoundary>
  );
}
