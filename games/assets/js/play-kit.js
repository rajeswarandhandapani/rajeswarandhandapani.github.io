/**
 * KlgPlayKit — interaction mechanics shared by the hand-built games.
 *
 * Every mechanic works by tap or click and by keyboard (Tab, Enter, Space).
 * Dragging is an extra for sorting; nothing needs it.
 *
 *   dragToBins({ host, items, bins, onPlace })
 *       items: [{ id, node|text, bin }]  bins: [{ id, label, icon }]
 *       Pick an item, then tap a bin (or drag it there). A wrong bin gives the
 *       item back; a right one keeps it in the bin. onPlace(item, bin, ok).
 *       Returns { remaining(), placed(), items }.
 *
 *   orderCards({ host, cards, order, onChange })
 *       cards: [{ id, node|text }]  order: the ids in the right order
 *       Tap cards to fill slots 1, 2, 3…; tap a filled slot to take it back.
 *       Returns { check(), isFull(), reset(), answer() }.
 *
 *   tapHotspots({ host, regions, onTap })
 *       regions: [{ id, el, label }]  makes SVG/HTML shapes keyboard buttons
 *       Returns { mark(id, "right"|"wrong"|""), lock() }.
 *
 *   buildFromTiles({ host, tiles, slots, joiner, onChange })
 *       tiles: [{ id, text }]  Tap tiles to fill the answer row left to right.
 *       Returns { value(), ids(), isFull(), reset(), setTiles(tiles) }.
 */
(function () {
  "use strict";

  function h(tag, cls, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function fill(node, item) {
    if (item.node) node.appendChild(typeof item.node === "function" ? item.node() : item.node);
    else node.textContent = item.text;
  }

  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function dragToBins({ host, items, bins, onPlace }) {
    host.replaceChildren();
    host.classList.add("pk-sort");
    const pool = h("div", "pk-pool", { "aria-label": "Things to sort" });
    const binRow = h("div", "pk-bins");
    host.append(pool, binRow);
    let selected = null;
    const placedIds = [];
    const binEls = {};
    bins.forEach((b) => {
      const el = h("button", "pk-bin", { type: "button", "data-bin": b.id, "aria-label": "Put it in " + b.label });
      const title = h("span", "pk-bin-title");
      title.textContent = (b.icon ? b.icon + " " : "") + b.label;
      const content = h("span", "pk-bin-items");
      el.append(title, content);
      el.addEventListener("click", () => drop(b));
      binEls[b.id] = { el, content };
      binRow.appendChild(el);
    });
    const itemEls = {};
    function select(item) {
      selected = selected === item ? null : item;
      Object.keys(itemEls).forEach((id) => itemEls[id].setAttribute("aria-pressed", String(selected && selected.id === id)));
    }
    function drop(bin) {
      if (!selected) return;
      const item = selected;
      const ok = item.bin === bin.id;
      if (ok) {
        const el = itemEls[item.id];
        // Not a disabled button: taps on placed pictures must still reach the house.
        el.classList.add("placed");
        el.tabIndex = -1;
        el.setAttribute("aria-disabled", "true");
        el.setAttribute("aria-pressed", "false");
        binEls[bin.id].content.appendChild(el);
        placedIds.push(item.id);
        selected = null;
      } else {
        const el = itemEls[item.id];
        el.classList.add("pk-shake");
        setTimeout(() => el.classList.remove("pk-shake"), 400);
        // The picture goes back to the pool: pick it up again to try another house.
        el.setAttribute("aria-pressed", "false");
        selected = null;
      }
      if (onPlace) onPlace(item, bin, ok);
    }
    shuffled(items).forEach((item) => {
      const el = h("button", "pk-item", { type: "button", "aria-pressed": "false", "data-id": item.id, "data-bin": item.bin });
      fill(el, item);
      if (item.label) el.setAttribute("aria-label", item.label);
      el.addEventListener("click", () => { if (!el.classList.contains("placed")) select(item); });
      // Pointer drag as an extra: drop on whichever bin is under the finger.
      el.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const startX = e.clientX, startY = e.clientY;
        let moved = false;
        const move = (ev) => {
          if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return;
          moved = true;
          el.style.transform = "translate(" + (ev.clientX - startX) + "px," + (ev.clientY - startY) + "px)";
          el.style.zIndex = "5";
          el.style.pointerEvents = "none";
        };
        const up = (ev) => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          el.style.transform = ""; el.style.zIndex = ""; el.style.pointerEvents = "";
          if (!moved) return;
          const under = document.elementFromPoint(ev.clientX, ev.clientY);
          const binEl = under && under.closest(".pk-bin");
          if (binEl) { selected = item; drop(bins.filter((b) => b.id === binEl.dataset.bin)[0]); }
          ev.preventDefault();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      });
      itemEls[item.id] = el;
      pool.appendChild(el);
    });
    return { remaining: () => items.length - placedIds.length, placed: () => placedIds.slice(), items: itemEls };
  }

  function orderCards({ host, cards, order, onChange }) {
    host.replaceChildren();
    host.classList.add("pk-order");
    const slotsRow = h("div", "pk-slots", { role: "list", "aria-label": "Your order" });
    const bank = h("div", "pk-bank", { "aria-label": "Cards" });
    host.append(slotsRow, bank);
    const slots = order.map((_, i) => {
      const s = h("button", "pk-slot", { type: "button", role: "listitem", "aria-label": "Place " + (i + 1) + ", empty" });
      const num = h("span", "pk-slot-n"); num.textContent = i + 1;
      s.appendChild(num);
      s._id = null;
      s.addEventListener("click", () => { if (s._id) take(i); });
      slotsRow.appendChild(s);
      return s;
    });
    const cardEls = {};
    function put(id) {
      const i = slots.findIndex((s) => !s._id);
      if (i < 0) return;
      const card = cards.filter((c) => c.id === id)[0];
      slots[i]._id = id;
      const body = h("span", "pk-card-body");
      fill(body, card);
      slots[i].appendChild(body);
      slots[i].classList.add("full");
      slots[i].setAttribute("aria-label", "Place " + (i + 1) + ": " + (card.label || card.text || "card") + ". Tap to take back");
      cardEls[id].hidden = true;
      if (onChange) onChange();
    }
    function take(i) {
      const s = slots[i];
      cardEls[s._id].hidden = false;
      s._id = null;
      s.classList.remove("full", "right", "wrong");
      s.querySelector(".pk-card-body").remove();
      s.setAttribute("aria-label", "Place " + (i + 1) + ", empty");
      if (onChange) onChange();
    }
    shuffled(cards).forEach((c) => {
      const el = h("button", "pk-card", { type: "button", "data-id": c.id });
      fill(el, c);
      if (c.label) el.setAttribute("aria-label", c.label);
      el.addEventListener("click", () => put(c.id));
      cardEls[c.id] = el;
      bank.appendChild(el);
    });
    return {
      answer: () => slots.map((s) => s._id),
      isFull: () => slots.every((s) => s._id),
      check() {
        let ok = true;
        slots.forEach((s, i) => {
          const right = s._id === order[i];
          s.classList.toggle("right", right);
          s.classList.toggle("wrong", !right);
          if (!right) ok = false;
        });
        return ok;
      },
      reset() { slots.forEach((s, i) => { if (s._id) take(i); }); },
    };
  }

  function tapHotspots({ host, regions, onTap }) {
    let locked = false;
    const byId = {};
    regions.forEach((r) => {
      const el = r.el;
      el.classList.add("pk-hot");
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", r.label);
      const fire = () => { if (!locked && onTap) onTap(r); };
      el.addEventListener("click", fire);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); } });
      byId[r.id] = el;
    });
    return {
      mark(id, state) { byId[id].classList.remove("right", "wrong"); if (state) byId[id].classList.add(state); },
      lock() { locked = true; },
      unlock() { locked = false; },
    };
  }

  function buildFromTiles({ host, tiles, slots, joiner = "", onChange }) {
    host.replaceChildren();
    host.classList.add("pk-build");
    const row = h("div", "pk-answer", { "aria-label": "Your answer", "aria-live": "polite" });
    const bank = h("div", "pk-bank");
    host.append(row, bank);
    let chosen = [];
    let pool = [];
    function render() {
      row.replaceChildren();
      for (let i = 0; i < slots; i++) {
        const t = chosen[i];
        const b = h("button", "pk-aslot" + (t ? " full" : ""), { type: "button", "aria-label": t ? t.text + ". Tap to take back" : "Empty spot " + (i + 1) });
        b.textContent = t ? t.text : "";
        if (t) b.addEventListener("click", () => { chosen.splice(i, 1); render(); if (onChange) onChange(); });
        row.appendChild(b);
      }
      bank.replaceChildren();
      pool.forEach((t) => {
        const used = chosen.indexOf(t) >= 0;
        const b = h("button", "pk-tile", { type: "button" });
        b.textContent = t.text;
        b.hidden = used;
        b.addEventListener("click", () => { if (chosen.length < slots) { chosen.push(t); render(); if (onChange) onChange(); } });
        bank.appendChild(b);
      });
    }
    const api = {
      value: () => chosen.map((t) => t.text).join(joiner),
      ids: () => chosen.map((t) => t.id),
      isFull: () => chosen.length === slots,
      reset() { chosen = []; render(); if (onChange) onChange(); },
      setTiles(list) { pool = shuffled(list); chosen = []; render(); },
    };
    api.setTiles(tiles);
    return api;
  }

  window.KlgPlayKit = { dragToBins, orderCards, tapHotspots, buildFromTiles, shuffled };
})();
