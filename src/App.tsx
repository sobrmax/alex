import { useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState } from './game/types';

function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const engineRef = useRef<GameEngine | null>(null);
  const animFrameRef = useRef<number>(0);
  const [docsCount, setDocsCount] = useState(0);

  // Callback ref - initializes engine when canvas is mounted
  const canvasCallbackRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    if (engineRef.current) return; // Already initialized

    const engine = new GameEngine(canvas, (state: GameState) => {
      setGameState(state);
    });
    engineRef.current = engine;

    const gameLoop = () => {
      if (engine.state === 'playing') {
        engine.update();
      } else {
        engine.frameCount++;
      }
      engine.render();
      setDocsCount(engine.docsCollected);
      animFrameRef.current = requestAnimationFrame(gameLoop);
    };
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const startGame = () => {
    if (engineRef.current) {
      engineRef.current.startGame();
      setGameState('playing');
    }
  };

  const restartGame = () => {
    if (engineRef.current) {
      engineRef.current.startGame();
      setGameState('playing');
    }
  };

  const goToMenu = () => {
    if (engineRef.current) {
      engineRef.current.state = 'menu';
    }
    setGameState('menu');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#111827',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Courier New', monospace",
      userSelect: 'none',
      padding: '1rem'
    }}>
      {/* Game container */}
      <div style={{ position: 'relative', border: '4px solid #374151', borderRadius: '8px', overflow: 'hidden', maxWidth: '100%', boxSizing: 'border-box' }}>
        <canvas
          ref={canvasCallbackRef}
          width={800}
          height={500}
          tabIndex={0}
          style={{
            display: 'block',
            imageRendering: 'pixelated',
            backgroundColor: '#1a1a2e'
          }}
        />

        {/* Menu Overlay */}
        {gameState === 'menu' && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(17, 24, 39, 0.88)',
            zIndex: 10
          }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                fontWeight: 'bold',
                color: '#facc15',
                marginBottom: '0.25rem',
                textShadow: '3px 3px 0 #b91c1c, 6px 6px 0 #000',
                letterSpacing: '0.1em',
                fontFamily: 'monospace'
              }}>
                АЛЕКС
              </h1>
              <h2 style={{
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: '0.25rem',
                textShadow: '2px 2px 0 #dc2626',
                fontFamily: 'monospace'
              }}>
                НАНОСИТ
              </h2>
              <h2 style={{
                fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
                fontWeight: 'bold',
                color: '#ef4444',
                textShadow: '2px 2px 0 #000, 4px 4px 0 #7f1d1d',
                fontFamily: 'monospace'
              }}>
                ОТВЕТНЫЙ УДАР
              </h2>
            </div>

            <div style={{ margin: '1.5rem 0', color: '#d1d5db', fontSize: '0.875rem', textAlign: 'center', padding: '0 1rem' }}>
              <p style={{ marginBottom: '0.5rem' }}>🎮 <strong>Управление:</strong></p>
              <p>← → или A/D — Движение</p>
              <p>Пробел / ↑ / W — Прыжок</p>
              <p style={{ marginTop: '0.75rem', color: '#fde047' }}>Собирай документы и победи TENOS!</p>
            </div>

            <button
              onClick={startGame}
              style={{
                padding: '0.8rem 2.5rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                borderRadius: '0.5rem',
                border: '4px solid #facc15',
                cursor: 'pointer',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
                boxShadow: '0 4px 14px rgba(127, 29, 29, 0.5)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              ▶ СТАРТ
            </button>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', color: '#6b7280', fontSize: '0.7rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span>📄 Собирай документы</span>
              <span>👊 Прыгай на врагов</span>
              <span>💀 Победи TENOS</span>
            </div>
          </div>
        )}

        {/* Victory Overlay */}
        {gameState === 'victory' && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 10
          }}>
            <h2 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#facc15', marginBottom: '1rem', textShadow: '2px 2px 0 #000', fontFamily: 'monospace' }}>
              🏆 ПОБЕДА!
            </h2>
            <p style={{ fontSize: '1.25rem', color: '#4ade80', marginBottom: '0.5rem', fontFamily: 'monospace' }}>TENOS повержен!</p>
            <p style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
              Документов собрано: {docsCount} / 50
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={restartGame} style={{
                padding: '0.75rem 2rem', backgroundColor: '#16a34a', color: '#fff',
                fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '0.5rem',
                border: '2px solid #86efac', cursor: 'pointer', fontFamily: 'monospace'
              }}>ИГРАТЬ СНОВА</button>
              <button onClick={goToMenu} style={{
                padding: '0.75rem 2rem', backgroundColor: '#4b5563', color: '#fff',
                fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '0.5rem',
                border: '2px solid #9ca3af', cursor: 'pointer', fontFamily: 'monospace'
              }}>МЕНЮ</button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 10
          }}>
            <h2 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '1rem', textShadow: '2px 2px 0 #000', fontFamily: 'monospace' }}>
              💀 GAME OVER
            </h2>
            <p style={{ fontSize: '1rem', color: '#d1d5db', marginBottom: '1.5rem', fontFamily: 'monospace' }}>Алекс не справился...</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={restartGame} style={{
                padding: '0.75rem 2rem', backgroundColor: '#dc2626', color: '#fff',
                fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '0.5rem',
                border: '2px solid #fca5a5', cursor: 'pointer', fontFamily: 'monospace'
              }}>ПОПРОБОВАТЬ СНОВА</button>
              <button onClick={goToMenu} style={{
                padding: '0.75rem 2rem', backgroundColor: '#4b5563', color: '#fff',
                fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '0.5rem',
                border: '2px solid #9ca3af', cursor: 'pointer', fontFamily: 'monospace'
              }}>МЕНЮ</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', color: '#4b5563', fontSize: '0.75rem', fontFamily: 'monospace' }}>
        © 2024 Alex Strikes Back — Retro Platformer
      </div>
    </div>
  );
}

export default App;
