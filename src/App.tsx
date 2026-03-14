/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Check, Trash2, Info, ChevronLeft, Bot, User } from 'lucide-react';

// Game Constants
const COLORS = [
  { id: 'red', hex: '#EF4444', label: '红色' },
  { id: 'green', hex: '#10B981', label: '绿色' },
  { id: 'blue', hex: '#3B82F6', label: '蓝色' },
  { id: 'yellow', hex: '#F59E0B', label: '黄色' },
  { id: 'purple', hex: '#A855F7', label: '紫色' },
  { id: 'grey', hex: '#6B7280', label: '灰色' },
];

const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 8;

type GameMode = 'repeat' | 'no-repeat';
type Role = 'player' | 'ai' | 'coop';

interface Guess {
  colors: string[];
  redDots: number; // Correct color and position
  whiteDots: number; // Correct color, wrong position
}

// Helper: Calculate feedback for a guess against a secret
const getFeedback = (guess: string[], secret: string[]) => {
  let redDots = 0;
  let whiteDots = 0;
  const secretCopy = [...secret];
  const guessCopy = [...guess];

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      redDots++;
      secretCopy[i] = 'matched_secret';
      guessCopy[i] = 'matched_guess';
    }
  }

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === 'matched_guess') continue;
    const foundIndex = secretCopy.indexOf(guessCopy[i]);
    if (foundIndex !== -1) {
      whiteDots++;
      secretCopy[foundIndex] = 'matched_secret';
    }
  }
  return { redDots, whiteDots };
};

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<GameMode | null>(null);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [coopStep, setCoopStep] = useState<'guessing' | 'feedback'>('guessing');
  const [coopFirstTurn, setCoopFirstTurn] = useState<'player' | 'ai'>('player');
  
  // Player mode state
  const [secretCode, setSecretCode] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<(string | null)[]>([null, null, null, null]);
  const [history, setHistory] = useState<Guess[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  
  // AI mode state
  const [possibleCodes, setPossibleCodes] = useState<string[][]>([]);
  const [aiGuess, setAiGuess] = useState<string[] | null>(null);
  const [feedbackInput, setFeedbackInput] = useState<{ red: number; white: number }>({ red: 0, white: 0 });
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (feedbackError) setFeedbackError(null);
  }, [feedbackInput]);

  // Generate all possible codes
  const generateAllCodes = useCallback((gameMode: GameMode) => {
    const colorIds = COLORS.map(c => c.id);
    const results: string[][] = [];

    const backtrack = (current: string[]) => {
      if (current.length === CODE_LENGTH) {
        results.push([...current]);
        return;
      }
      for (const id of colorIds) {
        if (gameMode === 'no-repeat' && current.includes(id)) continue;
        current.push(id);
        backtrack(current);
        current.pop();
      }
    };

    backtrack([]);
    return results;
  }, []);

  const startGame = (selectedRole: Role, selectedMode: GameMode) => {
    setRole(selectedRole);
    setMode(selectedMode);
    setHistory([]);
    setGameState('playing');
    setTurn('player');
    setFeedbackError(null);

    if (selectedRole === 'player') {
      const code: string[] = [];
      const availableColors = [...COLORS.map(c => c.id)];
      for (let i = 0; i < CODE_LENGTH; i++) {
        if (selectedMode === 'no-repeat') {
          const randomIndex = Math.floor(Math.random() * availableColors.length);
          code.push(availableColors.splice(randomIndex, 1)[0]);
        } else {
          const randomIndex = Math.floor(Math.random() * COLORS.length);
          code.push(COLORS[randomIndex].id);
        }
      }
      setSecretCode(code);
      setCurrentGuess([null, null, null, null]);
    } else if (selectedRole === 'coop') {
      const all = generateAllCodes(selectedMode);
      setPossibleCodes(all);
      setTurn(coopFirstTurn);
      
      if (coopFirstTurn === 'player') {
        setCurrentGuess([null, null, null, null]);
        setCoopStep('guessing');
      } else {
        const firstGuess = selectedMode === 'no-repeat' 
          ? [COLORS[0].id, COLORS[1].id, COLORS[2].id, COLORS[3].id]
          : [COLORS[0].id, COLORS[0].id, COLORS[1].id, COLORS[1].id];
        setAiGuess(firstGuess);
        setCoopStep('feedback');
        setFeedbackInput({ red: 0, white: 0 });
      }
    } else {
      // AI Guesser Mode
      const all = generateAllCodes(selectedMode);
      setPossibleCodes(all);
      const firstGuess = selectedMode === 'no-repeat' 
        ? [COLORS[0].id, COLORS[1].id, COLORS[2].id, COLORS[3].id]
        : [COLORS[0].id, COLORS[0].id, COLORS[1].id, COLORS[1].id];
      setAiGuess(firstGuess);
      setFeedbackInput({ red: 0, white: 0 });
    }
  };

  const resetGame = () => {
    setRole(null);
    setMode(null);
    setHistory([]);
    setGameState('playing');
    setAiGuess(null);
    setPossibleCodes([]);
    setFeedbackError(null);
  };

  // Player Mode Actions
  const handleColorSelect = (colorId: string) => {
    if (gameState !== 'playing') return;
    const nextIndex = currentGuess.indexOf(null);
    if (nextIndex !== -1) {
      const newGuess = [...currentGuess];
      newGuess[nextIndex] = colorId;
      setCurrentGuess(newGuess);
    }
  };

  const removeColor = (index: number) => {
    if (gameState !== 'playing') return;
    const newGuess = [...currentGuess];
    newGuess[index] = null;
    setCurrentGuess(newGuess);
  };

  const submitPlayerGuess = () => {
    if (currentGuess.includes(null) || gameState !== 'playing') return;
    
    if (role === 'coop') {
      setCoopStep('feedback');
      setFeedbackInput({ red: 0, white: 0 });
      return;
    }

    const guessColors = currentGuess as string[];
    const { redDots, whiteDots } = getFeedback(guessColors, secretCode);
    const newGuess: Guess = { colors: guessColors, redDots, whiteDots };
    const newHistory = [...history, newGuess];
    setHistory(newHistory);
    setCurrentGuess([null, null, null, null]);
    
    if (redDots === CODE_LENGTH) {
      setGameState('won');
      return;
    }
    
    if (newHistory.length >= MAX_ATTEMPTS) {
      setGameState('lost');
      return;
    }
  };

  const submitFeedback = () => {
    if (gameState !== 'playing') return;

    const { red, white } = feedbackInput;
    let guessColors: string[];
    
    if (role === 'ai') {
      guessColors = aiGuess!;
    } else {
      guessColors = turn === 'player' ? (currentGuess as string[]) : aiGuess!;
    }
    
    // Filter possible codes locally first
    const filtered = possibleCodes.filter(code => {
      const feedback = getFeedback(guessColors, code);
      return feedback.redDots === red && feedback.whiteDots === white;
    });

    if (filtered.length === 0 && (role === 'ai' || role === 'coop')) {
      setFeedbackError('提示信息有逻辑冲突，请检查并重新输入！');
      return;
    }

    const newGuess: Guess = { colors: guessColors, redDots: red, whiteDots: white };
    const newHistory = [...history, newGuess];
    setHistory(newHistory);

    if (red === CODE_LENGTH) {
      setGameState('won');
      return;
    }

    if (newHistory.length >= MAX_ATTEMPTS) {
      setGameState('lost');
      return;
    }

    setPossibleCodes(filtered);
    
    if (role === 'ai') {
      // Pick next guess
      const nextGuess = filtered[0];
      setAiGuess(nextGuess);
      setFeedbackInput({ red: 0, white: 0 });
    } else if (role === 'coop') {
      if (turn === 'player') {
        setTurn('ai');
        setAiGuess(filtered[0]);
        setCoopStep('feedback');
        setFeedbackInput({ red: 0, white: 0 });
      } else {
        setTurn('player');
        setCoopStep('guessing');
        setCurrentGuess([null, null, null, null]);
      }
    }
  };

  const undoLastGuess = () => {
    if (role === 'coop' && coopStep === 'feedback' && turn === 'player') {
      setCoopStep('guessing');
      return;
    }

    if (history.length === 0) return;
    
    const newHistory = [...history];
    const lastGuess = newHistory.pop()!;
    setHistory(newHistory);
    
    if (role === 'ai' || role === 'coop') {
      // Re-calculate possible codes from scratch based on remaining history
      let remaining = generateAllCodes(mode!);
      newHistory.forEach(h => {
        remaining = remaining.filter(code => {
          const feedback = getFeedback(h.colors, code);
          return feedback.redDots === h.redDots && feedback.whiteDots === h.whiteDots;
        });
      });
      setPossibleCodes(remaining);
    }

    if (role === 'ai') {
      setAiGuess(lastGuess.colors);
      setGameState('playing');
      setFeedbackInput({ red: lastGuess.redDots, white: lastGuess.whiteDots });
    } else if (role === 'coop') {
      setGameState('playing');
      const poppedWasPlayer = coopFirstTurn === 'player' 
        ? newHistory.length % 2 === 0 
        : newHistory.length % 2 !== 0;

      if (poppedWasPlayer) {
        setTurn('player');
        setCurrentGuess(lastGuess.colors);
        setCoopStep('feedback');
        setFeedbackInput({ red: lastGuess.redDots, white: lastGuess.whiteDots });
      } else {
        setTurn('ai');
        setAiGuess(lastGuess.colors);
        setCoopStep('feedback');
        setFeedbackInput({ red: lastGuess.redDots, white: lastGuess.whiteDots });
      }
    } else {
      setGameState('playing');
      setCurrentGuess([null, null, null, null]);
    }
  };

  const isPlayerTurn = (index: number) => coopFirstTurn === 'player' ? index % 2 === 0 : index % 2 !== 0;

  if (!role || !mode) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 font-sans text-[#1A1A1A]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-[32px] shadow-xl shadow-black/5 p-8 border border-black/5"
        >
          <h1 className="text-2xl font-bold text-center mb-8">选择游戏模式</h1>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">谁来猜测？</p>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setRole('player')}
                  className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                    role === 'player' ? 'border-cyan-500 bg-cyan-50 text-cyan-600' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <User size={20} />
                  <span className="text-xs font-bold">我来猜</span>
                </button>
                <button 
                  onClick={() => setRole('ai')}
                  className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                    role === 'ai' ? 'border-cyan-500 bg-cyan-50 text-cyan-600' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <Bot size={20} />
                  <span className="text-xs font-bold">AI 来猜</span>
                </button>
                <button 
                  onClick={() => setRole('coop')}
                  className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                    role === 'coop' ? 'border-cyan-500 bg-cyan-50 text-cyan-600' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex gap-0.5">
                    <User size={14} />
                    <Bot size={14} />
                  </div>
                  <span className="text-xs font-bold">双人合作</span>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {role === 'coop' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">谁先开始？</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setCoopFirstTurn('player')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                        coopFirstTurn === 'player' ? 'border-cyan-500 bg-cyan-50 text-cyan-600' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <User size={18} />
                      <span className="text-sm font-bold">我先猜</span>
                    </button>
                    <button 
                      onClick={() => setCoopFirstTurn('ai')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                        coopFirstTurn === 'ai' ? 'border-cyan-500 bg-cyan-50 text-cyan-600' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <Bot size={18} />
                      <span className="text-sm font-bold">AI 先猜</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">规则设定</p>
              <div className="space-y-3">
                <button
                  disabled={!role}
                  onClick={() => role && startGame(role, 'repeat')}
                  className="w-full group flex flex-col items-start p-5 bg-white border-2 border-gray-100 hover:border-cyan-400 rounded-2xl shadow-sm transition-all disabled:opacity-50"
                >
                  <span className="text-lg font-semibold">颜色可重复</span>
                  <p className="text-xs text-gray-400">序列中可能出现相同的颜色</p>
                </button>
                <button
                  disabled={!role}
                  onClick={() => role && startGame(role, 'no-repeat')}
                  className="w-full group flex flex-col items-start p-5 bg-white border-2 border-gray-100 hover:border-cyan-400 rounded-2xl shadow-sm transition-all disabled:opacity-50"
                >
                  <span className="text-lg font-semibold">颜色不重复</span>
                  <p className="text-xs text-gray-400">四个颜色都不同</p>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center p-4 font-sans text-[#1A1A1A]">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6 px-2">
        <button onClick={resetGame} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-semibold">
          {role === 'player' ? '猜测历史' : role === 'ai' ? 'AI 猜测过程' : '合作模式 (8次机会)'}
        </h2>
        <div className="flex gap-1">
          <button onClick={resetGame} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400" title="重置游戏">
            <RotateCcw size={20} />
          </button>
          <button onClick={() => setShowRules(true)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <Info size={20} />
          </button>
        </div>
      </div>

      {/* History Area */}
      <div className="w-full max-w-md flex-1 overflow-y-auto space-y-3 px-2 mb-6 scrollbar-hide">
        <AnimatePresence initial={false}>
          {history.map((guess, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border relative group ${
                role === 'coop' ? (isPlayerTurn(idx) ? 'border-cyan-100' : 'border-purple-100') : 'border-black/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  role === 'coop' 
                    ? (isPlayerTurn(idx) ? 'bg-cyan-50 text-cyan-500' : 'bg-purple-50 text-purple-500')
                    : 'bg-red-50 text-red-500'
                }`}>
                  {role === 'coop' ? (isPlayerTurn(idx) ? 'H' : 'AI') : idx + 1}
                </div>
                <div className="flex gap-2">
                  {guess.colors.map((colorId, cIdx) => (
                    <div
                      key={cIdx}
                      className="w-8 h-8 rounded-full shadow-inner"
                      style={{ backgroundColor: COLORS.find(c => c.id === colorId)?.hex }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: guess.redDots }).map((_, i) => (
                  <div key={`red-${i}`} className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
                ))}
                {Array.from({ length: guess.whiteDots }).map((_, i) => (
                  <div key={`white-${i}`} className="w-3 h-3 rounded-full border-2 border-gray-200 bg-white" />
                ))}
              </div>
              
              {idx === history.length - 1 && gameState === 'playing' && (
                <button 
                  onClick={undoLastGuess}
                  className="absolute -right-2 -top-2 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
            <Bot size={48} className="mb-4 opacity-20" />
            <p className="text-sm">
              {role === 'player' || (role === 'coop' && turn === 'player') 
                ? '开始你的第一次猜测吧' 
                : 'AI 正在等待你的反馈'}
            </p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="w-full max-w-md bg-white rounded-t-[40px] shadow-2xl shadow-black/10 p-8 border-t border-black/5">
        <div className="flex justify-center mb-8">
          <div className={`px-4 py-1 rounded-full text-xs font-bold tracking-wider uppercase transition-colors duration-300 ${
            gameState === 'playing' 
              ? (role === 'coop' 
                  ? (turn === 'player' ? 'bg-cyan-500 text-white' : 'bg-purple-500 text-white')
                  : 'bg-red-500 text-white')
              : gameState === 'won' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
          }`}>
            {gameState === 'playing' 
              ? (role === 'player' ? "H'S TURN" : role === 'ai' ? "AI'S GUESS" : (turn === 'player' ? (coopStep === 'guessing' ? "H'S TURN" : "WAITING FEEDBACK") : "AI'S GUESS")) 
              : gameState === 'won' ? "FINISHED" : (possibleCodes.length === 0 ? "LOGIC ERROR" : "GAME OVER")}
          </div>
        </div>

        {(role === 'player' || (role === 'coop' && coopStep === 'guessing')) ? (
          <div className={role === 'coop' && turn === 'ai' ? 'opacity-40 pointer-events-none grayscale' : ''}>
            {/* Player Input UI */}
            <div className="flex justify-center gap-4 mb-10">
              {currentGuess.map((colorId, idx) => (
                <button
                  key={idx}
                  onClick={() => colorId && removeColor(idx)}
                  className={`w-14 h-14 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all duration-200 ${
                    colorId ? 'border-transparent shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={colorId ? { backgroundColor: COLORS.find(c => c.id === colorId)?.hex } : {}}
                >
                  {!colorId && <span className="text-gray-300 text-2xl">+</span>}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-6 mb-10">
              {COLORS.map((color) => (
                <button key={color.id} onClick={() => handleColorSelect(color.id)} disabled={gameState !== 'playing'} className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-200 active:scale-95" style={{ backgroundColor: color.hex }} />
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setCurrentGuess([null, null, null, null])} className="flex-1 py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl font-semibold text-gray-500 transition-colors flex items-center justify-center gap-2">
                <Trash2 size={18} /> 清空
              </button>
              <button
                onClick={submitPlayerGuess}
                disabled={currentGuess.includes(null) || gameState !== 'playing'}
                className={`flex-[2] py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                  currentGuess.includes(null) || gameState !== 'playing' ? 'bg-gray-100 text-gray-300' : 'bg-gray-900 text-white hover:bg-black shadow-lg'
                }`}
              >
                <Check size={20} /> {role === 'coop' ? '确认猜测，等待朋友反馈' : '提交猜测'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Feedback UI */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 mb-4">
                {role === 'coop' && turn === 'player' ? '你的猜测：' : 'AI 的当前猜测：'}
              </p>
              <div className="flex justify-center gap-4 mb-8">
                {(role === 'coop' && turn === 'player' ? currentGuess : aiGuess)?.map((colorId, idx) => (
                  <div key={idx} className="w-14 h-14 rounded-2xl shadow-md" style={{ backgroundColor: COLORS.find(c => c.id === colorId)?.hex }} />
                ))}
              </div>
              
              <div className="space-y-6 bg-gray-50 p-6 rounded-[32px]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" /> 位置和颜色都对 (红点)
                  </span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setFeedbackInput(prev => ({ ...prev, red: Math.max(0, prev.red - 1) }))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">-</button>
                    <span className="w-4 font-bold">{feedbackInput.red}</span>
                    <button onClick={() => setFeedbackInput(prev => ({ ...prev, red: Math.min(CODE_LENGTH, prev.red + 1) }))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-gray-300 bg-white" /> 颜色对位置错 (白圈)
                  </span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setFeedbackInput(prev => ({ ...prev, white: Math.max(0, prev.white - 1) }))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">-</button>
                    <span className="w-4 font-bold">{feedbackInput.white}</span>
                    <button onClick={() => setFeedbackInput(prev => ({ ...prev, white: Math.min(CODE_LENGTH - feedbackInput.red, prev.white + 1) }))} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
              
              {feedbackError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-red-50 text-red-500 text-sm font-bold rounded-xl border border-red-100">
                  {feedbackError}
                </motion.div>
              )}
            </div>
            <button
              onClick={submitFeedback}
              disabled={gameState !== 'playing'}
              className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black shadow-lg transition-all disabled:opacity-50"
            >
              {role === 'coop' ? '提交朋友的反馈' : '提交反馈，让 AI 继续猜'}
            </button>
          </>
        )}
      </div>

      {/* Win/Loss/Error Modal */}
      <AnimatePresence>
        {gameState !== 'playing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl">
              <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                gameState === 'won' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'
              }`}>
                {gameState === 'won' ? <Check size={40} /> : <RotateCcw size={40} />}
              </div>
              <h3 className="text-3xl font-black mb-2">
                {gameState === 'won' 
                  ? (role === 'coop' ? '合作成功!' : (role === 'player' ? '你赢了!' : 'AI 猜对了!')) 
                  : '游戏结束'}
              </h3>
              <p className="text-gray-500 mb-8">
                {gameState === 'won' 
                  ? (role === 'coop' ? '你们共同破解了颜色密码！' : (role === 'player' ? '恭喜你猜出了正确答案！' : 'AI 已经成功破解了你的颜色组合！')) 
                  : '很遗憾，8次机会已用完。'}
              </p>
              
              <div className="flex flex-col gap-3">
                <button onClick={resetGame} className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors">
                  返回主菜单
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules Modal */}
      <AnimatePresence>
        {showRules && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowRules(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">游戏规则</h3>
              <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                <p>1. 目标是找出 4 个颜色的正确序列。</p>
                <p>2. 提示说明：</p>
                <ul className="list-disc ml-5 space-y-2">
                  <li><span className="text-red-500 font-bold">红点</span>：颜色和位置都正确。</li>
                  <li><span className="text-gray-400 font-bold">白圈</span>：颜色正确但位置错误。</li>
                </ul>
                <p>3. <b>AI 猜测模式</b>：你心中想好一个序列，AI 来猜。你根据 AI 的猜测给出红点和白圈的数量。</p>
                <p>4. <b>双人合作模式</b>：你和 AI 轮流猜测系统生成的随机序列。每人各猜一次为一轮，共 4 轮（8次机会）。</p>
              </div>
              <button onClick={() => setShowRules(false)} className="w-full mt-8 py-4 bg-gray-900 text-white rounded-2xl font-bold">知道了</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
