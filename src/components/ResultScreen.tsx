import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Award, RefreshCw, CheckCircle2, XCircle, ShieldCheck, Heart, AlertTriangle, BookOpen, BookOpenCheck, Trophy, Trash2, History } from 'lucide-react';
import { PlayerStats, GamePhase } from '../types';

interface ScoreRecord {
  id: string;
  score: number;
  difficulty: string;
  isSurvived: boolean;
  date: string;
}

interface ResultScreenProps {
  playerStats: PlayerStats;
  onRetry: () => void;
}

export default function ResultScreen({ playerStats, onRetry }: ResultScreenProps) {
  // Score calculations
  const isSurvived = playerStats.survivalResult === 'SURVIVED' || playerStats.survivalResult === 'INJURED_SURVIVED';
  const finalScore = isSurvived ? playerStats.score : Math.round(playerStats.score * 0.7);
  const deathPenaltyApplied = !isSurvived;
  
  const [rankings, setRankings] = useState<ScoreRecord[]>([]);
  const [bestScore, setBestScore] = useState<number>(0);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;

    try {
      const saved = localStorage.getItem('bosai_sim_rankings');
      let currentRecords: ScoreRecord[] = saved ? JSON.parse(saved) : [];
      
      // Determine the previous high score
      const prevBest = currentRecords.length > 0 
        ? Math.max(...currentRecords.map(r => r.score)) 
        : 0;

      const now = new Date();
      const dateString = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const newRecord: ScoreRecord = {
        id: Math.random().toString(36).substring(2, 9),
        score: finalScore,
        difficulty: playerStats.difficulty,
        isSurvived: isSurvived,
        date: dateString
      };

      const updatedRecords = [...currentRecords, newRecord];
      
      // Sort descending by score
      updatedRecords.sort((a, b) => b.score - a.score);

      // Save to localStorage
      localStorage.setItem('bosai_sim_rankings', JSON.stringify(updatedRecords));
      
      setRankings(updatedRecords);

      const currentBest = updatedRecords[0]?.score || 0;
      setBestScore(currentBest);

      if (finalScore > prevBest && currentRecords.length > 0) {
        setIsNewHighScore(true);
      } else if (currentRecords.length === 0) {
        setIsNewHighScore(true); // First game is always high score
      }
    } catch (e) {
      console.error('Failed to handle rankings:', e);
    }
  }, [playerStats, finalScore, isSurvived]);

  const handleClearRankings = () => {
    try {
      localStorage.removeItem('bosai_sim_rankings');
      setRankings([]);
      setBestScore(0);
      setIsNewHighScore(false);
      setShowClearConfirm(false);
    } catch (e) {
      console.error('Failed to clear rankings:', e);
    }
  };

  // Calculate Grade
  let grade = 'D';
  let gradeColor = 'text-red-500';
  let feedbackText = '防災対策の見直しが必要です。避難行動を繰り返し疑似体験して、正しい行動パターンを身につけましょう。';

  if (isSurvived) {
    if (finalScore >= 500 && playerStats.health >= 80) {
      grade = 'S';
      gradeColor = 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300';
      feedbackText = '完璧です！すべての難関をクリアし、正しい知識を持って命を守り抜きました。本物の防災マスターです！';
    } else if (finalScore >= 350) {
      grade = 'A';
      gradeColor = 'text-emerald-400';
      feedbackText = '素晴らしい判断力です。概ね適切な判断ができていますが、小さな怪我や装備の見落としがありました。次は完全無傷避難を目指しましょう。';
    } else if (finalScore >= 200) {
      grade = 'B';
      gradeColor = 'text-blue-400';
      feedbackText = '無事に避難できましたが、危険な判断や装備の不足がありました。実際の災害では、この差が命取りになることもあります。解説をよく読んで学びましょう。';
    } else {
      grade = 'C';
      gradeColor = 'text-orange-400';
      feedbackText = '生存には成功しましたが、行動や備えに多くの課題がありました。実際の災害に備え、より安全な行動パターンを身につけましょう。';
    }
  } else {
    // 死亡しているが、スコアに応じた評価判定を行う
    if (finalScore >= 350) {
      grade = 'B';
      gradeColor = 'text-blue-400';
      feedbackText = '非常に優れた防災知識と避難行動でしたが、紙一重のところで生存に至りませんでした（スコア30%減算のペナルティが適用されています）。装備や移動ルートをさらに最適化すれば、確実に生存できるはずです！';
    } else if (finalScore >= 200) {
      grade = 'C';
      gradeColor = 'text-orange-400';
      feedbackText = '適切な判断やアイテムの準備はできていましたが、惜しくも避難完了には届きませんでした（スコア30%減算のペナルティが適用されています）。あと一歩です、改善点を見直して再挑戦しましょう。';
    } else {
      grade = 'D';
      gradeColor = 'text-red-500';
      feedbackText = '避難行動や装備、初期判断に多くの課題が残り、生存に至りませんでした（スコア30%減算のペナルティが適用されています）。解説をよく読み、繰り返し挑戦して身を守る行動を覚えましょう。';
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4" id="result-screen-container">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center"
        id="result-card-inner"
      >
        {/* Top Header Result banner */}
        <div className="mb-6" id="result-badge-container">
          {isSurvived ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold" id="survived-pill">
              <ShieldCheck className="w-5 h-5 animate-bounce" />
              シミュレーション生存成功！
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold animate-pulse" id="caught-pill">
              <XCircle className="w-5 h-5" />
              生存失敗（避難訓練が必要です）
            </div>
          )}
        </div>

        {/* Selected Difficulty badge */}
        <div className="mb-4" id="result-difficulty-badge">
          <span className={`text-xs px-3 py-1 rounded-full font-extrabold border ${
            playerStats.difficulty === 'EASY'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : playerStats.difficulty === 'HARD'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            挑戦難易度: {playerStats.difficulty === 'EASY' ? 'イージー (初級)' : playerStats.difficulty === 'NORMAL' ? 'ノーマル (中級)' : 'ハード (上級)'}
          </span>
        </div>

        {/* Grade and Score display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl mb-8 bg-slate-950 p-6 rounded-2xl border border-slate-800/80" id="stats-grid">
          <div className="flex flex-col items-center justify-center border-b pb-4 md:pb-0 md:border-b-0 md:border-r border-slate-800/60" id="grade-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">サバイバル評価</span>
            <span className={`text-5xl font-black ${gradeColor}`} id="rank-value">{grade}</span>
          </div>
          <div className="flex flex-col items-center justify-center border-b pb-4 md:pb-0 md:border-b-0 md:border-r border-slate-800/60" id="score-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">獲得総合スコア</span>
            <span className="text-3xl font-mono font-black text-white" id="score-value">{finalScore} <span className="text-xs text-slate-400">Pts</span></span>
            {deathPenaltyApplied && (
              <span className="text-[10px] text-red-400 font-semibold mt-1">
                ※死亡ペナルティ(30%減算)<br />元のスコア: {playerStats.score} Pts
              </span>
            )}
            {isNewHighScore && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 font-extrabold px-2 py-0.5 rounded border border-amber-500/30 animate-pulse mt-1.5 flex items-center gap-1">
                🏆 自己ベスト更新!
              </span>
            )}
          </div>
          <div className="flex flex-col items-center justify-center pt-4 md:pt-0" id="best-score-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-500" /> 自己ベスト
            </span>
            <span className="text-3xl font-mono font-black text-yellow-500" id="best-score-value">
              {bestScore} <span className="text-xs text-yellow-500/85">Pts</span>
            </span>
          </div>
        </div>

        {/* Feedback description */}
        <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl mb-8 border-b border-slate-800 pb-6" id="feedback-desc">
          <strong>総評:</strong> {feedbackText}
        </p>

        {/* Rankings & Play History Section */}
        <div className="w-full bg-slate-950 p-5 rounded-2xl border border-slate-800 text-left mb-10" id="rankings-panel">
          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              シミュレーションベストスコア & 挑戦履歴
            </h3>
            {rankings.length > 0 && (
              <div className="relative">
                {!showClearConfirm ? (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                    id="btn-confirm-clear"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 履歴消去
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-slate-900 border border-red-500/30 p-1.5 rounded text-[11px]" id="clear-confirm-tooltip">
                    <span className="text-red-400 font-bold">本当に消去しますか？</span>
                    <button
                      onClick={handleClearRankings}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded font-bold cursor-pointer"
                    >
                      はい
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-0.5 rounded font-bold cursor-pointer"
                    >
                      いいえ
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {rankings.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">データがありません</p>
          ) : (
            <div className="overflow-x-auto" id="rankings-table-wrapper">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800/80 text-slate-500">
                    <th className="pb-2 font-bold text-left w-12">順位</th>
                    <th className="pb-2 font-bold text-left">プレイ日時</th>
                    <th className="pb-2 font-bold text-center">難易度</th>
                    <th className="pb-2 font-bold text-center">生存結果</th>
                    <th className="pb-2 font-bold text-right">スコア</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-mono">
                  {rankings.slice(0, 5).map((record, index) => {
                    const isCurrent = record.id === rankings.find(r => r.score === playerStats.score && r.difficulty === playerStats.difficulty)?.id;
                    let rankBadge = `${index + 1}`;
                    let rankClass = 'text-slate-400';
                    if (index === 0) {
                      rankBadge = '🥇';
                      rankClass = 'text-yellow-400 font-bold';
                    } else if (index === 1) {
                      rankBadge = '🥈';
                      rankClass = 'text-slate-300 font-bold';
                    } else if (index === 2) {
                      rankBadge = '🥉';
                      rankClass = 'text-amber-600 font-bold';
                    }

                    return (
                      <tr 
                        key={record.id} 
                        className={`hover:bg-slate-900/40 transition-colors ${
                          isCurrent ? 'bg-slate-800/40 font-bold border-l-2 border-l-amber-500' : ''
                        }`}
                      >
                        <td className="py-2 pl-1 text-left">
                          <span className={rankClass}>{rankBadge}</span>
                        </td>
                        <td className="py-2 text-slate-400 text-[11px] font-sans text-left">
                          {record.date} {isCurrent && <span className="text-[10px] text-amber-400 font-sans ml-1 font-bold">← 今回</span>}
                        </td>
                        <td className="py-2 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                            record.difficulty === 'EASY' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : record.difficulty === 'HARD' 
                              ? 'bg-rose-500/10 text-rose-400' 
                              : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {record.difficulty === 'EASY' ? 'EASY' : record.difficulty === 'NORMAL' ? 'NORMAL' : 'HARD'}
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          {record.isSurvived ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/10 font-sans font-bold">
                              生存成功
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/10 font-sans font-bold">
                              生存失敗
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right font-bold text-white text-sm">
                          {record.score} <span className="text-[10px] text-slate-500 font-normal">Pts</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rankings.length > 5 && (
                <p className="text-[10px] text-slate-500 mt-2 text-right font-sans">
                  他 {rankings.length - 5} 件の記録が保存されています
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action / Decisions Log */}
        <div className="w-full text-left mb-10" id="decisions-log-container">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
            <BookOpenCheck className="w-5 h-5 text-amber-400" />
            あなたの行動・判断の記録と振り返り
          </h3>

          <div className="space-y-4" id="log-list">
            {/* ITEM 0: Preparation */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-950 border border-slate-900" id="log-preparation">
              <div className="mt-0.5">
                {playerStats.preparedItems && playerStats.preparedItems.length >= 3 && !playerStats.preparedItems.includes('doll') && !playerStats.preparedItems.includes('console') ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm flex justify-between">
                  <span>🎒 地震前の非常持出袋（事前準備）</span>
                  <span className={playerStats.preparedItems && playerStats.preparedItems.length >= 3 && !playerStats.preparedItems.includes('doll') && !playerStats.preparedItems.includes('console') ? 'text-emerald-400' : 'text-amber-400'}>
                    {playerStats.preparedItems && playerStats.preparedItems.length > 0 
                      ? `${playerStats.preparedItems.map(id => {
                          if (id === 'flashlight') return '🔦懐中電灯';
                          if (id === 'radio') return '📻ラジオ';
                          if (id === 'food') return '🥫非常食';
                          if (id === 'firstaid') return '🩺救急薬';
                          if (id === 'toilet') return '🧻簡易トイレ';
                          if (id === 'doll') return '🧸ぬいぐるみ';
                          if (id === 'console') return '🎮ゲーム機';
                          return id;
                        }).join(', ')}`
                      : '準備なし'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  大地震に備えて、本当に必要なものだけを選んで避難用袋に詰める「事前準備」は極めて重要です。
                  <strong>懐中電灯、ポータブルラジオ、非常食・飲料水、簡易トイレ、救急セット</strong>は命を繋ぐために不可欠ですが、重く、電気が通らない避難所で使えないぬいぐるみやゲーム機などは避難の大きな妨げになります。
                </p>
              </div>
            </div>

            {/* ITEM 1: Helmet */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-950 border border-slate-900" id="log-helmet">
              <div className="mt-0.5">
                {playerStats.hasHelmet ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm flex justify-between">
                  <span>🪖 ヘルメットの回収</span>
                  <span className={playerStats.hasHelmet ? 'text-emerald-400' : 'text-red-400'}>
                    {playerStats.hasHelmet ? '回収成功 (+100)' : '未回収 (大怪我リスク)'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  地震時の最優先は「頭を守る」ことです。ヘルメットがない場合、本棚の落下物や天井からの建材の破片で意識を失う致命的なリスクがあります。
                </p>
              </div>
            </div>

            {/* ITEM 2: Shoes */}
            <div className="flex gap-4 p-4 rounded-xl bg-slate-950 border border-slate-900" id="log-shoes">
              <div className="mt-0.5">
                {playerStats.hasShoes ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-sm flex justify-between">
                  <span>👟 避難用厚底シューズの回収</span>
                  <span className={playerStats.hasShoes ? 'text-emerald-400' : 'text-red-400'}>
                    {playerStats.hasShoes ? '回収成功 (+100)' : '未回収 (避難速度35%低下)'}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  大地震直後の床には、割れた窓ガラスや食器が散乱し、素足での移動は困難を極めます。避難用シューズ（またはスリッパ）がないと、足を負傷し避難速度が大きく落ち、津波から逃げ切れなくなります。
                </p>
              </div>
            </div>

            {/* DECISION 1: Earthquake Quiz */}
            {playerStats.earthquakeQuizCorrect !== null && (
              <div className="flex gap-4 p-4 rounded-xl bg-slate-950 border border-slate-900" id="log-eq-quiz">
                <div className="mt-0.5">
                  {playerStats.earthquakeQuizCorrect === true ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm flex justify-between">
                    <span>🚪 地震直後の状況判断</span>
                    <span className={playerStats.earthquakeQuizCorrect === true ? 'text-emerald-400' : 'text-red-400'}>
                      {playerStats.earthquakeQuizCorrect === true ? '正解 (+150)' : '不正解'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    地震発生直後の小康状態（一時的に揺れが収まった時）には、まず足を保護して避難用の扉を開けることが鉄則です。エレベーターの使用は閉じ込めのリスクがあるため厳禁です。
                  </p>
                </div>
              </div>
            )}

            {/* DECISION 2: Tsunami Car */}
            {playerStats.tsunamiDecisions.carVsFoot !== null && (
              <div className="flex gap-4 p-4 rounded-xl bg-slate-950 border border-slate-900" id="log-ts-car">
                <div className="mt-0.5">
                  {playerStats.tsunamiDecisions.carResult ? (
                    playerStats.tsunamiDecisions.carResult.resultType === 'correct' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : playerStats.tsunamiDecisions.carResult.resultType === 'semi' ? (
                      <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )
                  ) : (
                    playerStats.tsunamiDecisions.carVsFoot === 'foot' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm flex flex-col md:flex-row justify-between gap-1">
                    <span>🚶 {playerStats.tsunamiDecisions.carResult?.title || '避難手段の選択'}</span>
                    <span className={
                      playerStats.tsunamiDecisions.carResult 
                        ? playerStats.tsunamiDecisions.carResult.resultType === 'correct'
                          ? 'text-emerald-400'
                          : playerStats.tsunamiDecisions.carResult.resultType === 'semi'
                          ? 'text-amber-400'
                          : 'text-red-400'
                        : playerStats.tsunamiDecisions.carVsFoot === 'foot' ? 'text-emerald-400' : 'text-red-400'
                    }>
                      {playerStats.tsunamiDecisions.carResult 
                        ? `${playerStats.tsunamiDecisions.carResult.badge}：${playerStats.tsunamiDecisions.carResult.desc}`
                        : playerStats.tsunamiDecisions.carVsFoot === 'foot' ? '適切：徒歩を選択' : '不適切：車を選択 (渋滞に捕まりました)'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {playerStats.tsunamiDecisions.carResult ? (
                      <>
                        <span className="text-slate-300 block mb-1"><strong>選択した避難手段:</strong> {playerStats.tsunamiDecisions.carResult.selectedText}</span>
                        <strong className="text-slate-200 block mt-1 bg-slate-900 p-2.5 rounded border border-slate-800">💡 防災解説: {playerStats.tsunamiDecisions.carResult.explanation}</strong>
                      </>
                    ) : (
                      '東日本大震災でも車が道路渋滞を引き起こし、そのまま波にのまれる大惨事が起きています。特別な支援を必要とする方を除き、津波避難は「徒歩」が基本です。'
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* DECISION 2.5: Tsunami Block Wall */}
            {playerStats.tsunamiDecisions.blockWall !== null && (
              <div className="flex gap-4 p-4 rounded-xl bg-slate-950 border border-slate-900" id="log-ts-blockwall">
                <div className="mt-0.5">
                  {playerStats.tsunamiDecisions.blockWallResult ? (
                    playerStats.tsunamiDecisions.blockWallResult.resultType === 'correct' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : playerStats.tsunamiDecisions.blockWallResult.resultType === 'semi' ? (
                      <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )
                  ) : (
                    playerStats.tsunamiDecisions.blockWall === 'wide' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm flex flex-col md:flex-row justify-between gap-1">
                    <span>🏘️ {playerStats.tsunamiDecisions.blockWallResult?.title || '避難時の危険回避'}</span>
                    <span className={
                      playerStats.tsunamiDecisions.blockWallResult 
                        ? playerStats.tsunamiDecisions.blockWallResult.resultType === 'correct'
                          ? 'text-emerald-400'
                          : playerStats.tsunamiDecisions.blockWallResult.resultType === 'semi'
                          ? 'text-amber-400'
                          : 'text-red-400'
                        : playerStats.tsunamiDecisions.blockWall === 'wide' ? 'text-emerald-400' : 'text-red-400'
                    }>
                      {playerStats.tsunamiDecisions.blockWallResult 
                        ? `${playerStats.tsunamiDecisions.blockWallResult.badge}：${playerStats.tsunamiDecisions.blockWallResult.desc}`
                        : playerStats.tsunamiDecisions.blockWall === 'wide' ? '適切：広い大通りを選択' : '不適切：ブロック塀のそばを選択 (倒壊下敷きリスク)'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {playerStats.tsunamiDecisions.blockWallResult ? (
                      <>
                        <span className="text-slate-300 block mb-1"><strong>選択した行動:</strong> {playerStats.tsunamiDecisions.blockWallResult.selectedText}</span>
                        <strong className="text-slate-200 block mt-1 bg-slate-900 p-2.5 rounded border border-slate-800">💡 防災解説: {playerStats.tsunamiDecisions.blockWallResult.explanation}</strong>
                      </>
                    ) : (
                      '大地震直後の密集市街地や住宅街には、古いブロック塀や自動販売機の倒壊リスクが潜んでいます。古い塀の近くは余震で倒れて下敷きになる危険性が非常に高いため、決して近寄らず、道幅の広い開けた大通りを避難ルートに選ぶのが鉄則です。'
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* DECISION 3: Tsunami Route */}
            {playerStats.tsunamiDecisions.routeSelection !== null && (
              <div className="flex gap-4 p-4 rounded-xl bg-slate-950 border border-slate-900" id="log-ts-route">
                <div className="mt-0.5">
                  {playerStats.tsunamiDecisions.routeResult ? (
                    playerStats.tsunamiDecisions.routeResult.resultType === 'correct' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : playerStats.tsunamiDecisions.routeResult.resultType === 'semi' ? (
                      <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )
                  ) : (
                    playerStats.tsunamiDecisions.routeSelection === 'safe' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm flex flex-col md:flex-row justify-between gap-1">
                    <span>🗺️ {playerStats.tsunamiDecisions.routeResult?.title || '避難ルートの選択'}</span>
                    <span className={
                      playerStats.tsunamiDecisions.routeResult 
                        ? playerStats.tsunamiDecisions.routeResult.resultType === 'correct'
                          ? 'text-emerald-400'
                          : playerStats.tsunamiDecisions.routeResult.resultType === 'semi'
                          ? 'text-amber-400'
                          : 'text-red-400'
                        : playerStats.tsunamiDecisions.routeSelection === 'safe' ? 'text-emerald-400' : 'text-red-400'
                    }>
                      {playerStats.tsunamiDecisions.routeResult 
                        ? `${playerStats.tsunamiDecisions.routeResult.badge}：${playerStats.tsunamiDecisions.routeResult.desc}`
                        : playerStats.tsunamiDecisions.routeSelection === 'safe' ? '適切：安全な平坦道路' : '不適切：危険崖沿い道路 (土砂崩れの直撃)'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {playerStats.tsunamiDecisions.routeResult ? (
                      <>
                        <span className="text-slate-300 block mb-1"><strong>選択した避難ルート:</strong> {playerStats.tsunamiDecisions.routeResult.selectedText}</span>
                        <strong className="text-slate-200 block mt-1 bg-slate-900 p-2.5 rounded border border-slate-800">💡 防災解説: {playerStats.tsunamiDecisions.routeResult.explanation}</strong>
                      </>
                    ) : (
                      '大きな本震の直後は、斜面や地盤がとても不安定になっています。近道だからといって崖沿いを進むと、落石や土砂崩れに巻き込まれるため、遠回りでも安全な開けた道を選んで避難します。'
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* DECISION 4: Tsunami building */}
            {playerStats.tsunamiDecisions.stairsVsElevator !== null && (
              <div className="flex gap-4 p-4 rounded-xl bg-slate-950 border border-slate-900" id="log-ts-stair">
                <div className="mt-0.5">
                  {playerStats.tsunamiDecisions.stairsResult ? (
                    playerStats.tsunamiDecisions.stairsResult.resultType === 'correct' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : playerStats.tsunamiDecisions.stairsResult.resultType === 'semi' ? (
                      <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )
                  ) : (
                    playerStats.tsunamiDecisions.stairsVsElevator === 'stairs' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm flex flex-col md:flex-row justify-between gap-1">
                    <span>🏢 {playerStats.tsunamiDecisions.stairsResult?.title || '垂直避難手段：非常階段 vs エレベーター'}</span>
                    <span className={
                      playerStats.tsunamiDecisions.stairsResult 
                        ? playerStats.tsunamiDecisions.stairsResult.resultType === 'correct'
                          ? 'text-emerald-400'
                          : playerStats.tsunamiDecisions.stairsResult.resultType === 'semi'
                          ? 'text-amber-400'
                          : 'text-red-400'
                        : playerStats.tsunamiDecisions.stairsVsElevator === 'stairs' ? 'text-emerald-400' : 'text-red-400'
                    }>
                      {playerStats.tsunamiDecisions.stairsResult 
                        ? `${playerStats.tsunamiDecisions.stairsResult.badge}：${playerStats.tsunamiDecisions.stairsResult.desc}`
                        : playerStats.tsunamiDecisions.stairsVsElevator === 'stairs' ? '適切：非常階段で走る' : '不適切：エレベーターを使用'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {playerStats.tsunamiDecisions.stairsResult ? (
                      <>
                        <span className="text-slate-300 block mb-1"><strong>選択した避難行動:</strong> {playerStats.tsunamiDecisions.stairsResult.selectedText}</span>
                        <strong className="text-slate-200 block mt-1 bg-slate-900 p-2.5 rounded border border-slate-800">💡 防災解説: {playerStats.tsunamiDecisions.stairsResult.explanation}</strong>
                      </>
                    ) : (
                      '高台に逃げる時間がない場合は、近くの「津波避難ビル」などの丈夫な建物に垂直避難します。しかし、エレベーターは停電等による閉じ込めの致命的な罠となるため、絶対に階段を使用してください。'
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-life Disaster Checklist */}
        <div className="w-full bg-slate-950 p-6 rounded-2xl border border-slate-800 text-left mb-10" id="real-life-checklist">
          <h4 className="font-bold text-white text-sm flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-400" />
            🏠 今すぐできる、リアルの防災アクション！
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            このゲームのシミュレーションを現実にするために、以下の行動を自宅で行ってみましょう。
          </p>
          <div className="space-y-3" id="checklist-items">
            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none" id="chk-label-1">
              <input type="checkbox" className="mt-0.5 rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0" />
              <span><strong>スリッパや室内履きの準備：</strong>枕元やリビングのすぐ近くに、厚底のスリッパや履き慣れた靴を置いておきましょう。</span>
            </label>
            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none" id="chk-label-2">
              <input type="checkbox" className="mt-0.5 rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0" />
              <span><strong>非常用持ち出し袋：</strong>最低3日分（できれば1週間分）の水、非常食、懐中電灯、簡易トイレ、ラジオ、救急キットをまとめて寝室近くに常備。</span>
            </label>
            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none" id="chk-label-3">
              <input type="checkbox" className="mt-0.5 rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0" />
              <span><strong>ハザードマップの確認：</strong>自治体が発行するハザードマップ（津波浸水想定・避難場所・避難経路・各場所の標高）を事前に確認。</span>
            </label>
            <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none" id="chk-label-4">
              <input type="checkbox" className="mt-0.5 rounded border-slate-800 bg-slate-900 text-amber-500 focus:ring-0" />
              <span><strong>家具の転倒防止：</strong>本棚や食器棚、冷蔵庫が倒れてこないようにL字金具や突っ張り棒でしっかり固定する。</span>
            </label>
          </div>
        </div>

        {/* Retry controls */}
        <button
          onClick={onRetry}
          className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-slate-800 hover:bg-slate-700 font-bold text-white text-base border border-slate-700 shadow-lg active:scale-95 transition-all duration-200 cursor-pointer"
          id="btn-retry"
        >
          <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
          もう一度シミュレーションを行う (再挑戦)
        </button>
      </motion.div>
    </div>
  );
}
