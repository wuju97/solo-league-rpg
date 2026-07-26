// ============================================================
// SOLO LEAGUE RPG — AI Loremaster Widget
// A floating chatbox, positioned above the Lobby Chat bubble,
// that answers questions about the world's lore and how the
// website works, grounded in AI Memory (Settings -> AI Memory).
// Uses the player's OWN Gemini key via the call-gemini Edge
// Function -- never shared, never another player's key.
// Requires the player to have set at least one Gemini key in
// Settings -> API; otherwise shows a friendly setup prompt instead
// of failing silently.
// Add this line near the bottom of a page, after supabaseClient.js:
//   <script src="loremaster.js"></script>
// ============================================================

(async function () {
  const { data } = await sb.auth.getSession();
  if (!data.session) return;

  const bubble = document.createElement("div");
  bubble.id = "loremaster-bubble";
  bubble.innerHTML = "&#128213;"; // open book icon
  bubble.title = "Ask the Loremaster";
  document.body.appendChild(bubble);

  const panel = document.createElement("div");
  panel.id = "loremaster-panel";
  panel.innerHTML = `
    <div class="lc-header">
      <span>AI Loremaster</span>
      <span class="lc-close" id="loremaster-close">&times;</span>
    </div>
    <div class="lc-messages" id="loremaster-messages">
      <div class="lm-msg lm-ai">Ask me anything about Solonia' lore, or how anything on this site works.</div>
    </div>
    <div class="lc-input-row">
      <input type="text" id="loremaster-input" placeholder="Ask a question..." maxlength="300">
      <button id="loremaster-send">Ask</button>
    </div>
  `;
  document.body.appendChild(panel);

  bubble.addEventListener("click", () => {
    panel.classList.toggle("open");
  });
  document.getElementById("loremaster-close").addEventListener("click", () => {
    panel.classList.remove("open");
  });

  async function askLoremaster() {
    const input = document.getElementById("loremaster-input");
    const question = input.value.trim();
    if (!question) return;

    const messagesEl = document.getElementById("loremaster-messages");
    messagesEl.insertAdjacentHTML("beforeend", `<div class="lm-msg lm-user">${lmEscapeHtml(question)}</div>`);
    input.value = "";
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const loadingId = "lm-loading-" + Date.now();
    messagesEl.insertAdjacentHTML("beforeend", `<div class="lm-msg lm-ai" id="${loadingId}">Thinking...</div>`);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const { data: result, error } = await sb.functions.invoke("call-gemini", {
      body: { purpose: "loremaster_qa", prompt: question, groundWith: "both" },
    });

    const loadingEl = document.getElementById(loadingId);
    if (error || result?.error) {
      loadingEl.textContent = result?.error || "Couldn't reach the Loremaster right now.";
      loadingEl.classList.add("lm-error");
    } else {
      loadingEl.textContent = result.text + (result.warning ? " ⚠" : "");
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  document.getElementById("loremaster-send").addEventListener("click", askLoremaster);
  document.getElementById("loremaster-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") askLoremaster();
  });

  function lmEscapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
