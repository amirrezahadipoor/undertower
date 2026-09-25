import { useState } from 'react';
import TitleScreen from './components/TitleScreen';
import GameShell from './shell/GameShell';

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

  if (screen === 'title') {
    return <TitleScreen best={best} onStart={() => setScreen('game')} />;
  }
  return (
    <GameShell
      key={runKey}
      onRetry={() => setRunKey((k) => k + 1)}
      onExit={() => {
        refreshBest();
        setScreen('title');
      }}
    />
  );
}
