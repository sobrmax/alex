import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState } from './game/types';

function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animFrameRef = useRef<number>(0);

  const handleStateChange = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    if (gameState === 'playing' && canvasRef.current) {
      const canvas = canvasRef.current;
      const engine = new GameEngine(canvas, handleStateChange);
      engineRef.current = engine;

      const gameLoop = () => {
        engine.update();
        engine.render();
        animFrameRef.current = requestAnimationFrame(gameLoop);
      };
      gameLoop();

      return () => {
        cancelAnimationFrame(animFrameRef.current);
        engine.destroy();
      };
    }
  }, [gameState, gameKey, handleStateChange]);

  const startGame = () => {
    setGameState('playing');
  };

  const restartGame = () => {
    setGameKey(k => k + 1);
    setGameState('playing');
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Menu Screen */}
      {gameState === 'menu' && (
        <div className="flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="mb-8">
            <h1 className="text-5xl md:text-7xl font-bold text-yellow-400 mb-2 tracking-wider"
                style={{ fontFamily: 'monospace', textShadow: '3px 3px 0 #b91c1c, 6px 6px 0 #000' }}>
              АЛЕКС
            </h1>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-2"
                style={{ fontFamily: 'monospace', textShadow: '2px 2px 0 #dc2626' }}>
              НАНОСИТ
            </h2>
            <h2 className="text-4xl md:text-6xl font-bold text-red-500"
                style={{ fontFamily: 'monospace', textShadow: '2px 2px 0 #000, 4px 4px 0 #7f1d1d' }}>
              ОТВЕТНЫЙ УДАР
            </h2>
          </div>

          <div className="mb-8 text-gray-300 text-sm max-w-md px-4">
            <p className="mb-2">🎮 <strong>Управление:</strong></p>
            <p>← → или A/D — Движение</p>
            <p>Пробел / ↑ / W — Прыжок</p>
            <p className="mt-3 text-yellow-300">Собирай документы и победи TENOS!</p>
          </div>

          <button
            onClick={startGame}
            className="px-12 py-4 bg-red-600 hover:bg-red-500 text-white text-2xl font-bold rounded-lg
                       border-4 border-yellow-400 transition-all duration-200 hover:scale-110
                       shadow-lg shadow-red-900/50 active:scale-95"
            style={{ fontFamily: 'monospace' }}
          >
            ▶ СТАРТ
          </button>

          <div className="mt-12 flex gap-8 text-gray-500 text-xs">
            <span>📄 Собирай документы</span>
            <span>👊 Прыгай на врагов</span>
            <span>💀 Победи босса TENOS</span>
          </div>
        </div>
      )}

      {/* Game Canvas */}
      {(gameState === 'playing' || gameState === 'victory' || gameState === 'gameover') && (
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="border-4 border-gray-700 rounded-lg shadow-2xl shadow-black/50"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Victory Overlay */}
          {gameState === 'victory' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <h2 className="text-5xl font-bold text-yellow-400 mb-4 animate-bounce"
                  style={{ fontFamily: 'monospace', textShadow: '2px 2px 0 #000' }}>
                🏆 ПОБЕДА!
              </h2>
              <p className="text-xl text-green-400 mb-2" style={{ fontFamily: 'monospace' }}>
                TENOS повержен!
              </p>
              <p className="text-lg text-white mb-6" style={{ fontFamily: 'monospace' }}>
                Документов собрано: {engineRef.current?.docsCollected || 0} / 50
              </p>
              <button
                onClick={restartGame}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white text-xl font-bold rounded-lg
                           border-2 border-green-300 transition-all hover:scale-105"
                style={{ fontFamily: 'monospace' }}
              >
                ИГРАТЬ СНОВА
              </button>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg">
              <h2 className="text-5xl font-bold text-red-500 mb-4"
                  style={{ fontFamily: 'monospace', textShadow: '2px 2px 0 #000' }}>
                💀 GAME OVER
              </h2>
              <p className="text-lg text-gray-300 mb-6" style={{ fontFamily: 'monospace' }}>
                Алекс не справился...
              </p>
              <button
                onClick={restartGame}
                className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white text-xl font-bold rounded-lg
                           border-2 border-red-300 transition-all hover:scale-105"
                style={{ fontFamily: 'monospace' }}
              >
                ПОПРОБОВАТЬ СНОВА
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-gray-600 text-xs" style={{ fontFamily: 'monospace' }}>
        © 2024 Alex Strikes Back — Retro Platformer
      </div>
    </div>
  );
}

export default App;
