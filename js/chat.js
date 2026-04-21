/*
 * Chat UI for the AI-Godot-project generator.
 *
 * Flow:
 *   1. User types request.
 *   2. POST /api/chat with message history + system prompt.
 *   3. Parse assistant response: extract <godot-project>{ JSON }</godot-project>
 *      (or a ```godot-project ... ``` fenced block) to find a project definition.
 *   4. If found, render a download card with "Download zip" and "Open in Godot" buttons.
 *      JSZip builds the zip in-browser.
 */
(function () {
  "use strict";

  const SYSTEM_PROMPT = `You are an expert Godot 4 game engine assistant. The user will ask you to build a small Godot project. Respond with:

1. A short explanation of what you are building (2-4 sentences).
2. A project definition in a SINGLE fenced code block tagged "godot-project" containing valid JSON in this exact shape:

\`\`\`godot-project
{
  "name": "short_name_lowercase_with_underscores",
  "display_name": "Human Readable Name",
  "main_scene": "main.tscn",
  "description": "One-sentence summary.",
  "files": {
    "project.godot": "FULL project.godot file contents (text)",
    "icon.svg": "SVG content — use SVG only, never PNG/JPG",
    "main.gd": "GDScript code",
    "main.tscn": "Godot .tscn scene text file"
  }
}
\`\`\`

Hard rules:
- Target Godot 4.3 or later. In project.godot use: config_version=5 and config/features=PackedStringArray("4.3", "GL Compatibility").
- Always include input actions ui_left/ui_right/ui_up/ui_down bound to both arrow keys AND WASD, and ui_accept bound to Space. Put these in the [input] section of project.godot. Use concrete InputEventKey entries (not shorthand).
- Use SVG (icon.svg), never PNG or JPG. Referencing icon.png crashes the Godot Web Editor.
- Reference icon.svg in config/icon="res://icon.svg".
- Prefer a single main.tscn scene. If you need more scenes, use .tscn format and reference them correctly.
- .tscn format must start with [gd_scene load_steps=... format=3 uid="uid://<random>"].
- .gd scripts must begin with extends <BaseClass>. Use only stable Godot 4 API (CharacterBody2D.move_and_slide(), Input.get_vector, Area2D.body_entered, etc.).
- Keep the project small — 1-5 files total is ideal.
- Do NOT include anything except the explanation and the fenced godot-project block. No markdown headings, no extra code blocks.`;

  const messagesEl = document.getElementById("messages");
  const inputEl = document.getElementById("input");
  const sendBtn = document.getElementById("sendBtn");
  const modelSel = document.getElementById("modelSel");
  const resetBtn = document.getElementById("resetBtn");
  const suggestRow = document.getElementById("suggestRow");

  let history = loadHistory();

  function loadHistory() {
    try {
      const raw = localStorage.getItem("lg-chat-history");
      if (!raw) return [];
      const h = JSON.parse(raw);
      if (Array.isArray(h)) return h;
    } catch (e) {}
    return [];
  }
  function saveHistory() {
    try { localStorage.setItem("lg-chat-history", JSON.stringify(history)); } catch (e) {}
  }

  function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  function renderMarkdown(s) {
    // Very small markdown: backticks, newlines. Leave fenced godot-project blocks as <pre>.
    s = esc(s);
    // fenced blocks
    s = s.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) =>
      `<pre><code>${code}</code></pre>`
    );
    s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
    return s;
  }

  function addMessage(role, content) {
    const msg = { role, content, ts: Date.now() };
    history.push(msg);
    saveHistory();
    renderOne(msg);
    scrollToBottom();
  }

  function renderOne(msg) {
    const wrap = document.createElement("div");
    wrap.className = "msg " + msg.role;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = msg.role === "user" ? "U" : (msg.role === "assistant" ? "AI" : "·");
    wrap.appendChild(avatar);

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const project = extractProject(msg.content);
    if (project) {
      bubble.innerHTML = renderMarkdown(stripProjectBlock(msg.content));
      bubble.appendChild(renderProjectCard(project));
    } else {
      bubble.innerHTML = renderMarkdown(msg.content);
    }
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
  }

  function renderAll() {
    messagesEl.innerHTML = "";
    if (history.length === 0) {
      renderOne({ role: "system", content: "Hi! Describe a small Godot game and I'll build it for you. Click a suggestion below or type your own." });
    }
    for (const m of history) renderOne(m);
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /* ---------- Project extraction ---------- */
  function extractProject(text) {
    if (!text) return null;
    const re = /```godot-project\s*([\s\S]*?)```/;
    const m = text.match(re);
    if (!m) return null;
    const raw = m[1].trim();
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object" && obj.files && typeof obj.files === "object") return obj;
    } catch (e) {
      // Try to recover by extracting a JSON object substring
      try {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        if (start !== -1 && end > start) {
          const obj = JSON.parse(raw.slice(start, end + 1));
          if (obj && obj.files) return obj;
        }
      } catch (e2) {}
    }
    return null;
  }

  function stripProjectBlock(text) {
    return text.replace(/```godot-project[\s\S]*?```/g, "").trim();
  }

  /* ---------- Project card ---------- */
  function renderProjectCard(project) {
    const card = document.createElement("div");
    card.className = "project-card";
    const name = project.display_name || project.name || "Godot project";
    const fileNames = Object.keys(project.files).sort();
    card.innerHTML = `
      <h4>📦 ${esc(name)}</h4>
      <div class="pfiles">${esc(fileNames.join(", "))}</div>
      <div class="pactions">
        <button class="btn btn-primary" data-a="download">⬇ Download zip</button>
        <button class="btn btn-ghost" data-a="open">▶ Open in Godot</button>
      </div>
    `;
    card.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-a]");
      if (!btn) return;
      if (btn.dataset.a === "download") await downloadProject(project);
      else if (btn.dataset.a === "open") await openProject(project);
    });
    return card;
  }

  async function buildZip(project) {
    if (typeof JSZip === "undefined") throw new Error("JSZip failed to load");
    const zip = new JSZip();
    for (const [path, content] of Object.entries(project.files)) {
      const lower = path.toLowerCase();
      if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
        // Model disobeyed — skip image files to avoid the web editor hang.
        continue;
      }
      zip.file(path, content);
    }
    return await zip.generateAsync({ type: "blob" });
  }

  async function downloadProject(project) {
    try {
      const blob = await buildZip(project);
      const filename = (project.name || "godot_project") + ".zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) {
      alert("Download failed: " + err.message);
    }
  }

  async function openProject(project) {
    await downloadProject(project);
    window.open("https://editor.godotengine.org/", "_blank", "noopener");
    alert("The project zip downloaded, and the Godot launcher has opened in a new tab.\n\n" +
      "On that page:\n" +
      "1. Find 'Preload project ZIP' → Choose File → pick the downloaded zip.\n" +
      "2. Click 'Start Godot editor'.\n" +
      "3. In Install Project: Create Folder → Install & Edit.\n" +
      "4. Press F5 to play.");
  }

  /* ---------- Sending ---------- */
  async function send(text) {
    if (!text || !text.trim()) return;
    addMessage("user", text);
    inputEl.value = "";
    setBusy(true);

    // Build message list for API — prepend system prompt.
    const apiMessages = [{ role: "system", content: SYSTEM_PROMPT }];
    for (const m of history) {
      if (m.role === "user" || m.role === "assistant") {
        apiMessages.push({ role: m.role, content: m.content });
      }
    }

    // Show a placeholder assistant message while waiting
    const placeholder = document.createElement("div");
    placeholder.className = "msg assistant";
    placeholder.innerHTML = `<div class="avatar">AI</div><div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>`;
    messagesEl.appendChild(placeholder);
    scrollToBottom();

    try {
      const body = { messages: apiMessages };
      const model = modelSel.value;
      if (model) body.model = model;

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      placeholder.remove();

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        const msg = err.error || ("HTTP " + resp.status);
        addMessage("assistant", "⚠ " + msg);
        return;
      }
      const data = await resp.json();
      const content = data.content || "(empty response)";
      addMessage("assistant", content);
    } catch (err) {
      placeholder.remove();
      addMessage("assistant", "⚠ Request failed: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  function setBusy(b) {
    sendBtn.disabled = b;
    inputEl.disabled = b;
    sendBtn.textContent = b ? "…thinking" : "Send ➤";
  }

  sendBtn.addEventListener("click", () => send(inputEl.value));
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send(inputEl.value);
    }
  });
  suggestRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".suggest-chip");
    if (!chip) return;
    inputEl.value = chip.dataset.p;
    inputEl.focus();
  });
  resetBtn.addEventListener("click", () => {
    if (history.length && !confirm("Start a new conversation? (current chat will be cleared)")) return;
    history = [];
    saveHistory();
    renderAll();
  });

  renderAll();
})();
