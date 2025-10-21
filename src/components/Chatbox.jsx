import { useState } from "react";
import { MessageCircle, X, Loader2 } from "lucide-react";

const ChatBox = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState([
    {
      sender: "bot",
      text: "Xin chào 👋! Bạn muốn tìm hiểu phần nào của lịch sử Việt Nam?",
    },
  ]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMsg = { sender: "user", text: message };
    setChat((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);
    setChat((prev) => [...prev, { sender: "bot", text: "Đang trả lời..." }]);

    try {
      const res = await fetch(
        `https://localhost:7082/api/DatabaseAnalyzer/ExecuteSqlCommand?sqlCommand=${encodeURIComponent(
          message
        )}`,
        { method: "POST" }
      );

      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.text();
      setChat((prev) => [
        ...prev.slice(0, -1),
        { sender: "bot", text: data || "Không có phản hồi từ máy chủ." },
      ]);
    } catch (err) {
      console.error(err);
      setChat((prev) => [
        ...prev.slice(0, -1),
        { sender: "bot", text: "⚠️ Có lỗi khi kết nối server!" },
      ]);
    } finally {
      setLoading(false);
    }
  };
  //á
  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-[#FFD700] text-[#8B0000] rounded-full shadow-xl p-4 hover:bg-[#FFC300] transition-all duration-300"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {open && (
        <div className="w-[500px] max-w-[90vw] h-[500px] bg-[#1a1a1a]/95 border border-[#FFD700] rounded-2xl flex flex-col shadow-2xl backdrop-blur-md">
          <div className="flex justify-between items-center bg-[#8B0000] text-[#FFD700] px-4 py-2 rounded-t-2xl">
            <h3 className="font-semibold">Trợ lý Lịch Sử VN</h3>
            <button onClick={() => setOpen(false)}>
              <X size={20} className="hover:text-white" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {chat.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-xl max-w-[80%] whitespace-pre-line ${
                    msg.sender === "user"
                      ? "bg-[#FFD700] text-[#8B0000]"
                      : "bg-[#333] text-[#FFD700]"
                  }`}
                >
                  {msg.text === "Đang trả lời..." && loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Đang trả
                      lời...
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[#FFD700]/30 flex gap-2">
            <input
              type="text"
              placeholder="Nhập câu hỏi..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 bg-[#222] text-[#FFD700] rounded-lg px-3 py-2 outline-none border border-[#FFD700]/30 focus:border-[#FFD700]"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              className="bg-[#FFD700] text-[#8B0000] px-3 py-2 rounded-lg hover:bg-[#FFC300] transition-all duration-300 disabled:opacity-50"
              disabled={loading}
            >
              Gửi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBox;
