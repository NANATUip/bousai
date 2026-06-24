/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GamePhase, PlayerStats } from './types';
import TitleScreen from './components/TitleScreen';
import EarthquakeStage from './components/EarthquakeStage';
import TsunamiStage from './components/TsunamiStage';
import ResultScreen from './components/ResultScreen';
import { Shield, HelpCircle, Heart, BookOpen, AlertCircle } from 'lucide-react';

const INITIAL_STATS: PlayerStats = {
  health: 100,
  maxHealth: 100,
  score: 0,
  hasHelmet: false,
  hasShoes: false,
  hasBag: false,
  earthquakeQuizCorrect: null,
  tsunamiDecisions: {
    carVsFoot: null,
    blockWall: null,
    routeSelection: null,
    stairsVsElevator: null,
  },
  preparedItems: [],
  survivalResult: 'SURVIVED',
  difficulty: 'NORMAL',
};

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('TITLE');
  const [stats, setStats] = useState<PlayerStats>({ ...INITIAL_STATS });

  const handleStartGame = (selectedDifficulty: 'EASY' | 'NORMAL' | 'HARD') => {
    setStats({
      ...INITIAL_STATS,
      difficulty: selectedDifficulty,
    });
    setPhase('EARTHQUAKE');
  };

  const handleNextPhase = (nextPhase: GamePhase) => {
    setPhase(nextPhase);
  };

  const handleRetry = () => {
    setStats({ ...INITIAL_STATS });
    setPhase('TITLE');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between" id="app-wrapper">
      {/* Universal Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3" id="app-header">
        <div className="max-w-6xl mx-auto flex justify-between items-center" id="header-inner">
          <div className="flex items-center gap-2" id="header-logo-group">
            <span className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Shield className="w-5 h-5" />
            </span>
            <span className="font-extrabold text-sm md:text-base tracking-wider bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              防災避難サバイバル
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400" id="header-meta">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              リアルタイム避難訓練中
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 flex items-center justify-center" id="app-main">
        {phase === 'TITLE' && (
          <TitleScreen onStart={handleStartGame} />
        )}

        {(phase === 'EARTHQUAKE_INTRO' || phase === 'EARTHQUAKE') && (
          <EarthquakeStage
            playerStats={stats}
            setPlayerStats={setStats}
            onNextPhase={handleNextPhase}
          />
        )}

        {(phase === 'TSUNAMI_INTRO' || phase === 'TSUNAMI') && (
          <TsunamiStage
            playerStats={stats}
            setPlayerStats={setStats}
            onNextPhase={handleNextPhase}
          />
        )}

        {phase === 'RESULT' && (
          <ResultScreen
            playerStats={stats}
            onRetry={handleRetry}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-950 bg-slate-950 py-4 text-center text-[10px] text-slate-600 px-4" id="app-footer">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2" id="footer-inner">
          <p>© 2026 防災避難アクションゲーム シミュレーター. All Rights Reserved.</p>
          <p className="flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            本ゲームで紹介する防災知識は、内閣府・気象庁等の公的避難ガイドラインに基づいています。
          </p>
        </div>
      </footer>
    </div>
  );
}
