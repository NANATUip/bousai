export type GamePhase = 'TITLE' | 'EARTHQUAKE_INTRO' | 'EARTHQUAKE' | 'TSUNAMI_INTRO' | 'TSUNAMI' | 'RESULT';
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

export interface TsunamiDecisionResult {
  title: string;
  question: string;
  selectedText: string;
  resultType: 'correct' | 'semi' | 'incorrect';
  badge: string;
  desc: string;
  explanation: string;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  score: number;
  hasHelmet: boolean;
  hasShoes: boolean;
  hasBag: boolean;
  earthquakeQuizCorrect: boolean | null;
  tsunamiDecisions: {
    carVsFoot: 'car' | 'foot' | null;
    blockWall: 'wide' | 'narrow' | null;
    routeSelection: 'cliff' | 'safe' | null;
    stairsVsElevator: 'stairs' | 'elevator' | null;
    carResult?: TsunamiDecisionResult | null;
    blockWallResult?: TsunamiDecisionResult | null;
    routeResult?: TsunamiDecisionResult | null;
    stairsResult?: TsunamiDecisionResult | null;
  };
  preparedItems: string[];
  survivalResult: 'SURVIVED' | 'INJURED_SURVIVED' | 'FAILED_TSUNAMI' | 'FAILED_EARTHQUAKE';
  difficulty: Difficulty;
}

export interface FallingItem {
  id: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  speed: number;
  type: 'DEBRIS_GLASS' | 'DEBRIS_BOOK' | 'DEBRIS_SHELF' | 'ITEM_HELMET' | 'ITEM_SHOES' | 'ITEM_BAG';
  width: number;
  label: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: {
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}
