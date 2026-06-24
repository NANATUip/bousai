import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Flame, Shield, ArrowRight, Zap, RefreshCw, Footprints, Skull, Compass, Building, HelpCircle, ShieldCheck } from 'lucide-react';
import { GamePhase, PlayerStats } from '../types';

interface TsunamiStageProps {
  playerStats: PlayerStats;
  setPlayerStats: Dispatch<SetStateAction<PlayerStats>>;
  onNextPhase: (phase: GamePhase) => void;
}

export default function TsunamiStage({ playerStats, setPlayerStats, onNextPhase }: TsunamiStageProps) {
  const [phase, setPhase] = useState<'INTRO' | 'PLAYING' | 'DECISION' | 'OUTRO'>('INTRO');
  
  // Game parameters
  const [playerDistance, setPlayerDistance] = useState<number>(0); // Progress from 0 to 1000 meters
  const [tsunamiDistance, setTsunamiDistance] = useState<number>(-200); // Tsunami starting position (behind player)
  const [activeDecision, setActiveDecision] = useState<'CAR' | 'ROUTE' | 'STAIRS' | 'BLOCK_WALL' | null>(null);
  const [decisionAnswered, setDecisionAnswered] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [stamina, setStamina] = useState<number>(100);

  // References to keep state available in loops
  const playerDistanceRef = useRef<number>(0);
  const tsunamiDistanceRef = useRef<number>(-200);
  const gameIntervalRef = useRef<any>(null);

  useEffect(() => {
    playerDistanceRef.current = playerDistance;
  }, [playerDistance]);

  useEffect(() => {
    tsunamiDistanceRef.current = tsunamiDistance;
  }, [tsunamiDistance]);

  // Start Tsunami gameplay
  const startTsunamiRun = () => {
    setPhase('PLAYING');
    setPlayerDistance(0);
    
    const diff = playerStats.difficulty;
    // Hard has slightly more breathing room (-180m) to allow player's skill to shine
    const startTsuDist = diff === 'EASY' ? -350 : diff === 'HARD' ? -180 : -250;
    setTsunamiDistance(startTsuDist);
    setStamina(100);

    // Speed multiplier based on shoes from Phase 1
    const speedPenalty = playerStats.hasShoes ? 1.0 : 0.65; // No shoes = much slower!
    const blockPenalty = playerStats.tsunamiDecisions.blockWall === 'narrow' ? 0.75 : 1.0;

    // Adjusted Tsunami wave speed based on user skill request (Easy: 8.5, Normal: 10.5, Hard: 13.0)
    const tsuSpeed = diff === 'EASY' ? 8.5 : diff === 'HARD' ? 13.0 : 10.5;

    // Game update clock (updates tsunami position, stamina recovery, etc.)
    gameIntervalRef.current = setInterval(() => {
      const currentTsu = tsunamiDistanceRef.current;
      const currentPl = playerDistanceRef.current;

      const nextTsu = currentTsu + tsuSpeed; // wave speed based on difficulty
      const nextPl = currentPl + (4 * speedPenalty * blockPenalty);

      setTsunamiDistance(nextTsu);
      setPlayerDistance(nextPl);

      // Check catch up
      if (nextTsu >= currentPl) {
        endTsunamiRun(false); // Player caught!
        return;
      }

      // Check milestones for choices
      if (currentPl < 300 && nextPl >= 300 && !playerStats.tsunamiDecisions.carVsFoot) {
        triggerDecision('CAR');
        return;
      } else if (currentPl < 450 && nextPl >= 450 && !playerStats.tsunamiDecisions.blockWall) {
        triggerDecision('BLOCK_WALL');
        return;
      } else if (currentPl < 600 && nextPl >= 600 && !playerStats.tsunamiDecisions.routeSelection) {
        triggerDecision('ROUTE');
        return;
      } else if (currentPl < 820 && nextPl >= 820 && !playerStats.tsunamiDecisions.stairsVsElevator) {
        triggerDecision('STAIRS');
        return;
      }

      // Check goal
      if (nextPl >= 1000) {
        endTsunamiRun(true); // Escaped!
        return;
      }

      // 3. Recover stamina slowly
      setStamina((prev) => Math.min(100, prev + 2.5));
    }, 400);
  };

  // Triggering decision points
  const triggerDecision = (decisionType: 'CAR' | 'ROUTE' | 'STAIRS' | 'BLOCK_WALL') => {
    // Pause game interval
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    setActiveDecision(decisionType);
    setPhase('DECISION');
    setDecisionAnswered(false);
    setSelectedOption(null);
  };

  // Handle decisions made
  const handleDecisionSubmit = (optionIndex: number, isCorrect: boolean) => {
    setSelectedOption(optionIndex);
    setDecisionAnswered(true);

    let nextHealth = playerStats.health;
    let nextScore = playerStats.score + (isCorrect ? 200 : 0);
    const updatedDecisions = { ...playerStats.tsunamiDecisions };

    const diff = playerStats.difficulty;
    const penaltyMultiplier = diff === 'EASY' ? 0.6 : diff === 'HARD' ? 1.25 : 1.0;

    if (activeDecision === 'CAR') {
      updatedDecisions.carVsFoot = optionIndex === 0 ? 'foot' : 'car';
      if (!isCorrect) {
        // Car gets stuck, tsunami catches up heavily!
        setTsunamiDistance((prev) => prev + Math.round(150 * penaltyMultiplier));
        nextHealth = Math.max(10, nextHealth - Math.round(15 * penaltyMultiplier));
      }
    } else if (activeDecision === 'BLOCK_WALL') {
      updatedDecisions.blockWall = optionIndex === 0 ? 'wide' : 'narrow';
      if (!isCorrect) {
        // Block walls collapse, lose health and speed drops!
        nextHealth = Math.max(10, nextHealth - Math.round(20 * penaltyMultiplier));
      }
    } else if (activeDecision === 'ROUTE') {
      updatedDecisions.routeSelection = optionIndex === 0 ? 'safe' : 'cliff';
      if (!isCorrect) {
        // Landslide hits, lose health and speed drops!
        nextHealth = Math.max(10, nextHealth - Math.round(35 * penaltyMultiplier));
      }
    } else if (activeDecision === 'STAIRS') {
      updatedDecisions.stairsVsElevator = optionIndex === 0 ? 'stairs' : 'elevator';
      if (!isCorrect) {
        // Caught by rising tide / power outage!
        nextHealth = Math.max(0, nextHealth - Math.round(45 * penaltyMultiplier));
      }
    }

    setPlayerStats((prev) => ({
      ...prev,
      health: nextHealth,
      score: nextScore,
      tsunamiDecisions: updatedDecisions,
    }));

    // Resume after display
    setTimeout(() => {
      if (nextHealth <= 0) {
        endTsunamiRun(false);
      } else {
        resumeTsunamiRun();
      }
    }, 4000);
  };

  const resumeTsunamiRun = () => {
    setPhase('PLAYING');
    setActiveDecision(null);

    // Speed multiplier based on shoes & choices
    const speedPenalty = playerStats.hasShoes ? 1.0 : 0.65;
    const carPenalty = playerStats.tsunamiDecisions.carVsFoot === 'car' ? 0.4 : 1.0; // Stuck in car!
    const blockPenalty = playerStats.tsunamiDecisions.blockWall === 'narrow' ? 0.75 : 1.0; // Slowed by collapse!
    const routePenalty = playerStats.tsunamiDecisions.routeSelection === 'cliff' ? 0.7 : 1.0; // Injured from landslide!

    const diff = playerStats.difficulty;
    // Adjusted post-decision tsunami speed for Hard (17 -> 14.5) to keep it tense but highly clearable
    const tsuSpeed = diff === 'EASY' ? 9.5 : diff === 'HARD' ? 14.5 : 11.5;

    gameIntervalRef.current = setInterval(() => {
      const currentTsu = tsunamiDistanceRef.current;
      const currentPl = playerDistanceRef.current;

      const nextTsu = currentTsu + tsuSpeed;
      const nextPl = currentPl + (4.5 * speedPenalty * carPenalty * routePenalty * blockPenalty);

      setTsunamiDistance(nextTsu);
      setPlayerDistance(nextPl);

      // Check catch up
      if (nextTsu >= currentPl) {
        endTsunamiRun(false);
        return;
      }

      // Check milestones for choices
      if (currentPl < 300 && nextPl >= 300 && !playerStats.tsunamiDecisions.carVsFoot) {
        triggerDecision('CAR');
        return;
      } else if (currentPl < 450 && nextPl >= 450 && !playerStats.tsunamiDecisions.blockWall) {
        triggerDecision('BLOCK_WALL');
        return;
      } else if (currentPl < 600 && nextPl >= 600 && !playerStats.tsunamiDecisions.routeSelection) {
        triggerDecision('ROUTE');
        return;
      } else if (currentPl < 820 && nextPl >= 820 && !playerStats.tsunamiDecisions.stairsVsElevator) {
        triggerDecision('STAIRS');
        return;
      }

      // Check goal
      if (nextPl >= 1000) {
        endTsunamiRun(true);
        return;
      }

      setStamina((prev) => Math.min(100, prev + 2.5));
    }, 400);
  };

  // Player active run key tap
  const handleActiveRun = () => {
    if (phase !== 'PLAYING') return;
    if (stamina < 10) return; // Out of breath!

    const speedPenalty = playerStats.hasShoes ? 1.0 : 0.65;
    const carPenalty = playerStats.tsunamiDecisions.carVsFoot === 'car' ? 0.3 : 1.0;
    const blockPenalty = playerStats.tsunamiDecisions.blockWall === 'narrow' ? 0.75 : 1.0;
    const routePenalty = playerStats.tsunamiDecisions.routeSelection === 'cliff' ? 0.65 : 1.0;

    const diff = playerStats.difficulty;
    // Adjusted sprint multiplier on Hard (0.85 -> 0.96) so players can actively run faster with physical effort
    const sprintMultiplier = diff === 'EASY' ? 1.15 : diff === 'HARD' ? 0.96 : 1.0;

    const sprintIncrement = 18 * speedPenalty * carPenalty * routePenalty * blockPenalty * sprintMultiplier;

    const currentPl = playerDistanceRef.current;
    const nextPl = currentPl + sprintIncrement;

    setPlayerDistance(nextPl);
    setStamina((prev) => Math.max(0, prev - 8));

    if (nextPl >= 1000) {
      endTsunamiRun(true);
    }
  };

  // Keyboard Space/ArrowUp support
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleActiveRun();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, stamina]);

  // End of tsunami
  const endTsunamiRun = (isSuccess: boolean) => {
    if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);

    setPlayerStats((prev) => {
      let finalResult: PlayerStats['survivalResult'] = 'FAILED_TSUNAMI';

      if (isSuccess) {
        if (prev.health >= 70) {
          finalResult = 'SURVIVED';
        } else {
          finalResult = 'INJURED_SURVIVED';
        }
      } else {
        finalResult = 'FAILED_TSUNAMI';
      }

      return {
        ...prev,
        survivalResult: finalResult,
      };
    });

    setPhase('OUTRO');
  };

  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
    };
  }, []);

  // Compute percentage calculations for graphic tracking
  const playerPercent = Math.min(100, Math.max(0, (playerDistance / 1000) * 100));
  const tsunamiPercent = Math.min(100, Math.max(0, ((tsunamiDistance + 200) / 1200) * 100)); // normalized scale
  const metersDifference = Math.max(0, Math.round(playerDistance - tsunamiDistance));

  return (
    <div className="w-full max-w-2xl mx-auto p-4" id="tsunami-stage-wrapper">
      <AnimatePresence mode="wait">
        {/* Intro view */}
        {phase === 'INTRO' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900/80 border-2 border-blue-500/50 rounded-3xl p-6 md:p-8 text-center shadow-xl shadow-blue-500/5"
            id="ts-intro-card"
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto mb-6 animate-pulse" id="siren-tsunami">
              <AlertTriangle className="w-9 h-9" />
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4" id="ts-title">
              第2部：大津波からの避難
            </h2>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6" id="ts-intro-desc">
              現在地から安全な高台の避難所まで、<strong className="text-white">【1000メートル】</strong>あります。<br />
              背後から巨大な津波（時速約40km）が刻一刻と押し寄せています！<br />
              画面上の<strong className="text-blue-400">【走る！】ボタンをタップ（またはスペースキーを押す）</strong>して全力疾走してください！<br />
              途中、行く手を阻む様々な罠や決断ポイントが現れます。正しい判断を行い、逃げ切ってください。
            </p>

            <div className="bg-slate-950 rounded-xl p-4 text-left border border-slate-800 mb-8" id="ts-effects">
              <h4 className="font-bold text-white text-xs mb-2 tracking-wider">第1部のアクション結果の適用:</h4>
              <ul className="text-xs text-slate-400 space-y-1.5" id="ts-effects-list">
                <li className="flex items-center gap-1.5">
                  • 避難用シューズ：
                  {playerStats.hasShoes ? (
                    <span className="text-emerald-400 font-bold">獲得済み (足元の安全が確保され、100%のスピードで走れます)</span>
                  ) : (
                    <span className="text-red-400 font-bold">未回収 (裸足で怪我を負ったため、走るスピードが35%低下)</span>
                  )}
                </li>
                <li className="flex items-center gap-1.5">
                  • 非常持出袋：
                  {playerStats.hasBag ? (
                    <span className="text-emerald-400 font-bold">獲得済み (避難時ボーナススコア＋200点)</span>
                  ) : (
                    <span className="text-slate-500 font-bold">未回収 (ボーナスなし)</span>
                  )}
                </li>
              </ul>
            </div>

            <button
              onClick={startTsunamiRun}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold transition-all duration-200 cursor-pointer text-sm tracking-wider shadow-lg shadow-blue-500/15"
              id="btn-start-ts"
            >
              高台を目指して走る (スタート)
            </button>
          </motion.div>
        )}

        {/* Gameplay view */}
        {phase === 'PLAYING' && (
          <motion.div
            key="gameplay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
            id="ts-gameplay-container"
          >
            {/* Status Header */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-center" id="ts-status-grid">
              <div id="ts-dist-p">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">避難まで</span>
                <span className="text-xl font-mono font-extrabold text-white" id="ts-dist-p-val">
                  {Math.max(0, 1000 - Math.round(playerDistance))}m
                </span>
              </div>
              <div id="ts-meters-diff">
                <span className="text-[10px] text-red-400 block uppercase font-bold tracking-wider">津波との距離</span>
                <span className={`text-xl font-mono font-extrabold ${metersDifference < 100 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} id="ts-meters-diff-val">
                  {metersDifference}m
                </span>
              </div>
              <div id="ts-stamina">
                <span className="text-[10px] text-emerald-400 block uppercase font-bold tracking-wider">スタミナ</span>
                <div className="w-20 mx-auto bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 flex mt-1.5" id="stamina-track">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75"
                    style={{ width: `${stamina}%` }}
                    id="stamina-fill"
                  />
                </div>
              </div>
            </div>

            {/* Run Track Visualizer */}
            <div className="relative bg-slate-950/90 h-44 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between p-4" id="ts-track-visual">
              {/* Top labels */}
              <div className="flex justify-between text-[10px] font-bold text-slate-500 border-b border-slate-900 pb-1.5 z-10" id="ts-track-labels">
                <span>🌊 海岸 (0m)</span>
                <span>🚧 300m</span>
                <span>🏘️ 住宅街 (450m)</span>
                <span>🏔️ 600m</span>
                <span>🏥 避難ビル (820m)</span>
                <span>🏔️ 避難所 (1000m)</span>
              </div>

              {/* Progress lanes */}
              <div className="relative h-20 w-full" id="ts-lanes">
                {/* Safe high ground Goal flag */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center" id="visual-goal">
                  <span className="text-base">🏔️</span>
                  <span className="text-[7px] text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded-md mt-0.5">安全高台</span>
                </div>

                {/* Evacuation building */}
                <div className="absolute right-[18%] top-1/2 -translate-y-1/2 flex flex-col items-center" id="visual-shelter">
                  <span className="text-base">🏥</span>
                  <span className="text-[7px] text-blue-400 font-bold">避難ビル</span>
                </div>

                {/* Tsunami Progress Wave */}
                <div
                  className="absolute top-2 transition-all duration-300 flex flex-col items-end"
                  style={{
                    left: `${tsunamiPercent}%`,
                    transform: 'translateX(-100%)',
                  }}
                  id="visual-tsunami-wave"
                >
                  <div className="text-2xl animate-pulse">🌊</div>
                  <div className="bg-red-500/15 border border-red-500/40 px-1 py-0.5 rounded text-[7px] font-mono font-bold text-red-400 uppercase tracking-widest mt-1">
                    大津波波源
                  </div>
                </div>

                {/* Player Progress Character */}
                <div
                  className="absolute top-2 transition-all duration-300 flex flex-col items-center"
                  style={{
                    left: `${playerPercent}%`,
                    transform: 'translateX(-50%)',
                  }}
                  id="visual-player-char"
                >
                  <div className="text-2xl animate-bounce">
                    {stamina < 15 ? '🥵' : playerStats.tsunamiDecisions.carVsFoot === 'car' ? '🚗' : '🏃'}
                  </div>
                  <div className="bg-slate-900 border border-slate-700/60 px-1 py-0.5 rounded text-[7px] font-bold text-slate-300 uppercase mt-1">
                    あなた ({Math.round(playerDistance)}m)
                  </div>
                </div>
              </div>

              {/* Bottom indicators */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-900 pt-1.5 z-10" id="ts-track-footer">
                <span className="flex items-center gap-1">
                  {!playerStats.hasShoes && <span className="text-red-400">⚠️ 足負傷（減速中）</span>}
                  {playerStats.tsunamiDecisions.carVsFoot === 'car' && <span className="text-amber-400">⚠️ 渋滞中！</span>}
                  {playerStats.tsunamiDecisions.blockWall === 'narrow' && <span className="text-amber-400">⚠️ 瓦礫・塀倒壊（減速中）</span>}
                  {playerStats.tsunamiDecisions.routeSelection === 'cliff' && <span className="text-red-400">⚠️ 土砂怪我（減速中）</span>}
                </span>
                <span className="font-semibold text-slate-500">津波の接近速度：毎秒約30m</span>
              </div>
            </div>

            {/* Run Button */}
            <div className="flex flex-col items-center gap-3" id="ts-control-center">
              <button
                onClick={handleActiveRun}
                disabled={stamina < 8 || !!activeDecision}
                className={`w-full py-8 rounded-2xl font-black text-xl tracking-widest shadow-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  stamina < 8 || !!activeDecision
                    ? 'bg-slate-800 text-slate-600 border border-slate-700 pointer-events-none'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-blue-500/20 active:scale-95 border-b-4 border-indigo-800'
                }`}
                id="btn-active-run"
              >
                <span className="flex items-center gap-2 text-xl font-black tracking-widest text-white">
                  <Flame className="w-6 h-6 animate-pulse" /> 走る！ (SPACEキー)
                </span>
                <span className="text-[10px] text-blue-200 mt-1 uppercase font-semibold">タップで全力疾走！</span>
              </button>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5" id="ts-control-tip">
                <span>💡 スタミナが切れると走れません。走ることでスタミナが減っていきます。</span>
              </div>
            </div>

            {/* Decision Modal */}
            {activeDecision && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 md:p-6 shadow-xl shadow-amber-500/5 mt-4"
                id="ts-decision-card"
              >
                {activeDecision === 'CAR' && (
              <div id="decision-car-view">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4">
                  <Compass className="w-3.5 h-3.5" />
                  選択地点：300m付近（避難手段の選択）
                </div>

                <h3 className="text-xl font-bold text-white mb-2 leading-relaxed">
                  大通りに出ました。周囲では多くの人が車で避難を開始し、道路が大渋滞し始めています。あなたはどう避難しますか？
                </h3>
                <p className="text-xs text-slate-400 mb-6">※道路事情と津波避難の本質を見極めてください。</p>

                <div className="space-y-3">
                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(0, true)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 0
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/5'
                        : decisionAnswered
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-car-opt-0"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span>🚶 このまま徒歩で、渋滞を避けて高台への避難経路を全力で走る。</span>
                      {selectedOption === 0 && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 shrink-0"><ShieldCheck className="w-4 h-4" />正解</span>}
                      {decisionAnswered && selectedOption !== 0 && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 shrink-0"><ShieldCheck className="w-4 h-4" />推奨行動</span>}
                    </div>
                  </button>

                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(1, false)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 1
                        ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                        : decisionAnswered && selectedOption === 0
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : decisionAnswered
                        ? 'border-slate-800 text-slate-500 opacity-40'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-car-opt-1"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span>🚗 走るのは疲れるので、路肩に停めてある車に乗り込み、車で逃げる。</span>
                      {selectedOption === 1 && <span className="text-xs text-red-400 font-bold shrink-0">不正解 (渋滞で逃げ遅れます)</span>}
                    </div>
                  </button>

                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(2, false)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 2
                        ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                        : decisionAnswered && selectedOption === 0
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : decisionAnswered
                        ? 'border-slate-800 text-slate-500 opacity-40'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-car-opt-2"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span>🚲 徒歩より速いので、近くに置いてある自転車を使って走る。</span>
                      {selectedOption === 2 && <span className="text-xs text-red-400 font-bold shrink-0">不正解 (瓦礫パンクのリスク)</span>}
                    </div>
                  </button>

                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(3, false)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 3
                        ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                        : decisionAnswered && selectedOption === 0
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : decisionAnswered
                        ? 'border-slate-800 text-slate-500 opacity-40'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-car-opt-3"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span>🛹 すばやく移動できそうなので、近くのスケートボード等を使って走る。</span>
                      {selectedOption === 3 && <span className="text-xs text-red-400 font-bold shrink-0">不正解 (転倒の危険性大)</span>}
                    </div>
                  </button>
                </div>

                {decisionAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed"
                  >
                    <strong className="text-white block mb-1">💡 防災知識解説:</strong>
                    東日本大震災でも、多くの人が車で避難しようとしたため致命的な道路渋滞が発生し、多くの車が津波に巻き込まれました。
                    津波避難は原則<strong className="text-emerald-400">「徒歩」</strong>が鉄則です。
                    車での避難が許されるのは、高齢者や要介護者の移動など、特別な事情がある場合に限定されます。
                  </motion.div>
                )}
              </div>
            )}

            {activeDecision === 'BLOCK_WALL' && (
              <div id="decision-blockwall-view">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4">
                  <Compass className="w-3.5 h-3.5" />
                  選択地点：450m付近（住宅街の危険回避）
                </div>

                <h3 className="text-xl font-bold text-white mb-2 leading-relaxed">
                  住宅街に入りました。余震により、周囲 of 古い木造家屋やブロック塀、自動販売機が崩れかけています。どちらのルートを進みますか？
                </h3>
                <p className="text-xs text-slate-400 mb-6">※地震直後の密集市街地や住宅街に潜むブロック塀倒壊のリスクを考慮してください。</p>

                <div className="space-y-3">
                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(0, true)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 0
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/5'
                        : decisionAnswered
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-blockwall-opt-0"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span>🚶 近道ではないが、古い塀を避けて道幅の広い安全な大通りを走る。</span>
                      {selectedOption === 0 && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 shrink-0"><ShieldCheck className="w-4 h-4" />正解</span>}
                      {decisionAnswered && selectedOption !== 0 && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 shrink-0"><ShieldCheck className="w-4 h-4" />推奨行動</span>}
                    </div>
                  </button>

                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(1, false)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 1
                        ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                        : decisionAnswered && selectedOption === 0
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : decisionAnswered
                        ? 'border-slate-800 text-slate-500 opacity-40'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-blockwall-opt-1"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span>🧱 近道なので、古いコンクリートブロック塀や自動販売機のすぐ横をすり抜けて走る。</span>
                      {selectedOption === 1 && <span className="text-xs text-red-400 font-bold shrink-0">不正解 (余震による倒壊・下敷きリスク)</span>}
                    </div>
                  </button>

                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(2, false)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 2
                        ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                        : decisionAnswered && selectedOption === 0
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : decisionAnswered
                        ? 'border-slate-800 text-slate-500 opacity-40'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-blockwall-opt-2"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span>🏬 古い木造の家屋が密集した、軒下やくぐり戸が多い近道を走り抜ける。</span>
                      {selectedOption === 2 && <span className="text-xs text-red-400 font-bold shrink-0">不正解 (倒壊屋根・落下瓦の危険)</span>}
                    </div>
                  </button>

                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(3, false)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 3
                        ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                        : decisionAnswered && selectedOption === 0
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : decisionAnswered
                        ? 'border-slate-800 text-slate-500 opacity-40'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-blockwall-opt-3"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span>🏃‍♂️ 切れた電線が垂れ下がっている電柱や、大きい古い看板の下をすり抜けて進む。</span>
                      {selectedOption === 3 && <span className="text-xs text-red-400 font-bold shrink-0">不正解 (感電のリスクあり)</span>}
                    </div>
                  </button>
                </div>
                {decisionAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed"
                  >
                    <strong className="text-white block mb-1">💡 防災知識解説:</strong>
                    1978年の宮城県沖地震や2018年の大阪府北部地震では、倒壊したブロック塀の下敷きになり命を落とす痛ましい事故が発生しました。
                    地震直後の住宅街避難では、古いブロック塀や自動販売機は余震で崩れる恐れが非常に高いため、絶対に近寄らず、多少遠回りでも<strong className="text-emerald-400">道幅の広い開けた道路</strong>を避難ルートに選ぶのが鉄則です。
                  </motion.div>
                )}
              </div>
            )}

            {activeDecision === 'ROUTE' && (
              <div id="decision-route-view">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4">
                  <Compass className="w-3.5 h-3.5" />
                  選択地点：600m付近（避難ルートの選択）
                </div>

                <h3 className="text-xl font-bold text-white mb-2 leading-relaxed">
                  分かれ道に来ました。左側は近道ですが「崖沿い・土砂崩れ多発注意」の警告看板があります。右側は少し遠回り（距離が伸びる）になりますが、平坦で広い通りです。どちらに進みますか？
                </h3>
                <p className="text-xs text-slate-400 mb-6">※大地震直後の山地や崖の付近に潜む「二次災害」を考慮してください。</p>

                <div className="space-y-4">
                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(0, true)}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 0
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/5'
                        : decisionAnswered
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-route-opt-0"
                  >
                    <div className="flex justify-between items-center">
                      <span>🚶 遠回りでも、土砂崩れ等の崩落二次災害に遭わない安全な平坦道路を進む。</span>
                      {selectedOption === 0 && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4" />正解</span>}
                    </div>
                  </button>

                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(1, false)}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 1
                        ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                        : decisionAnswered && selectedOption === 0
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : decisionAnswered
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-route-opt-1"
                  >
                    <div className="flex justify-between items-center">
                      <span>⛰️ 津波から少しでも早く遠ざかるため、土砂崩れ注意の崖沿い近道を進む。</span>
                      {selectedOption === 1 && <span className="text-xs text-red-400 font-bold">不正解 (土砂崩れの直撃に遭います)</span>}
                      {decisionAnswered && selectedOption === 0 && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4" />推奨行動</span>}
                    </div>
                  </button>
                </div>

                {decisionAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed"
                  >
                    <strong className="text-white block mb-1">💡 防災知識解説:</strong>
                    大地震の直後は地盤が非常に緩んでおり、<strong className="text-amber-400">雨が降っていなくても土砂崩れや落石</strong>が極めて発生しやすくなっています。
                    近道だからといって危険な崖沿いや崩れやすい斜面のそばを通るルートは避け、安全が担保されたひらけた道を選択することが大切です。
                  </motion.div>
                )}
              </div>
            )}

            {activeDecision === 'STAIRS' && (
              <div id="decision-stairs-view">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4">
                  <Building className="w-3.5 h-3.5" />
                  選択地点：820m付近（避難手段の緊急切替）
                </div>

                <h3 className="text-xl font-bold text-white mb-2 leading-relaxed">
                  足元まで水がうっすらと迫ってきました！遠くの高台避難所まで走り続けるのはもう間に合わないかもしれません。目の前には丈夫な10階建ての鉄筋コンクリートビルがあります。どうしますか？
                </h3>
                <p className="text-xs text-slate-400 mb-6">※津波が到達しかけている時の「垂直避難」の正しい手段を選んでください。</p>

                <div className="space-y-4">
                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(0, true)}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 0
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/5'
                        : decisionAnswered
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-stair-opt-0"
                  >
                    <div className="flex justify-between items-center">
                      <span>🚶 非常階段を駆け上がり、ビルの3階以上（できれば最上階）に逃げる。</span>
                      {selectedOption === 0 && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4" />正解</span>}
                    </div>
                  </button>

                  <button
                    disabled={decisionAnswered}
                    onClick={() => handleDecisionSubmit(1, false)}
                    className={`w-full text-left p-4 rounded-xl border text-sm transition-all duration-200 cursor-pointer ${
                      selectedOption === 1
                        ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                        : decisionAnswered && selectedOption === 0
                        ? 'opacity-40 border-slate-800 text-slate-500'
                        : decisionAnswered
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300'
                    }`}
                    id="dec-stair-opt-1"
                  >
                    <div className="flex justify-between items-center">
                      <span>🏢 急いで最上階に行きたいため、動いているエレベーターに乗り込む。</span>
                      {selectedOption === 1 && <span className="text-xs text-red-400 font-bold">不正解 (閉じ込められの致命的リスク)</span>}
                      {decisionAnswered && selectedOption === 0 && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><ShieldCheck className="w-4 h-4" />推奨行動</span>}
                    </div>
                  </button>
                </div>

                {decisionAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed"
                  >
                    <strong className="text-white block mb-1">💡 防災知識解説:</strong>
                    すでに水が浸入している局面や、高台にたどり着く猶予がない場合は、ただちに近くの頑丈な中高層ビルへの<strong className="text-emerald-400">「垂直避難」</strong>に切り替えることが鉄則です。
                    ただし、エレベーターは急な停電（漏電によるブレーカー遮断など）で閉じ込められ、そのまま浸水する極めて致命的な罠となります。
                    どれほど疲れていても必ず<strong className="text-emerald-400">非常階段</strong>で這い上がってください。
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    )}

        {/* Phase Outro / Final Transition */}
        {phase === 'OUTRO' && (
          <motion.div
            key="outro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 md:p-8 text-center shadow-xl shadow-emerald-500/5"
            id="ts-outro-card"
          >
            {playerStats.survivalResult === 'SURVIVED' || playerStats.survivalResult === 'INJURED_SURVIVED' ? (
              <div id="ts-success">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-6" id="ts-success-badge">
                  <ShieldCheck className="w-9 h-9" />
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4" id="ts-success-title">
                  津波から逃げ切りました！
                </h2>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6" id="ts-success-desc">
                  安全な避難所（高台）に無事到着しました！<br />
                  あなたの下した数々の迅速かつ冷静な意思決定は、自らの命を救いました。<br />
                  {playerStats.survivalResult === 'INJURED_SURVIVED' ? (
                    <span className="text-amber-400 font-semibold block mt-2">
                      ※しかし、途中の小さなミスにより軽い負傷を負いました。本番では完全無傷の避難を目指しましょう！
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold block mt-2">
                      完璧な無傷避難（完全サバイバル）の達成です！素晴らしい判断力です。
                    </span>
                  )}
                </p>

                <button
                  onClick={() => onNextPhase('RESULT')}
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-bold text-white transition-all duration-200 cursor-pointer text-sm tracking-wider"
                  id="btn-goto-results-success"
                >
                  サバイバル評価シートを開く
                </button>
              </div>
            ) : (
              <div id="ts-failure">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 mx-auto mb-6 animate-pulse" id="ts-fail-badge">
                  <Skull className="w-9 h-9" />
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4" id="ts-fail-title">
                  津波に巻き込まれました
                </h2>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6" id="ts-fail-desc">
                  迫る津波に追いつかれてしまいました。<br />
                  津波は非常に速く、一瞬の判断ミスや準備不足（靴がない、車での立ち往生、誤ったルート選び）が致命的となります。<br />
                  防災知識を振り返り、次こそは命を守り切る最適なアクションを行いましょう。
                </p>

                <button
                  onClick={() => onNextPhase('RESULT')}
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 transition-all duration-200 cursor-pointer text-sm tracking-wider"
                  id="btn-goto-results-fail"
                >
                  評価シートを見る
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
