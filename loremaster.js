// ============================================================
// SOLO LEAGUE RPG — Loremaster Widget
// A floating chatbox, positioned above the Lobby Chat bubble, that
// answers questions about the world's lore and how the website
// works, grounded in AI Memory (Settings -> AI Memory).
//
// Works WITHOUT any AI by default: fetches the raw Information,
// Instructions, and Website Guide text once, splits it into
// sections, and does a real keyword-match search against the
// player's question -- instant, no API key needed, no network
// dependency on Gemini at all.
//
// AI is now an optional add-on, not a requirement: if the player
// has a Gemini key set, an "Ask AI instead" button offers a
// deeper, conversational answer via the same call-gemini Edge
// Function as before. Without a key, that button is simply hidden
// -- no error, no dead end, the keyword search already gave a
// real answer on its own.
//
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
      <span>Loremaster</span>
      <span class="lc-close" id="loremaster-close">&times;</span>
    </div>
    <div class="lc-messages" id="loremaster-messages">
      <div class="lm-msg lm-ai">Ask me anything about Solonia's lore, or how anything on this site works.</div>
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

  // --- Load and index AI Memory once, up front ---
  // Sections are split on blank-line-separated paragraphs and
  // "=== HEADER ===" style markers (matching how Website Guide and
  // Instructions are actually written), so each searchable chunk
  // stays reasonably sized and topical, not one giant blob.
  let sections = [];
  let hasGeminiKey = false;

  function splitIntoSections(text, sourceLabel) {
    if (!text) return [];
    const chunks = text.split(/\n(?=(?:===|##|\d+\.\s))/g); // new section on a header-like line
    return chunks
      .map(c => c.trim())
      .filter(c => c.length > 0)
      .map(c => ({ text: c, source: sourceLabel }));
  }

  async function loadMemory() {
    const { data: shared } = await sb.from("shared_site_settings")
      .select("ai_memory_information, ai_memory_instructions, ai_memory_website_guide").maybeSingle();
    if (shared) {
      sections = [
        ...splitIntoSections(shared.ai_memory_information, "World Lore"),
        ...splitIntoSections(shared.ai_memory_instructions, "Game Rules"),
        ...splitIntoSections(shared.ai_memory_website_guide, "Website Guide"),
      ];
    }
    const { data: keys } = await sb.from("user_api_keys").select("gemini_api_key_1, gemini_api_key_2").eq("user_id", data.session.user.id).maybeSingle();
    hasGeminiKey = !!(keys && (keys.gemini_api_key_1 || keys.gemini_api_key_2));
  }
  loadMemory();

  // --- Simple, real keyword-match search -- no AI required ---
  const STOP_WORDS = new Set(["the","a","an","is","are","was","were","do","does","did","how","what","where","when","why","who","to","of","in","on","for","and","or","i","you","it","this","that","my","can"]);

  function scoreSection(section, queryWords) {
    const lowerText = section.text.toLowerCase();
    let score = 0;
    for (const w of queryWords) {
      if (lowerText.includes(w)) score += w.length > 4 ? 2 : 1; // longer, more specific words count more
    }
    return score;
  }

  function keywordSearch(question) {
    const queryWords = question.toLowerCase().match(/[a-z0-9']+/g)?.filter(w => w.length > 2 && !STOP_WORDS.has(w)) || [];
    if (queryWords.length === 0 || sections.length === 0) return null;

    const scored = sections.map(s => ({ ...s, score: scoreSection(s, queryWords) }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;
    // Top 2 matches, so a question spanning two sections still gets a full answer
    return scored.slice(0, 2);
  }

  function renderKeywordResult(matches) {
    if (!matches) {
      return `I couldn't find anything matching that in the site's lore or rules. Try different wording, or a more specific term.`;
    }
    return matches.map(m => `<div class="lm-source-tag">${lmEscapeHtml(m.source)}</div>${lmEscapeHtml(m.text).replace(/\n/g, "<br>")}`).join("<hr class=\"lm-divider\">");
  }

  async function askAI(question, loadingEl) {
    loadingEl.textContent = "Thinking...";
    const { data: result, error } = await sb.functions.invoke("call-gemini", {
      body: { purpose: "loremaster_qa", prompt: question, groundWith: "both" },
    });
    if (error || result?.error) {
      loadingEl.textContent = result?.error || "Couldn't reach the AI right now.";
      loadingEl.classList.add("lm-error");
    } else {
      loadingEl.innerHTML = lmEscapeHtml(result.text).replace(/\n/g, "<br>") + (result.warning ? " ⚠" : "");
    }
  }

  async function askLoremaster() {
    const input = document.getElementById("loremaster-input");
    const question = input.value.trim();
    if (!question) return;

    const messagesEl = document.getElementById("loremaster-messages");
    messagesEl.insertAdjacentHTML("beforeend", `<div class="lm-msg lm-user">${lmEscapeHtml(question)}</div>`);
    input.value = "";
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Instant keyword-match answer -- no network call, no AI key needed
    const matches = keywordSearch(question);
    const answerId = "lm-answer-" + Date.now();
    const aiButtonHtml = hasGeminiKey
      ? `<button class="lm-ask-ai-btn" data-question="${lmEscapeHtml(question)}">Ask AI instead, for a deeper answer</button>`
      : "";
    messagesEl.insertAdjacentHTML("beforeend", `<div class="lm-msg lm-ai" id="${answerId}">${renderKeywordResult(matches)}${aiButtonHtml}</div>`);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const askAiBtn = document.querySelector(`#${answerId} .lm-ask-ai-btn`);
    if (askAiBtn) {
      askAiBtn.addEventListener("click", () => {
        askAiBtn.remove();
        const loadingId = "lm-ai-loading-" + Date.now();
        messagesEl.insertAdjacentHTML("beforeend", `<div class="lm-msg lm-ai" id="${loadingId}">Thinking...</div>`);
        messagesEl.scrollTop = messagesEl.scrollHeight;
        askAI(question, document.getElementById(loadingId)).then(() => {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        });
      });
    }
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
