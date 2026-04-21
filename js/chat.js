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

  const SYSTEM_PROMPT = `You are an expert Godot 4.3 game engine assistant. The user will ask you to build a small game project. Respond with:

1. A short explanation of what you are building (2-4 sentences).
2. A project definition in a SINGLE fenced code block tagged "godot-project" containing valid JSON matching this shape:
   { "name": "...", "display_name": "...", "main_scene": "main.tscn", "description": "...", "files": { "<path>": "<file contents>" } }

YOU MUST FOLLOW THESE FILE FORMATS EXACTLY. Do NOT invent keys. Copy this TEMPLATE and change only what the task requires.

=== project.godot TEMPLATE (copy verbatim, change config/name only) ===
; Engine configuration file.

config_version=5

[application]

config/name="My Game"
run/main_scene="res://main.tscn"
config/features=PackedStringArray("4.3", "GL Compatibility")
config/icon="res://icon.svg"

[input]

ui_left={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":65,"key_label":0,"unicode":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194319,"physical_keycode":0,"key_label":0,"unicode":0,"echo":false,"script":null)
]
}
ui_right={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":68,"key_label":0,"unicode":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194321,"physical_keycode":0,"key_label":0,"unicode":0,"echo":false,"script":null)
]
}
ui_up={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":87,"key_label":0,"unicode":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194320,"physical_keycode":0,"key_label":0,"unicode":0,"echo":false,"script":null)
]
}
ui_down={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":83,"key_label":0,"unicode":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194322,"physical_keycode":0,"key_label":0,"unicode":0,"echo":false,"script":null)
]
}

[rendering]

renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"
=== END project.godot ===

=== main.tscn TEMPLATE (a scene with a label and a script attached to root) ===
[gd_scene load_steps=2 format=3 uid="uid://b2exampleab"]

[ext_resource type="Script" path="res://main.gd" id="1_main"]

[node name="Main" type="Node2D"]
script = ExtResource("1_main")

[node name="Label" type="Label" parent="."]
offset_left = 500.0
offset_top = 340.0
offset_right = 780.0
offset_bottom = 370.0
text = "Hello"
horizontal_alignment = 1
=== END main.tscn ===

=== main.gd TEMPLATE ===
extends Node2D

func _ready() -> void:
    print("scene ready")
=== END main.gd ===

=== icon.svg TEMPLATE ===
<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="16" fill="#478cbf"/>
  <text x="64" y="86" font-family="Arial" font-size="72" fill="white" text-anchor="middle" font-weight="bold">G</text>
</svg>
=== END icon.svg ===

HARD RULES (violating any causes the project to break):
- Use these EXACT templates. Keep config/name, config/features, config/icon, run/main_scene keys exactly — slash separator, not underscore.
- Every script reference in a .tscn needs an [ext_resource] declaration with a unique id, then script = ExtResource("<id>") on the node.
- For ColorRect, Label, Button (Control-based nodes) use offset_left/offset_top/offset_right/offset_bottom for position, NOT position=Vector2(...).
- For Node2D and its subclasses (Sprite2D, CharacterBody2D, RigidBody2D) use position = Vector2(x, y).
- .tscn file MUST start with [gd_scene load_steps=N format=3 uid="uid://<random11chars>"] and load_steps must equal total ext_resource + sub_resource count + 1.
- .gd file MUST start with extends <ClassName>.
- Use SVG (icon.svg) — NEVER PNG or JPG. Referencing PNG/JPG crashes the Godot Web Editor.
- Input actions must be the literal InputEventKey Object(...) format shown above — do NOT use shorthand.
- Keep to 3-6 files total. Prefer single main.tscn + main.gd + icon.svg + project.godot.
- Output ONLY: your 2-4 sentence explanation, then the \`\`\`godot-project ... \`\`\` fenced JSON block. Nothing else. No markdown headings. No extra code blocks.`;

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

  /*
   * Fix common AI mistakes in generated projects so they actually open in Godot.
   * Returns a cleaned { path: content } files map.
   */
  function cleanupProjectFiles(filesMap, projectMeta) {
    const out = {};
    let hasIconSvg = false;
    let hasProjectGodot = false;

    for (const [path, content] of Object.entries(filesMap)) {
      const lower = path.toLowerCase();
      // 1. Drop any PNG/JPG — they break the web editor.
      if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) continue;

      let text = typeof content === "string" ? content : String(content);

      // 2. Fix project.godot — replace invented keys with real ones.
      if (lower === "project.godot" || lower.endsWith("/project.godot")) {
        hasProjectGodot = true;
        text = fixProjectGodot(text, projectMeta);
      }

      // 3. Fix .tscn files (strip bad Control position= lines, fix load_steps).
      if (lower.endsWith(".tscn")) {
        text = fixTscn(text);
      }

      if (lower === "icon.svg" || lower.endsWith("/icon.svg")) hasIconSvg = true;
      out[path] = text;
    }

    // Always ensure there's an icon.svg (references in project.godot fail without it).
    if (!hasIconSvg) {
      out["icon.svg"] = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="16" fill="#478cbf"/>
  <text x="64" y="86" font-family="Arial" font-size="72" fill="white" text-anchor="middle" font-weight="bold">G</text>
</svg>`;
    }

    // If project.godot is missing entirely, synthesise one.
    if (!hasProjectGodot) {
      out["project.godot"] = fixProjectGodot("", projectMeta);
    }
    return out;
  }

  function fixProjectGodot(text, meta) {
    const name = (meta && (meta.display_name || meta.name)) || "My Game";
    const mainScene = ((meta && meta.main_scene) || "main.tscn")
      .replace(/^res:\/\//, "");

    // Normalise any broken keys the model might have written.
    let t = text || "";
    t = t.replace(/^\s*name\s*=/gm, 'config/name=');
    t = t.replace(/^\s*display_name\s*=/gm, 'config/name=');
    t = t.replace(/^\s*main_scene\s*=/gm, 'run/main_scene=');
    t = t.replace(/^\s*config_features\s*=/gm, 'config/features=');
    t = t.replace(/^\s*config_icon\s*=/gm, 'config/icon=');
    t = t.replace(/^\s*icon\s*=/gm, 'config/icon=');

    // If we still don't have the essentials, rebuild fully.
    const mustHave = ["config_version", "config/name", "run/main_scene", "config/features"];
    const missing = mustHave.filter(k => !new RegExp("^\\s*" + k.replace("/", "\\/"), "m").test(t));
    if (missing.length > 0) {
      t = buildDefaultProjectGodot(name, mainScene);
    } else if (!/\[application\]/.test(t)) {
      // Keys exist but no [application] section — wrap them.
      t = `config_version=5\n\n[application]\n\n` + t.replace(/^\s*config_version\s*=.*$/m, "");
    }

    // Ensure config/icon points at icon.svg (in case model wrote icon.png).
    t = t.replace(/config\/icon\s*=\s*"[^"]*"/, 'config/icon="res://icon.svg"');
    if (!/config\/icon\s*=/.test(t)) {
      t = t.replace(/config\/features=.*$/m, (m) => m + '\nconfig/icon="res://icon.svg"');
    }

    // Ensure the input actions and rendering section are present.
    if (!/\[input\]/.test(t)) t += "\n\n" + DEFAULT_INPUT_SECTION;
    if (!/\[rendering\]/.test(t)) t += "\n\n" + DEFAULT_RENDERING_SECTION;

    // Dedupe keys that often get written twice by the renamer — keep the LAST occurrence.
    for (const key of ["config/name", "run/main_scene", "config/features", "config/icon"]) {
      const re = new RegExp("^\\s*" + key.replace("/", "\\/") + "\\s*=.*$", "gm");
      const matches = t.match(re);
      if (matches && matches.length > 1) {
        const keep = matches[matches.length - 1];
        t = t.replace(re, "");
        // insert back at first suitable spot (under [application])
        t = t.replace(/(\[application\][^\[]*)/, (section) => section.trimEnd() + "\n" + keep + "\n");
      }
    }
    // Collapse excess blank lines.
    t = t.replace(/\n{3,}/g, "\n\n");
    return t.trimStart();
  }

  function buildDefaultProjectGodot(name, mainScene) {
    return `; Engine configuration file.

config_version=5

[application]

config/name="${name.replace(/"/g, '\\"')}"
run/main_scene="res://${mainScene}"
config/features=PackedStringArray("4.3", "GL Compatibility")
config/icon="res://icon.svg"

${DEFAULT_INPUT_SECTION}

${DEFAULT_RENDERING_SECTION}
`;
  }

  const DEFAULT_INPUT_SECTION = `[input]

ui_left={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":65,"key_label":0,"unicode":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194319,"physical_keycode":0,"key_label":0,"unicode":0,"echo":false,"script":null)
]
}
ui_right={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":68,"key_label":0,"unicode":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194321,"physical_keycode":0,"key_label":0,"unicode":0,"echo":false,"script":null)
]
}
ui_up={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":87,"key_label":0,"unicode":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194320,"physical_keycode":0,"key_label":0,"unicode":0,"echo":false,"script":null)
]
}
ui_down={
"deadzone": 0.5,
"events": [Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":0,"physical_keycode":83,"key_label":0,"unicode":0,"echo":false,"script":null)
, Object(InputEventKey,"resource_local_to_scene":false,"resource_name":"","device":-1,"window_id":0,"alt_pressed":false,"shift_pressed":false,"ctrl_pressed":false,"meta_pressed":false,"pressed":false,"keycode":4194322,"physical_keycode":0,"key_label":0,"unicode":0,"echo":false,"script":null)
]
}`;

  const DEFAULT_RENDERING_SECTION = `[rendering]

renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"`;

  function fixTscn(text) {
    let t = text;
    // Recount load_steps so it matches actual ext/sub resource count + 1.
    const extCount = (t.match(/^\[ext_resource\b/gm) || []).length;
    const subCount = (t.match(/^\[sub_resource\b/gm) || []).length;
    const loadSteps = Math.max(1, extCount + subCount + 1);
    t = t.replace(/\[gd_scene(\s+load_steps\s*=\s*\d+)?(\s+[^\]]*)?\]/,
      `[gd_scene load_steps=${loadSteps}$2]`);
    // If no uid present, add one
    if (!/uid="uid:\/\//.test(t)) {
      const randomUid = "uid://b" + Math.random().toString(36).slice(2, 12);
      t = t.replace(/\[gd_scene\s+load_steps=(\d+)\s*(?:format=3)?\s*\]/,
        `[gd_scene load_steps=$1 format=3 uid="${randomUid}"]`);
    }
    // Ensure format=3
    if (!/\bformat\s*=\s*3\b/.test(t)) {
      t = t.replace(/\[gd_scene([^\]]*)\]/, "[gd_scene$1 format=3]");
    }
    return t;
  }

  async function buildZip(project) {
    if (typeof JSZip === "undefined") throw new Error("JSZip failed to load");
    const cleaned = cleanupProjectFiles(project.files, project);
    const zip = new JSZip();
    for (const [path, content] of Object.entries(cleaned)) {
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
