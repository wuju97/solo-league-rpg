// ============================================================
// SOLO LEAGUE RPG — Floating Lobby Chat Widget
// This is for casual chat with other players/friends, and
// asking if someone wants to duel. Actual duels happen over
// in PvP Chat, not here.
//
// This file builds its own little chat box in the bottom-right
// corner of whatever page includes it. Just add this line near
// the bottom of a page (after supabaseClient.js is loaded):
//   <script src="lobbyChat.js"></script>
// ============================================================

(async function () {
  // Only run this widget if someone is actually logged in
  const { data } = await sb.auth.getSession();
  if (!data.session) return;

  const currentUser = data.session.user;
  const displayName = await getMyGamerName();

  const MAX_DOM_MESSAGES = 100; // keep the DOM from growing forever over a long session
  const MAX_MESSAGE_LENGTH = 300;

  // ---- build the widget's HTML ----
  const bubble = document.createElement("div");
  bubble.id = "lobby-chat-bubble";
  bubble.innerHTML = '&#128172;<span id="lobby-chat-badge"></span>';
  document.body.appendChild(bubble);

  const panel = document.createElement("div");
  panel.id = "lobby-chat-panel";
  panel.innerHTML = `
    <div class="lc-header">
      <span>Lobby Chat</span>
      <span class="lc-close">&times;</span>
    </div>
    <div class="lc-messages" id="lc-messages"></div>
    <div class="lc-input-row">
      <input type="text" id="lc-input" placeholder="Say something..." maxlength="${MAX_MESSAGE_LENGTH}">
      <span class="lc-char-count" id="lc-char-count"></span>
      <button id="lc-send">Send</button>
    </div>
  `;
  document.body.appendChild(panel);

  const messagesEl = document.getElementById("lc-messages");
  const inputEl = document.getElementById("lc-input");
  const badgeEl = document.getElementById("lobby-chat-badge");
  const charCountEl = document.getElementById("lc-char-count");

  // ---- unread message tracking ----
  let unreadCount = 0;
  function updateBadge() {
    if (unreadCount > 0) {
      badgeEl.textContent = unreadCount > 9 ? "9+" : unreadCount;
      badgeEl.style.display = "flex";
    } else {
      badgeEl.style.display = "none";
    }
  }

  // ---- character counter -- only shows up once getting close to the limit ----
  inputEl.addEventListener("input", () => {
    const remaining = MAX_MESSAGE_LENGTH - inputEl.value.length;
    charCountEl.textContent = remaining <= 40 ? remaining : "";
    charCountEl.classList.toggle("lc-char-count-warn", remaining <= 15);
  });

  // ---- a short, generated notification beep (no audio file needed) ----
  // One AudioContext, created once and reused -- the previous version
  // created a brand new one on every single message, which is wasteful
  // and browsers cap how many can exist at once anyway.
  let audioCtx = null;
  function playNotificationSound() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Some browsers block sound until the page has been clicked
      // at least once — that's fine, it'll just work after that.
    }
  }

  // ---- open / close ----
  bubble.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
      unreadCount = 0;
      updateBadge();
    }
  });
  panel.querySelector(".lc-close").addEventListener("click", () => {
    panel.classList.remove("open");
  });

  // ---- give each player a consistent color based on their name ----
  const NAME_COLORS = [
    "#C9A24B", // gold
    "#E07A5F", // clay
    "#56949D", // teal
    "#9B6BB0", // violet
    "#6FA85C", // moss
    "#D98E52", // amber
    "#7C93E0", // periwinkle
    "#D06A8C", // rose
  ];
  function colorForName(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
  }

  function formatTime(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // ---- render a single message ----
  // Consecutive messages from the same sender are grouped -- the name
  // and color line only shows once, like any real chat app, instead
  // of repeating on every single line.
  let lastSenderId = null;

  function renderMessage(msg, { animate = true } = {}) {
    const isOwn = msg.sender_id === currentUser.id;
    const isGrouped = msg.sender_id === lastSenderId;
    lastSenderId = msg.sender_id;

    const row = document.createElement("div");
    row.className = "lc-row " + (isOwn ? "own" : "other") + (isGrouped ? " lc-grouped" : "");
    if (animate) row.classList.add("lc-row-enter");

    if (!isGrouped) {
      const who = document.createElement("div");
      who.className = "lc-who";
      who.style.color = colorForName(msg.sender_name);
      who.textContent = msg.sender_name;
      row.appendChild(who);
    }

    const bubbleWrap = document.createElement("div");
    bubbleWrap.className = "lc-bubble-wrap";

    const msgBubble = document.createElement("div");
    msgBubble.className = "lc-bubble";
    msgBubble.textContent = msg.message;
    bubbleWrap.appendChild(msgBubble);

    const time = document.createElement("span");
    time.className = "lc-time";
    time.textContent = formatTime(msg.created_at);
    bubbleWrap.appendChild(time);

    row.appendChild(bubbleWrap);
    messagesEl.appendChild(row);

    // Cap how many messages stay in the DOM, rather than growing
    // without limit over the course of a long session.
    while (messagesEl.children.length > MAX_DOM_MESSAGES) {
      messagesEl.removeChild(messagesEl.firstChild);
    }
  }

  function showEmptyState() {
    const empty = document.createElement("div");
    empty.className = "lc-empty-state";
    empty.textContent = "No messages yet — say hello!";
    messagesEl.appendChild(empty);
  }

  // ---- load the last 50 messages ----
  const { data: history, error: historyError } = await sb
    .from("chat_messages")
    .select("*")
    .eq("channel", "lobby")
    .order("created_at", { ascending: true })
    .limit(50);

  if (!historyError && history && history.length > 0) {
    history.forEach(msg => renderMessage(msg, { animate: false }));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  } else if (!historyError) {
    showEmptyState();
  }

  // ---- send a new message ----
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = "";
    charCountEl.textContent = "";
    const { error } = await sb.from("chat_messages").insert({
      sender_id: currentUser.id,
      sender_name: displayName,
      message: text,
      channel: "lobby",
    });

    if (error) {
      console.error("Failed to send message:", error.message);
    }
  }

  document.getElementById("lc-send").addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // ---- listen for new messages from anyone, live ----
  sb
    .channel("lobby-chat")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: "channel=eq.lobby" },
      (payload) => {
        const emptyState = messagesEl.querySelector(".lc-empty-state");
        if (emptyState) emptyState.remove();

        renderMessage(payload.new);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Only notify for messages from other people, not your own
        if (payload.new.sender_id !== currentUser.id) {
          playNotificationSound();
          if (!panel.classList.contains("open")) {
            unreadCount++;
            updateBadge();
          }
        }
      }
    )
    .subscribe();
})();
