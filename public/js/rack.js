/* =========================================================
   VEEK — "on the rack" hero
   Rack mode: pieces hang on a rail, hover pulls one forward.
   Focus mode: the picked piece flies to the center, the rest
   blur to the sides; arrows / swipe / keys move along the rail.
   ========================================================= */
(function () {
  "use strict";

  var rack = document.querySelector("[data-rack]");
  if (!rack) return;

  var scroller = rack.querySelector(".rack__scroller");
  var items = Array.prototype.slice.call(rack.querySelectorAll(".hang"));
  var n = items.length;
  if (!n) return;

  var caption = rack.querySelector(".rack__caption");
  var nameEl = document.getElementById("rackName");
  var priceEl = document.getElementById("rackPrice");
  var viewEl = document.getElementById("rackView");
  var addEl = document.getElementById("rackAdd");
  var toggle = rack.querySelector(".rack__toggle");

  var current = 0;
  var focused = false;
  var moveTimer = null;

  // the drop-in animation only plays once
  setTimeout(function () { rack.classList.add("is-settled"); }, 350 + n * 85 + 1500);

  /* ---------- helpers ---------- */
  function data(i) { return items[i].dataset; }

  function img(i) { return items[i].querySelector(".hang__img img"); }

  // shortest distance around the rail, so the carousel loops
  function offset(i) {
    var d = i - current;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  }

  function rectsOf() {
    return items.map(function (el) { return el.getBoundingClientRect(); });
  }

  function freeze() {
    items.forEach(function (el) {
      el.classList.remove("is-moving");
      el.style.transition = "none";
    });
  }

  function release() {
    void rack.offsetWidth; // commit the starting frame
    items.forEach(function (el) {
      el.style.transition = "";
      el.classList.add("is-moving");
    });
    clearTimeout(moveTimer);
    moveTimer = setTimeout(function () {
      items.forEach(function (el) { el.classList.remove("is-moving"); });
    }, 950);
  }

  /* ---------- focus layout ---------- */
  function layoutFocus() {
    var w = items[current].offsetWidth;
    var narrow = window.innerWidth < 900;
    var gaps = narrow ? [0, 0.6, 0.96, 1.24] : [0, 0.84, 1.42, 1.86];
    var scales = [1, 0.56, 0.42, 0.34];
    var blurs = [0, 3, 6, 8];
    var fades = [1, 0.72, 0.32, 0];

    items.forEach(function (el, i) {
      var d = offset(i);
      var a = Math.min(Math.abs(d), 3);
      var x = d === 0 ? 0 : (d > 0 ? 1 : -1) * w * gaps[a];
      el.style.transform = "translate(" + x + "px,0) scale(" + scales[a] + ")";
      el.style.filter = blurs[a] ? "blur(" + blurs[a] + "px) grayscale(.6)" : "none";
      el.style.opacity = fades[a];
      el.style.zIndex = String(10 - a);
      el.classList.toggle("is-current", d === 0);
      el.querySelector(".hang__btn").tabIndex = Math.abs(d) <= 1 ? 0 : -1;
    });
  }

  /* ---------- info panel ---------- */
  function setPrice(d) {
    priceEl.innerHTML = "";
    var now = document.createElement("span");
    now.className = "price__now";
    now.textContent = d.now + " EGP";
    priceEl.appendChild(now);
    if (d.was) {
      var was = document.createElement("span");
      was.className = "price__old";
      was.textContent = d.was + " EGP";
      var badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "−" + d.off + "%";
      priceEl.appendChild(was);
      priceEl.appendChild(badge);
    }
  }

  function updateInfo() {
    var d = data(current);

    nameEl.textContent = d.name;
    nameEl.classList.remove("is-changing");
    void nameEl.offsetWidth;
    nameEl.classList.add("is-changing");

    setPrice(d);
    viewEl.href = "/product/" + d.id;

    addEl.setAttribute("data-id", d.id);
    addEl.setAttribute("data-name", d.name);
    addEl.setAttribute("data-price", d.now + " EGP");
    addEl.setAttribute("data-image", d.front);
    addEl.setAttribute("data-sizes", d.sizes);
    addEl.setAttribute("data-colors", d.colors);
    addEl.disabled = !!d.soldout;
    addEl.textContent = d.soldout ? "Sold out" : "Quick add";

    toggle.hidden = !d.back;
    setSide("front", true);
  }

  /* ---------- front / back ---------- */
  function setSide(side, instant) {
    var d = data(current);
    var picture = img(current);
    var src = side === "back" && d.back ? d.back : d.front;

    toggle.classList.toggle("is-back", side === "back");
    toggle.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-side") === side);
    });

    if (picture.getAttribute("src") === src) return;
    if (instant) { picture.src = src; return; }

    picture.classList.add("is-swapping");
    setTimeout(function () {
      picture.onload = function () { picture.classList.remove("is-swapping"); };
      picture.src = src;
      if (picture.complete) picture.classList.remove("is-swapping");
    }, 220);
  }

  // put every other piece back on its front side
  function resetSides() {
    items.forEach(function (el, i) {
      var p = img(i);
      if (p.getAttribute("src") !== data(i).front) p.src = data(i).front;
    });
  }

  /* ---------- enter / move / exit ---------- */
  function enter(i) {
    if (focused) { go(i); return; }

    var first = rectsOf();
    current = i;
    focused = true;
    rack.classList.add("is-focus", "is-settled");

    freeze();
    items.forEach(function (el) { el.style.transform = "none"; el.style.filter = "none"; el.style.opacity = "1"; });

    // every piece now shares the same centered box — fly each one from where it was
    var base = items[current].getBoundingClientRect();
    items.forEach(function (el, k) {
      var f = first[k];
      var s = f.width / base.width;
      var dx = (f.left + f.width / 2) - (base.left + base.width / 2);
      var dy = f.top - base.top;
      el.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + s + ")";
    });

    release();
    layoutFocus();
    updateInfo();

    var top = rack.getBoundingClientRect().top;
    if (top < -40) window.scrollTo({ top: window.scrollY + top, behavior: "smooth" });
  }

  function go(i) {
    resetSides();
    current = (i + n) % n;
    items.forEach(function (el) { el.classList.add("is-moving"); });
    release();
    layoutFocus();
    updateInfo();
  }

  function exit() {
    if (!focused) return;

    var first = rectsOf();
    var fades = items.map(function (el) { return getComputedStyle(el).opacity; });

    focused = false;
    resetSides();
    rack.classList.remove("is-focus");
    freeze();
    items.forEach(function (el) {
      el.classList.remove("is-current");
      el.style.transform = "none";
      el.style.filter = "";
      el.style.opacity = "";
      el.style.zIndex = "";
      el.querySelector(".hang__btn").tabIndex = 0;
    });

    // keep the piece you were looking at in view on small screens
    var cur = items[current];
    scroller.scrollLeft = cur.offsetLeft - scroller.clientWidth / 2 + cur.offsetWidth / 2;

    var last = rectsOf();
    items.forEach(function (el, k) {
      var f = first[k];
      var l = last[k];
      var s = f.width / l.width;
      var dx = (f.left + f.width / 2) - (l.left + l.width / 2);
      var dy = f.top - l.top;
      el.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + s + ")";
      el.style.opacity = fades[k];
    });

    release();
    items.forEach(function (el) {
      el.style.transform = "";
      el.style.opacity = "";
    });

    caption.textContent = caption.getAttribute("data-default");
    caption.classList.remove("is-live");
    items[current].querySelector(".hang__btn").focus({ preventScroll: true });
  }

  /* ---------- events ---------- */
  items.forEach(function (el, i) {
    var btn = el.querySelector(".hang__btn");

    btn.addEventListener("click", function () {
      if (!focused) enter(i);
      else if (i === current) window.location.href = "/product/" + data(i).id;
      else go(i);
    });

    btn.addEventListener("mouseenter", function () {
      if (focused) return;
      caption.textContent = data(i).name + " — " + data(i).now + " EGP";
      caption.classList.add("is-live");
    });

    btn.addEventListener("mouseleave", function () {
      if (focused) return;
      caption.textContent = caption.getAttribute("data-default");
      caption.classList.remove("is-live");
    });
  });

  rack.querySelector("[data-rack-open]").addEventListener("click", function () { enter(current); });
  rack.querySelector("[data-rack-close]").addEventListener("click", exit);

  rack.querySelectorAll("[data-rack-step]").forEach(function (b) {
    b.addEventListener("click", function () { go(current + Number(b.getAttribute("data-rack-step"))); });
  });

  toggle.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () { setSide(b.getAttribute("data-side")); });
  });

  document.addEventListener("keydown", function (e) {
    if (!focused || document.querySelector(".modal.is-open")) return;
    if (e.key === "ArrowRight") go(current + 1);
    else if (e.key === "ArrowLeft") go(current - 1);
    else if (e.key === "Escape") exit();
  });

  // swipe between pieces on touch screens
  var startX = null;
  var stage = rack.querySelector(".rack__stage");
  stage.addEventListener("touchstart", function (e) {
    if (focused) startX = e.touches[0].clientX;
  }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (!focused || startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
    startX = null;
  }, { passive: true });

  var resizeTimer;
  window.addEventListener("resize", function () {
    if (!focused) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { freeze(); layoutFocus(); }, 120);
  });

  /* ---------- open straight on the clothes ---------- */
  focused = true;
  rack.classList.add("is-settled");
  freeze();
  layoutFocus();
  updateInfo();
  window.requestAnimationFrame(function () {
    items.forEach(function (el) { el.style.transition = ""; });
    rack.classList.remove("is-booting");
    rack.classList.add("is-intro");
    setTimeout(function () { rack.classList.remove("is-intro"); }, 2200);
  });
})();
