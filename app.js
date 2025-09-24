(() => {
  const mainLine = document.getElementById("mainLine");
  const modeLine = document.getElementById("modeLine");
  const keys = document.querySelector(".keys");

  let expr = "0";
  let memory = 0;
  let ans = 0;
  let isDeg = true;

  const updateDisplay = () => {
    mainLine.textContent = expr || "0";
    modeLine.textContent = `${isDeg ? "DEG" : "RAD"} | M:${Number(memory.toFixed(10)).toString()}`;
  };

  const setExpr = (s) => { expr = s; updateDisplay(); };

  const append = (s) => {
    if (expr === "0" && /[0-9.πe]/.test(s)) {
      setExpr(s);
    } else {
      setExpr(expr + s);
    }
  };

  const isSafeChars = (s) => {
    // permit numbers, basic ops, parentheses, dot, comma (not used), functions tokens we introduce, π, e, Ans
    return /^[0-9+\-*/^().,%!√πe Ainscotalgqrxy]+$/i.test(
      s.replaceAll("×","*").replaceAll("÷","/")
    );
  };

  // Factorial (integer or gamma-ish for n>=0 integer only to keep it simple)
  const factorial = (n) => {
    if (n < 0 || !Number.isFinite(n)) return NaN;
    if (Math.floor(n) !== n) return NaN; // only integers
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  };

  const toRadians = (x) => (isDeg ? (x * Math.PI) / 180 : x);

  // Transform human expression to a JS-safe string using Math.* and allowed funcs
  const transform = (raw) => {
    let s = raw;

    // Replace visual operators
    s = s.replaceAll("×","*").replaceAll("÷","/");

    // Handle Ans
    s = s.replace(/\bAns\b/gi, String(ans));

    // Constants
    s = s.replace(/π/g, "Math.PI").replace(/\be\b/g, "Math.E");

    // Implicit multiplication cases: number)(, )number, numberπ, )π, numberfunc, πnumber
    s = s.replace(/(\d|\)|Math\.PI|Math\.E)\s*(\()/g, "$1*$2");
    s = s.replace(/(\))\s*(\d)/g, "$1*$2");
    s = s.replace(/(\d|\))\s*(Math\.PI|Math\.E)/g, "$1*$2");
    s = s.replace(/(Math\.PI|Math\.E)\s*(\d|\()/g, "$1*$2");

    // Percent: treat trailing % as /100
    s = s.replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)");

    // Power via caret or xʸ
    s = s.replace(/\^/g, "**");

    // Functions
    // √x -> sqrt(x)
    s = s.replace(/√(?=\()/g, "Math.sqrt");

    // Named funcs with parentheses
    s = s.replace(/\bln(?=\()/gi, "Math.log");
    s = s.replace(/\blog(?=\()/gi, "Math.log10");
    // trig need DEG/RAD handling; wrap toRadians
    s = s.replace(/\bsin\(([^)]+)\)/gi, (_, a) => `Math.sin(${isDeg ? `((${a})*Math.PI/180)` : a})`);
    s = s.replace(/\bcos\(([^)]+)\)/gi, (_, a) => `Math.cos(${isDeg ? `((${a})*Math.PI/180)` : a})`);
    s = s.replace(/\btan\(([^)]+)\)/gi, (_, a) => `Math.tan(${isDeg ? `((${a})*Math.PI/180)` : a})`);

    // x! factorial (only postfix on numbers or closing paren)
    // Replace iteratively to handle multiple !!
    const replaceFactorial = (str) => {
      let prev;
      const re = /(\b\d+(?:\.\d+)?|\([^()]*\))!/g;
      do {
        prev = str;
        str = str.replace(re, (_, inner) => `__fact__(${inner})`);
      } while (str !== prev);
      return str;
    };
    s = replaceFactorial(s);

    // Reciprocal marker __inv__(x) if we inserted earlier
    // (handled by direct transform when pressing 1/x)

    return s;
  };

  // Evaluate transformed expression with a safe Function and whitelisted helpers
  const safeEval = (t) => {
    const __fact__ = factorial;
    const __inv__ = (x) => 1 / x;

    // Basic safety net
    if (!isSafeChars(t)) throw new Error("Caracter no permitido.");
    // eslint-disable-next-line no-new-func
    const f = new Function("Math","__fact__","__inv__", `return (${t});`);
    return f(Math, __fact__, __inv__);
  };

  const compute = () => {
    try {
      const t = transform(expr);
      let result = safeEval(t);
      if (typeof result !== "number" || !isFinite(result)) throw new Error("Resultado inválido");
      // Normalize tiny rounding errors
      result = Number.parseFloat(result.toFixed(12));
      ans = result;
      setExpr(String(result));
    } catch (e) {
      setExpr("Error");
      setTimeout(() => setExpr("0"), 900);
    }
  };

  // Button handlers
  keys.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;

    const insert = b.getAttribute("data-insert");
    const action = b.getAttribute("data-action");
    const fn = b.getAttribute("data-fn");

    if (insert !== null) {
      append(insert);
      return;
    }

    if (action) {
      switch (action) {
        case "toggleDegRad":
          isDeg = !isDeg; updateDisplay(); break;
        case "ans":
          append("Ans"); break;
        case "del":
          if (expr.length <= 1) setExpr("0");
          else setExpr(expr.slice(0, -1));
          break;
        case "ac":
          setExpr("0");
          break;
        case "divide": append("÷"); break;
        case "multiply": append("×"); break;
        case "minus": append("−".replace("−","-")); break;
        case "plus": append("+"); break;
        case "powCaret": append("^"); break;
        case "equals": compute(); break;
      }
      return;
    }

    if (fn) {
      switch (fn) {
        case "sqrt": append("√("); break;
        case "square": append("^2"); break;
        case "pow": append("^"); break;
        case "sin": append("sin("); break;
        case "cos": append("cos("); break;
        case "tan": append("tan("); break;
        case "ln": append("ln("); break;
        case "log": append("log("); break;
        case "inv":
          // wrap last token or whole expr with __inv__(...)
          wrapLast("(__inv__(", "))");
          break;
        case "factorial":
          append("!"); break;
        case "percent":
          append("%"); break;
      }
      return;
    }
  });

  // Memory actions on buttons
  keys.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const action = b.getAttribute("data-action");
    if (!action) return;
    switch (action) {
      case "mc": memory = 0; updateDisplay(); break;
      case "mr": append(String(memory)); break;
      case "mplus":
        try { memory += Number(safeEval(transform(expr))); } catch {}
        updateDisplay(); break;
      case "mminus":
        try { memory -= Number(safeEval(transform(expr))); } catch {}
        updateDisplay(); break;
    }
  });

  // Helper: wrap last number/paren group for 1/x
  function wrapLast(prefix, suffix) {
    // find last number, constant, or ) group
    const m = expr.match(/(Math\.PI|Math\.E|π|e|\d+(?:\.\d+)?|\))\s*$/);
    if (m) {
      const i = m.index;
      if (m[0] === ")") {
        // find matching opening (
        let depth = 0, start = -1;
        for (let k = expr.length - 1; k >= 0; k--) {
          const ch = expr[k];
          if (ch === ")") depth++;
          else if (ch === "(") {
            depth--;
            if (depth === 0) { start = k; break; }
          }
        }
        if (start !== -1) {
          setExpr(expr.slice(0, start) + prefix + expr.slice(start) + suffix);
          return;
        }
      }
      setExpr(expr.slice(0, i) + prefix + expr.slice(i) + suffix);
    } else {
      setExpr(prefix + expr + suffix);
    }
  }

  // Keyboard support
  window.addEventListener("keydown", (ev) => {
    const k = ev.key;
    if ((k >= "0" && k <= "9") || k === ".") { append(k); return; }
    if (k === "+" || k === "-" || k === "*" || k === "/") {
      append(k === "*" ? "×" : k === "/" ? "÷" : k); return;
    }
    if (k === "^") { append("^"); return; }
    if (k === "Enter" || k === "=") { ev.preventDefault(); compute(); return; }
    if (k === "Backspace") { ev.preventDefault(); const s = expr.length<=1?"0":expr.slice(0,-1); setExpr(s); return; }
    if (k === "Delete") { setExpr("0"); return; }
    if (k === "(" || k === ")") { append(k); return; }
  });

  updateDisplay();
})();
