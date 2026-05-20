export interface MacroEntry {
  protein?: number;
  carbs?: number;
  fat?: number;
  alcohol?: number;
  meal?: string;
  date?: string;
}

export interface WeightData {
  date: string;
  weight: number | null;
  unit: string;
}

export interface DiaryData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targets?: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
  exercise?: {
    caloriesBurned: number;
  } | null;
}

export interface CustomFoodEntry {
  name: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  calories?: number;
  log?: string | boolean;
}

export interface LogFoodEntry {
  name: string;
  meal?: string;
  servings?: number;
}

export interface AutomationClient {
  addQuickEntry(
    entry: MacroEntry,
    onStatus?: (msg: string) => void
  ): Promise<void>;
  getWeight(
    dates: string[],
    onStatus?: (msg: string) => void
  ): Promise<WeightData[]>;
  getDiary(
    dates: string[],
    onStatus?: (msg: string) => void,
    scrapeTargets?: boolean
  ): Promise<DiaryData[]>;
  addCustomFood(
    entry: CustomFoodEntry,
    onStatus?: (msg: string) => void
  ): Promise<void>;
  logFood(entry: LogFoodEntry, onStatus?: (msg: string) => void): Promise<void>;
}

export interface PlaywrightExecutionResponse<T = unknown> {
  success: boolean;
  error?: string;
  result?: T;
  stderr?: string;
}

export interface AutomationRuntime {
  liveViewUrl?: string | null;
  execute<T = unknown>(
    code: string,
    timeoutSec?: number
  ): Promise<PlaywrightExecutionResponse<T>>;
  close(): Promise<void>;
}

export type AutomationRuntimeFactory = (
  hasAutoCredentials: boolean
) => Promise<AutomationRuntime>;
