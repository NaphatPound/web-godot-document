/*
 * Minimal GDScript interpreter for the in-browser playground.
 * Supports a useful imperative subset:
 *   - var / const declarations (type hints accepted and ignored)
 *   - print, printerr, printt, printt, push_warning
 *   - arithmetic, comparisons, boolean ops (and/or/not)
 *   - if / elif / else
 *   - for <var> in <iterable>  (range, int, array, string, dictionary)
 *   - while with break / continue
 *   - func definitions (with default args and type hints) + return
 *   - arrays, dictionaries, string operations
 *   - built-in math: abs, min, max, clamp, floor, ceil, round, sqrt, pow, sin, cos, tan, PI, TAU, INF
 *   - random: randi, randf, randi_range, randf_range, randomize
 *   - utilities: len, range, str, int, float, bool, typeof
 *   - Vector2(x, y) with .x, .y and basic arithmetic
 *   - Not supported: classes, extends, signals, scenes, await, match. Useful error emitted if used.
 */
(function () {
  "use strict";

  /* ------------------ Lexer ------------------ */
  function tokenize(src) {
    const lines = src.replace(/\r\n/g, "\n").split("\n");
    const tokens = [];
    const indentStack = [0];
    let bracketDepth = 0; // implicit line-continuation inside ( ) [ ] { }

    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
      const line = lines[lineNo];
      const stripped = line.replace(/#.*$/, "").replace(/\s+$/, "");
      if (stripped.trim() === "") continue;

      let indent = 0, i = 0;
      while (i < line.length && (line[i] === " " || line[i] === "\t")) {
        indent += (line[i] === "\t") ? 4 : 1;
        i++;
      }

      // Inside brackets, this line is a continuation; no INDENT/DEDENT handling.
      if (bracketDepth === 0) {
        const top = indentStack[indentStack.length - 1];
        if (indent > top) {
          indentStack.push(indent);
          tokens.push({ type: "INDENT", line: lineNo + 1 });
        } else {
          while (indent < indentStack[indentStack.length - 1]) {
            indentStack.pop();
            tokens.push({ type: "DEDENT", line: lineNo + 1 });
          }
          if (indent !== indentStack[indentStack.length - 1]) {
            throw new Error("Indentation error on line " + (lineNo + 1));
          }
        }
      }

      while (i < line.length) {
        const ch = line[i];
        if (ch === "#") break;
        if (ch === " " || ch === "\t") { i++; continue; }

        if (ch === '"' || ch === "'") {
          const q = ch;
          let j = i + 1, str = "";
          while (j < line.length && line[j] !== q) {
            if (line[j] === "\\" && j + 1 < line.length) {
              const n = line[j + 1];
              if (n === "n") str += "\n";
              else if (n === "t") str += "\t";
              else if (n === "\\") str += "\\";
              else if (n === '"') str += '"';
              else if (n === "'") str += "'";
              else str += n;
              j += 2;
            } else { str += line[j]; j++; }
          }
          if (j >= line.length) throw new Error("Unterminated string on line " + (lineNo + 1));
          tokens.push({ type: "STR", value: str, line: lineNo + 1 });
          i = j + 1;
          continue;
        }

        if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(line[i + 1] || ""))) {
          let j = i, hasDot = false;
          while (j < line.length && /[0-9._]/.test(line[j])) {
            if (line[j] === ".") {
              if (hasDot || line[j + 1] === ".") break;
              hasDot = true;
            }
            j++;
          }
          const raw = line.slice(i, j).replace(/_/g, "");
          tokens.push({
            type: hasDot ? "FLOAT" : "INT",
            value: hasDot ? parseFloat(raw) : parseInt(raw, 10),
            line: lineNo + 1
          });
          i = j;
          continue;
        }

        if (/[A-Za-z_@]/.test(ch)) {
          let j = i;
          while (j < line.length && /[A-Za-z0-9_@]/.test(line[j])) j++;
          const word = line.slice(i, j);
          tokens.push({ type: "IDENT", value: word, line: lineNo + 1 });
          i = j;
          continue;
        }

        const two = line.slice(i, i + 2);
        if (["==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", ":=", "->"].includes(two)) {
          tokens.push({ type: "OP", value: two, line: lineNo + 1 });
          i += 2; continue;
        }
        if ("+-*/%<>=(){}[]:,.!".includes(ch)) {
          if (ch === "(" || ch === "[" || ch === "{") bracketDepth++;
          else if (ch === ")" || ch === "]" || ch === "}") bracketDepth = Math.max(0, bracketDepth - 1);
          tokens.push({ type: "OP", value: ch, line: lineNo + 1 });
          i++; continue;
        }
        throw new Error("Unexpected character '" + ch + "' on line " + (lineNo + 1));
      }
      if (bracketDepth === 0) tokens.push({ type: "NEWLINE", line: lineNo + 1 });
    }

    while (indentStack.length > 1) {
      indentStack.pop();
      tokens.push({ type: "DEDENT" });
    }
    tokens.push({ type: "EOF" });
    return tokens;
  }

  /* ------------------ Parser ------------------ */
  function Parser(tokens) {
    let pos = 0;
    const peek = (off = 0) => tokens[pos + off];
    const eat = () => tokens[pos++];
    const check = (type, value) => {
      const t = tokens[pos];
      if (!t || t.type !== type) return false;
      if (value !== undefined && t.value !== value) return false;
      return true;
    };
    const expect = (type, value) => {
      const t = tokens[pos];
      if (!t || t.type !== type || (value !== undefined && t.value !== value)) {
        throw new Error("Expected " + type + (value ? " '" + value + "'" : "") +
          " but got " + (t ? t.type + " '" + t.value + "'" : "EOF") +
          (t && t.line ? " on line " + t.line : ""));
      }
      pos++;
      return t;
    };
    const skipNewlines = () => { while (check("NEWLINE")) pos++; };

    function parseProgram() {
      const body = [];
      skipNewlines();
      while (!check("EOF")) {
        body.push(parseStatement());
        skipNewlines();
      }
      return { type: "Program", body };
    }

    function parseStatement() {
      if (check("IDENT", "func")) return parseFunc();
      if (check("IDENT", "if")) return parseIf();
      if (check("IDENT", "while")) return parseWhile();
      if (check("IDENT", "for")) return parseFor();
      if (check("IDENT", "return")) return parseReturn();
      if (check("IDENT", "break")) { eat(); consumeEOL(); return { type: "Break" }; }
      if (check("IDENT", "continue")) { eat(); consumeEOL(); return { type: "Continue" }; }
      if (check("IDENT", "pass")) { eat(); consumeEOL(); return { type: "Pass" }; }
      if (check("IDENT", "var")) return parseVarDecl(false);
      if (check("IDENT", "const")) return parseVarDecl(true);
      // Top-level ignored declarations
      if (check("IDENT", "extends") || check("IDENT", "class_name") ||
          check("IDENT", "signal") || check("IDENT", "enum")) {
        while (!check("NEWLINE") && !check("EOF")) eat();
        consumeEOL();
        return { type: "Noop" };
      }
      if (peek().type === "IDENT" && peek().value.startsWith("@")) {
        // annotation line — skip through end of line
        while (!check("NEWLINE") && !check("EOF")) eat();
        consumeEOL();
        return { type: "Noop" };
      }
      return parseExprStatement();
    }

    function consumeEOL() {
      if (check("NEWLINE")) eat();
    }

    function parseBlock() {
      expect("OP", ":");
      consumeEOL();
      expect("INDENT");
      const body = [];
      skipNewlines();
      while (!check("DEDENT") && !check("EOF")) {
        body.push(parseStatement());
        skipNewlines();
      }
      if (check("DEDENT")) eat();
      return body;
    }

    function parseFunc() {
      eat(); // func
      const name = expect("IDENT").value;
      expect("OP", "(");
      const params = [];
      if (!check("OP", ")")) {
        do {
          const pname = expect("IDENT").value;
          if (check("OP", ":")) {
            eat();
            // type hint — skip one ident (possibly with [])
            if (check("IDENT")) eat();
            if (check("OP", "[")) {
              while (!check("OP", "]") && !check("EOF")) eat();
              if (check("OP", "]")) eat();
            }
          }
          let dflt = null;
          if (check("OP", "=")) { eat(); dflt = parseExpr(); }
          params.push({ name: pname, default: dflt });
        } while (check("OP", ",") && eat());
      }
      expect("OP", ")");
      if (check("OP", "->")) {
        eat();
        if (check("IDENT")) eat();
      }
      const body = parseBlock();
      return { type: "FuncDef", name, params, body };
    }

    function parseIf() {
      eat(); // if
      const test = parseExpr();
      const consequent = parseBlock();
      const alternates = [];
      let alternate = null;
      while (check("IDENT", "elif")) {
        eat();
        const t2 = parseExpr();
        const b2 = parseBlock();
        alternates.push({ test: t2, body: b2 });
      }
      if (check("IDENT", "else")) {
        eat();
        alternate = parseBlock();
      }
      return { type: "If", test, consequent, alternates, alternate };
    }

    function parseWhile() {
      eat();
      const test = parseExpr();
      const body = parseBlock();
      return { type: "While", test, body };
    }

    function parseFor() {
      eat();
      const name = expect("IDENT").value;
      if (check("OP", ":")) { // type hint
        eat();
        if (check("IDENT")) eat();
      }
      if (!(check("IDENT", "in"))) throw new Error("Expected 'in' in for loop on line " + peek().line);
      eat();
      const iter = parseExpr();
      const body = parseBlock();
      return { type: "For", name, iter, body };
    }

    function parseReturn() {
      eat();
      let arg = null;
      if (!check("NEWLINE") && !check("EOF") && !check("DEDENT")) {
        arg = parseExpr();
      }
      consumeEOL();
      return { type: "Return", arg };
    }

    function parseVarDecl(isConst) {
      eat(); // var/const
      const name = expect("IDENT").value;
      // optional type annotation
      if (check("OP", ":")) {
        eat();
        if (!check("OP", "=")) {
          if (check("IDENT")) eat();
          if (check("OP", "[")) {
            while (!check("OP", "]") && !check("EOF")) eat();
            if (check("OP", "]")) eat();
          }
        }
      }
      let value = null;
      if (check("OP", "=") || check("OP", ":=")) {
        eat();
        value = parseExpr();
      }
      consumeEOL();
      return { type: "VarDecl", name, value, isConst };
    }

    function parseExprStatement() {
      const expr = parseExpr();
      // assignment?
      if (check("OP", "=") || check("OP", "+=") || check("OP", "-=") ||
          check("OP", "*=") || check("OP", "/=")) {
        const op = eat().value;
        const right = parseExpr();
        consumeEOL();
        return { type: "Assign", target: expr, op, value: right };
      }
      consumeEOL();
      return { type: "ExprStmt", expr };
    }

    /* ---- Expressions (Pratt-ish) ---- */
    function parseExpr() { return parseTernary(); }

    function parseTernary() {
      const cond = parseOr();
      if (check("IDENT", "if")) {
        eat();
        const test = parseOr();
        expect("IDENT", "else");
        const alt = parseOr();
        return { type: "Ternary", test, consequent: cond, alternate: alt };
      }
      return cond;
    }

    function parseOr() {
      let left = parseAnd();
      while (check("IDENT", "or")) { eat(); const right = parseAnd(); left = { type: "Logical", op: "or", left, right }; }
      return left;
    }
    function parseAnd() {
      let left = parseNot();
      while (check("IDENT", "and")) { eat(); const right = parseNot(); left = { type: "Logical", op: "and", left, right }; }
      return left;
    }
    function parseNot() {
      if (check("IDENT", "not")) { eat(); return { type: "Unary", op: "not", arg: parseNot() }; }
      return parseCompare();
    }
    function parseCompare() {
      let left = parseAdd();
      while (check("OP", "==") || check("OP", "!=") || check("OP", "<") ||
             check("OP", ">") || check("OP", "<=") || check("OP", ">=") || check("IDENT", "in")) {
        const op = eat().value;
        const right = parseAdd();
        left = { type: "Binary", op, left, right };
      }
      return left;
    }
    function parseAdd() {
      let left = parseMul();
      while (check("OP", "+") || check("OP", "-")) {
        const op = eat().value;
        const right = parseMul();
        left = { type: "Binary", op, left, right };
      }
      return left;
    }
    function parseMul() {
      let left = parseUnary();
      while (check("OP", "*") || check("OP", "/") || check("OP", "%")) {
        const op = eat().value;
        const right = parseUnary();
        left = { type: "Binary", op, left, right };
      }
      return left;
    }
    function parseUnary() {
      if (check("OP", "-")) { eat(); return { type: "Unary", op: "-", arg: parseUnary() }; }
      if (check("OP", "+")) { eat(); return parseUnary(); }
      return parsePostfix();
    }

    function parsePostfix() {
      let node = parsePrimary();
      while (true) {
        if (check("OP", "(")) {
          eat();
          const args = [];
          if (!check("OP", ")")) {
            do { args.push(parseExpr()); } while (check("OP", ",") && eat());
          }
          expect("OP", ")");
          node = { type: "Call", callee: node, args };
        } else if (check("OP", ".")) {
          eat();
          const prop = expect("IDENT").value;
          node = { type: "Member", object: node, property: prop };
        } else if (check("OP", "[")) {
          eat();
          const idx = parseExpr();
          expect("OP", "]");
          node = { type: "Index", object: node, index: idx };
        } else {
          break;
        }
      }
      return node;
    }

    function parsePrimary() {
      const t = peek();
      if (!t) throw new Error("Unexpected end of input");
      if (t.type === "INT" || t.type === "FLOAT") { eat(); return { type: "Literal", value: t.value }; }
      if (t.type === "STR") { eat(); return { type: "Literal", value: t.value }; }
      if (t.type === "IDENT") {
        if (t.value === "true") { eat(); return { type: "Literal", value: true }; }
        if (t.value === "false") { eat(); return { type: "Literal", value: false }; }
        if (t.value === "null") { eat(); return { type: "Literal", value: null }; }
        eat();
        return { type: "Identifier", name: t.value };
      }
      if (t.type === "OP" && t.value === "(") {
        eat();
        const e = parseExpr();
        expect("OP", ")");
        return e;
      }
      if (t.type === "OP" && t.value === "[") {
        eat();
        const items = [];
        if (!check("OP", "]")) {
          do { items.push(parseExpr()); } while (check("OP", ",") && eat());
        }
        expect("OP", "]");
        return { type: "ArrayLit", items };
      }
      if (t.type === "OP" && t.value === "{") {
        eat();
        const pairs = [];
        if (!check("OP", "}")) {
          do {
            const k = parseExpr();
            expect("OP", ":");
            const v = parseExpr();
            pairs.push([k, v]);
          } while (check("OP", ",") && eat());
        }
        expect("OP", "}");
        return { type: "DictLit", pairs };
      }
      throw new Error("Unexpected token " + t.type + " '" + t.value + "' on line " + t.line);
    }

    return { parse: parseProgram };
  }

  /* ------------------ Runtime values ------------------ */
  function GVector2(x, y) { this.x = +x || 0; this.y = +y || 0; }
  GVector2.prototype.toString = function () { return "(" + this.x + ", " + this.y + ")"; };

  /* ------------------ Interpreter ------------------ */
  const STEP_LIMIT = 200000;

  function Interpreter(out) {
    const globals = makeGlobals(out);
    let steps = 0;

    function step() {
      steps++;
      if (steps > STEP_LIMIT) throw new Error("Script ran too long (step limit reached). Possible infinite loop.");
    }

    function Env(parent) {
      this.vars = Object.create(null);
      this.consts = new Set();
      this.parent = parent || null;
    }
    Env.prototype.get = function (name) {
      if (name in this.vars) return this.vars[name];
      if (this.parent) return this.parent.get(name);
      if (name in globals) return globals[name];
      throw new Error("Unknown name '" + name + "'");
    };
    Env.prototype.has = function (name) {
      if (name in this.vars) return true;
      if (this.parent) return this.parent.has(name);
      return (name in globals);
    };
    Env.prototype.set = function (name, val) {
      // walk up to find existing binding, else set at current scope
      let e = this;
      while (e) {
        if (name in e.vars) {
          if (e.consts.has(name)) throw new Error("Cannot reassign const '" + name + "'");
          e.vars[name] = val;
          return;
        }
        e = e.parent;
      }
      this.vars[name] = val;
    };
    Env.prototype.declare = function (name, val, isConst) {
      this.vars[name] = val;
      if (isConst) this.consts.add(name);
    };

    const BreakSignal = { t: "break" };
    const ContinueSignal = { t: "continue" };
    function ReturnSignal(v) { this.value = v; }

    function evalNode(node, env) {
      step();
      if (!node) return null;
      switch (node.type) {
        case "Program":
        case "Noop": {
          if (node.type === "Noop") return null;
          // pre-pass: register funcs so they can be called from anywhere in top-level
          for (const s of node.body) {
            if (s.type === "FuncDef") env.declare(s.name, makeFunction(s, env));
          }
          for (const s of node.body) {
            if (s.type !== "FuncDef") evalNode(s, env);
          }
          // if user defined a _ready or main-style function, call it
          if (env.has("_ready")) {
            const fn = env.get("_ready");
            if (typeof fn === "function") fn([]);
          } else if (env.has("main")) {
            const fn = env.get("main");
            if (typeof fn === "function") fn([]);
          }
          return null;
        }
        case "Literal": return node.value;
        case "ArrayLit": return node.items.map(i => evalNode(i, env));
        case "DictLit": {
          const obj = {};
          for (const [k, v] of node.pairs) obj[evalNode(k, env)] = evalNode(v, env);
          return obj;
        }
        case "Identifier": return env.get(node.name);
        case "Member": {
          const obj = evalNode(node.object, env);
          return memberAccess(obj, node.property);
        }
        case "Index": {
          const obj = evalNode(node.object, env);
          const idx = evalNode(node.index, env);
          if (obj == null) throw new Error("Cannot index null");
          if (typeof obj === "string") return obj[idx] || "";
          return obj[idx];
        }
        case "Call": {
          const args = node.args.map(a => evalNode(a, env));
          if (node.callee.type === "Member") {
            const obj = evalNode(node.callee.object, env);
            return callMethod(obj, node.callee.property, args);
          }
          const callee = evalNode(node.callee, env);
          if (typeof callee !== "function") throw new Error("Value is not callable");
          return callee(args);
        }
        case "Unary": {
          const v = evalNode(node.arg, env);
          if (node.op === "-") return -v;
          if (node.op === "not") return !v;
          throw new Error("Bad unary op " + node.op);
        }
        case "Binary": {
          const op = node.op;
          if (op === "in") {
            const r = evalNode(node.right, env);
            const l = evalNode(node.left, env);
            if (Array.isArray(r)) return r.includes(l);
            if (typeof r === "string") return r.indexOf(l) !== -1;
            if (r && typeof r === "object") return l in r;
            return false;
          }
          const l = evalNode(node.left, env);
          const r = evalNode(node.right, env);
          switch (op) {
            case "+":
              if (l instanceof GVector2 && r instanceof GVector2) return new GVector2(l.x + r.x, l.y + r.y);
              return l + r;
            case "-":
              if (l instanceof GVector2 && r instanceof GVector2) return new GVector2(l.x - r.x, l.y - r.y);
              return l - r;
            case "*":
              if (l instanceof GVector2) return new GVector2(l.x * r, l.y * r);
              if (r instanceof GVector2) return new GVector2(r.x * l, r.y * l);
              return l * r;
            case "/":
              if (l instanceof GVector2) return new GVector2(l.x / r, l.y / r);
              return l / r;
            case "%": return l % r;
            case "==": return l === r || (l instanceof GVector2 && r instanceof GVector2 && l.x === r.x && l.y === r.y);
            case "!=": return !(l === r);
            case "<": return l < r;
            case ">": return l > r;
            case "<=": return l <= r;
            case ">=": return l >= r;
          }
          throw new Error("Bad binary op " + op);
        }
        case "Logical": {
          const l = evalNode(node.left, env);
          if (node.op === "and") return l ? evalNode(node.right, env) : l;
          return l ? l : evalNode(node.right, env);
        }
        case "Ternary": {
          return evalNode(node.test, env) ? evalNode(node.consequent, env) : evalNode(node.alternate, env);
        }
        case "VarDecl": {
          const val = node.value ? evalNode(node.value, env) : null;
          env.declare(node.name, val, node.isConst);
          return null;
        }
        case "Assign": {
          const val = (function () {
            const rhs = evalNode(node.value, env);
            if (node.op === "=") return rhs;
            const cur = evalNode(node.target, env);
            if (node.op === "+=") return (cur instanceof GVector2 && rhs instanceof GVector2) ? new GVector2(cur.x + rhs.x, cur.y + rhs.y) : cur + rhs;
            if (node.op === "-=") return cur - rhs;
            if (node.op === "*=") return cur * rhs;
            if (node.op === "/=") return cur / rhs;
            return rhs;
          })();
          assignTarget(node.target, val, env);
          return null;
        }
        case "ExprStmt": evalNode(node.expr, env); return null;
        case "If": {
          if (evalNode(node.test, env)) return runBlock(node.consequent, env);
          for (const alt of node.alternates) {
            if (evalNode(alt.test, env)) return runBlock(alt.body, env);
          }
          if (node.alternate) return runBlock(node.alternate, env);
          return null;
        }
        case "While": {
          while (evalNode(node.test, env)) {
            try { runBlock(node.body, env); }
            catch (e) {
              if (e === BreakSignal) break;
              if (e === ContinueSignal) continue;
              throw e;
            }
          }
          return null;
        }
        case "For": {
          const iter = evalNode(node.iter, env);
          const seq = toIterable(iter);
          for (const v of seq) {
            env.declare(node.name, v, false);
            try { runBlock(node.body, env); }
            catch (e) {
              if (e === BreakSignal) break;
              if (e === ContinueSignal) continue;
              throw e;
            }
          }
          return null;
        }
        case "FuncDef":
          env.declare(node.name, makeFunction(node, env));
          return null;
        case "Return": throw new ReturnSignal(node.arg ? evalNode(node.arg, env) : null);
        case "Break": throw BreakSignal;
        case "Continue": throw ContinueSignal;
        case "Pass": return null;
      }
      throw new Error("Unsupported node " + node.type);
    }

    function runBlock(stmts, env) {
      for (const s of stmts) {
        if (s.type === "FuncDef") env.declare(s.name, makeFunction(s, env));
      }
      for (const s of stmts) {
        if (s.type !== "FuncDef") evalNode(s, env);
      }
    }

    function makeFunction(node, parentEnv) {
      return function (args) {
        const env = new Env(parentEnv);
        for (let i = 0; i < node.params.length; i++) {
          const p = node.params[i];
          let v;
          if (i < args.length) v = args[i];
          else if (p.default) v = evalNode(p.default, parentEnv);
          else v = null;
          env.declare(p.name, v);
        }
        try {
          runBlock(node.body, env);
        } catch (e) {
          if (e instanceof ReturnSignal) return e.value;
          throw e;
        }
        return null;
      };
    }

    function assignTarget(target, val, env) {
      if (target.type === "Identifier") { env.set(target.name, val); return; }
      if (target.type === "Member") {
        const obj = evalNode(target.object, env);
        obj[target.property] = val;
        return;
      }
      if (target.type === "Index") {
        const obj = evalNode(target.object, env);
        const idx = evalNode(target.index, env);
        obj[idx] = val;
        return;
      }
      throw new Error("Invalid assignment target");
    }

    function toIterable(v) {
      if (Array.isArray(v)) return v;
      if (typeof v === "number") {
        const arr = [];
        for (let i = 0; i < v; i++) arr.push(i);
        return arr;
      }
      if (typeof v === "string") return v.split("");
      if (v && typeof v === "object") return Object.keys(v);
      throw new Error("Cannot iterate value");
    }

    function memberAccess(obj, prop) {
      if (obj instanceof GVector2) {
        if (prop === "x" || prop === "y") return obj[prop];
        if (prop === "length") return (args) => Math.sqrt(obj.x * obj.x + obj.y * obj.y);
        if (prop === "normalized") return (args) => {
          const l = Math.sqrt(obj.x * obj.x + obj.y * obj.y);
          if (l === 0) return new GVector2(0, 0);
          return new GVector2(obj.x / l, obj.y / l);
        };
        throw new Error("Vector2 has no property '" + prop + "'");
      }
      if (Array.isArray(obj)) {
        if (prop === "size") return (args) => obj.length;
        if (prop === "append" || prop === "push_back") return (args) => { obj.push(args[0]); return null; };
        if (prop === "pop_back") return (args) => { return obj.pop(); };
        if (prop === "clear") return (args) => { obj.length = 0; return null; };
        if (prop === "has") return (args) => obj.includes(args[0]);
        if (prop === "front") return (args) => obj[0];
        if (prop === "back") return (args) => obj[obj.length - 1];
        if (prop === "length") return obj.length;
      }
      if (typeof obj === "string") {
        if (prop === "length") return (args) => obj.length;
        if (prop === "to_lower") return (args) => obj.toLowerCase();
        if (prop === "to_upper") return (args) => obj.toUpperCase();
        if (prop === "strip_edges") return (args) => obj.trim();
        if (prop === "split") return (args) => obj.split(args[0]);
        if (prop === "contains") return (args) => obj.includes(args[0]);
        if (prop === "begins_with") return (args) => obj.startsWith(args[0]);
        if (prop === "ends_with") return (args) => obj.endsWith(args[0]);
      }
      if (obj && typeof obj === "object" && prop in obj) return obj[prop];
      throw new Error("Property '" + prop + "' not found");
    }

    function callMethod(obj, name, args) {
      const m = memberAccess(obj, name);
      if (typeof m === "function") return m(args);
      throw new Error("Method '" + name + "' is not callable");
    }

    return {
      run: function (ast) {
        const env = new Env(null);
        evalNode(ast, env);
      }
    };
  }

  function gdFormat(v) {
    if (v === null || v === undefined) return "null";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (Array.isArray(v)) return "[" + v.map(gdFormat).join(", ") + "]";
    if (v instanceof GVector2) return "(" + v.x + ", " + v.y + ")";
    if (typeof v === "object") {
      return "{" + Object.keys(v).map(k => '"' + k + '": ' + gdFormat(v[k])).join(", ") + "}";
    }
    return String(v);
  }

  function makeGlobals(out) {
    const g = Object.create(null);
    const emit = (cls, s) => out(cls, s);

    g.print = function (args) {
      emit("log", args.map(gdFormat).join("") + "\n");
      return null;
    };
    g.printerr = function (args) { emit("err", args.map(gdFormat).join("") + "\n"); return null; };
    g.push_warning = function (args) { emit("err", "warn: " + args.map(gdFormat).join("") + "\n"); return null; };
    g.push_error = function (args) { emit("err", "error: " + args.map(gdFormat).join("") + "\n"); return null; };
    g.print_debug = g.print;
    g.printt = function (args) { emit("log", args.map(gdFormat).join("\t") + "\n"); return null; };

    g.len = (a) => {
      const v = a[0];
      if (typeof v === "string" || Array.isArray(v)) return v.length;
      if (v && typeof v === "object") return Object.keys(v).length;
      return 0;
    };
    g.range = (a) => {
      let start = 0, end = 0, step = 1;
      if (a.length === 1) { end = a[0]; }
      else if (a.length === 2) { start = a[0]; end = a[1]; }
      else { start = a[0]; end = a[1]; step = a[2]; }
      const out = [];
      if (step > 0) for (let i = start; i < end; i += step) out.push(i);
      else for (let i = start; i > end; i += step) out.push(i);
      return out;
    };
    g.str = (a) => a.map(gdFormat).join("");
    g.int = (a) => Math.trunc(+a[0]);
    g.float = (a) => +a[0];
    g.bool = (a) => !!a[0];
    g.typeof = (a) => {
      const v = a[0];
      if (v === null) return 0;
      if (typeof v === "boolean") return 1;
      if (typeof v === "number") return Number.isInteger(v) ? 2 : 3;
      if (typeof v === "string") return 4;
      if (Array.isArray(v)) return 28;
      if (v instanceof GVector2) return 5;
      return -1;
    };

    // math
    g.abs = (a) => Math.abs(a[0]);
    g.sign = (a) => Math.sign(a[0]);
    g.min = (a) => Math.min.apply(null, a);
    g.max = (a) => Math.max.apply(null, a);
    g.clamp = (a) => Math.min(Math.max(a[0], a[1]), a[2]);
    g.clampf = g.clamp;
    g.clampi = g.clamp;
    g.floor = (a) => Math.floor(a[0]);
    g.ceil = (a) => Math.ceil(a[0]);
    g.round = (a) => Math.round(a[0]);
    g.sqrt = (a) => Math.sqrt(a[0]);
    g.pow = (a) => Math.pow(a[0], a[1]);
    g.sin = (a) => Math.sin(a[0]);
    g.cos = (a) => Math.cos(a[0]);
    g.tan = (a) => Math.tan(a[0]);
    g.atan = (a) => Math.atan(a[0]);
    g.atan2 = (a) => Math.atan2(a[0], a[1]);
    g.log = (a) => Math.log(a[0]);
    g.exp = (a) => Math.exp(a[0]);
    g.lerp = (a) => a[0] + (a[1] - a[0]) * a[2];
    g.fmod = (a) => a[0] % a[1];
    g.deg_to_rad = (a) => a[0] * Math.PI / 180;
    g.rad_to_deg = (a) => a[0] * 180 / Math.PI;
    g.PI = Math.PI;
    g.TAU = Math.PI * 2;
    g.INF = Infinity;
    g.NAN = NaN;

    // random
    g.randomize = () => null;
    g.randf = () => Math.random();
    g.randi = () => Math.floor(Math.random() * 0x7fffffff);
    g.randi_range = (a) => Math.floor(a[0] + Math.random() * (a[1] - a[0] + 1));
    g.randf_range = (a) => a[0] + Math.random() * (a[1] - a[0]);

    // Vector2 constructor
    g.Vector2 = (a) => new GVector2(a[0] || 0, a[1] || 0);
    g.Vector2.ZERO = new GVector2(0, 0);
    g.Vector2.ONE = new GVector2(1, 1);

    // Color placeholder (string representation)
    g.Color = (a) => ({ r: a[0] || 0, g: a[1] || 0, b: a[2] || 0, a: a[3] == null ? 1 : a[3] });

    return g;
  }

  /* ------------------ Public API ------------------ */
  window.GDS = {
    run: function (source, outFn) {
      try {
        const tokens = tokenize(source);
        const parser = Parser(tokens);
        const ast = parser.parse();
        const interp = Interpreter(outFn);
        interp.run(ast);
        return { ok: true };
      } catch (e) {
        outFn("err", (e && e.message) ? ("Error: " + e.message + "\n") : String(e) + "\n");
        return { ok: false, error: e };
      }
    }
  };
})();
