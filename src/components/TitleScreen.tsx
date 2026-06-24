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
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-slate-100 p-4" id="title-screen-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-6 uppercase tracking-wider" id="disaster-badge">
          <AlertTriangle className="w-3.5 h-3.5" />
          災害疑似体験シミュレーター
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4" id="game-title">
          防災サバイバル
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500 text-3xl md:text-4xl mt-2">
            地震・津波避難アクション
          </span>
        </h1>

        <p className="text-slate-400 text-xs md:text-sm mb-8 leading-relaxed max-w-xl mx-auto" id="game-description">
          このゲームは、大地震の発生から津波の到達まで、命を守るための正しい判断とアクションを疑似体験し、実践的な防災知識を身に付けるシミュレーターです。
        </p>
      </motion.div>

      {/* Grid of features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full mb-8"
        id="feature-cards-grid"
      >
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col items-center text-center" id="feature-card-1">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-2">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white mb-1 text-xs">第1部：地震発生時アクション</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            激しい揺れの中、落下物を避けて安全な場所に身を隠し、避難に必要な装備（靴やヘルメット）を素早く確保します。
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col items-center text-center" id="feature-card-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white mb-1 text-xs">第2部：津波避難アクション</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            津波警告が発令！高台や避難ビルを目指して、迫る波から逃げ切るアクションと重要な選択を行います。
          </p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl flex flex-col items-center text-center" id="feature-card-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white mb-1 text-xs">防災学習と知識の習得</h3>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            あなたの避難行動をゲーム後に詳細評価。いざという時に役立つ、信頼性の高い防災知識のアドバイスが表示されます。
          </p>
        </div>
      </motion.div>

      {/* Difficulty Selector */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-4xl bg-slate-950/60 border border-slate-800 rounded-3xl p-6 mb-8 shadow-xl"
        id="difficulty-selector-panel"
      >
        <h2 className="text-center text-lg md:text-xl font-bold text-white mb-5 flex items-center justify-center gap-2" id="difficulty-heading">
          ⚠️ 難易度を選択してください
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="difficulty-options">
          {difficultyLevels.map((lvl) => {
            const isSelected = selectedDifficulty === lvl.id;
            return (
              <button
                key={lvl.id}
                onClick={() => setSelectedDifficulty(lvl.id)}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? lvl.activeBorder
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 text-slate-300'
                }`}
                id={`difficulty-btn-${lvl.id}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${lvl.badgeColor}`}>
                      {lvl.badge}
                    </span>
                    {isSelected && (
                      <span className={`p-1 rounded-full ${lvl.id === 'EASY' ? 'bg-emerald-500/20 text-emerald-400' : lvl.id === 'NORMAL' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <h3 className={`font-bold text-base ${isSelected ? 'text-white' : 'text-slate-200'} mb-1`}>
                    {lvl.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-snug mb-3">
                    {lvl.desc}
                  </p>
                </div>

                <div className="border-t border-slate-900 pt-2.5 mt-2 space-y-1">
                  {lvl.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-1 text-[10.5px] text-slate-400">
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

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        id="start-button-wrapper"
      >
        <button
          onClick={() => onStart(selectedDifficulty)}
          className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-white text-lg shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:from-amber-400 hover:to-orange-500 active:scale-95 transition-all duration-200 cursor-pointer"
          id="btn-start-simulation"
        >
          <Play className="w-5 h-5 fill-current" />
          シミュレーションを開始する ({selectedDifficulty === 'EASY' ? 'イージー' : selectedDifficulty === 'NORMAL' ? 'ノーマル' : 'ハード'})
        </button>
      </motion.div>

      <div className="text-[11px] text-slate-500 mt-8 text-center" id="disclaimer-text">
        ※PCでは左右キー（またはA/Dキー、マウス、画面上のボタン）でプレイヤーを動かし、上キー（またはスペースキー、画面上の走るボタン）で走ります。
      </div>
    </div>
  );
}
