import { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Play, Heart, AlertTriangle, BookOpen, Check } from 'lucide-react';
import { Difficulty } from '../types';

interface TitleScreenProps {
  onStart: (difficulty: Difficulty) => void;
}

export default function TitleScreen({ onStart }: TitleScreenProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('NORMAL');

  const difficultyLevels = [
    {
      id: 'EASY' as Difficulty,
      name: 'イージー (初級)',
      desc: '初めての方や、じっくり防災の知識を学びたい方向け。',
      badge: '甘口',
      badgeColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      textColor: 'text-emerald-400',
      activeBorder: 'border-emerald-500 bg-emerald-500/10 shadow-emerald-500/5',
      features: ['落下物のスピードが遅い', '避難制限時間が短い (15秒)', '津波の接近速度がゆるやか']
    },
    {
      id: 'NORMAL' as Difficulty,
      name: 'ノーマル (中級)',
      desc: '標準的な難易度。正しい状況判断と素早いアクションが必要。',
      badge: '中辛',
      badgeColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      textColor: 'text-amber-400',
      activeBorder: 'border-amber-500 bg-amber-500/10 shadow-amber-500/5',
      features: ['標準的な落下スピード', '20秒の避難制限時間', '通常スピードの津波']
    },
    {
      id: 'HARD' as Difficulty,
      name: 'ハード (上級)',
      desc: '緊迫した極限状態を再現。わずかな判断ミスも許されない。',
      badge: '激辛',
      badgeColor: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      textColor: 'text-rose-400',
      activeBorder: 'border-rose-500 bg-rose-500/10 shadow-rose-500/5',
      features: ['落下物の速度が大幅アップ', '避難に長く耐え抜く必要あり (25秒)', '津波スピードが速く、開始距離が近い']
    }
  ];

  return (
    <div className="flex flex-col items-center justify-between h-full max-h-[85vh] text-slate-100 p-2 md:p-4 w-full select-none" id="title-screen-container">
      {/* Visual background alert lines / sirens */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.03] z-0">
        <div className="absolute top-0 left-0 w-full h-8 bg-red-600 -rotate-12 transform scale-150 origin-top-left" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, #000 20px, #000 40px)' }}></div>
        <div className="absolute bottom-0 right-0 w-full h-8 bg-amber-600 -rotate-12 transform scale-150 origin-bottom-right" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, #000 20px, #000 40px)' }}></div>
      </div>

      {/* Earthquake Crack Patterns (SVG Path Animations) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-20" id="earthquake-cracks">
        <svg className="w-full h-full text-slate-700" viewBox="0 0 800 600" preserveAspectRatio="none">
          {/* Main left crack */}
          <motion.path
            d="M 120 0 L 140 100 L 105 180 L 195 290 L 160 380 L 240 470 L 210 600"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.6, ease: "linear" }}
          />
          {/* Left branch */}
          <motion.path
            d="M 105 180 L 50 230 L 20 310"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.0, delay: 0.5, ease: "linear" }}
          />
          {/* Main right crack */}
          <motion.path
            d="M 680 0 L 640 130 L 670 240 L 590 350 L 620 450 L 560 600"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, ease: "linear" }}
          />
          {/* Right branch */}
          <motion.path
            d="M 670 240 L 730 290 L 780 360"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, delay: 0.6, ease: "linear" }}
          />
          {/* Center critical crack (Highlighted red/orange) */}
          <motion.path
            d="M 400 150 L 375 220 L 430 300 L 385 390 L 410 460"
            fill="none"
            stroke="rgba(239, 68, 68, 0.45)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }}
          />
          {/* Cross crack bridge */}
          <motion.path
            d="M 195 290 L 270 310 L 315 275 L 375 220"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.3, delay: 0.8, ease: "linear" }}
          />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] md:text-xs font-bold mb-3 uppercase tracking-wider animate-pulse" id="disaster-badge">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          緊急災害疑似体験シミュレーター
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2 filter drop-shadow-[0_4px_12px_rgba(239,68,68,0.25)]" id="game-title">
          <span className="inline-block bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 bg-clip-text text-transparent px-2">
            震災エスケープ
          </span>
          <span className="block text-slate-300 text-xs md:text-sm font-semibold tracking-widest mt-1.5">
            〜 大地震と迫り来る大津波から生き延びろ 〜
          </span>
        </h1>

        <p className="text-slate-400 text-[11px] md:text-xs leading-relaxed max-w-lg mx-auto mb-2" id="game-description">
          大地震の発生から巨大津波の到達まで、わずかな決断の遅れが生死を分けます。
          正しい判断と素早いアクションを体験し、真のサバイバル力を鍛えてください。
        </p>
      </motion.div>

      {/* Grid of features - Slimmer height */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-4xl w-full my-2 z-10"
        id="feature-cards-grid"
      >
        <div className="bg-slate-950/75 border border-red-950/40 p-2.5 rounded-xl flex flex-col items-center text-center backdrop-blur-sm" id="feature-card-1">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-1">
            <ShieldAlert className="w-4 h-4 animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
          <h3 className="font-bold text-white mb-0.5 text-[11px]">揺れと落下物：生存行動</h3>
          <p className="text-[10px] text-slate-400 leading-snug">
            激しい初期微動の中、落下物を避けながら安全な装備（靴・メット）をその場で回収します。
          </p>
        </div>

        <div className="bg-slate-950/75 border border-amber-950/40 p-2.5 rounded-xl flex flex-col items-center text-center backdrop-blur-sm" id="feature-card-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-1">
            <Heart className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white mb-0.5 text-[11px]">大津波襲来：迅速な判断</h3>
          <p className="text-[10px] text-slate-400 leading-snug">
            津波警報発令！徒歩か車か、ルート選択、階段かエレベーターか、命を賭けた決断に挑みます。
          </p>
        </div>

        <div className="bg-slate-950/75 border border-emerald-950/40 p-2.5 rounded-xl flex flex-col items-center text-center backdrop-blur-sm" id="feature-card-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1">
            <BookOpen className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-white mb-0.5 text-[11px]">科学的な評価・防災学習</h3>
          <p className="text-[10px] text-slate-400 leading-snug">
            あなたの選択を評価。公的機関の災害ガイドラインに基づいた解説で、現実の防災力を向上。
          </p>
        </div>
      </motion.div>

      {/* Difficulty Selector - Even more compact to prevent overflow */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-4xl bg-slate-950/80 border border-slate-900 rounded-2xl p-4 my-2 shadow-2xl z-10"
        id="difficulty-selector-panel"
      >
        <h2 className="text-center text-xs md:text-sm font-bold text-slate-300 mb-3 flex items-center justify-center gap-2" id="difficulty-heading">
          ⚠️ 訓練難易度を選択してください
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" id="difficulty-options">
          {difficultyLevels.map((lvl) => {
            const isSelected = selectedDifficulty === lvl.id;
            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedDifficulty(lvl.id)}
                className={`relative p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? lvl.activeBorder + ' border-2'
                    : 'bg-slate-900/30 border-slate-900 hover:border-slate-800 hover:bg-slate-900/60 text-slate-300'
                }`}
                id={`difficulty-btn-${lvl.id}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${lvl.badgeColor}`}>
                      {lvl.badge}
                    </span>
                    {isSelected && (
                      <span className={`p-0.5 rounded-full ${lvl.id === 'EASY' ? 'bg-emerald-500/20 text-emerald-400' : lvl.id === 'NORMAL' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <h3 className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-200'} mb-0.5`}>
                    {lvl.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 leading-tight mb-2">
                    {lvl.desc}
                  </p>
                </div>

                <div className="border-t border-slate-900 pt-1.5 mt-1 space-y-0.5">
                  {lvl.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-1 text-[9.5px] text-slate-400 leading-none">
                      <span className={`font-bold ${isSelected ? lvl.textColor : 'text-slate-500'}`}>•</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Start Button & Instructions */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center z-10 w-full max-w-sm"
        id="start-button-wrapper"
      >
        <button
          onClick={() => onStart(selectedDifficulty)}
          className="group relative inline-flex items-center justify-center gap-3 w-full py-3 px-6 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 font-extrabold text-white text-sm shadow-xl shadow-red-950/20 hover:shadow-orange-500/20 hover:from-red-500 hover:to-amber-500 active:scale-98 transition-all duration-150 cursor-pointer uppercase tracking-wider"
          id="btn-start-simulation"
        >
          <Play className="w-4 h-4 fill-current animate-pulse" />
          避難訓練を開始 ({selectedDifficulty === 'EASY' ? '初級' : selectedDifficulty === 'NORMAL' ? '中級' : '上級'})
        </button>

        <div className="text-[9.5px] text-slate-500 mt-2 font-medium" id="disclaimer-text">
          PC: [A]/[D] または [←]/[→] 移動, [W], [↑] または [スペース] でダッシュ
        </div>
      </motion.div>
    </div>
  );
}
