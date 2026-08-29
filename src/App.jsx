import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const GAME_WIDTH = 500;
const GAME_HEIGHT = 700;
const PADDLE_WIDTH = 88;
const PADDLE_HEIGHT = 12;
const INITIAL_GAME = {
  ballX: GAME_WIDTH / 2,
  ballY: GAME_HEIGHT / 2,
  paddleX: [206, 206],
  score: [0, 0],
};

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    sound: <><path d="M4 10v4h4l5 4V6L8 10H4Z" /><path d="M16 9.5a4 4 0 0 1 0 5M18.8 6.8a8 8 0 0 1 0 10.4" /></>,
    mute: <><path d="M4 10v4h4l5 4V6L8 10H4Z" /><path d="m16 10 4 4m0-4-4 4" /></>,
    spark: <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" />,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    arrows: <><path d="M8 5 5 8l3 3M5 8h14M16 19l3-3-3-3M19 16H5" /></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const gameRef = useRef({ ...INITIAL_GAME, running: false, referee: false, paddleIndex: 0, speedX: 0, speedY: 3, direction: 1, moved: false, message: 'Connecting to arena...' });
  const [status, setStatus] = useState('Connecting');
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [score, setScore] = useState([0, 0]);
  const [isLive, setIsLive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const socket = io('/pong');
    socketRef.current = socket;
    let frame;

    const draw = () => {
      const game = gameRef.current;
      const gradient = context.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT);
      gradient.addColorStop(0, '#111326');
      gradient.addColorStop(1, '#070812');
      context.fillStyle = gradient;
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      context.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      context.setLineDash([9, 12]);
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(20, GAME_HEIGHT / 2);
      context.lineTo(GAME_WIDTH - 20, GAME_HEIGHT / 2);
      context.stroke();
      context.setLineDash([]);

      context.fillStyle = 'rgba(255, 255, 255, 0.05)';
      context.font = '600 118px Space Grotesk, sans-serif';
      context.textAlign = 'center';
      context.fillText(game.score[1], GAME_WIDTH / 2, 160);
      context.fillText(game.score[0], GAME_WIDTH / 2, GAME_HEIGHT - 78);

      [[1, 26, '#a78bfa'], [0, GAME_HEIGHT - 38, '#fbbf24']].forEach(([index, y, color]) => {
        const x = game.paddleX[index];
        context.shadowColor = color;
        context.shadowBlur = 20;
        context.fillStyle = color;
        context.fillRect(x, y, PADDLE_WIDTH, PADDLE_HEIGHT);
        context.shadowBlur = 0;
      });

      context.beginPath();
      context.arc(game.ballX, game.ballY, 8, 0, Math.PI * 2);
      context.shadowColor = '#ffffff';
      context.shadowBlur = 22;
      context.fillStyle = '#ffffff';
      context.fill();
      context.shadowBlur = 0;

      if (!game.running) {
        context.fillStyle = 'rgba(7, 8, 18, 0.62)';
        context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        context.fillStyle = '#f8fafc';
        context.font = '600 22px Space Grotesk, sans-serif';
        context.textAlign = 'center';
        context.fillText(game.message, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 5);
        context.fillStyle = '#94a3b8';
        context.font = '15px DM Sans, sans-serif';
        context.fillText('Share this page to start a match', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 29);
      }
    };

    const resetBall = () => {
      const game = gameRef.current;
      game.ballX = GAME_WIDTH / 2;
      game.ballY = GAME_HEIGHT / 2;
      game.speedY = 3;
    };

    const animate = () => {
      const game = gameRef.current;
      if (game.running && !game.paused && game.referee) {
        game.ballY += game.speedY * game.direction;
        if (game.moved) game.ballX += game.speedX;
        if ((game.ballX < 8 && game.speedX < 0) || (game.ballX > GAME_WIDTH - 8 && game.speedX > 0)) game.speedX *= -1;
        const hitBottom = game.ballY > GAME_HEIGHT - 40;
        const hitTop = game.ballY < 40;
        if (hitBottom || hitTop) {
          const paddle = hitBottom ? 0 : 1;
          if (game.ballX >= game.paddleX[paddle] && game.ballX <= game.paddleX[paddle] + PADDLE_WIDTH) {
            game.speedY = Math.min(game.speedY + (game.moved ? 0.18 : 0), 6);
            game.direction *= -1;
            game.speedX = (game.ballX - (game.paddleX[paddle] + PADDLE_WIDTH / 2)) * 0.085;
          } else {
            game.score[hitBottom ? 1 : 0] += 1;
            setScore([...game.score]);
            resetBall();
          }
        }
        socket.emit('ballMove', { ballX: game.ballX, ballY: game.ballY, score: game.score });
      }
      draw();
      frame = requestAnimationFrame(animate);
    };

    socket.on('connect', () => { gameRef.current.message = 'Waiting for challenger...'; setStatus('Searching'); socket.emit('ready'); });
    socket.on('startGame', (refereeId) => {
      const game = gameRef.current;
      game.referee = socket.id === refereeId;
      game.paddleIndex = game.referee ? 0 : 1;
      game.running = true;
      game.message = 'Match live';
      setStatus('Match live');
      setIsLive(true);
    });
    socket.on('paddleMove', ({ xPosition }) => {
      const game = gameRef.current;
      game.paddleX[1 - game.paddleIndex] = xPosition;
    });
    socket.on('ballMove', ({ ballX, ballY, score: nextScore }) => {
      const game = gameRef.current;
      if (!game.referee) { game.ballX = ballX; game.ballY = ballY; game.score = nextScore; setScore([...nextScore]); }
    });
    socket.on('disconnect', () => { gameRef.current.running = false; gameRef.current.message = 'Reconnecting to arena...'; setIsLive(false); setStatus('Reconnecting'); });

    const movePaddle = (event) => {
      const rect = canvas.getBoundingClientRect();
      const game = gameRef.current;
      const scale = GAME_WIDTH / rect.width;
      game.moved = true;
      game.paddleX[game.paddleIndex] = Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, (event.clientX - rect.left) * scale - PADDLE_WIDTH / 2));
      socket.emit('paddleMove', { xPosition: game.paddleX[game.paddleIndex] });
    };
    canvas.addEventListener('pointermove', movePaddle);
    animate();

    return () => { cancelAnimationFrame(frame); canvas.removeEventListener('pointermove', movePaddle); socket.disconnect(); };
  }, []);

  const togglePause = () => {
    if (!gameRef.current.running) return;
    gameRef.current.paused = !gameRef.current.paused;
    setIsPaused(gameRef.current.paused);
  };

  const statusStyle = isLive ? 'bg-emerald-400' : 'bg-amber-300';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080914] px-5 py-6 text-slate-50 selection:bg-violet-400/30 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(111,75,227,.23),transparent_29%),radial-gradient(circle_at_86%_80%,rgba(14,165,233,.15),transparent_28%)]" />
      <div className="relative mx-auto max-w-7xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <a className="font-display text-xl font-bold tracking-[-0.06em] sm:text-2xl" href="/">NEON<span className="text-violet-400">PONG</span></a>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-400 sm:block">Multiplayer arcade</span>
            <button aria-label="Toggle sound" type="button" onClick={() => setIsSoundOn((value) => !value)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white">
              <Icon name={isSoundOn ? 'sound' : 'mute'} />
            </button>
          </div>
        </header>

        <section className="grid items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(430px,560px)] lg:py-14">
          <div className="order-2 max-w-xl lg:order-1">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-200"><Icon name="spark" className="h-3.5 w-3.5" /> Classic game. New energy.</div>
            <h1 className="font-display text-5xl font-bold leading-[.95] tracking-[-0.07em] text-white sm:text-6xl xl:text-7xl">The arcade<br /><span className="text-transparent [background:linear-gradient(100deg,#c4b5fd,#60a5fa)] bg-clip-text">is calling.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-400 sm:text-lg">A precision-built multiplayer Pong experience. Move your paddle, read your opponent, and own the rally.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300"><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-4 py-3"><Icon name="arrows" className="h-4 w-4 text-violet-300" /> Move your cursor to play</div><div className="rounded-xl border border-white/10 bg-white/[.035] px-4 py-3"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" /> Real-time multiplayer</div></div>
            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/10 pt-6"><div><p className="text-2xl font-semibold tracking-tight text-white">01</p><p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">Arena</p></div><div><p className="text-2xl font-semibold tracking-tight text-white">∞</p><p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">Rallies</p></div><div><p className="text-2xl font-semibold tracking-tight text-white">LIVE</p><p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">Matchmaking</p></div></div>
          </div>

          <div className="order-1 mx-auto w-full max-w-[560px] lg:order-2">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#101120]/75 p-3 shadow-glow backdrop-blur-sm sm:p-4">
              <div className="mb-3 flex items-center justify-between px-2 pt-1 text-xs font-medium"><span className="flex items-center gap-2 text-slate-400"><span className={`h-2 w-2 rounded-full ${statusStyle} ${isLive ? 'animate-pulse' : ''}`} /> {status}</span><span className="text-slate-500">ROOM / AUTO-MATCH</span></div>
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#090a15]"><canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} className="block h-auto w-full touch-none" aria-label="Multiplayer Pong game" /><div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-4 text-[10px] font-bold uppercase tracking-[0.22em]"><span className="rounded-md bg-amber-300/10 px-2 py-1 text-amber-200">You</span><span className="rounded-md bg-violet-300/10 px-2 py-1 text-violet-200">Rival</span></div><div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between p-4 text-xs font-semibold uppercase tracking-[0.18em]"><span className="text-amber-200">Score · {score[0]}</span><span className="text-violet-200">Score · {score[1]}</span></div></div>
              <div className="mt-3 flex items-center justify-between px-2 pb-1"><p className="text-xs text-slate-500">First to 11 wins the arena.</p><button type="button" onClick={togglePause} disabled={!isLive} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"><Icon name="pause" className="h-3.5 w-3.5" /> {isPaused ? 'Resume' : 'Pause'}</button></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
