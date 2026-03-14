// ===================================================
// FILE: typing.js - Fungsi Terkait Typing Indicator
// ===================================================

let typingTimeout;

// ========== HANDLE TYPING STATUS ==========
function handleTypingStatus(postId, userId, isTyping) {
  if (selectedPostId === postId) {
    const typingIndicator = document.getElementById("typingIndicator");
    if (typingIndicator) {
      if (isTyping) {
        typingIndicator.classList.remove("hidden");
      } else {
        typingIndicator.classList.add("hidden");
      }
    }
  }
}

// ========== SEND TYPING STATUS ==========
function sendTypingStatus(postId, isTyping) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(
    JSON.stringify({
      type: "typing",
      postId,
      userId: currentUser.id,
      isTyping,
    }),
  );

  if (isTyping) {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      sendTypingStatus(postId, false);
    }, TYPING_TIMEOUT);
  }
}