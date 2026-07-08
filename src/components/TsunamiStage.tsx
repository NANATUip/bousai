import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Flame, Shield, ArrowRight, Zap, RefreshCw, Footprints, Skull, Compass, Building, HelpCircle, ShieldCheck } from 'lucide-react';
import { GamePhase, PlayerStats } from '../types';

interface TsunamiQuizOption {
  text: string;
  score: number; // 200 for correct, 100 for semi, 0 for incorrect
  healthPenalty: number;
  tsunamiAdvance: number; // tsunami approaches by how many meters
  resultType: 'correct' | 'semi' | 'incorrect';
  badge: string;
  desc: string; // inline result message
}

interface TsunamiQuiz {
  type: 'CAR' | 'BLOCK_WALL' | 'ROUTE' | 'STAIRS';
  title: string;
  question: string;
  tip: string;
  options: TsunamiQuizOption[];
  explanation: string;
}

const CAR_QUIZ_POOL: TsunamiQuiz[] = [
  {
    type: 'CAR',
    title: '選択地点：300m付近（避難手段の選択）',
    question: '大通りに出ました。周囲では多くの人が車で避難を開始し、道路が大渋滞し始めています。あなたはどう避難しますか？',
    tip: '※道路事情と津波避難の本質を見極めてください。',
    options: [
      {
        text: '🚶 このまま徒歩で、渋滞を避けて高台への避難経路を全力で走る。',
        score: 200,
        healthPenalty: 0,
        tsunamiAdvance: 0,
        resultType: 'correct',
        badge: '✨ 大正解',
        desc: '安全な徒歩での避難を維持！'
      },
      {
        text: '🏃 安全な高台がある方向に向けて、裏道の狭い坂道を徒歩で駆け上がる。',
        score: 100,
        healthPenalty: 5,
        tsunamiAdvance: 50,
        resultType: 'semi',
        badge: '👍 準正解',
        desc: '徒歩優先ですが、裏道の余震リスクにより軽微なダメージ'
      },
      {
        text: '🚗 走るのは疲れるので、近くに放置された車に乗り込み、車で逃げる。',
        score: 0,
        healthPenalty: 15,
        tsunamiAdvance: 150,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '大渋滞で立ち往生！津波が急速に接近します'
      },
      {
        text: '🚲 徒歩より速いので、近くに置いてある放置自転車を使って逃げる。',
        score: 0,
        healthPenalty: 10,
        tsunamiAdvance: 100,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '余震の瓦礫でパンク・転倒し、スピードが大幅低下'
      }
    ],
    explanation: '東日本大震災でも多くの人が車で避難しようとしたため致命的な渋滞が発生し、多くの車が津波に巻き込まれました。津波避難は原則「徒歩」が鉄則です。自転車は瓦礫や余震による道路の割れで転倒する危険が高いため、極力避けるべきです。'
  },
  {
    type: 'CAR',
    title: '選択地点：300m付近（警報直後の行動）',
    question: '海岸近くで激しい揺れが収まりました。大津波警報のサイレンが鳴り響いています。まず取るべき行動は何ですか？',
    tip: '※津波到達までの時間は限られています。初動の優先順位を考えてください。',
    options: [
      {
        text: '🚶 すぐに荷物を最小限にし、一番近い高台の避難場所に向けて徒歩で走り出す。',
        score: 200,
        healthPenalty: 0,
        tsunamiAdvance: 0,
        resultType: 'correct',
        badge: '✨ 大正解',
        desc: '迅速な初期避難！最も安全な選択です'
      },
      {
        text: '🏃 近所の足の悪い高齢者に大声で避難を呼びかけながら、一緒に高台へ徒歩避難する。',
        score: 100,
        healthPenalty: 0,
        tsunamiAdvance: 60,
        resultType: 'semi',
        badge: '👍 準正解',
        desc: '共助は素晴らしいですが、津波の接近を許します'
      },
      {
        text: '🌊 津波がどのくらいの高さか、あるいは本当に来るのか確認するために一度海岸の方を見る。',
        score: 0,
        healthPenalty: 25,
        tsunamiAdvance: 200,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '津波を見てからでは手遅れです。津波は一瞬で到達します'
      },
      {
        text: '🎒 自宅に戻って、大切なアルバムや貴重品、より多くの防災グッズを袋に詰めてから逃げる。',
        score: 0,
        healthPenalty: 20,
        tsunamiAdvance: 180,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '引き返すことで逃げ遅れる最大の間違い。命を最優先に！'
      }
    ],
    explanation: '大地震の揺れが収まったら、津波警報が鳴る前であってもすぐに高台へ逃げ始める必要があります。津波を見てから逃げる、貴重品を取りに戻るなどは、いずれも逃げ遅れて命を落とす危険が非常に高いNG行動です。'
  }
];

const BLOCK_WALL_QUIZ_POOL: TsunamiQuiz[] = [
  {
    type: 'BLOCK_WALL',
    title: '選択地点：450m付近（住宅街の危険回避）',
    question: '住宅街に入りました。余震により、周囲の古いコンクリートブロック塀や自動販売機が崩れかけています。どちらのルートを進みますか？',
    tip: '※地震直後の密集市街地や住宅街に潜むブロック塀倒壊のリスクを考慮してください。',
    options: [
      {
        text: '🚶 近道ではないが、古い塀を避けて道幅の広い安全な大通りを走る。',
        score: 200,
        healthPenalty: 0,
        tsunamiAdvance: 0,
        resultType: 'correct',
        badge: '✨ 大正解',
        desc: '多少遠回りでも、倒壊リスクを完全に回避！'
      },
      {
        text: '🏃 近くの新しい鉄筋建物の影に一度隠れて、安全を確認してから大通りを進む。',
        score: 100,
        healthPenalty: 0,
        tsunamiAdvance: 70,
        resultType: 'semi',
        badge: '👍 準正解',
        desc: '安全確保を優先したため、少し津波の接近を許しました'
      },
      {
        text: '🧱 近道なので、古いコンクリートブロック塀や自動販売機のすぐ横をすり抜けて走る。',
        score: 0,
        healthPenalty: 20,
        tsunamiAdvance: 40,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '余震でブロック塀が倒壊！足元に破片が当たり怪我を負います'
      },
      {
        text: '🏬 古い木造家屋の軒下を、上空からの落下物除けとして頭を守りながら走り抜ける。',
        score: 0,
        healthPenalty: 25,
        tsunamiAdvance: 50,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '木造家屋全体が余震で崩落！大怪我を負ってしまいます'
      }
    ],
    explanation: '倒壊したブロック塀の下敷きになり命を落とす痛ましい事故は、過去の地震で何度も発生しています。古い塀や自販機は余震で崩れる恐れが非常に高いため、多少遠回りでも「道幅の広い開けた道路の中央」を避難ルートに選ぶのが鉄則です。'
  },
  {
    type: 'BLOCK_WALL',
    title: '選択地点：450m付近（火災と煙の発生）',
    question: '住宅街の避難経路のすぐ先にある古い木造住宅から火災が発生し、煙が立ち込めて道路を塞ぎ始めています。どう行動しますか？',
    tip: '※大地震後に発生する市街地火災と煙の有毒性に注意してください。',
    options: [
      {
        text: '🚶 煙を吸わないよう濡れたハンカチ等で口元を覆い、風上側の広い道路に迂回する。',
        score: 200,
        healthPenalty: 0,
        tsunamiAdvance: 0,
        resultType: 'correct',
        badge: '✨ 大正解',
        desc: '風上へ避難して有害な煙を完璧に回避！'
      },
      {
        text: '🏃 煙の薄い位置を姿勢を低くして見極め、火から少し離れた路地を早足で迂回する。',
        score: 100,
        healthPenalty: 5,
        tsunamiAdvance: 60,
        resultType: 'semi',
        badge: '👍 準正解',
        desc: '路地が狭いため若干煙を吸い、軽い息苦しさと遅れが発生'
      },
      {
        text: '🔥 火の勢いがまだ小さいうちに、煙が充満する元の最短ルートを息を止めて一気に走る。',
        score: 0,
        healthPenalty: 35,
        tsunamiAdvance: 30,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '煙に含まれる一酸化炭素を吸い、一時的な酸素欠乏で大ダメージ'
      },
      {
        text: '🧯 近くにある街頭消火器を探し、避難を一時中断して一人で初期消火活動を行う。',
        score: 0,
        healthPenalty: 30,
        tsunamiAdvance: 150,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '津波が目前に迫る状況での消火は逃げ遅れに直結します'
      }
    ],
    explanation: '大地震後の避難では、大規模火災による煙が道路を塞ぐことが多々あります。煙の有毒ガス（一酸化炭素など）は数吸っただけで意識を失うため、必ず煙を避けて風上へ迂回してください。また、背後から津波が来ている状況での消火は致命的な遅れを招くため避けるべきです。'
  }
];

const ROUTE_QUIZ_POOL: TsunamiQuiz[] = [
  {
    type: 'ROUTE',
    title: '選択地点：600m付近（避難ルートの選択）',
    question: '分かれ道に来ました。左側は近道ですが「崖沿い・土砂崩れ注意」の看板があります。右側は少し遠回りになりますが、平坦で広い通りです。どちらに進みますか？',
    tip: '※大地震直後の斜面や崖の付近に潜む二次災害のリスクを考慮してください。',
    options: [
      {
        text: '🚶 遠回りでも、土砂崩れ等の崩落二次災害に遭わない安全な平坦道路を進む。',
        score: 200,
        healthPenalty: 0,
        tsunamiAdvance: 0,
        resultType: 'correct',
        badge: '✨ 大正解',
        desc: '土砂崩れを完全に回避し、最も安全に進みます'
      },
      {
        text: '🏃 崖からできるだけ離れた端を走り、上を警戒しながら崖沿いの近道を進む。',
        score: 100,
        healthPenalty: 15,
        tsunamiAdvance: 30,
        resultType: 'semi',
        badge: '👍 準正解',
        desc: '警戒していましたが、小規模な落石を受け、軽微なダメージ'
      },
      {
        text: '⛰️ 津波から1秒でも早く遠ざかるため、土砂崩れ注意の斜面下近道を全速力で走る。',
        score: 0,
        healthPenalty: 35,
        tsunamiAdvance: 50,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '突発的な土砂崩れが発生！巻き込まれて大きな怪我を負います'
      },
      {
        text: '🌲 崖崩れが起きたら木に掴まれば助かると思い、林の中の未舗装ショートカットを登る。',
        score: 0,
        healthPenalty: 40,
        tsunamiAdvance: 120,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '斜面崩落と滑落の危険！救助を待つことになり大きく遅れます'
      }
    ],
    explanation: '大地震の直後は、雨が降っていなくても地盤が著しく緩んでおり、崖崩れや落石が極めて発生しやすくなっています。いくら津波から早く逃げたくても、二次災害で命を落っては意味がありません。崖や急斜面の近くを走るルートは絶対に避けましょう。'
  },
  {
    type: 'ROUTE',
    title: '選択地点：600m付近（河川・橋ルートの選択）',
    question: '高台へ向かうルートの分岐です。左は「川沿いを通る橋ルート（近道）」、右は「川から離れて内陸を大きく迂回するルート（遠回り）」です。どちらに進みますか？',
    tip: '※津波が川を遡上（そじょう）するスピードや威力について考えてください。',
    options: [
      {
        text: '🚶 川沿いは津波が遡上して氾濫しやすいため、川から大きく離れた内陸の安全な迂回ルートを選ぶ。',
        score: 200,
        healthPenalty: 0,
        tsunamiAdvance: 0,
        resultType: 'correct',
        badge: '✨ 大正解',
        desc: '川からの遡上津波リスクを完璧に回避！'
      },
      {
        text: '🏃 川沿いの橋を渡るが、川の様子を一切見ずに、全速力で橋を一瞬で渡りきる。',
        score: 100,
        healthPenalty: 10,
        tsunamiAdvance: 40,
        resultType: 'semi',
        badge: '👍 準正解',
        desc: '渡りきりましたが、川の氾濫による水しぶきとパニックで遅れが発生'
      },
      {
        text: '🌊 川を遡上してくる津波の迫力を、橋の上から一度目視で確認して、来そうなら引き返す。',
        score: 0,
        healthPenalty: 35,
        tsunamiAdvance: 120,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '津波の遡上は時速40km以上！目視してからでは絶対に逃げられません'
      },
      {
        text: '🛶 橋が多少混雑しているので、川岸に置いてあるボートや小舟を使って対岸へ渡る。',
        score: 0,
        healthPenalty: 45,
        tsunamiAdvance: 160,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '遡上してきた巨大な引き波・押し波の濁流にボートごと瞬時に流されます'
      }
    ],
    explanation: '津波は、海から陸地へ押し寄せるだけでなく、河川を凄まじいスピード（時速数十km）で遡上し、一瞬で氾濫させます。津波の河川遡上は海上の波よりも遥かに速いため、避難時に川の近くを通ること、橋の上で様子を見ることは絶対に行ってはならない最危険行動です。'
  }
];

const STAIRS_QUIZ_POOL: TsunamiQuiz[] = [
  {
    type: 'STAIRS',
    title: '選択地点：820m付近（緊急の垂直避難）',
    question: '足元まで海水がうっすらと迫ってきました！安全な高台まではまだ180mあります。目の前には頑丈な10階建ての鉄筋コンクリートビルがあります。どうしますか？',
    tip: '※津波が到達しかけているときの「垂直避難」の正しい手段を選んでください。',
    options: [
      {
        text: '🚶 ビルに駆け込み、非常階段を使って3階以上（できれば最上階近く）に逃げる。',
        score: 200,
        healthPenalty: 0,
        tsunamiAdvance: 0,
        resultType: 'correct',
        badge: '✨ 大正解',
        desc: '完璧な垂直避難！命を守る英断です'
      },
      {
        text: '🏃 ビルの外壁非常階段を上りつつ、周囲に「急いで上に逃げて！」と声を掛けながら階段を駆け上がる。',
        score: 100,
        healthPenalty: 0,
        tsunamiAdvance: 40,
        resultType: 'semi',
        badge: '👍 準正解',
        desc: '共助の呼びかけにより、自分が登る時間が少し遅れました'
      },
      {
        text: '🏢 急いで最上階に行きたいため、エントランスで動いているエレベーターに乗り込む。',
        score: 0,
        healthPenalty: 45,
        tsunamiAdvance: 100,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '停電によりエレベーター内に閉じ込められ、致命的な水没の罠に遭います'
      },
      {
        text: '🚶 まだ高台まで走れると信じて、足元に水が押し寄せている大通りをそのまま直進して走る。',
        score: 0,
        healthPenalty: 50,
        tsunamiAdvance: 150,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '水深が数10cmであっても、強烈な津波の流れに人は立ち上がれず、流されます'
      }
    ],
    explanation: '高台避難が間に合わないと判断した場合、頑丈な中高層ビルなどへ移動する「垂直避難」が有効です。ただし、エレベーターは津波の浸水や余震による停電で閉じ込められる可能性が非常に高く、極めて危険です。どれほど急いでいても、必ず非常階段を使ってください。'
  },
  {
    type: 'STAIRS',
    title: '選択地点：820m付近（避難先ビルの選定）',
    question: '津波が背後に迫り、緊急垂直避難する必要があります。目の前にいくつかの建物があります。どれに逃げ込みますか？',
    tip: '※津波の破壊力と、垂直避難先としてふさわしい建物の構造を考えてください。',
    options: [
      {
        text: '🚶 「津波避難ビル」の指定マークがある、頑丈な鉄筋コンクリート造の4階建て小学校に入る。',
        score: 200,
        healthPenalty: 0,
        tsunamiAdvance: 0,
        resultType: 'correct',
        badge: '✨ 大正解',
        desc: '最も信頼できる津波避難指定ビルに垂直避難！'
      },
      {
        text: '🏃 新しく建てられた、外観が非常に頑丈そうな3階建てのガラス張りオフィスビルに入る。',
        score: 100,
        healthPenalty: 10,
        tsunamiAdvance: 40,
        resultType: 'semi',
        badge: '👍 準正解',
        desc: '鉄筋ビルですが、津波の直撃で低層のガラスが割れ、怪我と浸水のリスクが生じます'
      },
      {
        text: '🪵 すぐ隣にある、伝統的で歴史のある頑丈な太い木柱で作られた2階建ての寺院に入る。',
        score: 0,
        healthPenalty: 40,
        tsunamiAdvance: 80,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '木造建物は、どれほど頑丈であっても津波の強大な圧力で根元から破壊・流失します'
      },
      {
        text: '🚗 駐車場に停まっている大型キャンピングカーに逃げ込み、密閉して水に浮くのを期待する。',
        score: 0,
        healthPenalty: 50,
        tsunamiAdvance: 150,
        resultType: 'incorrect',
        badge: '❌ 不正解',
        desc: '車両は津波の濁流でゴミのように押し流され、他の障害物に激突して粉砕します'
      }
    ],
    explanation: '津波の破壊力は凄まじく、一般的な木造家屋は一瞬で全壊・流失します。垂直避難の先には「鉄筋コンクリート（RC）造」または「鉄骨鉄筋コンクリート（SRC）造」の頑丈な建物を選択してください。また自治体が指定する「津波避難ビル」のマークがある場所が最も安全です。'
  }
];

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

  // ランダムに選ばれたクイズを保持する状態
  const [selectedQuizzes, setSelectedQuizzes] = useState<{
    CAR: TsunamiQuiz;
    BLOCK_WALL: TsunamiQuiz;
    ROUTE: TsunamiQuiz;
    STAIRS: TsunamiQuiz;
  } | null>(null);

  // References to keep state available in loops
  const playerDistanceRef = useRef<number>(0);
  const tsunamiDistanceRef = useRef<number>(-200);
  const gameIntervalRef = useRef<any>(null);

  // Create a ref for playerStats to avoid closure issues with outdated states
  const playerStatsRef = useRef<PlayerStats>(playerStats);

  useEffect(() => {
    playerStatsRef.current = playerStats;
  }, [playerStats]);

  useEffect(() => {
    // クイズプールから各タイプ1つずつランダムに選択し、選択肢をシャッフルする
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const selectRandomAndShuffle = (pool: TsunamiQuiz[]): TsunamiQuiz => {
      const quiz = pool[Math.floor(Math.random() * pool.length)];
      return {
        ...quiz,
        options: shuffleArray(quiz.options)
      };
    };

    setSelectedQuizzes({
      CAR: selectRandomAndShuffle(CAR_QUIZ_POOL),
      BLOCK_WALL: selectRandomAndShuffle(BLOCK_WALL_QUIZ_POOL),
      ROUTE: selectRandomAndShuffle(ROUTE_QUIZ_POOL),
      STAIRS: selectRandomAndShuffle(STAIRS_QUIZ_POOL),
    });
  }, []);

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
    
    const diff = playerStatsRef.current.difficulty;
    // Hard has slightly more breathing room (-180m) to allow player's skill to shine
    const startTsuDist = diff === 'EASY' ? -350 : diff === 'HARD' ? -180 : -250;
    setTsunamiDistance(startTsuDist);
    setStamina(100);

    // Speed multiplier based on shoes from Phase 1
    const speedPenalty = playerStatsRef.current.hasShoes ? 1.0 : 0.65; // No shoes = much slower!
    const blockPenalty = playerStatsRef.current.tsunamiDecisions.blockWall === 'narrow' ? 0.75 : 1.0;

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
      if (currentPl < 300 && nextPl >= 300 && !playerStatsRef.current.tsunamiDecisions.carVsFoot) {
        triggerDecision('CAR');
        return;
      } else if (currentPl < 450 && nextPl >= 450 && !playerStatsRef.current.tsunamiDecisions.blockWall) {
        triggerDecision('BLOCK_WALL');
        return;
      } else if (currentPl < 600 && nextPl >= 600 && !playerStatsRef.current.tsunamiDecisions.routeSelection) {
        triggerDecision('ROUTE');
        return;
      } else if (currentPl < 820 && nextPl >= 820 && !playerStatsRef.current.tsunamiDecisions.stairsVsElevator) {
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
  const handleDecisionSubmit = (optionIndex: number, option: TsunamiQuizOption) => {
    setSelectedOption(optionIndex);
    setDecisionAnswered(true);

    const isCorrect = option.resultType === 'correct';

    let nextHealth = playerStatsRef.current.health;
    let nextScore = playerStatsRef.current.score + option.score;
    const updatedDecisions = { ...playerStatsRef.current.tsunamiDecisions };

    const diff = playerStatsRef.current.difficulty;
    const penaltyMultiplier = diff === 'EASY' ? 0.6 : diff === 'HARD' ? 1.25 : 1.0;

    // Apply penalties based on selected option from active quiz
    if (option.healthPenalty > 0) {
      nextHealth = Math.max(10, nextHealth - Math.round(option.healthPenalty * penaltyMultiplier));
    }
    if (option.tsunamiAdvance > 0) {
      setTsunamiDistance((prev) => prev + Math.round(option.tsunamiAdvance * penaltyMultiplier));
    }

    const currentQuiz = selectedQuizzes?.[activeDecision];
    if (currentQuiz) {
      const decisionResult = {
        title: currentQuiz.title,
        question: currentQuiz.question,
        selectedText: option.text,
        resultType: option.resultType,
        badge: option.badge,
        desc: option.desc,
        explanation: currentQuiz.explanation,
      };

      if (activeDecision === 'CAR') {
        updatedDecisions.carVsFoot = isCorrect ? 'foot' : 'car';
        updatedDecisions.carResult = decisionResult;
      } else if (activeDecision === 'BLOCK_WALL') {
        updatedDecisions.blockWall = isCorrect ? 'wide' : 'narrow';
        updatedDecisions.blockWallResult = decisionResult;
      } else if (activeDecision === 'ROUTE') {
        updatedDecisions.routeSelection = isCorrect ? 'safe' : 'cliff';
        updatedDecisions.routeResult = decisionResult;
      } else if (activeDecision === 'STAIRS') {
        updatedDecisions.stairsVsElevator = isCorrect ? 'stairs' : 'elevator';
        updatedDecisions.stairsResult = decisionResult;
        if (!isCorrect) {
          nextHealth = 0; // Elevator or staying outside in water is instantly critical when tsunami hits!
        }
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
    }, 4500); // 4.5 seconds for reading detailed explanation
  };

  const resumeTsunamiRun = () => {
    setPhase('PLAYING');
    setActiveDecision(null);

    // Speed multiplier based on shoes & choices
    const speedPenalty = playerStatsRef.current.hasShoes ? 1.0 : 0.65;
    const carPenalty = playerStatsRef.current.tsunamiDecisions.carVsFoot === 'car' ? 0.4 : 1.0; // Stuck in car!
    const blockPenalty = playerStatsRef.current.tsunamiDecisions.blockWall === 'narrow' ? 0.75 : 1.0; // Slowed by collapse!
    const routePenalty = playerStatsRef.current.tsunamiDecisions.routeSelection === 'cliff' ? 0.7 : 1.0; // Injured from landslide!

    const diff = playerStatsRef.current.difficulty;
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
      if (currentPl < 300 && nextPl >= 300 && !playerStatsRef.current.tsunamiDecisions.carVsFoot) {
        triggerDecision('CAR');
        return;
      } else if (currentPl < 450 && nextPl >= 450 && !playerStatsRef.current.tsunamiDecisions.blockWall) {
        triggerDecision('BLOCK_WALL');
        return;
      } else if (currentPl < 600 && nextPl >= 600 && !playerStatsRef.current.tsunamiDecisions.routeSelection) {
        triggerDecision('ROUTE');
        return;
      } else if (currentPl < 820 && nextPl >= 820 && !playerStatsRef.current.tsunamiDecisions.stairsVsElevator) {
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

    const speedPenalty = playerStatsRef.current.hasShoes ? 1.0 : 0.65;
    const carPenalty = playerStatsRef.current.tsunamiDecisions.carVsFoot === 'car' ? 0.3 : 1.0;
    const blockPenalty = playerStatsRef.current.tsunamiDecisions.blockWall === 'narrow' ? 0.75 : 1.0;
    const routePenalty = playerStatsRef.current.tsunamiDecisions.routeSelection === 'cliff' ? 0.65 : 1.0;

    const diff = playerStatsRef.current.difficulty;
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
        {(phase === 'PLAYING' || phase === 'DECISION') && (
          <motion.div
            key="gameplay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2 w-full max-w-xl mx-auto"
            id="ts-gameplay-container"
          >
            {/* Realtime Escape Timer is removed to make survival purely physical distance based */}

            {/* Status Header - Slimmed */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center" id="ts-status-grid">
              <div id="ts-dist-p">
                <span className="text-[8px] text-slate-400 block uppercase font-bold tracking-wider leading-none">避難まで</span>
                <span className="text-sm md:text-base font-mono font-extrabold text-white leading-tight block mt-0.5" id="ts-dist-p-val">
                  {Math.max(0, 1000 - Math.round(playerDistance))}m
                </span>
              </div>
              <div id="ts-meters-diff">
                <span className="text-[8px] text-red-400 block uppercase font-bold tracking-wider leading-none">津波との距離</span>
                <span className={`text-sm md:text-base font-mono font-extrabold leading-tight block mt-0.5 ${metersDifference < 100 ? 'text-red-500 animate-pulse' : 'text-amber-500'}`} id="ts-meters-diff-val">
                  {metersDifference}m
                </span>
              </div>
              <div id="ts-stamina" className="flex flex-col justify-center">
                <span className="text-[8px] text-emerald-400 block uppercase font-bold tracking-wider leading-none">スタミナ</span>
                <div className="w-16 mx-auto bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 flex mt-1" id="stamina-track">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75"
                    style={{ width: `${stamina}%` }}
                    id="stamina-fill"
                  />
                </div>
              </div>
            </div>

            {/* Run Track Visualizer - Height reduced to prevent page scroll */}
            <div className="relative bg-slate-950/90 h-32 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between p-2.5" id="ts-track-visual">
              {/* Top labels */}
              <div className="flex justify-between text-[8px] font-bold text-slate-500 border-b border-slate-900 pb-1 z-10" id="ts-track-labels">
                <span>🌊 0m</span>
                <span>🚧 300m</span>
                <span>🏘️ 450m</span>
                <span>🏔️ 600m</span>
                <span>🏥 820m</span>
                <span>🏔️ 避難所</span>
              </div>

              {/* Progress lanes */}
              <div className="relative h-14 w-full" id="ts-lanes">
                {/* Safe high ground Goal flag */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center" id="visual-goal">
                  <span className="text-xs">🏔️</span>
                  <span className="text-[6.5px] text-emerald-400 font-extrabold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded mt-0.5">高台</span>
                </div>

                {/* Evacuation building */}
                <div className="absolute right-[18%] top-1/2 -translate-y-1/2 flex flex-col items-center" id="visual-shelter">
                  <span className="text-xs">🏥</span>
                  <span className="text-[6.5px] text-blue-400 font-bold">ビル</span>
                </div>

                {/* Tsunami Progress Wave */}
                <div
                  className="absolute top-1.5 transition-all duration-300 flex flex-col items-end"
                  style={{
                    left: `${tsunamiPercent}%`,
                    transform: 'translateX(-100%)',
                  }}
                  id="visual-tsunami-wave"
                >
                  <div className="text-lg animate-pulse">🌊</div>
                </div>

                {/* Player Progress Character */}
                <div
                  className="absolute top-1.5 transition-all duration-300 flex flex-col items-center"
                  style={{
                    left: `${playerPercent}%`,
                    transform: 'translateX(-50%)',
                  }}
                  id="visual-player-char"
                >
                  <div className="text-lg animate-bounce">
                    {stamina < 15 ? '🥵' : playerStats.tsunamiDecisions.carVsFoot === 'car' ? '🚗' : '🏃'}
                  </div>
                  <div className="bg-slate-900 border border-slate-700/60 px-1 py-0.1 rounded text-[6.5px] font-bold text-slate-300 mt-0.5">
                    あなた ({Math.round(playerDistance)}m)
                  </div>
                </div>
              </div>

              {/* Bottom indicators */}
              <div className="flex justify-between items-center text-[8.5px] text-slate-400 border-t border-slate-900 pt-1 z-10" id="ts-track-footer">
                <span className="flex items-center gap-1">
                  {!playerStats.hasShoes && <span className="text-red-400 font-semibold">⚠️裸足 </span>}
                  {playerStats.tsunamiDecisions.carVsFoot === 'car' && <span className="text-amber-400 font-semibold">⚠️渋滞 </span>}
                  {playerStats.tsunamiDecisions.blockWall === 'narrow' && <span className="text-amber-400 font-semibold">⚠️塀 </span>}
                  {playerStats.tsunamiDecisions.routeSelection === 'cliff' && <span className="text-red-400 font-semibold">⚠️崩落 </span>}
                </span>
                <span className="font-semibold text-slate-500">津波：秒速30m</span>
              </div>
            </div>

            {/* Run Button - Py reduced */}
            <div className="flex flex-col items-center gap-1" id="ts-control-center">
              <button
                onClick={handleActiveRun}
                disabled={stamina < 8 || !!activeDecision}
                className={`w-full py-4.5 rounded-xl font-black text-base tracking-widest shadow-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  stamina < 8 || !!activeDecision
                    ? 'bg-slate-800 text-slate-600 border border-slate-700 pointer-events-none'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white shadow-blue-500/20 active:scale-95 border-b-2 border-indigo-800'
                }`}
                id="btn-active-run"
              >
                <span className="flex items-center gap-1.5 text-base font-black tracking-widest text-white leading-none">
                  <Flame className="w-4 h-4 animate-pulse" /> 走る！ (SPACE / W)
                </span>
              </button>

              <div className="text-[9.5px] text-slate-500" id="ts-control-tip">
                💡 スタミナが切れると走れません
              </div>
            </div>

            {/* Decision Modal */}
            {activeDecision && selectedQuizzes && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 md:p-4 shadow-xl shadow-amber-500/5 mt-2"
                id="ts-decision-card"
              >
                {(() => {
                  const currentQuiz = selectedQuizzes[activeDecision];
                  return (
                    <div id={`decision-${activeDecision.toLowerCase()}-view`}>
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold mb-2">
                        <Compass className="w-3 h-3" />
                        {currentQuiz.title}
                      </div>

                      <h3 className="text-sm font-bold text-white mb-1 leading-snug">
                        {currentQuiz.question}
                      </h3>
                      <p className="text-[10px] text-slate-400 mb-3">{currentQuiz.tip}</p>

                      <div className="space-y-2">
                        {currentQuiz.options.map((opt, idx) => {
                          const isSelected = selectedOption === idx;
                          let btnStyle = 'bg-slate-950 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 text-slate-300';
                          if (decisionAnswered) {
                            if (isSelected) {
                              if (opt.resultType === 'correct') {
                                btnStyle = 'bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/5';
                              } else if (opt.resultType === 'semi') {
                                btnStyle = 'bg-blue-500/20 border-blue-500 text-white font-bold shadow-lg shadow-blue-500/5';
                              } else {
                                btnStyle = 'bg-red-500/20 border-red-500 text-white font-bold shadow-lg shadow-red-500/5';
                              }
                            } else {
                              btnStyle = 'opacity-40 border-slate-800 text-slate-500';
                            }
                          }

                          return (
                            <button
                              key={idx}
                              disabled={decisionAnswered}
                              onClick={() => handleDecisionSubmit(idx, opt)}
                              className={`w-full text-left p-2.5 rounded-lg border text-[11px] md:text-xs transition-all duration-200 cursor-pointer ${btnStyle}`}
                              id={`dec-${activeDecision.toLowerCase()}-opt-${idx}`}
                            >
                              <div className="flex justify-between items-center gap-2">
                                <span className="leading-tight">{opt.text}</span>
                                {decisionAnswered && (
                                  <span className={`text-[10px] font-bold shrink-0 ${
                                    opt.resultType === 'correct' ? 'text-emerald-400' :
                                    opt.resultType === 'semi' ? 'text-blue-400' : 'text-red-400'
                                  }`}>
                                    {isSelected ? `${opt.badge} (${opt.desc})` : (opt.resultType === 'correct' ? '推奨行動' : '')}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {decisionAnswered && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10.5px] text-slate-400 leading-normal"
                        >
                          <strong className="text-white block mb-0.5 text-xs">💡 防災知識解説:</strong>
                          {currentQuiz.explanation}
                        </motion.div>
                      )}
                    </div>
                  );
                })()}
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
