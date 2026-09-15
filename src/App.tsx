import { useRef, useState, useCallback, useEffect } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameState } from './game/types';

function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const engineRef = useRef<GameEngine | null>(null);
  const animFrameRef = useRef<number>(0);
  const [docsCount, setDocsCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Callback ref - initializes engine when canvas is mounted
  const canvasCallbackRef = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    if (engineRef.current) return;

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

  // Touch controls for mobile
  const handleTouchStart = (action: string) => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    
    if (action === 'left') {
      engine.keys.add('ArrowLeft');
    } else if (action === 'right') {
      engine.keys.add('ArrowRight');
    } else if (action === 'jump') {
      engine.keys.add('Space');
    }
  };

  const handleTouchEnd = (action: string) => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    
    if (action === 'left') {
      engine.keys.delete('ArrowLeft');
    } else if (action === 'right') {
      engine.keys.delete('ArrowRight');
    } else if (action === 'jump') {
      engine.keys.delete('Space');
    }
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
      padding: isMobile ? '0.5rem' : '1rem',
      overflow: 'hidden'
    }}>
      {/* Game container */}
      <div 
        ref={containerRef}
        style={{ 
          position: 'relative', 
          border: isMobile ? '2px solid #374151' : '4px solid #374151',
          borderRadius: '8px', 
          overflow: 'hidden', 
          maxWidth: '100%',
          width: isMobile ? '100%' : '808px',
          boxSizing: 'border-box'
        }}
      >
        <canvas
          ref={canvasCallbackRef}
          width={800}
          height={500}
          tabIndex={0}
          style={{
            display: 'block',
            imageRendering: 'pixelated',
            backgroundColor: '#1a1a2e',
            width: '100%',
            height: 'auto'
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
            zIndex: 10,
            padding: isMobile ? '1rem' : '2rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontSize: isMobile ? 'clamp(1.5rem, 8vw, 2.5rem)' : 'clamp(2rem, 6vw, 3.5rem)',
                fontWeight: 'bold',
                color: '#facc15',
                marginBottom: '0.25rem',
                textShadow: '2px 2px 0 #b91c1c, 4px 4px 0 #000',
                letterSpacing: '0.1em',
                fontFamily: 'monospace'
              }}>
                АЛЕКС
              </h1>
              <h2 style={{
                fontSize: isMobile ? 'clamp(1.2rem, 6vw, 1.8rem)' : 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: '0.25rem',
                textShadow: '1px 1px 0 #dc2626',
                fontFamily: 'monospace'
              }}>
                НАНОСИТ
              </h2>
              <h2 style={{
                fontSize: isMobile ? 'clamp(1.3rem, 7vw, 2rem)' : 'clamp(1.8rem, 5vw, 2.5rem)',
                fontWeight: 'bold',
                color: '#ef4444',
                textShadow: '1px 1px 0 #000, 3px 3px 0 #7f1d1d',
                fontFamily: 'monospace'
              }}>
                ОТВЕТНЫЙ УДАР
              </h2>
            </div>

            <div style={{ 
              margin: isMobile ? '1rem 0' : '1.5rem 0', 
              color: '#d1d5db', 
              fontSize: isMobile ? '0.75rem' : '0.875rem', 
              textAlign: 'center', 
              padding: '0 0.5rem' 
            }}>
              <p style={{ marginBottom: '0.5rem' }}>🎮 <strong>Управление:</strong></p>
              {isMobile ? (
                <>
                  <p>Используйте кнопки внизу экрана</p>
                  <p style={{ marginTop: '0.5rem', color: '#fde047' }}>Собирай документы и победи TENOS!</p>
                </>
              ) : (
                <>
                  <p>← → или A/D — Движение</p>
                  <p>Пробел / ↑ / W — Прыжок</p>
                  <p style={{ marginTop: '0.75rem', color: '#fde047' }}>Собирай документы и победи TENOS!</p>
                </>
              )}
            </div>

            <button
              onClick={startGame}
              style={{
                padding: isMobile ? '0.6rem 2rem' : '0.8rem 2.5rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: isMobile ? '1.2rem' : '1.5rem',
                fontWeight: 'bold',
                borderRadius: '0.5rem',
                border: isMobile ? '3px solid #facc15' : '4px solid #facc15',
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

            {!isMobile && (
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', color: '#6b7280', fontSize: '0.7rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span>📄 Собирай документы</span>
                <span>👊 Прыгай на врагов</span>
                <span>💀 Победи TENOS</span>
              </div>
            )}
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
            zIndex: 10,
            padding: isMobile ? '1rem' : '2rem'
          }}>
            <h2 style={{ 
              fontSize: isMobile ? '2rem' : '3rem', 
              fontWeight: 'bold', 
              color: '#facc15', 
              marginBottom: '1rem', 
              textShadow: '2px 2px 0 #000', 
              fontFamily: 'monospace' 
            }}>
              🏆 ПОБЕДА!
            </h2>
            <p style={{ fontSize: isMobile ? '1rem' : '1.25rem', color: '#4ade80', marginBottom: '0.5rem', fontFamily: 'monospace' }}>TENOS повержен!</p>
            <p style={{ fontSize: isMobile ? '0.875rem' : '1rem', color: '#ffffff', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
              Документов собрано: {docsCount} / 60
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={restartGame} style={{
                padding: isMobile ? '0.5rem 1.5rem' : '0.75rem 2rem',
                backgroundColor: '#16a34a', color: '#fff',
                fontSize: isMobile ? '0.9rem' : '1.1rem',
                fontWeight: 'bold', borderRadius: '0.5rem',
                border: '2px solid #86efac', cursor: 'pointer', fontFamily: 'monospace'
              }}>ИГРАТЬ СНОВА</button>
              <button onClick={goToMenu} style={{
                padding: isMobile ? '0.5rem 1.5rem' : '0.75rem 2rem',
                backgroundColor: '#4b5563', color: '#fff',
                fontSize: isMobile ? '0.9rem' : '1.1rem',
                fontWeight: 'bold', borderRadius: '0.5rem',
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
            zIndex: 10,
            padding: isMobile ? '1rem' : '2rem'
          }}>
            <h2 style={{ 
              fontSize: isMobile ? '2rem' : '3rem', 
              fontWeight: 'bold', 
              color: '#ef4444', 
              marginBottom: '1rem', 
              textShadow: '2px 2px 0 #000', 
              fontFamily: 'monospace' 
            }}>
              💀 GAME OVER
            </h2>
            <p style={{ fontSize: isMobile ? '0.875rem' : '1rem', color: '#d1d5db', marginBottom: '1.5rem', fontFamily: 'monospace' }}>Алекс не справился...</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button onClick={restartGame} style={{
                padding: isMobile ? '0.5rem 1.5rem' : '0.75rem 2rem',
                backgroundColor: '#dc2626', color: '#fff',
                fontSize: isMobile ? '0.9rem' : '1.1rem',
                fontWeight: 'bold', borderRadius: '0.5rem',
                border: '2px solid #fca5a5', cursor: 'pointer', fontFamily: 'monospace'
              }}>ПОПРОБОВАТЬ СНОВА</button>
              <button onClick={goToMenu} style={{
                padding: isMobile ? '0.5rem 1.5rem' : '0.75rem 2rem',
                backgroundColor: '#4b5563', color: '#fff',
                fontSize: isMobile ? '0.9rem' : '1.1rem',
                fontWeight: 'bold', borderRadius: '0.5rem',
                border: '2px solid #9ca3af', cursor: 'pointer', fontFamily: 'monospace'
              }}>МЕНЮ</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Touch Controls */}
      {isMobile && gameState === 'playing' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          pointerEvents: 'none',
          zIndex: 100
        }}>
          {/* Left side - Movement */}
          <div style={{ display: 'flex', gap: '0.5rem', pointerEvents: 'auto' }}>
            <button
              onTouchStart={(e) => { e.preventDefault(); handleTouchStart('left'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('left'); }}
              onMouseDown={() => handleTouchStart('left')}
              onMouseUp={() => handleTouchEnd('left')}
              onMouseLeave={() => handleTouchEnd('left')}
              style={{
                width: '70px',
                height: '70px',
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                border: '3px solid rgba(59, 130, 246, 0.8)',
                borderRadius: '50%',
                fontSize: '2rem',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                touchAction: 'none'
              }}
            >
              ←
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); handleTouchStart('right'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('right'); }}
              onMouseDown={() => handleTouchStart('right')}
              onMouseUp={() => handleTouchEnd('right')}
              onMouseLeave={() => handleTouchEnd('right')}
              style={{
                width: '70px',
                height: '70px',
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                border: '3px solid rgba(59, 130, 246, 0.8)',
                borderRadius: '50%',
                fontSize: '2rem',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                touchAction: 'none'
              }}
            >
              →
            </button>
          </div>

          {/* Right side - Jump */}
          <div style={{ pointerEvents: 'auto' }}>
            <button
              onTouchStart={(e) => { e.preventDefault(); handleTouchStart('jump'); }}
              onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd('jump'); }}
              onMouseDown={() => handleTouchStart('jump')}
              onMouseUp={() => handleTouchEnd('jump')}
              onMouseLeave={() => handleTouchEnd('jump')}
              style={{
                width: '90px',
                height: '90px',
                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                border: '3px solid rgba(239, 68, 68, 0.8)',
                borderRadius: '50%',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                touchAction: 'none'
              }}
            >
              ПРЫЖОК
            </button>
          </div>
        </div>
      )}

      {!isMobile && (
        <div style={{ marginTop: '1rem', color: '#4b5563', fontSize: '0.75rem', fontFamily: 'monospace' }}>
          © 2024 Alex Strikes Back — Retro Platformer
        </div>
      )}
    </div>
  );
}

export default App;
