/* Shared site script: theme, search, syntax highlight, page init. */
(function () {
  "use strict";

  /* ---------------- Theme ---------------- */
  const savedTheme = localStorage.getItem("lg-theme");
  if (savedTheme === "light") document.documentElement.setAttribute("data-theme", "light");

  const toggle = document.getElementById("themeToggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      const next = cur === "light" ? "dark" : "light";
      if (next === "light") document.documentElement.setAttribute("data-theme", "light");
      else document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("lg-theme", next);
    });
  }

  /* ---------------- GDScript highlighter ---------------- */
  const KEYWORDS = new Set([
    "extends","class_name","var","const","func","return","if","elif","else","for","while",
    "break","continue","match","pass","and","or","not","in","is","as","null","true","false",
    "self","super","static","signal","enum","tool","onready","export","yield","await","preload",
    "load","assert","breakpoint","setget","void","class"
  ]);
  const TYPES = new Set([
    "int","float","bool","String","Vector2","Vector3","Vector4","Color","Array","Dictionary",
    "Node","Node2D","Node3D","Control","Sprite2D","Sprite3D","Label","Button","Area2D","Area3D",
    "RigidBody2D","RigidBody3D","StaticBody2D","StaticBody3D","CharacterBody2D","CharacterBody3D",
    "Camera2D","Camera3D","Timer","AnimationPlayer","AudioStreamPlayer","Resource","PackedScene",
    "Callable","Signal","NodePath","Rect2","Transform2D","Transform3D","Basis","Quaternion",
    "StringName","Variant","Object","Tween","Input","Engine","OS","Math","PI","TAU","INF","NAN"
  ]);

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlightGDScript(src) {
    // tokenize line by line to keep comments + strings simple
    const lines = src.split("\n");
    const out = [];
    for (const line of lines) {
      out.push(highlightLine(line));
    }
    return out.join("\n");
  }

  function highlightLine(line) {
    let i = 0, n = line.length, out = "";
    while (i < n) {
      const ch = line[i];
      // comment
      if (ch === "#") {
        out += '<span class="tok-com">' + escapeHtml(line.slice(i)) + "</span>";
        return out;
      }
      // string
      if (ch === '"' || ch === "'") {
        const q = ch;
        let j = i + 1;
        while (j < n && line[j] !== q) {
          if (line[j] === "\\") j++;
          j++;
        }
        out += '<span class="tok-str">' + escapeHtml(line.slice(i, Math.min(j + 1, n))) + "</span>";
        i = j + 1;
        continue;
      }
      // annotation
      if (ch === "@") {
        let j = i + 1;
        while (j < n && /[A-Za-z0-9_]/.test(line[j])) j++;
        out += '<span class="tok-anno">' + escapeHtml(line.slice(i, j)) + "</span>";
        i = j;
        continue;
      }
      // number
      if (/[0-9]/.test(ch)) {
        let j = i;
        while (j < n && /[0-9eE_.\-+xXaAbBcCdDfF]/.test(line[j])) j++;
        out += '<span class="tok-num">' + escapeHtml(line.slice(i, j)) + "</span>";
        i = j;
        continue;
      }
      // word
      if (/[A-Za-z_]/.test(ch)) {
        let j = i;
        while (j < n && /[A-Za-z0-9_]/.test(line[j])) j++;
        const word = line.slice(i, j);
        let cls = "";
        if (KEYWORDS.has(word)) cls = "tok-kw";
        else if (TYPES.has(word)) cls = "tok-cls";
        else if (line[j] === "(") cls = "tok-fn";
        if (cls) out += '<span class="' + cls + '">' + escapeHtml(word) + "</span>";
        else out += escapeHtml(word);
        i = j;
        continue;
      }
      out += escapeHtml(ch);
      i++;
    }
    return out;
  }

  function applyHighlighting(root) {
    const blocks = (root || document).querySelectorAll("pre.code code.lang-gdscript");
    blocks.forEach(el => {
      if (el.dataset.hl === "1") return;
      el.innerHTML = highlightGDScript(el.textContent);
      el.dataset.hl = "1";
    });
  }

  window.LG = window.LG || {};
  window.LG.highlight = applyHighlighting;
  window.LG.highlightGDScript = highlightGDScript;

  /* ---------------- Global search ---------------- */
  function buildSearchIndex() {
    const idx = [];
    if (window.LG_NODES) {
      window.LG_NODES.forEach(n => {
        idx.push({ type: "Node", name: n.name, url: "nodes.html#" + n.id, blurb: n.desc });
      });
    }
    if (window.LG_GDSCRIPT) {
      window.LG_GDSCRIPT.forEach(g => {
        idx.push({ type: g.section || "GDScript", name: g.name, url: "gdscript.html#" + g.id, blurb: g.desc });
      });
    }
    if (window.LG_TUTORIALS) {
      window.LG_TUTORIALS.forEach(t => {
        idx.push({ type: "Tutorial", name: t.title, url: "tutorials.html#" + t.id, blurb: t.summary });
      });
    }
    return idx;
  }

  function runSearch(q, idx) {
    q = (q || "").trim().toLowerCase();
    if (!q) return [];
    return idx
      .map(item => {
        const hay = (item.name + " " + (item.blurb || "")).toLowerCase();
        let score = 0;
        if (item.name.toLowerCase() === q) score += 100;
        if (item.name.toLowerCase().startsWith(q)) score += 40;
        if (hay.includes(q)) score += 10;
        return { item, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(x => x.item);
  }

  function wireSearch(inputId, resultsId) {
    const input = document.getElementById(inputId);
    const results = document.getElementById(resultsId);
    if (!input || !results) return;
    const idx = buildSearchIndex();
    const render = () => {
      const q = input.value;
      const matches = runSearch(q, idx);
      if (!q || !matches.length) {
        results.hidden = true;
        results.innerHTML = "";
        return;
      }
      results.hidden = false;
      results.innerHTML = matches.map(m =>
        `<a href="${m.url}"><span class="result-type">${escapeHtml(m.type)}</span>${escapeHtml(m.name)}</a>`
      ).join("");
    };
    input.addEventListener("input", render);
    document.addEventListener("click", (e) => {
      if (!results.contains(e.target) && e.target !== input) results.hidden = true;
    });
  }

  /* ---------------- On load ---------------- */
  document.addEventListener("DOMContentLoaded", () => {
    applyHighlighting();
    wireSearch("heroSearch", "heroSearchResults");
    wireSearch("globalSearch", "globalSearchResults");
  });
})();
