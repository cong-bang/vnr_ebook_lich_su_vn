import { atom, useAtom } from "jotai";
import { useEffect, useState } from "react";
import historyBg from "../assets/images/history-vietnam-bg.jpeg";
import { Gamepad2 } from "lucide-react";
import { BookOpen } from "lucide-react";

/* --- danh sách ảnh tên file (giữ nguyên) --- */
const pictures = [
  "1.2-2.1-2.3-4_page-0001",
  "1.2-2.1-2.3-4_page-0002",
  "1.2-2.1-2.3-4_page-0003",
  "1.2-2.1-2.3-4_page-0004",
  "1.2-2.1-2.3-4_page-0005",
  "1.2-2.1-2.3-4_page-0006",
  "1.2-2.1-2.3-4_page-0007",
  "1.2-2.1-2.3-4_page-0008",
  "1.2-2.1-2.3-4_page-0009",
  "1.2-2.1-2.3-4_page-0010",
  "1.2-2.1-2.3-4_page-0011",
  "1.2-2.1-2.3-4_page-0012",
];

export const pageAtom = atom(0);

export const pages = [{ front: "book-cover", back: pictures[0] }];
for (let i = 1; i < pictures.length - 1; i += 2) {
  pages.push({
    front: pictures[i % pictures.length],
    back: pictures[(i + 1) % pictures.length],
  });
}
pages.push({
  front: pictures[pictures.length - 1],
  back: "book-back",
});

export const UI = ({ mode, setMode }) => {
  const [page, setPage] = useAtom(pageAtom);
  const [userInteracted, setUserInteracted] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const handleInteraction = () => setUserInteracted(true);
    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  useEffect(() => {
    if (!userInteracted) return;
    const audio = new Audio("/audios/page-flip-01a.mp3");
    audio.play().catch(() => {});
  }, [page, userInteracted]);

  const current = pages[page] || pages[0];

  return (
    <>
      {/* Thanh tiêu đề */}
      {mode === "book" && (
        <header className="fixed top-0 left-0 w-full z-20 bg-[#8B0000]/90 text-[#FFD700] shadow-md py-4 px-10 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-wide font-serif">
            Lịch Sử Việt Nam
          </h1>
          <span className="text-[#FAF3E0] italic text-lg">
            Hành trình đấu tranh giành độc lập (1930 - 1945)
          </span>
        </header>
      )}
      <div className="fixed top-20 right-6 z-30 flex flex-col gap-3">
        {mode === "book" ? (
          <button
            onClick={() => setMode("minigame")}
            className="bg-[#FFD700] text-[#8B0000] font-semibold px-4 py-2 rounded-lg shadow-lg hover:bg-[#FFA500] hover:scale-105 transition-all duration-300 flex items-center gap-2 border-2 border-[#8B0000]"
          >
            <Gamepad2 size={20} />
            <span className="text-sm">Mini Game</span>
          </button>
        ) : (
          <button
            onClick={() => setMode("book")}
            className="bg-[#8B0000] text-[#FFD700] font-semibold px-4 py-2 rounded-lg shadow-lg hover:bg-[#A52A2A] hover:scale-105 transition-all duration-300 flex items-center gap-2 border-2 border-[#FFD700]"
          >
            <BookOpen size={20} />
            <span className="text-sm">Xem Sách</span>
          </button>
        )}

        {/* Nút Xem Chi Tiết (dựa trên page hiện tại) */}
        {mode === "book" && (
          <button
            onClick={() => {
              if (page > 0 && page < pages.length) {
                setShowDetail(true);
              }
            }}
            disabled={page === 0 || page === pages.length}
            className={`px-5 py-2 rounded-lg font-semibold border-2 transition-all ${
              page === 0 || page === pages.length
                ? "bg-gray-600 text-gray-300 border-gray-400 cursor-not-allowed"
                : "bg-[#FFD700] text-[#8B0000] border-[#8B0000] hover:bg-[#FFA500]"
            }`}
          >
            Xem chi tiết
          </button>
        )}
      </div>
      {mode === "book" && (
        <main className="pointer-events-none select-none z-10 fixed inset-0 flex flex-col justify-end">
          <div className="w-full overflow-auto pointer-events-auto flex justify-center bg-gradient-to-t from-[#8B0000]/70 to-transparent py-6">
            <div className="overflow-auto flex items-center gap-3 max-w-full px-6">
              {[...pages].map((_, index) => (
                <button
                  key={index}
                  className={`transition-all duration-300 px-5 py-3 rounded-full text-base uppercase font-semibold border-2 font-serif
                ${
                  index === page
                    ? "bg-[#FFD700] text-[#8B0000] border-[#FFD700]"
                    : "bg-transparent text-[#FAF3E0] border-[#FFD700]/50 hover:bg-[#FFD700]/20"
                }`}
                  onClick={() => setPage(index)}
                >
                  {index === 0 ? "Bìa Trước" : `Trang ${index}`}
                </button>
              ))}

              <button
                className={`transition-all duration-300 px-5 py-3 rounded-full text-base uppercase font-semibold border-2 font-serif
              ${
                page === pages.length
                  ? "bg-[#FFD700] text-[#8B0000] border-[#FFD700]"
                  : "bg-transparent text-[#FAF3E0] border-[#FFD700]/50 hover:bg-[#FFD700]/20"
              }`}
                onClick={() => setPage(pages.length)}
              >
                Bìa Sau
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Hình nền */}
      <div
        className="fixed inset-0 bg-center bg-cover bg-no-repeat opacity-50 pointer-events-none animate-slow-pan"
        style={{
          backgroundImage: `url(${historyBg})`,
        }}
      ></div>

      {/* ----------------------------
          Modal: Hiển thị chi tiết trang
          ---------------------------- */}
      {/* Popup chi tiết – chỉ hiển thị nếu không phải bìa */}
      {showDetail && page > 0 && page < pages.length && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-[#FAF3E0] text-[#111] rounded-2xl shadow-2xl p-6 max-w-6xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-3xl font-serif font-bold mb-6 text-center text-[#8B0000]">
              Trang {page}
            </h3>

            {(() => {
              const startIndex = (page - 1) * 2;
              const frontImg = pictures[startIndex];
              const backImg = pictures[startIndex + 1];

              return (
                <div className="flex items-start gap-6">
                  <div className="flex-1 flex flex-col gap-4">
                    <img
                      src={`/textures/${frontImg}.jpg`}
                      alt={`Trang ${page} - ảnh 1`}
                      className="w-full h-auto rounded-lg border border-[#8B0000] shadow-md"
                    />
                    <p className="text-center text-sm italic text-[#555]">
                      {frontImg}
                    </p>
                  </div>

                  {backImg && (
                    <div className="flex-1 flex flex-col gap-4">
                      <img
                        src={`/textures/${backImg}.jpg`}
                        alt={`Trang ${page} - ảnh 2`}
                        className="w-full h-auto rounded-lg border border-[#8B0000] shadow-md"
                      />
                      <p className="text-center text-sm italic text-[#555]">
                        {backImg}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Mô tả */}
            {/* <div className="mt-6 text-[#333]">
              <h4 className="text-lg font-semibold mb-2">Mô tả:</h4>
              <p>{`Trang ${page} hiển thị hai hình ảnh lịch sử liên quan đến giai đoạn đấu tranh.`}</p>
            </div> */}

            <div className="mt-6 text-right">
              <button
                onClick={() => setShowDetail(false)}
                className="px-5 py-2 bg-[#8B0000] text-[#FFD700] rounded-lg font-semibold hover:bg-[#A52A2A] transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
