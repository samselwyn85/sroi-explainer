/* SROI calculator — full builder.
   Plain vanilla JS, no dependencies. State lives in memory; the worked
   example can be reloaded at any time with the "Load worked example" button.

   Model, per benefit, per year t = 1..3:
     quantity = cohort × (seg% ÷ 100) × (succ% ÷ 100) × units
     value    = quantity × proxy
     pv       = value ÷ (1 + rate)^(t − 0.5)      // mid-year discounting
*/

(function () {
  "use strict";

  // ---------- worked example (published NZ SROI, 2026) ----------
  // years: [segment %, success %, units per person] for Years 1–3.
  var EXAMPLE = {
    cohort: 2453,
    rate: 2,
    cost: 5644906,
    benefits: [
      { name: "Enhanced life satisfaction", proxy: 7343,
        unit: "year-equivalent of improved life satisfaction",
        years: [[41.83, 60, 1], [37.64, 57, 1], [33.46, 55, 1]] },
      { name: "Belonging & social connectedness", proxy: 3455,
        unit: "year-equivalent of improved belonging",
        years: [[62.66, 70, 1], [56.35, 68, 1], [50.06, 65, 1]] },
      { name: "Jobseeker benefit avoided", proxy: 17168,
        unit: "year of Jobseeker Support avoided (0.25 = 3 months)",
        years: [[4.15, 45, 0.25], [3.73, 40.5, 0.125], [3.32, 38.25, 0.0625]] },
      { name: "Youth justice response avoided", proxy: 4638,
        unit: "low-risk youth justice response avoided (one-off)",
        years: [[6.727, 40, 1], [0, 0, 0], [0, 0, 0]] },
      { name: "Enhanced education engagement", proxy: 1845,
        unit: "engagement year-equivalent (unit tapers as momentum fades)",
        years: [[4.15, 55, 1], [3.73, 49.5, 0.7], [3.32, 46.75, 0.5]] },
      { name: "Emergency housing avoided", proxy: 313.71,
        unit: "emergency accommodation night avoided (7 per case)",
        years: [[5.474, 25, 7], [4.105, 20, 7], [3.011, 16.25, 7]] },
      { name: "Material hardship avoided", proxy: 400,
        unit: "grant-equivalent resolution (one-off)",
        years: [[5.707, 50, 1], [0, 0, 0], [0, 0, 0]] },
      { name: "Mental health crisis avoided", proxy: 571,
        unit: "ED presentation avoided (one-off)",
        years: [[5.164, 30, 1], [0, 0, 0], [0, 0, 0]] },
      { name: "Restored primary healthcare access", proxy: 166,
        unit: "year-equivalent of restored access",
        years: [[1.26, 55, 1], [1.14, 50, 1], [1.04, 47, 1]] }
    ]
  };

  var BLANK_BENEFIT = function () {
    return {
      name: "New benefit",
      proxy: 0,
      unit: "describe one unit of change (e.g. a year of X, one event of Y avoided)",
      years: [[0, 0, 1], [0, 0, 0], [0, 0, 0]]
    };
  };

  // ---------- state ----------
  var state = {
    cohort: EXAMPLE.cohort,
    rate: EXAMPLE.rate,
    cost: EXAMPLE.cost,
    benefits: deepCopy(EXAMPLE.benefits),
    open: {} // benefit index -> bool (details expanded); default open
  };

  function deepCopy(x) { return JSON.parse(JSON.stringify(x)); }

  // ---------- maths ----------
  function pvOfBenefit(b) {
    var out = { years: [], total: 0 };
    for (var t = 0; t < 3; t++) {
      var y = b.years[t];
      var qty = state.cohort * (y[0] / 100) * (y[1] / 100) * y[2];
      var val = qty * b.proxy;
      var pv = val / Math.pow(1 + state.rate / 100, (t + 1) - 0.5);
      out.years.push({ qty: qty, val: val, pv: pv });
      out.total += pv;
    }
    return out;
  }

  function money(n) {
    if (!isFinite(n)) return "—";
    var neg = n < 0 ? "−" : "";
    n = Math.abs(n);
    if (n >= 1e6) return neg + "$" + (n / 1e6).toFixed(2) + "m";
    if (n >= 1000) return neg + "$" + Math.round(n).toLocaleString("en-NZ");
    return neg + "$" + n.toFixed(0);
  }
  function qtyFmt(n) {
    if (!isFinite(n)) return "—";
    return n >= 100 ? Math.round(n).toLocaleString("en-NZ") : (+n.toFixed(1)).toString();
  }

  // ---------- render ----------
  var $ = function (id) { return document.getElementById(id); };

  function render() {
    var results = state.benefits.map(function (b) { return pvOfBenefit(b); });
    var grand = results.reduce(function (a, r) { return a + r.total; }, 0);

    // results bar
    $("r-pv").textContent = money(grand);
    $("r-cost").textContent = money(state.cost);
    $("r-bcr").textContent = state.cost > 0 ? (grand / state.cost).toFixed(2) + " : 1" : "—";
    var npv = grand - state.cost;
    $("r-npv").textContent = (npv >= 0 ? "+" : "") + money(npv);

    renderBenefits(results, grand);
    renderShares(results, grand);
  }

  function renderBenefits(results, grand) {
    var host = $("benefits");
    host.innerHTML = "";

    if (state.benefits.length === 0) {
      var e = document.createElement("div");
      e.className = "empty";
      e.textContent = "No benefits yet. Add one, or load the worked example to see a complete model.";
      host.appendChild(e);
      return;
    }

    state.benefits.forEach(function (b, i) {
      var r = results[i];
      var card = document.createElement("div");
      card.className = "benefit";

      // header
      var head = document.createElement("div");
      head.className = "head";
      head.innerHTML =
        '<input class="name" type="text" aria-label="Benefit name" data-i="' + i + '" data-f="name" value="">' +
        '<span class="pv mono">' + money(r.total) + " PV</span>";
      head.querySelector("input.name").value = b.name;
      card.appendChild(head);

      // body
      var body = document.createElement("div");
      body.className = "body";

      var top = document.createElement("div");
      top.className = "row-top";
      top.innerHTML =
        '<div><label for="px-' + i + '">Proxy $ per unit</label>' +
        '<input id="px-' + i + '" type="number" min="0" step="1" data-i="' + i + '" data-f="proxy" value="' + b.proxy + '"></div>' +
        '<div><label for="un-' + i + '">What one unit means</label>' +
        '<input id="un-' + i + '" type="text" data-i="' + i + '" data-f="unit" value=""></div>';
      top.querySelector('#un-' + i).value = b.unit;
      body.appendChild(top);

      // per-year table
      var tbl = document.createElement("table");
      var html =
        "<thead><tr><th>Year</th><th>Segment %</th><th>Success %</th><th>Units / person</th>" +
        "<th style='text-align:right'>Quantity</th><th style='text-align:right'>PV</th></tr></thead><tbody>";
      for (var t = 0; t < 3; t++) {
        html +=
          "<tr><td class='mono' style='color:var(--ink-soft)'>Yr " + (t + 1) + "</td>" +
          "<td><input type='number' min='0' max='100' step='0.01' aria-label='Year " + (t + 1) + " segment share percent' data-i='" + i + "' data-y='" + t + "' data-p='0' value='" + b.years[t][0] + "'></td>" +
          "<td><input type='number' min='0' max='100' step='0.5' aria-label='Year " + (t + 1) + " success rate percent' data-i='" + i + "' data-y='" + t + "' data-p='1' value='" + b.years[t][1] + "'></td>" +
          "<td><input type='number' min='0' step='0.05' aria-label='Year " + (t + 1) + " units per person' data-i='" + i + "' data-y='" + t + "' data-p='2' value='" + b.years[t][2] + "'></td>" +
          "<td class='calc'>" + qtyFmt(r.years[t].qty) + "</td>" +
          "<td class='calc pvcell'>" + money(r.years[t].pv) + "</td></tr>";
      }
      html += "</tbody>";
      tbl.innerHTML = html;
      body.appendChild(tbl);

      // year-1 worked chain
      var y0 = b.years[0], r0 = r.years[0];
      var chain = document.createElement("div");
      chain.className = "chain";
      chain.innerHTML =
        "Year 1: <b>" + state.cohort.toLocaleString("en-NZ") + "</b> people × <b>" + y0[0] + "%</b> exposed × <b>" +
        y0[1] + "%</b> succeed × <b>" + y0[2] + "</b> units = <b>" + qtyFmt(r0.qty) + "</b> units → × <b>$" +
        Number(b.proxy).toLocaleString("en-NZ") + "</b> = <b>" + money(r0.val) + "</b> → discounted = <b>" + money(r0.pv) + "</b>";
      body.appendChild(chain);

      card.appendChild(body);

      // footer: delete
      var foot = document.createElement("div");
      foot.className = "foot";
      var del = document.createElement("button");
      del.className = "danger small";
      del.type = "button";
      del.textContent = "Delete this benefit";
      del.addEventListener("click", function () {
        if (confirm('Delete "' + b.name + '"? This can\u2019t be undone.')) {
          state.benefits.splice(i, 1);
          render();
        }
      });
      foot.appendChild(del);
      card.appendChild(foot);

      host.appendChild(card);
    });

    // wire inputs (event delegation would also work; direct is simpler to read)
    host.querySelectorAll("input").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var i = +inp.dataset.i;
        var b = state.benefits[i];
        if (!b) return;
        if (inp.dataset.f === "name") { b.name = inp.value; refreshCalcOnly(); return; }
        if (inp.dataset.f === "unit") { b.unit = inp.value; return; }
        var v = parseFloat(inp.value);
        if (isNaN(v)) return;
        if (inp.dataset.f === "proxy") { b.proxy = Math.max(0, v); }
        else { b.years[+inp.dataset.y][+inp.dataset.p] = Math.max(0, v); }
        refreshCalcOnly();
      });
    });
  }

  // Recompute displayed numbers without rebuilding the DOM (keeps focus in inputs).
  function refreshCalcOnly() {
    var results = state.benefits.map(function (b) { return pvOfBenefit(b); });
    var grand = results.reduce(function (a, r) { return a + r.total; }, 0);

    $("r-pv").textContent = money(grand);
    $("r-cost").textContent = money(state.cost);
    $("r-bcr").textContent = state.cost > 0 ? (grand / state.cost).toFixed(2) + " : 1" : "—";
    var npv = grand - state.cost;
    $("r-npv").textContent = (npv >= 0 ? "+" : "") + money(npv);

    document.querySelectorAll("#benefits .benefit").forEach(function (card, i) {
      var b = state.benefits[i], r = results[i];
      if (!b) return;
      card.querySelector(".pv").textContent = money(r.total) + " PV";
      var calcs = card.querySelectorAll("td.calc");
      for (var t = 0; t < 3; t++) {
        calcs[t * 2].textContent = qtyFmt(r.years[t].qty);
        calcs[t * 2 + 1].textContent = money(r.years[t].pv);
      }
      var y0 = b.years[0], r0 = r.years[0];
      card.querySelector(".chain").innerHTML =
        "Year 1: <b>" + state.cohort.toLocaleString("en-NZ") + "</b> people × <b>" + y0[0] + "%</b> exposed × <b>" +
        y0[1] + "%</b> succeed × <b>" + y0[2] + "</b> units = <b>" + qtyFmt(r0.qty) + "</b> units → × <b>$" +
        Number(b.proxy).toLocaleString("en-NZ") + "</b> = <b>" + money(r0.val) + "</b> → discounted = <b>" + money(r0.pv) + "</b>";
    });

    renderShares(results, grand);
  }

  function renderShares(results, grand) {
    var host = $("shares");
    host.innerHTML = "";
    state.benefits.forEach(function (b, i) {
      var pct = grand > 0 ? (results[i].total / grand) * 100 : 0;
      var li = document.createElement("li");
      li.innerHTML =
        "<span>" + escapeHtml(b.name) + "</span>" +
        '<span class="track"><span class="fill" style="width:' + Math.max(pct, 0.5) + '%"></span></span>' +
        '<span class="pct">' + pct.toFixed(1) + "%</span>";
      host.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- global controls ----------
  $("g-cohort").addEventListener("input", function (e) {
    var v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v > 0) { state.cohort = v; refreshCalcOnly(); }
  });
  $("g-rate").addEventListener("input", function (e) {
    var v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0) { state.rate = v; refreshCalcOnly(); }
  });
  $("g-cost").addEventListener("input", function (e) {
    var v = parseFloat(e.target.value);
    if (!isNaN(v) && v >= 0) { state.cost = v; refreshCalcOnly(); }
  });

  $("btn-example").addEventListener("click", function () {
    state.cohort = EXAMPLE.cohort;
    state.rate = EXAMPLE.rate;
    state.cost = EXAMPLE.cost;
    state.benefits = deepCopy(EXAMPLE.benefits);
    $("g-cohort").value = state.cohort;
    $("g-rate").value = state.rate;
    $("g-cost").value = state.cost;
    render();
  });

  $("btn-blank").addEventListener("click", function () {
    if (state.benefits.length && !confirm("Clear the current model and start blank?")) return;
    state.benefits = [];
    render();
  });

  function addBenefit() {
    state.benefits.push(BLANK_BENEFIT());
    render();
    var cards = document.querySelectorAll("#benefits .benefit");
    var last = cards[cards.length - 1];
    if (last) {
      last.scrollIntoView({ behavior: "smooth", block: "center" });
      var nm = last.querySelector("input.name");
      if (nm) { nm.focus(); nm.select(); }
    }
  }
  $("btn-add").addEventListener("click", addBenefit);
  $("btn-add-2").addEventListener("click", addBenefit);

  // ---------- boot ----------
  render();
})();
