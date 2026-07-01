import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertOctagon, Flame, Shield, ArrowRight, Zap, RefreshCw, Footprints, ShieldCheck } from 'lucide-react';
import { GamePhase, PlayerStats, FallingItem } from '../types';

let uniqueIdCounter = 0;
const getUniqueId = (): string => {
  uniqueIdCounter += 1;
  return `${Date.now()}-${uniqueIdCounter}-${Math.random()}`;
};

interface EarthquakeStageProps {
  playerStats: PlayerStats;
  setPlayerStats: Dispatch<SetStateAction<PlayerStats>>;
  onNextPhase: (phase: GamePhase) => void;
}

interface PrepItem {
  id: string;
  name: string;
  icon: string;
  desc: string;
  isUseful: boolean;
  why: string;
}

const PREP_ITEMS: PrepItem[] = [
  { id: 'flashlight', name: '懐中電灯と電池', icon: '🔦', desc: '夜間停電時の避難や暗闇での作業に必須。頭部を照らし両手を開けられます。', isUseful: true, why: '停電時の暗闇で安全に避難するために極めて重要です。' },
  { id: 'radio', name: '小型ポータブルラジオ', icon: '📻', desc: 'デマを避け、災害用ダイヤルや避難指示などの正確な情報を得られます。', isUseful: true, why: '停電時や通信障害時でも、確実な防災情報・津波警報をキャッチできます。' },
  { id: 'food', name: '非常食・保存水', icon: '🥫', desc: '水や食料は生存に直結します。手軽に摂取できる高エネルギー食がベスト。', isUseful: true, why: 'ライフラインが寸断された直後でも体力を維持するために必須です。' },
  { id: 'firstaid', name: '簡易救急セット', icon: '🩺', desc: '地震によるガラス破片や瓦礫でのケガに対し、止血や保護が行えます。', isUseful: true, why: '避難中に発生しやすい小さなケガから感染症を防ぐための必需品です。' },
  { id: 'toilet', name: '携帯用簡易トイレ', icon: '🧻', desc: '断水時に最も困る排泄問題。衛生状態を保ち、感染症リスクを軽減します。', isUseful: true, why: '避難所や自宅避難時の断水対策として最も重要なアイテムの一つです。' },
  { id: 'doll', name: '巨大なぬいぐるみ', icon: '🧸', desc: '癒やされるかもしれませんが、重くてかさばるため避難の邪魔になります。', isUseful: false, why: '避難時は身軽さが命です。かさばる荷物は移動速度を著しく低下させます。' },
  { id: 'console', name: '据え置きゲーム機', icon: '🎮', desc: '電気が通らない避難所では使えず、重いため避難の大きな障害に。', isUseful: false, why: '電気がない環境では使用できず、重い荷物は避難行動を遅らせ危険を招きます。' },
];

export default function EarthquakeStage({ playerStats, setPlayerStats, onNextPhase }: EarthquakeStageProps) {
  const [phase, setPhase] = useState<'PREPARATION' | 'INTRO' | 'PLAYING' | 'QUIZ' | 'OUTRO'>('PREPARATION');
  const [selectedPrepItems, setSelectedPrepItems] = useState<string[]>([]);
  const [prepResult, setPrepResult] = useState<{ show: boolean; scoreBonus: number; hpBonus: boolean; hasBagBonus: boolean } | null>(null);
  const [playerPosition, setPlayerPosition] = useState<number>(50); // percentage (0 to 100)
  const [items, setItems] = useState<FallingItem[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(20); // 20 seconds gameplay
  const [escapeTimeLeft, setEscapeTimeLeft] = useState<number>(28); // 避難残り時間
  const [activeEffects, setActiveEffects] = useState<{ id: string; text: string; color: string; x: number; y: number }[]>([]);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);

  const gameLoopRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);
  const escapeCountdownRef = useRef<any>(null);
  const playerPositionRef = useRef<number>(50);
  const collidedItemsRef = useRef<FallingItem[]>([]);
  const escapedItemsRef = useRef<FallingItem[]>([]);
  const justDodgedItemsRef = useRef<FallingItem[]>([]);
  const processedItemIdsRef = useRef<Set<string>>(new Set());
  const justDodgeProcessedRef = useRef<Set<string>>(new Set());
  const comboRef = useRef<number>(0);

  // Time Over Handler (Force result screen)
  const handleTimeOver = () => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (escapeCountdownRef.current) clearInterval(escapeCountdownRef.current);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);

    setPlayerStats((prev) => ({
      ...prev,
      health: 0,
      survivalResult: 'FAILED_EARTHQUAKE',
    }));
    
    onNextPhase('RESULT');
  };

  // Keep player position ref up to date
  useEffect(() => {
    playerPositionRef.current = playerPosition;
  }, [playerPosition]);

  // Global Countdown Timer for Earthquake
  useEffect(() => {
    if (phase !== 'PLAYING' && phase !== 'QUIZ') {
      if (escapeCountdownRef.current) {
        clearInterval(escapeCountdownRef.current);
        escapeCountdownRef.current = null;
      }
      return;
    }

    if (!escapeCountdownRef.current) {
      escapeCountdownRef.current = setInterval(() => {
        setEscapeTimeLeft((prev) => {
          if (prev <= 0.1) {
            clearInterval(escapeCountdownRef.current);
            escapeCountdownRef.current = null;
            handleTimeOver();
            return 0;
          }
          return Number((prev - 0.1).toFixed(1));
        });
      }, 100);
    }

    return () => {
      if (escapeCountdownRef.current) {
        clearInterval(escapeCountdownRef.current);
        escapeCountdownRef.current = null;
      }
    };
  }, [phase]);

  const spawnSpecificItem = (type: FallingItem['type'], label: string) => {
    const playerX = playerPositionRef.current;
    // Spawn close to player so it can be easily fetched
    const offset = (Math.random() - 0.5) * 12;
    const itemX = Math.max(10, Math.min(90, playerX + offset));

    const newItem: FallingItem = {
      id: getUniqueId(),
      x: itemX,
      y: 0,
      speed: 0.9, // Slow falling for easy grab
      type,
      width: 10,
      label: `🌟実力特典: ${label}`,
    };
    setItems((prev) => [...prev, newItem]);
    addEffect(newItem.id, `${label}が出現！`, 'text-yellow-300 font-extrabold text-[11px] animate-bounce', itemX, 15);
  };

  const handleTogglePrepItem = (id: string) => {
    if (prepResult?.show) return;
    if (selectedPrepItems.includes(id)) {
      setSelectedPrepItems((prev) => prev.filter((item) => item !== id));
    } else {
      if (selectedPrepItems.length >= 3) {
        return;
      }
      setSelectedPrepItems((prev) => [...prev, id]);
    }
  };

  const handlePrepComplete = () => {
    if (selectedPrepItems.length === 0) {
      alert('避難持出袋に詰めるアイテムを1つ以上選んでください！');
      return;
    }

    const selectedDetails = PREP_ITEMS.filter((item) => selectedPrepItems.includes(item.id));
    const usefulCount = selectedDetails.filter((item) => item.isUseful).length;
    const scoreBonus = usefulCount * 100;
    const allUseful = usefulCount === 3; // 3つ選んで、かつ3つとも役立つ

    setPlayerStats((prev) => {
      const updated = {
        ...prev,
        preparedItems: selectedPrepItems,
        score: prev.score + scoreBonus,
      };
      
      if (allUseful) {
        updated.hasBag = true;
        updated.maxHealth = 120;
        updated.health = 120;
      }

      return updated;
    });

    setPrepResult({
      show: true,
      scoreBonus,
      hpBonus: allUseful,
      hasBagBonus: allUseful,
    });
  };

  const handleProceedToIntro = () => {
    setPrepResult(null);
    setPhase('INTRO');
  };

  // Start Gameplay
  const startGameplay = () => {
    setPhase('PLAYING');
    
    // Adjust starting parameters based on difficulty
    const diff = playerStats.difficulty;
    const initialTime = diff === 'EASY' ? 15 : diff === 'HARD' ? 25 : 20;
    const spawnInterval = diff === 'EASY' ? 1500 : diff === 'HARD' ? 700 : 1100;
    const quizTriggerTime = diff === 'EASY' ? 8 : diff === 'HARD' ? 13 : 11;

    setTimeLeft(initialTime);
    setItems([]);
    processedItemIdsRef.current.clear();
    justDodgeProcessedRef.current.clear();
    collidedItemsRef.current = [];
    escapedItemsRef.current = [];
    justDodgedItemsRef.current = [];
    setCombo(0);
    comboRef.current = 0;
    setMaxCombo(0);
    
    // Countdown timer
    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        // Trigger quiz at half way points
        if (prev === quizTriggerTime) {
          triggerQuiz();
        }
        return prev - 1;
      });
    }, 1000);

    // Spawn falling items
    spawnTimerRef.current = setInterval(() => {
      spawnItem();
    }, spawnInterval);
  };

  // Trigger mid-earthquake quiz
  const triggerQuiz = () => {
    setPhase('QUIZ');
    // Pause item spawning and countdown
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  // Resume after quiz
  const handleQuizAnswer = (isCorrect: boolean, index: number) => {
    setSelectedOption(index);
    setQuizAnswered(true);

    setPlayerStats((prev) => ({
      ...prev,
      earthquakeQuizCorrect: isCorrect,
      health: isCorrect ? prev.health : Math.max(10, prev.health - 25), // Lose health on wrong answer
      score: prev.score + (isCorrect ? 150 : 0),
    }));

    setTimeout(() => {
      // Resume game
      setPhase('PLAYING');
      setQuizAnswered(false);
      setSelectedOption(null);

      const diff = playerStats.difficulty;
      const spawnInterval = diff === 'EASY' ? 1500 : diff === 'HARD' ? 700 : 1100;

      // Re-initialize countdown and spawning
      countdownRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            // End of earthquake
            endEarthquake();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      spawnTimerRef.current = setInterval(() => {
        spawnItem();
      }, spawnInterval);
    }, 3500);
  };

  // Spawn falling objects
  const spawnItem = () => {
    const types: FallingItem['type'][] = [
      'DEBRIS_GLASS', 'DEBRIS_BOOK', 'DEBRIS_SHELF',
      'ITEM_HELMET', 'ITEM_SHOES', 'ITEM_BAG'
    ];
    // Weight the spawn towards debris
    const rand = Math.random();
    let type: FallingItem['type'] = 'DEBRIS_GLASS';
    let label = 'ガラス片';

    if (rand < 0.3) {
      type = 'DEBRIS_GLASS';
      label = '割れたガラス！';
    } else if (rand < 0.55) {
      type = 'DEBRIS_BOOK';
      label = '落下の本！';
    } else if (rand < 0.7) {
      type = 'DEBRIS_SHELF';
      label = '倒れる家具！';
    } else if (rand < 0.8) {
      type = 'ITEM_HELMET';
      label = 'ヘルメット🪖';
    } else if (rand < 0.9) {
      type = 'ITEM_SHOES';
      label = '厚底の靴👟';
    } else {
      type = 'ITEM_BAG';
      label = '非常持出袋🎒';
    }

    const diff = playerStats.difficulty;
    
    // 難易度による基本速度倍率の設定（メリハリを強めるために微調整）
    const speedMultiplier = diff === 'EASY' ? 0.55 : diff === 'HARD' ? 1.65 : 1.0;

    // 落下物の種類に応じた個別基本速度（重さや軽さをゲームデザイン的に表現）
    let baseSpeed = 1.2;
    if (type === 'DEBRIS_GLASS') {
      // ガラス片：軽いため少し速めかつランダム性が高め
      baseSpeed = Math.random() * 0.8 + 1.4; 
    } else if (type === 'DEBRIS_BOOK') {
      // 本：標準的な落下速度
      baseSpeed = Math.random() * 0.6 + 1.1;
    } else if (type === 'DEBRIS_SHELF') {
      // 家具：重いためやや遅い、ただしサイズが大きい
      baseSpeed = Math.random() * 0.4 + 0.8;
    } else {
      // 支援・救助アイテム：プレイヤーが拾いやすいよう優しめの速度
      baseSpeed = Math.random() * 0.4 + 1.0;
    }

    const newItem: FallingItem = {
      id: getUniqueId(),
      x: Math.random() * 90 + 5, // 5% to 95%
      y: 0,
      speed: baseSpeed * speedMultiplier,
      type,
      width: type.startsWith('DEBRIS_SHELF') ? 14 : 10,
      label,
    };

    setItems((prev) => [...prev, newItem]);
  };

  // Keyboard controls
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setPlayerPosition((prev) => Math.max(5, prev - 7));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setPlayerPosition((prev) => Math.min(95, prev + 7));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  // 回避成功（自然消滅）時の処理
  const handleEscape = (item: FallingItem) => {
    if (item.type.startsWith('DEBRIS')) {
      const nextCombo = comboRef.current + 1;
      comboRef.current = nextCombo;
      setCombo(nextCombo);
      setMaxCombo((mc) => Math.max(mc, nextCombo));
      
      // 特定コンボでまだ持っていないアイテムを目の前に確定出現させる！(実力重視)
      if (nextCombo === 4 && !playerStats.hasHelmet) {
        spawnSpecificItem('ITEM_HELMET', 'ヘルメット🪖');
      } else if (nextCombo === 8 && !playerStats.hasShoes) {
        spawnSpecificItem('ITEM_SHOES', '避難用シューズ👟');
      } else if (nextCombo === 12 && !playerStats.hasBag) {
        spawnSpecificItem('ITEM_BAG', '非常持出袋🎒');
      }

      // 回避自体に対する基礎スコア
      setPlayerStats((prev) => ({
        ...prev,
        score: prev.score + 10 + (nextCombo * 2), // コンボが繋がるほどスコア増加
      }));

      if (nextCombo % 3 === 0) {
        addEffect(item.id, `${nextCombo} COMBO!`, 'text-cyan-400 font-extrabold text-xs', item.x, 90);
      }
    }
  };

  // ジャスト回避成功時の処理
  const handleJustDodge = (item: FallingItem) => {
    const nextCombo = comboRef.current + 1;
    comboRef.current = nextCombo;
    setCombo(nextCombo);
    setMaxCombo((mc) => Math.max(mc, nextCombo));

    setPlayerStats((prev) => ({
      ...prev,
      score: prev.score + 40,
      health: Math.min(prev.maxHealth, prev.health + 2), // 実力回避でHPが2回復！
    }));
    
    addEffect(item.id, '⚡ JUST DODGE! +40', 'text-amber-300 font-black tracking-wider text-[9px] animate-pulse', item.x, 75);
  };

  // Main game loop (running animation frame)
  useEffect(() => {
    if (phase !== 'PLAYING') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const updatePhysics = () => {
      // 1. 衝突の処理
      if (collidedItemsRef.current.length > 0) {
        const toProcess = [...collidedItemsRef.current];
        collidedItemsRef.current = [];
        for (const item of toProcess) {
          handleCollision(item);
        }
      }

      // 2. 回避成功（自然消滅）の処理
      if (escapedItemsRef.current.length > 0) {
        const toProcess = [...escapedItemsRef.current];
        escapedItemsRef.current = [];
        for (const item of toProcess) {
          handleEscape(item);
        }
      }

      // 3. ジャスト回避の処理
      if (justDodgedItemsRef.current.length > 0) {
        const toProcess = [...justDodgedItemsRef.current];
        justDodgedItemsRef.current = [];
        for (const item of toProcess) {
          handleJustDodge(item);
        }
      }

      setItems((prevItems) => {
        const updated: FallingItem[] = [];
        
        for (const item of prevItems) {
          if (processedItemIdsRef.current.has(item.id)) {
            continue; // Ignore already processed item
          }
          const nextY = item.y + item.speed;

          // プレイヤーとの衝突判定（あなたのアイコン（🚶）に接触する高さ：88% 〜 98%（アイコン高さ10%）に合わせて判定）
          if (nextY >= 88 && nextY <= 98) {
            const distance = Math.abs(item.x - playerPositionRef.current);
            // 落下物アイコン（半径約2%）とアバターアイコン（半径約3%）の接触判定（合計5.0%未満で衝突）
            if (distance < 5.0) {
              // 衝突！
              processedItemIdsRef.current.add(item.id);
              collidedItemsRef.current.push(item);
              continue; // 接触したら即座に消す（効果を適用してリストから除外）
            }
          }

          // 地面への落下（98%に達するまで落下を続け、98%以上で自然に消える）
          if (nextY >= 98) {
            processedItemIdsRef.current.add(item.id);
            escapedItemsRef.current.push(item);
            continue;
          }

          // ジャスト回避判定（地面近くで衝突はせず、かつ極めて近い距離をすり抜けた場合）
          if (item.type.startsWith('DEBRIS') && nextY >= 82 && nextY <= 98) {
            const distance = Math.abs(item.x - playerPositionRef.current);
            const minCollideDist = 5.0; // 衝突判定の境界（アイコン基準）
            // 衝突範囲外（5%以上）だが、極めて近い距離（8.5%未満）を通過した場合
            if (distance >= minCollideDist && distance < minCollideDist + 3.5 && !justDodgeProcessedRef.current.has(item.id)) {
              justDodgeProcessedRef.current.add(item.id);
              justDodgedItemsRef.current.push(item);
            }
          }

          updated.push({ ...item, y: nextY });
        }
        return updated;
      });

      gameLoopRef.current = requestAnimationFrame(updatePhysics);
    };

    gameLoopRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [phase]);

  // Handle Collisions
  const handleCollision = (item: FallingItem) => {
    const isDebris = item.type.startsWith('DEBRIS');

    if (isDebris) {
      // Reset combo on damage
      setCombo(0);
      comboRef.current = 0;

      // Calculate damage based on item type and if they have helmet
      let baseDamage = 15;
      if (item.type === 'DEBRIS_SHELF') baseDamage = 30;
      if (item.type === 'DEBRIS_GLASS') baseDamage = 10;

      // Reduction with helmet & Difficulty adjustment
      const baseFinalDamage = playerStats.hasHelmet ? Math.round(baseDamage * 0.4) : baseDamage;
      const diff = playerStats.difficulty;
      const damageMultiplier = diff === 'EASY' ? 0.65 : diff === 'HARD' ? 1.45 : 1.0;
      const finalDamage = Math.round(baseFinalDamage * damageMultiplier);

      setPlayerStats((prev) => {
        const newHealth = Math.max(0, prev.health - finalDamage);
        return {
          ...prev,
          health: newHealth,
        };
      });

      // Visual floating effect text
      addEffect(item.id, `💥痛っ! -${finalDamage} HP (コンボ終了)`, 'text-red-500 font-extrabold text-[10px]', item.x, 82);
    } else {
      // Item collected!
      let itemKey: keyof PlayerStats = 'hasHelmet';
      let statText = '';
      let scoreBonus = 100;

      if (item.type === 'ITEM_HELMET') {
        itemKey = 'hasHelmet';
        statText = 'ヘルメット装着（ダメージ60%カット！）';
      } else if (item.type === 'ITEM_SHOES') {
        itemKey = 'hasShoes';
        statText = '靴をゲット（避難時の怪我を防止！）';
      } else if (item.type === 'ITEM_BAG') {
        itemKey = 'hasBag';
        statText = '非常持出袋（スコア大幅アップ！）';
        scoreBonus = 200;
      }

      setPlayerStats((prev) => ({
        ...prev,
        [itemKey]: true,
        score: prev.score + scoreBonus,
      }));

      addEffect(item.id, `GET! ${item.label}`, 'text-emerald-400 font-bold', item.x, 90);
    }
  };

  const addEffect = (id: string, text: string, color: string, x: number, y: number) => {
    const effectId = `${id}-${getUniqueId()}`;
    setActiveEffects((prev) => [...prev, { id: effectId, text, color, x, y }]);
    setTimeout(() => {
      setActiveEffects((prev) => prev.filter((e) => e.id !== effectId));
    }, 1000);
  };

  // End of Phase 1
  const endEarthquake = () => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    // Check if player died during earthquake
    if (playerStats.health <= 0) {
      setPlayerStats((prev) => ({
        ...prev,
        survivalResult: 'FAILED_EARTHQUAKE',
      }));
      setPhase('OUTRO');
    } else {
      setPhase('OUTRO');
    }
  };

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto p-4" id="earthquake-stage-wrapper">
      <AnimatePresence mode="wait">
        {/* Preparation view */}
        {phase === 'PREPARATION' && (
          <motion.div
            key="prep"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-6 md:p-8 shadow-xl shadow-indigo-500/5"
            id="eq-prep-card"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-4" id="prep-badge">
              🎒 事前準備フェーズ：非常用の持ち出し準備
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight" id="prep-title">
              地震が起きる前の備え
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mb-6 leading-relaxed">
              災害は突然やってきます。自宅やオフィスに大地震が起きる前に、<strong>非常持出袋（避難用バッグ）</strong>に必要なアイテムを準備しておきましょう。
              限られたスペースのため、持ち出せるのは<strong>最大3つ</strong>までです。本当に役に立つアイテムを選んでください！
            </p>

            {!prepResult?.show ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6" id="prep-items-grid">
                  {PREP_ITEMS.map((item) => {
                    const isSelected = selectedPrepItems.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTogglePrepItem(item.id)}
                        className={`text-left p-3 rounded-xl border flex gap-3 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-md shadow-indigo-500/5'
                            : selectedPrepItems.length >= 3
                            ? 'bg-slate-950 border-slate-900 text-slate-500 opacity-60'
                            : 'bg-slate-950 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-slate-300'
                        }`}
                        id={`prep-item-${item.id}`}
                      >
                        <span className="text-2xl flex items-center">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-white flex justify-between items-center">
                            <span>{item.name}</span>
                            {isSelected && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">選択中</span>}
                          </h4>
                          <p className="text-[10.5px] text-slate-400 leading-tight mt-1">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-900 mb-6">
                  <div className="text-xs text-slate-400">
                    選択状況: <strong className="text-white text-sm">{selectedPrepItems.length}</strong> / 3 つ
                  </div>
                  <button
                    onClick={handlePrepComplete}
                    disabled={selectedPrepItems.length === 0}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm tracking-wider transition-all cursor-pointer ${
                      selectedPrepItems.length > 0
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold shadow-md'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                    id="btn-prep-complete"
                  >
                    これで準備完了！
                  </button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-4 md:p-6 mb-6 text-left space-y-4"
                id="prep-result-view"
              >
                <h3 className="font-bold text-emerald-400 text-base md:text-lg flex items-center gap-1.5 border-b border-slate-900 pb-2">
                  <ShieldCheck className="w-5 h-5" /> 準備状況の評価・フィードバック
                </h3>

                <div className="space-y-3">
                  {PREP_ITEMS.filter((item) => selectedPrepItems.includes(item.id)).map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs flex gap-3">
                      <span className="text-2xl flex items-center">{item.icon}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <strong className="text-white text-xs">{item.name}</strong>
                          <span className={item.isUseful ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                            {item.isUseful ? '◎ 非常に有益' : '× 避難時は不要'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{item.why}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-xs space-y-2 mt-4 text-slate-300">
                  <h4 className="font-bold text-indigo-400 text-sm">🎒 準備フェーズでの獲得ボーナス:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>初期獲得スコア: <strong className="text-white">+{prepResult.scoreBonus} 点</strong>（役立つアイテム 1つにつき 100点）</li>
                    {prepResult.hpBonus ? (
                      <>
                        <li className="text-emerald-400 font-semibold">🌟 パーフェクト準備ボーナス：最大HP＆初期HPが <strong className="text-white underline">120</strong> にアップ！</li>
                        <li className="text-emerald-400 font-semibold">🎒 防災パーフェクトボーナス：<strong>「非常持出袋」</strong>を所持した状態でスタート！</li>
                      </>
                    ) : (
                      <li className="text-amber-400">💡 ヒント：役立つ実用的な3つのアイテム（懐中電灯、ラジオ、非常食、救急セット、簡易トイレ）だけを選ぶと、強力な<strong>パーフェクト準備ボーナス</strong>が有効になります！</li>
                    )}
                  </ul>
                </div>

                <button
                  onClick={handleProceedToIntro}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-bold text-white transition-all duration-200 cursor-pointer text-sm tracking-wider flex items-center justify-center gap-2"
                  id="btn-prep-next"
                >
                  地震発生（アクション開始）
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Intro view */}
        {phase === 'INTRO' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900/80 border-2 border-amber-500/50 rounded-3xl p-6 md:p-8 text-center shadow-xl shadow-amber-500/5"
            id="eq-intro-card"
          >
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 mx-auto mb-6 animate-pulse" id="warning-siren">
              <AlertOctagon className="w-9 h-9" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4" id="eq-title">
              緊急警報：大地震発生
            </h2>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6" id="eq-intro-desc">
              激しい揺れ（震度6強）があなたの家を襲いました！<br />
              上空から棚の本や、割れた窓ガラスが降ってきます。<br />
              <strong className="text-amber-400">ヘルメットや靴、非常袋などの防災グッズ</strong>を回収しつつ、落下物（赤い危険物）を避けて、揺れが一時収まるまで生き延びてください。
            </p>

            <div className="bg-slate-950/80 rounded-xl p-4 text-left border border-slate-800 mb-8" id="eq-instructions">
              <h4 className="font-bold text-white text-xs mb-2 tracking-wider uppercase">操作方法:</h4>
              <ul className="text-xs text-slate-400 space-y-1.5" id="eq-controls-list">
                <li>• キーボードの <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white">←</span> <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white">→</span> または <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white">A</span> <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white">D</span> で左右に移動</li>
                <li>• スマートフォンやタッチパネルの場合は、画面下部の<span className="text-amber-400 font-bold">【左に動く】【右に動く】</span>ボタンをタップ</li>
              </ul>
            </div>

            <button
              onClick={startGameplay}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all duration-200 cursor-pointer text-sm tracking-wider shadow-lg shadow-amber-500/15"
              id="btn-start-eq"
            >
              揺れに立ち向かう (スタート)
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
            className="flex flex-col gap-2 w-full max-w-xl mx-auto"
            id="eq-gameplay-container"
          >
            {/* Realtime Escape Timer */}
            <div className="w-full py-1.5 px-3 bg-red-950/40 border border-red-500/30 rounded-xl text-center flex items-center justify-between gap-3 animate-pulse" id="eq-realtime-escape-timer">
              <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-black text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                🚨 避難制限（倒壊リミット）
              </span>
              <span className={`font-mono text-lg md:text-xl font-black ${escapeTimeLeft <= 5 ? 'text-red-500 scale-110' : 'text-orange-400'}`}>
                {escapeTimeLeft.toFixed(1)} 秒
              </span>
            </div>

            {/* Status Header - More compact */}
            <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-xl border border-slate-800" id="eq-status-bar">
              <div className="flex items-center gap-2" id="health-container">
                <span className="text-[10px] text-slate-400 font-bold uppercase">HP:</span>
                <div className="w-20 bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 flex" id="health-track">
                  <div
                    className={`h-full transition-all duration-150 ${
                      playerStats.health > 50 ? 'bg-emerald-500' : playerStats.health > 25 ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
                    }`}
                    style={{ width: `${playerStats.health}%` }}
                    id="health-fill"
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-200" id="health-number">{playerStats.health}%</span>
              </div>

              {/* Combo Counter Panel */}
              <div className="text-center px-2 py-0.5 bg-slate-950/60 rounded-lg border border-slate-800/80 min-w-[50px]" id="combo-panel">
                <span className="text-[7px] text-cyan-400 block uppercase font-extrabold tracking-widest leading-none">Combo</span>
                <span className="text-xs font-mono font-extrabold text-cyan-300" id="combo-count">{combo}</span>
              </div>

              <div className="text-center" id="timer-container">
                <span className="text-[8px] text-slate-400 block uppercase font-bold tracking-wider leading-none">耐える時間</span>
                <span className="text-sm font-mono font-extrabold text-amber-500 animate-pulse" id="timer-number">{timeLeft}s</span>
              </div>

              <div className="text-right" id="score-container">
                <span className="text-[9px] text-slate-400 font-bold uppercase block leading-none">スコア:</span>
                <span className="text-xs font-mono font-bold text-white" id="score-number">{playerStats.score}</span>
              </div>
            </div>

            {/* Collected Equipment indicators - Slimmer */}
            <div className="flex gap-1.5 justify-center bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/50" id="eq-equipments">
              <span className="text-[9px] text-slate-400 font-bold self-center mr-1">装備:</span>
              <div className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border transition-all ${
                playerStats.hasHelmet ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold' : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`} id="badge-helmet">
                <Shield className="w-3 h-3" />
                ヘル{playerStats.hasHelmet ? '○' : '×'}
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border transition-all ${
                playerStats.hasShoes ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold' : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`} id="badge-shoes">
                <Footprints className="w-3 h-3" />
                靴{playerStats.hasShoes ? '○' : '×'}
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border transition-all ${
                playerStats.hasBag ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 font-bold' : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`} id="badge-bag">
                <Zap className="w-3 h-3" />
                袋{playerStats.hasBag ? '○' : '×'}
              </div>
            </div>

            {/* Simulated Room Viewport - Height reduced to prevent page scroll */}
            <div
              className="relative w-full h-[190px] md:h-[240px] bg-slate-950/90 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-inner flex items-end justify-center"
              style={{
                // Shaking effect based on time left (simulates earthquake vibration)
                transform: timeLeft > 0 ? `translate(${(Math.random() - 0.5) * 4}px, ${(Math.random() - 0.5) * 4}px)` : 'none',
              }}
              id="earthquake-physics-viewport"
            >
              {/* Floor / Grid lines */}
              <div className="absolute inset-x-0 bottom-0 h-[4px] bg-red-500/20" />
              
              {/* Floating Effects */}
              {activeEffects.map((effect) => (
                <div
                  key={effect.id}
                  className={`absolute ${effect.color} text-xs pointer-events-none animate-bounce z-20`}
                  style={{
                    left: `${effect.x}%`,
                    top: `${effect.y}%`,
                    transform: 'translateX(-50%)',
                  }}
                  id={`effect-${effect.id}`}
                >
                  {effect.text}
                </div>
              ))}

              {/* Warning lines (Trajectory prediction indicators for high skill game) */}
              {items.map((item) => {
                const isDebris = item.type.startsWith('DEBRIS');
                const isNearFloor = item.y < 85;
                if (!isNearFloor) return null;
                return (
                  <div
                    key={`warn-${item.id}`}
                    className="absolute bottom-0 h-full pointer-events-none transition-opacity duration-300"
                    style={{
                      left: `${item.x}%`,
                      width: `${item.width * 5}px`,
                      transform: 'translateX(-50%)',
                      background: isDebris
                        ? 'linear-gradient(to top, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0) 100%)'
                        : 'linear-gradient(to top, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0) 100%)',
                    }}
                  />
                );
              })}

              {/* Falling items */}
              {items.map((item) => {
                const isDebris = item.type.startsWith('DEBRIS');
                return (
                  <div
                    key={item.id}
                    className={`absolute rounded-xl px-2 py-1 flex flex-col items-center justify-center border text-[10px] font-bold shadow-md transition-all z-10`}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      width: `${item.width * 5}px`,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: isDebris ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      borderColor: isDebris ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                      color: isDebris ? '#f87171' : '#34d399',
                    }}
                    id={`falling-item-${item.id}`}
                  >
                    {item.type === 'DEBRIS_GLASS' && <span>⚠️ 硝子</span>}
                    {item.type === 'DEBRIS_BOOK' && <span>📚 本</span>}
                    {item.type === 'DEBRIS_SHELF' && <span>🗄️ 家具</span>}
                    {item.type === 'ITEM_HELMET' && <span>🪖 兜</span>}
                    {item.type === 'ITEM_SHOES' && <span>👟 靴</span>}
                    {item.type === 'ITEM_BAG' && <span>🎒 非常袋</span>}
                    <span className="text-[7px] opacity-75">{item.label}</span>
                  </div>
                );
              })}

              {/* Player Avatar */}
              <div
                className="absolute bottom-2 transition-all duration-75 flex flex-col items-center"
                style={{
                  left: `${playerPosition}%`,
                  transform: 'translateX(-50%)',
                }}
                id="player-avatar-eq"
              >
                {/* Visual Helmet if equipped */}
                {playerStats.hasHelmet && (
                  <span className="text-base animate-bounce">🪖</span>
                )}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg transition-colors ${
                  playerStats.hasHelmet ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-slate-800 border-slate-600 text-slate-300'
                }`}>
                  🚶
                </div>
                <div className="mt-1 bg-slate-900/80 border border-slate-700/50 rounded-md px-1.5 py-0.5 text-[8px] font-bold text-slate-300 whitespace-nowrap">
                  あなた (左右キー)
                </div>
              </div>
            </div>

            {/* Mobile / Screen controller buttons */}
            <div className="grid grid-cols-2 gap-4" id="eq-controls-touch">
              <button
                onMouseDown={() => setPlayerPosition((prev) => Math.max(5, prev - 12))}
                onTouchStart={() => setPlayerPosition((prev) => Math.max(5, prev - 12))}
                className="py-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl border border-slate-700 font-bold text-sm text-slate-300 select-none cursor-pointer"
                id="btn-move-left"
              >
                ◀ 左に移動
              </button>
              <button
                onMouseDown={() => setPlayerPosition((prev) => Math.min(95, prev + 12))}
                onTouchStart={() => setPlayerPosition((prev) => Math.min(95, prev + 12))}
                className="py-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl border border-slate-700 font-bold text-sm text-slate-300 select-none cursor-pointer"
                id="btn-move-right"
              >
                右に移動 ▶
              </button>
            </div>
          </motion.div>
        )}

        {/* Temporary lull Quiz view */}
        {phase === 'QUIZ' && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border-2 border-orange-500/70 rounded-2xl p-4 md:p-5 shadow-2xl shadow-orange-500/10 w-full max-w-xl mx-auto"
            id="eq-quiz-card"
          >
            {/* Realtime Escape Timer */}
            <div className="w-full py-1.5 px-3 bg-red-950/40 border border-red-500/30 rounded-xl text-center flex items-center justify-between gap-3 mb-3 animate-pulse" id="eq-quiz-escape-timer">
              <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-black text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                🚨 避難制限（回答中もタイマーは減少します）
              </span>
              <span className={`font-mono text-lg md:text-xl font-black ${escapeTimeLeft <= 5 ? 'text-red-500 scale-110' : 'text-orange-400'}`}>
                {escapeTimeLeft.toFixed(1)} 秒
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-bold mb-2.5" id="quiz-badge">
              <Flame className="w-3 h-3" />
              急を要する状況判断！
            </div>

            <h3 className="text-sm md:text-base font-bold text-white mb-1.5 leading-snug" id="quiz-question">
              揺れが少し収まりました。まず最初に取るべき行動はどれでしょう？
            </h3>
            <p className="text-[10px] text-slate-400 mb-3">※正しく迅速な行動は、命を守り避難成功率を大きく上げます。</p>

            <div className="space-y-2.5" id="quiz-options">
              {/* Option 1 */}
              <button
                disabled={quizAnswered}
                onClick={() => handleQuizAnswer(true, 0)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                  selectedOption === 0
                    ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/5'
                    : quizAnswered
                    ? 'opacity-40 border-slate-800 text-slate-500'
                    : 'bg-slate-950 border-slate-800 hover:border-orange-500/50 hover:bg-slate-900 text-slate-300'
                }`}
                id="quiz-opt-0"
              >
                <div className="flex justify-between items-center gap-2">
                  <span>👟 靴（スリッパ）を履き、ドアを開けて避難経路を確保した上で、火元を確認する。</span>
                  {selectedOption === 0 && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 shrink-0"><ShieldCheck className="w-4 h-4" />正解！</span>}
                  {quizAnswered && selectedOption !== 0 && <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 shrink-0"><ShieldCheck className="w-4 h-4" />推奨行動</span>}
                </div>
              </button>

              {/* Option 2 */}
              <button
                disabled={quizAnswered}
                onClick={() => handleQuizAnswer(false, 1)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                  selectedOption === 1
                    ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                    : quizAnswered && selectedOption === 0
                    ? 'opacity-40 border-slate-800 text-slate-500'
                    : quizAnswered
                    ? 'border-slate-800 text-slate-500 opacity-40'
                    : 'bg-slate-950 border-slate-800 hover:border-orange-500/50 hover:bg-slate-900 text-slate-300'
                }`}
                id="quiz-opt-1"
              >
                <div className="flex justify-between items-center gap-2">
                  <span>🏢 揺れが収まったので、すぐにエレベーターを使って1階に逃げ去る。</span>
                  {selectedOption === 1 && <span className="text-xs text-red-400 font-bold shrink-0">不正解 (閉じ込めの危険)</span>}
                </div>
              </button>

              {/* Option 3 */}
              <button
                disabled={quizAnswered}
                onClick={() => handleQuizAnswer(false, 2)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                  selectedOption === 2
                    ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                    : quizAnswered && selectedOption === 0
                    ? 'opacity-40 border-slate-800 text-slate-500'
                    : quizAnswered
                    ? 'border-slate-800 text-slate-500 opacity-40'
                    : 'bg-slate-950 border-slate-800 hover:border-orange-500/50 hover:bg-slate-900 text-slate-300'
                }`}
                id="quiz-opt-2"
              >
                <div className="flex justify-between items-center gap-2">
                  <span>🔥 最優先で火災を防ぐため、激しい揺れの最中に大急ぎで台所のコンロの火を消しに行く。</span>
                  {selectedOption === 2 && <span className="text-xs text-red-400 font-bold shrink-0">不正解 (怪我・転倒のリスク)</span>}
                </div>
              </button>

              {/* Option 4 */}
              <button
                disabled={quizAnswered}
                onClick={() => handleQuizAnswer(false, 3)}
                className={`w-full text-left p-3.5 rounded-xl border text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                  selectedOption === 3
                    ? 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5'
                    : quizAnswered && selectedOption === 0
                    ? 'opacity-40 border-slate-800 text-slate-500'
                    : quizAnswered
                    ? 'border-slate-800 text-slate-500 opacity-40'
                    : 'bg-slate-950 border-slate-800 hover:border-orange-500/50 hover:bg-slate-900 text-slate-300'
                }`}
                id="quiz-opt-3"
              >
                <div className="flex justify-between items-center gap-2">
                  <span>📱 家族や友人に安否を伝えるため、部屋の中に留まってSNSの投稿や通話を続ける。</span>
                  {selectedOption === 3 && <span className="text-xs text-red-400 font-bold shrink-0">不正解 (避難遅れ・危険)</span>}
                </div>
              </button>
            </div>

            {quizAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10.5px] text-slate-400 leading-normal"
                id="quiz-feedback"
              >
                <strong className="text-white block mb-0.5 text-xs">💡 解説:</strong>
                地震直後の室内は割れた破片等が多く靴が必要です。
                まずは<strong className="text-emerald-400">足元を靴で保護する</strong>ことが鉄則。余震に備えてドアを開け避難経路を確保します。
                エレベーターは停電閉じ込めの危険があるため絶対に使用禁止です。
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Phase Outro / Transition View */}
        {phase === 'OUTRO' && (
          <motion.div
            key="outro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 md:p-8 text-center shadow-xl shadow-emerald-500/5"
            id="eq-outro-card"
          >
            {playerStats.health > 0 ? (
              <div id="eq-success-outro">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-6" id="success-badge">
                  <ShieldCheck className="w-9 h-9" />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4" id="eq-success-title">
                  地震を生き延びました！
                </h2>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6" id="eq-success-desc">
                  揺れが完全に収まり、安全を確保しました。<br />
                  しかし、海の近くで大地震が起きたため、<strong className="text-red-400">大津波警報</strong>が発令されました！<br />
                  今すぐ海岸付近から離れ、少しでも標高の高い高台や避難タワーを目指して逃げなければなりません。
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left mb-6" id="eq-inventory">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2 tracking-wider">避難フェーズに引き継ぐアイテム:</span>
                  <div className="grid grid-cols-3 gap-2 text-center" id="inventory-grid">
                    <div className={`p-2 rounded-lg text-xs border ${playerStats.hasHelmet ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-slate-950 text-slate-600 border-slate-900'}`}>
                      🪖 ヘルメット
                    </div>
                    <div className={`p-2 rounded-lg text-xs border ${playerStats.hasShoes ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold' : 'bg-slate-950 text-slate-600 border-slate-900'}`}>
                      👟 避難靴
                    </div>
                    <div className={`p-2 rounded-lg text-xs border ${playerStats.hasBag ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-slate-950 text-slate-600 border-slate-900'}`}>
                      🎒 非常袋
                    </div>
                  </div>
                  {!playerStats.hasShoes && (
                    <p className="text-[10px] text-red-400 mt-2 font-semibold">
                      ⚠️ 注意：避難用の靴を拾えなかったため、足元の瓦礫で怪我をしやすくなり、津波避難時の移動速度が少し下がります。
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onNextPhase('TSUNAMI_INTRO')}
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 font-bold text-white transition-all duration-200 cursor-pointer text-sm tracking-wider flex items-center justify-center gap-2"
                  id="btn-goto-tsunami"
                >
                  津波避難フェーズへ進む
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div id="eq-failure-outro">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 mx-auto mb-6" id="fail-badge">
                  <AlertOctagon className="w-9 h-9" />
                </div>
                
                <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4" id="eq-fail-title">
                  避難失敗
                </h2>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6" id="eq-fail-desc">
                  落下物の直撃、または家具の転倒の下敷きになり、深刻なダメージを負ってしまいました。<br />
                  地震が起きたら、まず<strong className="text-amber-400">「頭部を最優先で守る」「重い家具から距離を置く」</strong>を徹底してください。
                </p>

                <button
                  onClick={() => onNextPhase('RESULT')}
                  className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 transition-all duration-200 cursor-pointer text-sm tracking-wider"
                  id="btn-see-results-fail"
                >
                  結果シートを見る
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
