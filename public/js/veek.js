/* =========================================================
   VEEK — storefront interactions
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function storageGet(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function storageSet(key, value) {
    try { window.sessionStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  /* ---------- page loader (first visit per session only) ---------- */
  var loader = $("#loader");
  if (loader) {
    if (storageGet("veek-loaded") || reduceMotion) {
      loader.classList.add("is-skipped");
      body.classList.add("is-ready");
    } else {
      storageSet("veek-loaded", "1");
      body.classList.add("no-scroll");
      var finish = function () {
        loader.classList.add("is-done");
        body.classList.remove("no-scroll");
        body.classList.add("is-ready");
        setTimeout(function () { loader.classList.add("is-skipped"); }, 1000);
      };
      var minTime = new Promise(function (r) { setTimeout(r, 1300); });
      var loaded = new Promise(function (r) {
        if (document.readyState === "complete") r();
        else window.addEventListener("load", r);
        setTimeout(r, 3500); // never block longer than this
      });
      Promise.all([minTime, loaded]).then(finish);
    }
  } else {
    body.classList.add("is-ready");
  }

  /* ---------- header: shadow + hide on scroll down ---------- */
  var header = $(".site-header");
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (!body.classList.contains("menu-open")) {
      var goingDown = y > lastY;
      body.classList.toggle("header-hidden", goingDown && y > 240);
    }
    lastY = y;
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  onScroll();

  /* ---------- active nav link ---------- */
  var path = window.location.pathname;
  $$(".nav a, .drawer__links a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href === path || (href !== "/" && path.indexOf(href) === 0)) a.classList.add("is-active");
  });

  /* ---------- mobile drawer ---------- */
  var menuBtn = $("#menuBtn");
  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    body.classList.toggle("no-scroll", open);
    if (menuBtn) menuBtn.setAttribute("aria-expanded", String(open));
    if (open) body.classList.remove("header-hidden");
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      setMenu(!body.classList.contains("menu-open"));
    });
  }

  $$("[data-close-menu]").forEach(function (el) {
    el.addEventListener("click", function () { setMenu(false); });
  });

  /* ---------- reveal on scroll ---------- */
  function observeReveals(scope) {
    var items = $$("[data-reveal], .lines", scope);
    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    var vh = window.innerHeight;
    items.forEach(function (el) {
      // anything already on the first screen animates in right away
      if (el.getBoundingClientRect().top < vh) el.classList.add("is-in");
      else io.observe(el);
    });
  }

  // stagger cards inside each grid row-ish
  $$(".grid, .tiles").forEach(function (grid) {
    $$("[data-reveal]", grid).forEach(function (el, i) {
      el.style.setProperty("--d", String((i % 4) * 90));
    });
  });

  // wait for the loader before revealing the first screen
  function startReveals() { observeReveals(document); }
  if (loader && !loader.classList.contains("is-skipped")) {
    var waitReady = setInterval(function () {
      if (body.classList.contains("is-ready")) {
        clearInterval(waitReady);
        setTimeout(startReveals, 250);
      }
    }, 60);
  } else {
    startReveals();
  }

  /* ---------- hero slider ---------- */
  var hero = $("[data-hero]");
  if (hero) {
    var slides = $$(".hero-slide", hero);
    var dots = $$(".hero__dot", hero);
    var interval = 6000;
    var current = 0;
    var timer = null;

    hero.style.setProperty("--hero-interval", interval + "ms");

    var go = function (n) {
      slides[current].classList.remove("is-active");
      current = (n + slides.length) % slides.length;
      slides[current].classList.add("is-active");
      dots.forEach(function (d, i) {
        d.classList.remove("is-active", "is-done");
        // restart animation
        void d.offsetWidth;
        if (i < current) d.classList.add("is-done");
        if (i === current) d.classList.add("is-active");
      });
    };

    var play = function () {
      clearInterval(timer);
      if (slides.length > 1) timer = setInterval(function () { go(current + 1); }, interval);
    };

    dots.forEach(function (d, i) {
      d.addEventListener("click", function () { go(i); play(); });
    });

    go(0);
    play();
  }

  /* ---------- toast ---------- */
  var toastEl = $("#toast");
  var toastTimer = null;

  function toast(message, type) {
    if (!toastEl) return;
    toastEl.className = "toast";
    toastEl.innerHTML = "";
    var icon = document.createElement("span");
    icon.className = "toast__icon";
    icon.textContent = type === "error" ? "!" : "✓";
    var text = document.createElement("span");
    text.textContent = message;
    toastEl.appendChild(icon);
    toastEl.appendChild(text);
    if (type === "error") toastEl.classList.add("error");
    void toastEl.offsetWidth;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2800);
  }

  /* ---------- cart badge ---------- */
  function setCartCount(n) {
    var count = Number(n) || 0;
    $$("[data-cart-count]").forEach(function (el) {
      el.textContent = count;
      el.classList.toggle("is-empty", count === 0);
      el.classList.remove("bump");
      void el.offsetWidth;
      if (count > 0) el.classList.add("bump");
    });
  }

  /* ---------- add to cart (shared) ---------- */
  function addToCart(payload) {
    return fetch("/cart/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.success) {
          setCartCount(data.totalQuantity);
          toast("Added to your bag");
        } else {
          toast((data && data.error) || "Something went wrong", "error");
        }
        return data || { success: false };
      })
      .catch(function () {
        toast("Connection problem, please try again", "error");
        return { success: false };
      });
  }

  /* ---------- modal helpers ---------- */
  var lastFocus = null;

  function openModal(modal) {
    lastFocus = document.activeElement;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    body.classList.add("no-scroll");
    var focusable = modal.querySelector("button, input, [tabindex]");
    if (focusable) setTimeout(function () { focusable.focus(); }, 50);
  }

  function closeModal(modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    body.classList.remove("no-scroll");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  $$("[data-modal-close]").forEach(function (el) {
    el.addEventListener("click", function () { closeModal(el.closest(".modal")); });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    $$(".modal.is-open").forEach(closeModal);
    if (body.classList.contains("menu-open")) setMenu(false);
  });

  /* ---------- qty steppers ---------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-qty]");
    if (!btn) return;
    var input = btn.parentElement.querySelector("input");
    var max = Number(input.getAttribute("max")) || 10;
    var v = (parseInt(input.value, 10) || 1) + Number(btn.getAttribute("data-qty"));
    input.value = Math.min(Math.max(v, 1), max);
  });

  /* ---------- quick add ---------- */
  var qaModal = $("#quickAdd");

  function chipGroup(name, values) {
    var wrap = document.createElement("div");
    wrap.className = "chips";
    values.forEach(function (v, i) {
      var label = document.createElement("label");
      label.className = "chip";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = name;
      input.value = v;
      if (i === 0) input.checked = true;
      var span = document.createElement("span");
      span.textContent = v;
      label.appendChild(input);
      label.appendChild(span);
      wrap.appendChild(label);
    });
    return wrap;
  }

  function parseList(raw) {
    try {
      var list = JSON.parse(raw || "[]");
      return Array.isArray(list) ? list.filter(function (x) { return x !== "" && x != null; }) : [];
    } catch (e) { return []; }
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-quick-add]");
    if (!btn) return;
    e.preventDefault();

    var id = btn.getAttribute("data-id");
    var sizes = parseList(btn.getAttribute("data-sizes"));
    var colors = parseList(btn.getAttribute("data-colors"));

    if (!sizes.length && !colors.length) {
      btn.classList.add("is-loading");
      addToCart({ productId: id, qty: 1 }).then(function () {
        btn.classList.remove("is-loading");
      });
      return;
    }

    if (!qaModal) return;
    qaModal.setAttribute("data-id", id);
    $("#qaName", qaModal).textContent = btn.getAttribute("data-name") || "";
    $("#qaPrice", qaModal).textContent = btn.getAttribute("data-price") || "";
    var img = $("#qaImage", qaModal);
    img.src = btn.getAttribute("data-image") || "";
    img.alt = btn.getAttribute("data-name") || "";

    var sizeWrap = $("#qaSizes", qaModal);
    var colorWrap = $("#qaColors", qaModal);
    sizeWrap.innerHTML = "";
    colorWrap.innerHTML = "";
    sizeWrap.parentElement.hidden = !sizes.length;
    colorWrap.parentElement.hidden = !colors.length;
    if (sizes.length) sizeWrap.appendChild(chipGroup("qaSize", sizes));
    if (colors.length) colorWrap.appendChild(chipGroup("qaColor", colors));
    $("#qaQty", qaModal).value = 1;

    openModal(qaModal);
  });

  if (qaModal) {
    $("#qaConfirm", qaModal).addEventListener("click", function () {
      var confirmBtn = this;
      var size = qaModal.querySelector("input[name=qaSize]:checked");
      var color = qaModal.querySelector("input[name=qaColor]:checked");
      confirmBtn.classList.add("is-loading");
      addToCart({
        productId: qaModal.getAttribute("data-id"),
        size: size ? size.value : null,
        color: color ? color.value : null,
        qty: parseInt($("#qaQty", qaModal).value, 10) || 1
      }).then(function (data) {
        confirmBtn.classList.remove("is-loading");
        if (data.success) closeModal(qaModal);
      });
    });
  }

  /* ---------- magnetic hover for primary CTAs (desktop only) ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
    $$("[data-magnetic]").forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.18;
        var y = (e.clientY - r.top - r.height / 2) * 0.3;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });
      el.addEventListener("mouseleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- public API for page scripts ---------- */
  window.Veek = {
    toast: toast,
    setCartCount: setCartCount,
    addToCart: addToCart,
    openModal: openModal,
    closeModal: closeModal,
    observeReveals: observeReveals
  };

  root.classList.remove("no-js");
})();
