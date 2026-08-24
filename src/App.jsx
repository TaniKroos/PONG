import { useCallback, useEffect, useRef, useState } from 'react';

const GAME_WIDTH = 500;
const GAME_HEIGHT = 700;

function App() {
  const canvasRef = useRef(null);
  const [isSoundOn, setIsSoundOn] = useState(true);

  const drawGame = useCallback(() => {
    // Canvas rendering is implemented here.
  }, []);

  useEffect(() => {
    drawGame();
  }, [drawGame]);

  return (
    <main className="min-h-screen">
      <canvas ref={canvasRef} width={GAME_WIDTH} height={GAME_HEIGHT} />
      <button type="button" onClick={() => setIsSoundOn((value) => !value)}>
        {isSoundOn ? 'Sound on' : 'Sound off'}
      </button>
    </main>
  );
}

export default App;
