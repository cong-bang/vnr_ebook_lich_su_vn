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

// --- CẮT ẢNH THÀNH 6 MẢNH, PHÂN BỔ PIXEL DƯ ĐỀU CHO CÁC CỘT/HÀNG ---
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

      // JPEG cho nhẹ, 0.92 chất lượng tốt; có thể đổi "image/png" nếu muốn lossless
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      pieces.push(dataUrl);
    }
  }

  const tileRatio = w / cols / (h / rows); // aspect-ratio của từng mảnh
  return { pieces, tileRatio };
}

export const MiniGame = ({ onExit }) => {
  const [phase, setPhase] = useState("unlock");
  const [unlockedPieces, setUnlockedPieces] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [QUESTIONS, setQUESTIONS] = useState([]);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    // Chọn 6 câu ngẫu nhiên
    const selected = shuffle(ALL_QUESTIONS).slice(0, ROWS * COLS);
    // Gắn số mảnh và vị trí cho từng câu
    const withPieces = selected.map((q, i) => ({
      ...q,
      piece: i + 1,
      position: {
        row: Math.floor(i / COLS) + 1,
        col: (i % COLS) + 1,
      },
    }));
    setQUESTIONS(withPieces);
    setUnlockOrder(shuffle(withPieces.map((q) => q.id)));
    setUnlockedPieces([]);
    setPhase("unlock");
  };

  // unlock random order
  const [unlockOrder, setUnlockOrder] = useState(() =>
    shuffle(QUESTIONS.map((q) => q.id))
  );

  // puzzle states
  const [pool, setPool] = useState([]); // các mảnh còn lại để kéo
  const [grid, setGrid] = useState(Array(ROWS * COLS).fill(null)); // mảng 6 ô
  const [dragged, setDragged] = useState(null); // {piece, src}
  const [dragSource, setDragSource] = useState(null); // "pool" | number(index)
  const [showReport, setShowReport] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  // slice results
  const [tileSrcList, setTileSrcList] = useState([]); // length 6, theo thứ tự 1..6
  const [tileRatio, setTileRatio] = useState(1); // aspect-ratio cho box của từng mảnh

  // Cắt ảnh 1 lần khi mount
  useEffect(() => {
    let alive = true;
    sliceImage(IMAGE_URL, ROWS, COLS).then(({ pieces, tileRatio }) => {
      if (!alive) return;
      setTileSrcList(pieces); // index 0→ mảnh 1, ... index 5→ mảnh 6
      setTileRatio(tileRatio);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Khi đủ 6 mảnh mở khóa => sang puzzle, chuẩn bị pool
  useEffect(() => {
    if (phase === "puzzle") {
      // tạo pool gồm full QUESTIONS, attach src tương ứng
      const all = QUESTIONS.map((q, i) => ({
        ...q,
        src: tileSrcList[q.piece - 1],
      }));
      setPool(shuffle(all));
      setGrid(Array(ROWS * COLS).fill(null));
      setShowReport(false);
      setLastScore(0);
    }
  }, [phase, tileSrcList]);

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
        if (newUnlocked.length === ROWS * COLS) {
          setTimeout(() => setPhase("puzzle"), 600);
        }
      }, 900);
    }
  };

  const onPoolDragStart = (e, piece) => {
    setDragged(piece);
    setDragSource("pool");
    e.dataTransfer.effectAllowed = "move";
  };
  const onGridDragStart = (e, index) => {
    const piece = grid[index];
    if (!piece) return;
    setDragged(piece);
    setDragSource(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const evaluate = (g) => {
    const correct = g.reduce(
      (acc, p, idx) => acc + (p && p.piece - 1 === idx ? 1 : 0),
      0
    );
    setLastScore(correct);
    if (correct === g.length) {
      setTimeout(() => setPhase("complete"), 400);
    } else {
      setShowReport(true);
    }
  };

  const onDrop = (e, targetIndex) => {
    e.preventDefault();
    if (!dragged) return;

    const newGrid = [...grid];

    if (dragSource === "pool") {
      const fromPool = dragged;
      let newPool = pool.filter((p) => p.piece !== fromPool.piece);
      if (newGrid[targetIndex]) {
        newPool.push(newGrid[targetIndex]);
      }
      newGrid[targetIndex] = fromPool;
      setPool(newPool);
      setGrid(newGrid);
    } else if (typeof dragSource === "number") {
      const srcIndex = dragSource;
      if (srcIndex !== targetIndex) {
        const temp = newGrid[targetIndex];
        newGrid[targetIndex] = newGrid[srcIndex];
        newGrid[srcIndex] = temp || null;
        setGrid(newGrid);
      }
    }

    setDragged(null);
    setDragSource(null);

    if (newGrid.every((cell) => cell !== null)) evaluate(newGrid);
  };

  const resetGame = () => {
    startNewGame();
    setCurrentQuestion(null);
    setShowResult(false);
    setPool([]);
    setGrid(Array(ROWS * COLS).fill(null));
    setShowReport(false);
    setLastScore(0);
  };

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
      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
      draggable={false}
    />
  );

  const PuzzlePiece = ({ idDisplay, unlocked, src, onClick }) => (
    <div
      onClick={onClick}
      style={{ aspectRatio: tileRatio }}
      className={`relative rounded-lg border-4 overflow-hidden transition-all duration-500
        ${
          unlocked
            ? "border-[#FFD700]"
            : "cursor-pointer border-[#FFD700]/30 hover:border-[#FFD700]/50 hover:scale-105"
        }`}
    >
      {unlocked ? (
        <>
          <TileImg src={src} />
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/15 to-transparent"></div>
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-sm flex items-center justify-center">
          <Lock size={48} className="text-[#FFD700]/50" />
        </div>
      )}
      {/* <div className="absolute bottom-2 right-2 bg-[#8B0000] text-[#FFD700] w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-[#FFD700]">
        {idDisplay}
      </div> */}
    </div>
  );

  const DraggablePiece = ({ piece }) => (
    <div
      draggable
      onDragStart={(e) => onPoolDragStart(e, piece)}
      style={{ aspectRatio: tileRatio }}
      className="relative w-32 rounded-lg border-4 border-[#FFD700] cursor-grab active:cursor-grabbing hover:scale-110 transition-all overflow-hidden shadow-lg"
    >
      <TileImg src={piece.src} />
      {/* <div className="absolute bottom-1 right-1 bg-[#8B0000] text-[#FFD700] w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm border-2 border-[#FFD700]">
        {piece.piece}
      </div> */}
    </div>
  );

  const DropZone = ({ index, piece }) => (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onDragStart={(e) => onGridDragStart(e, index)}
      draggable={!!piece}
      style={{ aspectRatio: tileRatio }}
      className={`relative rounded-lg border-4 border-dashed transition-all overflow-hidden
        ${piece ? "border-[#FFD700]" : "border-[#FFD700]/30 bg-black/40"}`}
    >
      {piece ? (
        <>
          <TileImg src={piece.src} />
          {/* <div className="absolute bottom-1 right-1 bg-[#8B0000] text-[#FFD700] w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm border-2 border-[#FFD700]">
            {piece.piece}
          </div> */}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#FFD700]/50 text-4xl font-bold">
            {index + 1}
          </span>
        </div>
      )}
    </div>
  );

  // ================= COMPLETE =================
  if (phase === "complete") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#400000] via-[#8B0000] to-[#600000] text-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Trophy
            size={100}
            className="text-[#FFD700] mx-auto mb-6 animate-bounce"
          />
          <p className="text-2xl text-[#FAF3E0] mb-2">
            Bạn đã hoàn thành bức tranh lịch sử!
          </p>
          <p className="text-lg text-[#FFD700] font-semibold mb-6">
            Kết quả: {lastScore}/{ROWS * COLS} mảnh ghép đúng
          </p>

          <div className="bg-black/40 border-4 border-[#FFD700] rounded-2xl p-4 max-w-3xl mx-auto mb-6 backdrop-blur-sm">
            <img
              src={IMAGE_URL}
              alt="Bức tranh lịch sử hoàn chỉnh"
              className="w-full rounded-lg"
            />
          </div>

          <button
            onClick={resetGame}
            className="px-6 py-3 bg-[#FFD700] text-[#8B0000] rounded-lg font-bold hover:bg-[#FFA500] transition-all flex items-center gap-2 mx-auto"
          >
            <RotateCcw size={20} />
            Chơi lại
          </button>
        </div>
      </div>
    );
  }

  // ================= PUZZLE =================
  if (phase === "puzzle") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#400000] via-[#8B0000] to-[#600000] text-white flex flex-col items-center justify-start pt-20 pb-10 overflow-y-auto">
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold font-serif text-[#FFD700] mb-4 tracking-wide">
            Mảnh Ghép Lịch Sử
          </h2>
          <button
            onClick={resetPuzzleOnly}
            className="px-4 py-2 bg-[#FFD700] text-[#8B0000] rounded-md font-bold hover:bg-[#FFA500] transition-all flex justify-center items-center gap-2 mx-auto w-full sm:w-auto"
          >
            <RotateCcw size={18} />
            Ghép lại từ đầu
          </button>
        </div>

        {/* Puzzle grid */}
        <div className="bg-black/40 border border-[#FFD700]/40 rounded-xl p-5 shadow-2xl backdrop-blur-sm max-w-[700px] w-full mx-auto mb-8">
          <div className="grid grid-cols-3 gap-3">
            {grid.map((piece, index) => (
              <DropZone key={index} index={index} piece={piece} />
            ))}
          </div>
        </div>

        {/* Pool area */}
        <div className="bg-black/40 border border-[#FFD700]/40 rounded-xl p-5 shadow-xl backdrop-blur-sm w-full max-w-[700px] flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <div className="flex items-center gap-2">
              <Shuffle size={18} className="text-[#FFD700]" />
              <h3 className="text-lg font-semibold text-[#FFD700]">
                Các mảnh còn lại
              </h3>
            </div>
            <button
              className="text-xs px-3 py-1 border border-[#FFD700]/50 rounded-md hover:bg-[#FFD700]/10 transition-all"
              onClick={() => setPool(shuffle(pool))}
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
            <p className="text-[#FAF3E0]/70 text-sm italic text-center py-3">
              Tất cả mảnh ghép đang trên lưới
            </p>
          )}
        </div>

        {/* Result overlay when not perfect */}
        {showReport && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-20">
            <div className="bg-gradient-to-br from-[#8B0000] to-[#600000] border-2 border-[#FFD700] rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
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

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={resetPuzzleOnly}
                  className="px-4 py-2 bg-[#FFD700] text-[#8B0000] rounded-md font-bold hover:bg-[#FFA500] transition-all flex items-center gap-2 w-full sm:w-auto"
                >
                  <RotateCcw size={18} />
                  Ghép lại từ đầu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ================= UNLOCK =================
  const unlockedList = QUESTIONS.map((q) => ({
    ...q,
    src: tileSrcList[q.piece - 1],
  }));

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#400000] via-[#8B0000] to-[#600000] text-white flex flex-col items-center justify-center p-6 overflow-auto">
      <div className="text-center mb-6 mt-20">
        <h2 className="text-4xl font-bold font-serif text-[#FFD700] mb-2">
          Mở Khóa Lịch Sử
        </h2>
        <p className="text-lg text-[#FAF3E0] italic">
          Trả lời đúng để mở khóa từng mảnh ghép!
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="bg-[#FFD700]/20 px-6 py-2 rounded-full border border-[#FFD700]">
            <span className="text-[#FFD700] font-bold text-xl">
              {unlockedPieces.length}/{ROWS * COLS} mảnh ghép
            </span>
          </div>
        </div>
      </div>

      <div className="bg-black/40 border-2 border-[#FFD700]/50 rounded-2xl p-8 shadow-2xl backdrop-blur-sm max-w-3xl w-full mb-6">
        <div className="grid grid-cols-3 gap-4">
          {unlockOrder.map((id) => {
            const q = unlockedList.find((x) => x.id === id);
            const isUnlocked = unlockedPieces.includes(q.piece);
            return (
              <div
                key={q.id}
                onClick={() => !isUnlocked && handlePieceClick(q.piece)}
                style={{ aspectRatio: tileRatio }}
                className={`relative rounded-lg border-4 overflow-hidden transition-all duration-500
                  ${
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
                    <Lock size={48} className="text-[#FFD700]/50" />
                  </div>
                )}
                {/* <div className="absolute bottom-2 right-2 bg-[#8B0000] text-[#FFD700] w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-[#FFD700]">
                  {q.piece}
                </div> */}
              </div>
            );
          })}
        </div>
      </div>

      {currentQuestion && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-20">
          <div className="bg-gradient-to-br from-[#8B0000] to-[#600000] border-4 border-[#FFD700] rounded-2xl p-8 max-w-2xl w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="bg-[#FFD700] text-[#8B0000] w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                {currentQuestion.piece}
              </div>
              <h3 className="text-2xl font-bold text-[#FFD700] mb-4">
                {currentQuestion.question}
              </h3>
            </div>

            {!showResult ? (
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="bg-[#FFD700]/10 hover:bg-[#FFD700]/30 border-2 border-[#FFD700] text-[#FAF3E0] py-4 px-6 rounded-lg font-semibold text-lg transition-all hover:scale-105"
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <div
                className={`text-center p-6 rounded-xl ${
                  isCorrect
                    ? "bg-green-500/20 border-2 border-green-500"
                    : "bg-red-500/20 border-2 border-red-500"
                }`}
              >
                <p
                  className={`text-3xl font-bold mb-2 ${
                    isCorrect ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isCorrect ? "✓ CHÍNH XÁC!" : "✗ SAI RỒI!"}
                </p>
                <p className="text-[#FAF3E0] text-lg">
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
                    className="mt-4 px-6 py-2 bg-[#FFD700] text-[#8B0000] rounded-lg font-bold hover:bg-[#FFA500] transition-all"
                  >
                    Thử lại
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-[#FFD700]/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
};
