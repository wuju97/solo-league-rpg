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
      <input type="text" id="lc-input" placeholder="Say something..." maxlength="300">
      <button id="lc-send">Send</button>
    </div>
  `;
  document.body.appendChild(panel);

  const messagesEl = document.getElementById("lc-messages");
  const inputEl = document.getElementById("lc-input");
  const badgeEl = document.getElementById("lobby-chat-badge");

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

  // ---- a short, generated notification beep (no audio file needed) ----
  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
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

  // ---- render a single message ----
  function renderMessage(msg) {
    const isOwn = msg.sender_id === currentUser.id;

    const row = document.createElement("div");
    row.className = "lc-row " + (isOwn ? "own" : "other");

    const who = document.createElement("div");
    who.className = "lc-who";
    who.style.color = colorForName(msg.sender_name);
    who.textContent = msg.sender_name;

    const bubble = document.createElement("div");
    bubble.className = "lc-bubble";
    bubble.textContent = msg.message;

    row.appendChild(who);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
  }

  // ---- load the last 50 messages ----
  const { data: history, error: historyError } = await sb
    .from("chat_messages")
    .select("*")
    .eq("channel", "lobby")
    .order("created_at", { ascending: true })
    .limit(50);

  if (!historyError && history) {
    history.forEach(renderMessage);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ---- send a new message ----
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = "";
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
