import { useState, Suspense } from "react";
import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";
import { MiniGame } from "./components/MiniGame";
import { pages } from "./components/UI";
import ChatBox from "./components/Chatbox";
function App() {
  const [mode, setMode] = useState("book");
  const [selectedPage, setSelectedPage] = useState(null);

  return (
    <>
      <UI mode={mode} setMode={setMode} selectedPage={selectedPage} />
      <Loader />
      {/* Hiển thị quyển sách 3D */}
      {mode === "book" && (
        <Canvas
          shadows
          style={{ background: "transparent" }}
          camera={{
            position: [-0.5, 1, window.innerWidth > 800 ? 4 : 9],
            fov: 45,
          }}
        >
          <group position-y={0}>
            <Suspense fallback={null}>
              <Experience onPageSelect={setSelectedPage} />
            </Suspense>
          </group>
        </Canvas>
      )}
      {/* MiniGame hiển thị riêng */}
      {mode === "minigame" && <MiniGame onExit={() => setMode("book")} />}
      {/* Giao diện xem chi tiết */}
      {mode === "showdetail" && selectedPage && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#111]/95 text-[#FFD700] z-50">
          <h2 className="text-2xl font-serif font-bold mb-6">
            Chi Tiết Trang {selectedPage.number}
          </h2>

          <img
            src={`/textures/${selectedPage.front}.jpg`}
            alt={`Trang ${selectedPage.number}`}
            className="max-w-[80%] max-h-[70vh] rounded-lg shadow-lg border-4 border-[#FFD700]"
          />

          <button
            onClick={() => setMode("book")}
            className="mt-8 bg-[#FFD700] text-[#8B0000] font-semibold px-6 py-3 rounded-lg shadow-lg hover:bg-[#FFA500] transition-all duration-300"
          >
            ← Quay lại Sách
          </button>
        </div>
      )}
      <ChatBox />;
    </>
  );
}

export default App;
