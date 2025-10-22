import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Lock,
  Trophy,
  RotateCcw,
  Shuffle,
  XCircle,
} from "lucide-react";
import historyBgUrl from "../assets/images/history-vietnam-bg.jpeg?url";
import { ALL_QUESTIONS } from "../data/question";

const ROWS = 2;
const COLS = 3;
const IMAGE_URL = historyBgUrl;
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

// --- CẮT ẢNH THÀNH NHIỀU MẢNH ---
async function sliceImage(url, rows, cols) {
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const baseW = Math.floor(w / cols);
  const baseH = Math.floor(h / rows);
  const extraW = w - baseW * cols;
  const extraH = h - baseH * rows;

  const colWidths = Array.from(
    { length: cols },
    (_, c) => baseW + (c < extraW ? 1 : 0)
  );
  const rowHeights = Array.from(
    { length: rows },
    (_, r) => baseH + (r < extraH ? 1 : 0)
  );
  const colX = colWidths.map((_, i) =>
    colWidths.slice(0, i).reduce((a, b) => a + b, 0)
  );
  const rowY = rowHeights.map((_, i) =>
    rowHeights.slice(0, i).reduce((a, b) => a + b, 0)
  );

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const pieces = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = colX[c];
      const sy = rowY[r];
      const sw = colWidths[c];
      const sh = rowHeights[r];
      canvas.width = sw;
      canvas.height = sh;
      ctx.clearRect(0, 0, sw, sh);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      pieces.push(canvas.toDataURL("image/jpeg", 0.92));
    }
  }
  const tileRatio = w / cols / (h / rows);
  return { pieces, tileRatio };
}

export const MiniGame = ({ onExit }) => {
  const [phase, setPhase] = useState("unlock");
  const [unlockedPieces, setUnlockedPieces] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [QUESTIONS, setQUESTIONS] = useState([]);
  const [unlockOrder, setUnlockOrder] = useState([]);
  const [pool, setPool] = useState([]);
  const [grid, setGrid] = useState(Array(ROWS * COLS).fill(null));
  const [dragged, setDragged] = useState(null);
  const [dragSource, setDragSource] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [tileSrcList, setTileSrcList] = useState([]);
  const [tileRatio, setTileRatio] = useState(1);

  // --- khởi tạo game ---
  useEffect(() => startNewGame(), []);
  useEffect(() => {
    let alive = true;
    sliceImage(IMAGE_URL, ROWS, COLS).then(({ pieces, tileRatio }) => {
      if (!alive) return;
      setTileSrcList(pieces);
      setTileRatio(tileRatio);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (phase === "puzzle") {
      const all = QUESTIONS.map((q) => ({
        ...q,
        src: tileSrcList[q.piece - 1],
      }));
      setPool(shuffle(all));
      setGrid(Array(ROWS * COLS).fill(null));
      setShowReport(false);
      setLastScore(0);
    }
  }, [phase, tileSrcList]);

  const startNewGame = () => {
    const selected = shuffle(ALL_QUESTIONS).slice(0, ROWS * COLS);
    const withPieces = selected.map((q, i) => ({
      ...q,
      piece: i + 1,
      position: { row: Math.floor(i / COLS) + 1, col: (i % COLS) + 1 },
    }));
    setQUESTIONS(withPieces);
    setUnlockOrder(shuffle(withPieces.map((q) => q.id)));
    setUnlockedPieces([]);
    setPhase("unlock");
  };

  // --- xử lý chọn câu ---
  const handlePieceClick = (pieceNum) => {
    if (unlockedPieces.includes(pieceNum)) return;
    const q = QUESTIONS.find((x) => x.piece === pieceNum);
    setCurrentQuestion(q);
    setShowResult(false);
  };

  const handleAnswer = (selectedIndex) => {
    if (!currentQuestion) return;
    const correct = selectedIndex === currentQuestion.correct;
    setIsCorrect(correct);
    setShowResult(true);
    if (correct) {
      setTimeout(() => {
        const newUnlocked = [...unlockedPieces, currentQuestion.piece];
        setUnlockedPieces(newUnlocked);
        setCurrentQuestion(null);
        setShowResult(false);
        if (newUnlocked.length === ROWS * COLS)
          setTimeout(() => setPhase("puzzle"), 600);
      }, 900);
    }
  };

  // --- Drag & Drop + Touch ---
  const onPoolDragStart = (e, piece) => {
    setDragged(piece);
    setDragSource("pool");
    e.dataTransfer?.setData("text/plain", piece.piece);
  };

  const onGridDragStart = (e, index) => {
    const piece = grid[index];
    if (!piece) return;
    setDragged(piece);
    setDragSource(index);
    e.dataTransfer?.setData("text/plain", piece.piece);
  };

  const onDragOver = (e) => e.preventDefault();

  const onDrop = (e, targetIndex) => {
    e.preventDefault?.();
    if (!dragged) return;
    const newGrid = [...grid];
    if (dragSource === "pool") {
      let newPool = pool.filter((p) => p.piece !== dragged.piece);
      if (newGrid[targetIndex]) newPool.push(newGrid[targetIndex]);
      newGrid[targetIndex] = dragged;
      setPool(newPool);
      setGrid(newGrid);
    } else if (typeof dragSource === "number") {
      const temp = newGrid[targetIndex];
      newGrid[targetIndex] = newGrid[dragSource];
      newGrid[dragSource] = temp || null;
      setGrid(newGrid);
    }
    setDragged(null);
    setDragSource(null);
    if (newGrid.every((cell) => cell !== null)) evaluate(newGrid);
  };

  // --- Touch fallback ---
  const handleTouchStart = (piece) => setDragged(piece);
  const handleTouchEnd = (index) => {
    if (dragged) onDrop({}, index);
  };

  const evaluate = (g) => {
    const correct = g.reduce(
      (acc, p, idx) => acc + (p && p.piece - 1 === idx ? 1 : 0),
      0
    );
    setLastScore(correct);
    if (correct === g.length) setTimeout(() => setPhase("complete"), 400);
    else setShowReport(true);
  };

  const resetGame = () => startNewGame();
  const resetPuzzleOnly = () => {
    const all = QUESTIONS.map((q) => ({ ...q, src: tileSrcList[q.piece - 1] }));
    setPool(shuffle(all));
    setGrid(Array(ROWS * COLS).fill(null));
    setShowReport(false);
    setLastScore(0);
  };

  const TileImg = ({ src }) => (
    <img
      src={src}
      alt=""
      className="absolute inset-0 w-full h-full object-cover select-none"
      draggable={false}
    />
  );

  const DraggablePiece = ({ piece }) => (
    <div
      draggable
      onDragStart={(e) => onPoolDragStart(e, piece)}
      onTouchStart={() => handleTouchStart(piece)}
      style={{ aspectRatio: tileRatio }}
      className="relative w-24 sm:w-32 rounded-lg border-4 border-[#FFD700] cursor-grab active:cursor-grabbing hover:scale-110 transition-all overflow-hidden shadow-lg"
    >
      <TileImg src={piece.src} />
    </div>
  );

  const DropZone = ({ index, piece }) => (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onTouchEnd={() => handleTouchEnd(index)}
      onDragStart={(e) => onGridDragStart(e, index)}
      draggable={!!piece}
      style={{ aspectRatio: tileRatio }}
      className={`relative rounded-lg border-4 border-dashed transition-all overflow-hidden ${
        piece ? "border-[#FFD700]" : "border-[#FFD700]/30 bg-black/40"
      }`}
    >
      {piece ? (
        <TileImg src={piece.src} />
      ) : (
        <div className="flex items-center justify-center h-full text-[#FFD700]/50 text-xl">
          {index + 1}
        </div>
      )}
    </div>
  );

  // --- COMPLETE ---
  if (phase === "complete")
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#400000] via-[#8B0000] to-[#600000] text-white flex flex-col items-center justify-center p-4 overflow-y-auto">
        <Trophy size={90} className="text-[#FFD700] mb-4 animate-bounce" />
        <p className="text-2xl text-[#FAF3E0] mb-1">
          Bạn đã hoàn thành bức tranh!
        </p>
        <p className="text-lg text-[#FFD700] font-semibold mb-4">
          Kết quả: {lastScore}/{ROWS * COLS}
        </p>
        <img
          src={IMAGE_URL}
          className="rounded-xl w-full max-w-md mb-6 border-4 border-[#FFD700]"
        />
        <button
          onClick={resetGame}
          className="px-6 py-3 bg-[#FFD700] text-[#8B0000] rounded-lg font-bold hover:bg-[#FFA500] flex items-center gap-2"
        >
          <RotateCcw size={20} /> Chơi lại
        </button>
      </div>
    );

  // --- PUZZLE ---
  if (phase === "puzzle")
    return (
      <div className="fixed inset-0 overflow-y-auto bg-gradient-to-br from-[#400000] via-[#8B0000] to-[#600000] text-white flex flex-col items-center p-4 pb-24">
        <h2 className="text-3xl font-bold text-[#FFD700] mt-4 mb-4">
          Mảnh Ghép Lịch Sử
        </h2>
        <button
          onClick={resetPuzzleOnly}
          className="px-4 py-2 bg-[#FFD700] text-[#8B0000] rounded-md font-bold hover:bg-[#FFA500] transition-all flex gap-2 mb-4"
        >
          <RotateCcw size={18} /> Ghép lại
        </button>

        <div className="bg-black/40 border border-[#FFD700]/40 rounded-xl p-3 shadow-2xl backdrop-blur-sm w-full max-w-[700px] mb-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {grid.map((piece, index) => (
              <DropZone key={index} index={index} piece={piece} />
            ))}
          </div>
        </div>

        <div className="bg-black/40 border border-[#FFD700]/40 rounded-xl p-3 shadow-xl w-full max-w-[700px] flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <h3 className="text-lg font-semibold text-[#FFD700] flex items-center gap-2">
              <Shuffle size={18} /> Các mảnh còn lại
            </h3>
            <button
              onClick={() => setPool(shuffle(pool))}
              className="text-xs px-3 py-1 border border-[#FFD700]/50 rounded-md"
            >
              Xáo lại
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 justify-items-center">
            {pool.map((piece) => (
              <DraggablePiece key={piece.id} piece={piece} />
            ))}
          </div>
          {pool.length === 0 && (
            <p className="text-[#FAF3E0]/70 text-sm italic mt-2">
              Tất cả mảnh ghép đang trên lưới
            </p>
          )}
        </div>

        {showReport && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-20">
            <div className="bg-gradient-to-br from-[#8B0000] to-[#600000] border-2 border-[#FFD700] rounded-2xl p-8 text-center">
              <XCircle size={64} className="text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#FFD700] mb-2">
                Chưa khớp hoàn toàn
              </h3>
              <p className="text-[#FAF3E0] text-base mb-6">
                Bạn ghép đúng{" "}
                <span className="font-semibold text-[#FFD700]">
                  {lastScore}/{ROWS * COLS}
                </span>{" "}
                mảnh.
              </p>
              <button
                onClick={resetPuzzleOnly}
                className="px-4 py-2 bg-[#FFD700] text-[#8B0000] rounded-md font-bold hover:bg-[#FFA500] transition-all flex items-center gap-2 mx-auto"
              >
                <RotateCcw size={18} /> Ghép lại
              </button>
            </div>
          </div>
        )}
      </div>
    );

  // --- UNLOCK ---
  const unlockedList = QUESTIONS.map((q) => ({
    ...q,
    src: tileSrcList[q.piece - 1],
  }));
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#400000] via-[#8B0000] to-[#600000] text-white flex flex-col items-center p-4 overflow-y-auto">
      <h2 className="text-3xl sm:text-4xl font-bold text-[#FFD700] mt-8 mb-2">
        Mở Khóa Lịch Sử
      </h2>
      <p className="text-base sm:text-lg text-[#FAF3E0] italic mb-3">
        Trả lời đúng để mở khóa từng mảnh ghép!
      </p>
      <div className="bg-[#FFD700]/20 px-5 py-2 rounded-full border border-[#FFD700] mb-4">
        <span className="text-[#FFD700] font-bold text-lg">
          {unlockedPieces.length}/{ROWS * COLS} mảnh ghép
        </span>
      </div>

      <div className="bg-black/40 border-2 border-[#FFD700]/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm max-w-3xl w-full mb-6">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {unlockOrder.map((id) => {
            const q = unlockedList.find((x) => x.id === id);
            const isUnlocked = unlockedPieces.includes(q.piece);
            return (
              <div
                key={q.id}
                onClick={() => !isUnlocked && handlePieceClick(q.piece)}
                style={{ aspectRatio: tileRatio }}
                className={`relative rounded-lg border-4 overflow-hidden transition-all duration-500 ${
                  isUnlocked
                    ? "border-[#FFD700]"
                    : "cursor-pointer border-[#FFD700]/30 hover:border-[#FFD700]/50 hover:scale-105"
                }`}
              >
                {isUnlocked ? (
                  <>
                    <TileImg src={q.src} />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/15 to-transparent"></div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-sm flex items-center justify-center">
                    <Lock size={36} className="text-[#FFD700]/50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {currentQuestion && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-20">
          <div className="bg-gradient-to-br from-[#8B0000] to-[#600000] border-4 border-[#FFD700] rounded-2xl p-6 max-w-md sm:max-w-2xl w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="bg-[#FFD700] text-[#8B0000] w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-3">
                {currentQuestion.piece}
              </div>
              <h3 className="text-lg sm:text-2xl font-bold text-[#FFD700]">
                {currentQuestion.question}
              </h3>
            </div>

            {!showResult ? (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="bg-[#FFD700]/10 hover:bg-[#FFD700]/30 border-2 border-[#FFD700] text-[#FAF3E0] py-3 px-4 rounded-lg font-semibold text-base sm:text-lg transition-all hover:scale-105"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div
                className={`text-center p-4 rounded-xl ${
                  isCorrect
                    ? "bg-green-500/20 border-2 border-green-500"
                    : "bg-red-500/20 border-2 border-red-500"
                }`}
              >
                <p
                  className={`text-2xl font-bold mb-2 ${
                    isCorrect ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isCorrect ? "✓ CHÍNH XÁC!" : "✗ SAI RỒI!"}
                </p>
                <p className="text-[#FAF3E0] text-base sm:text-lg">
                  {isCorrect
                    ? "Mảnh ghép đang được mở khóa..."
                    : "Hãy thử lại nhé!"}
                </p>
                {!isCorrect && (
                  <button
                    onClick={() => {
                      setCurrentQuestion(null);
                      setShowResult(false);
                    }}
                    className="mt-3 px-5 py-2 bg-[#FFD700] text-[#8B0000] rounded-lg font-bold hover:bg-[#FFA500]"
                  >
                    Thử lại
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
