
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus, ColorState, GameState, PowerUpType, Obstacle, PowerUpItem, Particle } from './types';
import { COLORS, PHYSICS, POWER_UP_DURATION } from './constants';
import { audio } from './services/AudioManager';

const App: React.FC = () => {
  // Use state for UI-related values
  const [uiState, setUiState] = useState({
    status: GameStatus.MENU,
    score: 0,
    highScore: parseInt(localStorage.getItem('highScore') || '0'),
    combo: 0,
    multiplier: 1,
    playerColor: ColorState.BLUE,
    powerUp: null as PowerUpType | null,
    powerUpTimer: 0
  });

  // Use refs for the core game loop to ensure stability and high performance
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  
  // Mutable game state for the loop
  const gameRef = useRef({
    status: GameStatus.MENU,
    score: 0,
    combo: 0,
    multiplier: 1,
    playerColor: ColorState.BLUE,
    speed: PHYSICS.INITIAL_SPEED,
    powerUp: null as PowerUpType | null,
    powerUpTimer: 0,
    isGhost: false,
    obstacles: [] as Obstacle[],
    powerUps: [] as PowerUpItem[],
    particles: [] as Particle[],
    spawnTimer: 0,
    shake: 0,
    flash: 0
  });

  const syncUI = useCallback(() => {
    setUiState({
      status: gameRef.current.status,
      score: gameRef.current.score,
      highScore: parseInt(localStorage.getItem('highScore') || '0'),
      combo: gameRef.current.combo,
      multiplier: gameRef.current.multiplier,
      playerColor: gameRef.current.playerColor,
      powerUp: gameRef.current.powerUp,
      powerUpTimer: gameRef.current.powerUpTimer
    });
  }, []);

  const spawnShatter = (x: number, y: number, color: string, count: number = 30, isImpact: boolean = false) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = isImpact ? (6 + Math.random() * 14) : (2 + Math.random() * 6);
      gameRef.current.particles.push({
        x: x + (Math.random() - 0.5) * 50,
        y: y + (Math.random() - 0.5) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isImpact ? 4 : 0),
        life: 1.5,
        maxLife: 1.5,
        color: color,
        rotation: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.4,
        size: 3 + Math.random() * 12,
        isShard: true
      });
    }
  };

  const startGame = () => {
    audio.init();
    gameRef.current = {
      ...gameRef.current,
      status: GameStatus.PLAYING,
      score: 0,
      combo: 0,
      multiplier: 1,
      speed: PHYSICS.INITIAL_SPEED,
      powerUp: null,
      isGhost: false,
      obstacles: [],
      powerUps: [],
      particles: [],
      spawnTimer: 0,
      shake: 0,
      flash: 0,
      playerColor: ColorState.BLUE
    };
    syncUI();
  };

  const flipColor = () => {
    if (gameRef.current.status !== GameStatus.PLAYING) return;
    audio.playFlip();
    gameRef.current.playerColor = gameRef.current.playerColor === ColorState.RED ? ColorState.BLUE : ColorState.RED;
    
    spawnShatter(window.innerWidth / 2, window.innerHeight * PHYSICS.PLAYER_Y, COLORS[gameRef.current.playerColor], 10);
    syncUI();
  };

  const handleInput = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameRef.current.status === GameStatus.MENU || gameRef.current.status === GameStatus.GAMEOVER || gameRef.current.status === GameStatus.VICTORY) {
      startGame();
    } else {
      flipColor();
    }
  };

  const spawnObstacle = (width: number) => {
    const dice = Math.random();
    let type: Obstacle['type'] = 'GATE';
    const score = gameRef.current.score;
    
    if (score > 100 && dice < 0.2) type = 'SWITCHER';
    else if (score > 60 && dice < 0.4) type = 'MOVING';
    else if (score > 30 && dice < 0.55) type = 'ZIGZAG';
    else if (dice < 0.4) type = 'BLOCK';

    const color = Math.random() > 0.5 ? ColorState.RED : ColorState.BLUE;
    
    gameRef.current.obstacles.push({
      id: Math.random().toString(36).substr(2, 9),
      type,
      y: -200,
      xOffset: 0,
      vx: type === 'MOVING' ? (Math.random() > 0.5 ? 2.5 : -2.5) : 0,
      color,
      passed: false,
      width: width,
      height: PHYSICS.OBSTACLE_HEIGHT,
      rotation: 0,
      switchTimer: type === 'SWITCHER' ? 1400 : 0
    });

    if (Math.random() > 0.94) {
      const types = [PowerUpType.GHOST, PowerUpType.BOMB, PowerUpType.MIRROR];
      gameRef.current.powerUps.push({
        id: Math.random().toString(36).substr(2, 9),
        type: types[Math.floor(Math.random() * types.length)],
        x: Math.random() * (width - 80) + 40,
        y: -250,
        collected: false
      });
    }
  };

  const update = (time: number) => {
    if (gameRef.current.status !== GameStatus.PLAYING) {
      render();
      requestRef.current = requestAnimationFrame(update);
      return;
    }
    
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    if (dt > 100) { // Catch-up or focus loss
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const width = canvasRef.current?.width || window.innerWidth;
    const height = canvasRef.current?.height || window.innerHeight;

    const speedScale = 1 + (gameRef.current.score / 600);
    gameRef.current.speed = Math.min(PHYSICS.MAX_SPEED, (gameRef.current.speed + PHYSICS.SPEED_ACCEL * dt) * speedScale);
    
    const spawnInterval = Math.max(PHYSICS.MIN_SPAWN_INTERVAL, PHYSICS.SPAWN_INTERVAL - (gameRef.current.score * 8));
    gameRef.current.spawnTimer += dt;
    if (gameRef.current.spawnTimer > spawnInterval) {
      spawnObstacle(width);
      gameRef.current.spawnTimer = 0;
    }

    // Camera shakes & flashes
    if (gameRef.current.shake > 0) gameRef.current.shake *= 0.9;
    if (gameRef.current.flash > 0) gameRef.current.flash *= 0.8;

    // Obstacle Logic
    gameRef.current.obstacles.forEach(obs => {
      obs.y += gameRef.current.speed;
      if (obs.type === 'MOVING' && obs.vx) {
        obs.xOffset = (obs.xOffset || 0) + obs.vx;
        if (Math.abs(obs.xOffset) > width * 0.3) obs.vx *= -1;
      }
      if (obs.type === 'SWITCHER' && obs.switchTimer !== undefined) {
        obs.switchTimer -= dt;
        if (obs.switchTimer <= 0) {
          obs.color = obs.color === ColorState.RED ? ColorState.BLUE : ColorState.RED;
          obs.switchTimer = Math.max(400, 1600 - (gameRef.current.score * 5)); 
          spawnShatter(width/2 + (obs.xOffset || 0), obs.y, COLORS[obs.color], 10);
        }
      }
    });

    gameRef.current.powerUps.forEach(p => { p.y += gameRef.current.speed; });
    gameRef.current.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.angularVelocity;
      p.life -= dt / 1000;
      p.vy += 0.28; 
    });
    gameRef.current.particles = gameRef.current.particles.filter(p => p.life > 0);

    const pX = width / 2;
    const pY = height * PHYSICS.PLAYER_Y;
    const pR = PHYSICS.BALL_RADIUS;

    // Collision Detection
    gameRef.current.obstacles.forEach(obs => {
      const currentXOffset = obs.xOffset || 0;
      if (!obs.passed && obs.y > pY - pR - obs.height && obs.y < pY + pR) {
        
        let hittingSolid = false;
        const gapInitial = 0.24;
        const difficultyGap = Math.max(0.08, gapInitial - (gameRef.current.score / 1200));
        const sideWidth = (1 - difficultyGap) / 2;

        if (obs.type === 'GATE' || obs.type === 'MOVING') {
          const leftBound = width * sideWidth + currentXOffset;
          const rightBound = width * (1 - sideWidth) + currentXOffset;
          // Check if any part of the ball is hitting the solid barriers
          if (pX - pR < leftBound || pX + pR > rightBound) {
            hittingSolid = true;
          }
        } else if (obs.type === 'BLOCK' || obs.type === 'SWITCHER' || obs.type === 'ZIGZAG') {
          const blockW = width * (obs.type === 'ZIGZAG' ? 0.88 : 0.65);
          const blockL = (width - blockW) / 2 + currentXOffset;
          const blockR = blockL + blockW;
          // Check if the ball overlaps the block
          if (pX + pR > blockL && pX - pR < blockR) {
            hittingSolid = true;
          }
        }

        if (hittingSolid) {
          if (!gameRef.current.isGhost && obs.color !== gameRef.current.playerColor) {
            // CRASH
            audio.playCrash();
            gameRef.current.shake = 40;
            gameRef.current.status = GameStatus.GAMEOVER;
            const high = Math.max(parseInt(localStorage.getItem('highScore') || '0'), gameRef.current.score);
            localStorage.setItem('highScore', high.toString());
            syncUI();
          } else {
            // MATCHED COLOR - SHATTER THROUGH
            obs.passed = true;
            audio.playMatch();
            gameRef.current.shake = 20;
            gameRef.current.flash = 0.6;
            
            if (obs.type === 'GATE' || obs.type === 'MOVING') {
              spawnShatter(width * 0.15 + currentXOffset, obs.y + obs.height/2, COLORS[obs.color], 30, true);
              spawnShatter(width * 0.85 + currentXOffset, obs.y + obs.height/2, COLORS[obs.color], 30, true);
            } else {
              spawnShatter(pX, obs.y + obs.height/2, COLORS[obs.color], 50, true);
            }
            incrementScore();
          }
        } else {
          // THROUGH GAP - Safe pass
          obs.passed = true;
          audio.playMatch();
          gameRef.current.shake = 6;
          incrementScore();
        }
      }
    });

    const incrementScore = () => {
      gameRef.current.score += 1;
      gameRef.current.combo += 1;
      gameRef.current.multiplier = Math.floor(gameRef.current.combo / 10) + 1;
      if (gameRef.current.score >= 999) {
        gameRef.current.status = GameStatus.VICTORY;
      }
      if (gameRef.current.combo % 10 === 0) audio.playCombo(gameRef.current.multiplier);
      syncUI();
    };

    // Power Ups
    gameRef.current.powerUps.forEach(p => {
      if (!p.collected && Math.abs(p.x - pX) < 45 && Math.abs(p.y - pY) < 45) {
        p.collected = true;
        audio.playPowerUp();
        spawnShatter(p.x, p.y, COLORS.ACCENT_PURPLE, 20);
        gameRef.current.powerUp = p.type;
        gameRef.current.powerUpTimer = POWER_UP_DURATION;
        gameRef.current.isGhost = p.type === PowerUpType.GHOST;
        syncUI();
      }
    });

    if (gameRef.current.powerUpTimer > 0) {
      gameRef.current.powerUpTimer -= dt;
      if (gameRef.current.powerUpTimer <= 0) {
        gameRef.current.powerUp = null;
        gameRef.current.isGhost = false;
        syncUI();
      }
    }

    // Cleanup
    gameRef.current.obstacles = gameRef.current.obstacles.filter(o => o.y < height + 300);
    gameRef.current.powerUps = gameRef.current.powerUps.filter(p => p.y < height + 300 && !p.collected);

    render();
    requestRef.current = requestAnimationFrame(update);
  };

  const render = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    ctx.save();
    if (gameRef.current.shake > 0) {
      ctx.translate((Math.random() - 0.5) * gameRef.current.shake, (Math.random() - 0.5) * gameRef.current.shake);
    }

    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 1.5;
    const gridOffset = (gameRef.current.speed * 45) % 90;
    for (let y = -90; y < height + 90; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y + gridOffset);
      ctx.lineTo(width, y + gridOffset);
      ctx.stroke();
    }
    for (let x = 0; x < width + 90; x += 90) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Obstacles
    gameRef.current.obstacles.forEach(obs => {
      const currentXOffset = obs.xOffset || 0;
      if (obs.passed) ctx.globalAlpha = 0.1;
      
      ctx.fillStyle = COLORS[obs.color];
      const cornerRadius = 16;
      const gapInitial = 0.24;
      const difficultyGap = Math.max(0.08, gapInitial - (gameRef.current.score / 1200));
      const sideWidthPercent = (1 - difficultyGap) / 2;
      
      const drawGlassRect = (x: number, y: number, w: number, h: number) => {
        ctx.beginPath();
        // Manual rounded rect for maximum compatibility if needed, but roundRect is standard
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, cornerRadius);
        else ctx.rect(x, y, w, h);
        ctx.fill();

        if (obs.type === 'SWITCHER' && obs.switchTimer && obs.switchTimer < 600) {
           const pulse = (Math.sin(Date.now() / 45) * 0.5 + 0.5) * 0.5;
           ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
           ctx.lineWidth = 10;
           ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + 6, y + 6, w - 12, 10);
        
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(x + 6, y + h - 16, w - 12, 8);
        ctx.fillStyle = COLORS[obs.color];
      };

      if (obs.type === 'GATE' || obs.type === 'MOVING') {
        drawGlassRect(currentXOffset, obs.y, width * sideWidthPercent, obs.height);
        drawGlassRect(width * (1 - sideWidthPercent) + currentXOffset, obs.y, width * sideWidthPercent, obs.height);
      } else if (obs.type === 'BLOCK' || obs.type === 'SWITCHER') {
        const blockW = width * 0.65;
        drawGlassRect((width - blockW) / 2 + currentXOffset, obs.y, blockW, obs.height);
        if (obs.type === 'SWITCHER') {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 20px Inter';
          ctx.textAlign = 'center';
          ctx.fillText('⚡', width/2 + currentXOffset, obs.y + obs.height/2 + 8);
        }
      } else if (obs.type === 'ZIGZAG') {
        const blockW = width * 0.88;
        drawGlassRect((width - blockW) / 2 + currentXOffset, obs.y, blockW, obs.height);
      }
      ctx.globalAlpha = 1.0;
    });

    // Particles
    gameRef.current.particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-p.size/2, -p.size/2);
      ctx.lineTo(p.size/2, -p.size/5);
      ctx.lineTo(p.size/2.5, p.size/2);
      ctx.lineTo(-p.size/5, p.size/2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1.0;

    // Player
    const pX = width / 2;
    const pY = height * PHYSICS.PLAYER_Y;
    const pR = PHYSICS.BALL_RADIUS;
    
    // Trail
    const trailLen = 180;
    const trailGrad = ctx.createLinearGradient(pX, pY, pX, pY + trailLen);
    trailGrad.addColorStop(0, COLORS[gameRef.current.playerColor]);
    trailGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = trailGrad;
    ctx.fillRect(pX - pR, pY, pR * 2, trailLen);

    // Ball
    ctx.fillStyle = COLORS.WHITE;
    ctx.beginPath();
    ctx.arc(pX, pY, pR + 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = gameRef.current.isGhost ? COLORS.GHOST : COLORS[gameRef.current.playerColor];
    ctx.beginPath();
    ctx.arc(pX, pY, pR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(pX - 10, pY - 10, 10, 6, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    if (gameRef.current.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${gameRef.current.flash})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  return (
    <div 
      className="relative w-full h-screen overflow-hidden touch-none"
      onMouseDown={handleInput}
      onTouchStart={handleInput}
    >
      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="w-full h-full block" />

      {/* HUD */}
      {uiState.status === GameStatus.PLAYING && (
        <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none select-none">
          <div className="flex flex-col gap-2">
            <span className="text-[#333] font-fredoka text-6xl md:text-8xl drop-shadow-2xl transition-all">{uiState.score}</span>
            <span className="text-[#333]/60 text-[10px] font-black uppercase tracking-[0.3em] bg-white/80 px-4 py-2 rounded-xl shadow-sm border border-black/5 backdrop-blur-sm">RECORD: {uiState.highScore}</span>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <div className={`px-6 py-3 rounded-[2rem] text-xs font-black transition-all transform ${uiState.multiplier > 1 ? 'bg-[#FFD166] text-[#6A4C00] scale-110 shadow-lg border-b-4 border-[#E0B050]' : 'bg-[#333]/5 text-[#333]'}`}>
              {uiState.multiplier > 1 ? `x${uiState.multiplier} RUSH` : 'COMBO x1'}
            </div>
            {uiState.powerUp && (
              <div className="bg-[#06D6A0] text-white px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-tighter shadow-lg animate-bounce border-b-4 border-[#05B080]">
                {uiState.powerUp} ACTIVE
              </div>
            )}
          </div>
        </div>
      )}

      {/* Menus */}
      {uiState.status === GameStatus.MENU && (
        <div className="absolute inset-0 bg-[#FFF9F0]/80 backdrop-blur-2xl flex flex-col items-center justify-center text-[#333] p-10 transition-all">
          <div className="relative mb-16 animate-float text-center">
            <h1 className="text-7xl md:text-9xl font-fredoka leading-none tracking-tighter drop-shadow-lg">
              COLOR<br/><span className="text-[#2EC4B6]">FLIP</span><br/><span className="text-[#FF4D6D]">RUSH</span>
            </h1>
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-[#FFB703] rounded-full flex items-center justify-center text-white text-2xl font-black rotate-12 shadow-2xl border-6 border-white animate-pulse">GO!</div>
          </div>
          <button className="px-24 py-7 bg-[#333] text-[#FFF9F0] font-fredoka text-4xl tracking-widest rounded-[3rem] hover:scale-105 active:scale-95 transition-all shadow-2xl border-b-8 border-black">
            START
          </button>
          <div className="mt-16 flex flex-col items-center gap-4 text-[#333]/50">
             <p className="font-black uppercase text-xs tracking-[0.4em]">Tap to flip & match sides</p>
             <div className="flex gap-10 grayscale opacity-40">
                <div className="w-12 h-12 rounded-full border-6 border-[#333]"></div>
                <div className="w-12 h-12 rounded-full border-6 border-[#333] bg-[#333]"></div>
             </div>
          </div>
        </div>
      )}

      {uiState.status === GameStatus.GAMEOVER && (
        <div className="absolute inset-0 bg-white/98 flex flex-col items-center justify-center text-[#333] p-10 animate-in fade-in zoom-in duration-300">
          <div className="w-32 h-32 bg-[#FF4D6D] rounded-[2.5rem] mb-10 flex items-center justify-center text-white text-7xl font-black shadow-2xl -rotate-6">!</div>
          <h2 className="text-7xl font-fredoka text-center mb-10 tracking-tighter">CRASHED</h2>
          <div className="bg-[#333]/5 p-12 rounded-[4rem] text-center mb-12 w-full max-w-sm space-y-8 border border-black/5 shadow-inner">
            <div>
              <div className="text-[#333]/40 text-sm uppercase font-black tracking-[0.4em] mb-3">TOTAL SCORE</div>
              <div className="text-8xl font-fredoka text-[#333] leading-none">{uiState.score}</div>
            </div>
            <div className="h-0.5 bg-black/10 w-full" />
            <div className="flex justify-between items-center px-6">
               <span className="text-[#333]/40 text-xs font-black uppercase tracking-[0.3em]">BEST RUN</span>
               <span className="text-3xl font-fredoka text-[#333]">{uiState.highScore}</span>
            </div>
          </div>
          <button className="px-20 py-7 bg-[#2EC4B6] text-white font-fredoka text-3xl tracking-widest rounded-[3rem] hover:scale-105 active:scale-95 transition-all w-full max-w-sm shadow-2xl border-b-8 border-[#1F9B8F]">
            RETRY
          </button>
        </div>
      )}

      {uiState.status === GameStatus.VICTORY && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-10 overflow-hidden" style={{ background: 'linear-gradient(45deg, #FF4D6D, #7209B7, #2EC4B6, #FFB703)', backgroundSize: '400% 400%', animation: 'gradient 5s ease infinite' }}>
          <div className="text-[15rem] font-fredoka text-center leading-none mb-6 drop-shadow-2xl animate-pulse">999</div>
          <h2 className="text-6xl font-fredoka text-center mb-12 tracking-widest uppercase">COLOR SUPREME</h2>
          <div className="text-center z-10 max-w-md bg-white/40 backdrop-blur-3xl p-12 rounded-[5rem] border border-white/60 shadow-2xl">
            <p className="font-fredoka text-3xl mb-8">999 SHATTERED</p>
            <p className="text-lg opacity-95 font-bold leading-relaxed tracking-wider">Reflexes of a god. Barriers are mere glass. You have conquered the rush.</p>
          </div>
          <button onClick={() => setUiState(prev => ({ ...prev, status: GameStatus.MENU }))} className="mt-16 px-24 py-7 bg-white text-[#333] font-fredoka text-3xl tracking-widest rounded-full hover:bg-black hover:text-white transition-all shadow-2xl">
            CONTINUE
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
