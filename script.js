(function() {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const pad = n => String(n).padStart(2, '0');

  const debounce = (fn, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const store = {
    get: key => {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch {
        return null;
      }
    },
    set: (key, val) => {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch {}
    },
    session: {
      get: key => {
        try {
          return JSON.parse(sessionStorage.getItem(key));
        } catch {
          return null;
        }
      },
      set: (key, val) => {
        try {
          sessionStorage.setItem(key, JSON.stringify(val));
        } catch {}
      }
    }
  };

  // ========== DETECT TIME OF DAY FOR DYNAMIC BACKGROUND ==========
  function updateTimeOfDay() {
    const h24 = new Date().getHours();
    let timeOfDay = '';
    if (h24 >= 5 && h24 < 12) timeOfDay = 'morning';
    else if (h24 >= 12 && h24 < 17) timeOfDay = 'afternoon';
    else if (h24 >= 17 && h24 < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';
    document.body.setAttribute('data-time', timeOfDay);
  }
  updateTimeOfDay();
  setInterval(updateTimeOfDay, 60000);

  // ========== DYNAMIC COPYRIGHT YEAR ==========
  (function() {
    const yearSpan = $('#copyright-year');
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  })();

  // ========== SYSTEM MONITOR (No permissions needed) ==========
  (function() {
    const ramEl = $('#ram-usage');
    const batteryEl = $('#battery-status');
    const connectionEl = $('#connection-status');

    function updateRAM() {
      if (!ramEl) return;
      if (performance.memory) {
        const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
        ramEl.textContent = `${usedMB}MB / ${limitMB}MB`;
      } else {
        ramEl.textContent = 'N/A';
      }
    }

    function updateBattery() {
      if (!batteryEl) return;
      if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
          const renderBattery = () => {
            const level = Math.round(battery.level * 100);
            const charging = battery.charging ? '⚡' : '🔋';
            batteryEl.textContent = `${charging} ${level}%`;
          };
          renderBattery();
          battery.addEventListener('levelchange', renderBattery);
          battery.addEventListener('chargingchange', renderBattery);
        }).catch(() => {
          batteryEl.textContent = '—';
        });
      } else {
        batteryEl.textContent = '—';
      }
    }

    function updateConnection() {
      if (!connectionEl) return;
      if ('connection' in navigator && navigator.connection) {
        const conn = navigator.connection;
        const renderConn = () => {
          const type = conn.effectiveType || conn.type || 'unknown';
          connectionEl.textContent = type.toUpperCase();
        };
        renderConn();
        conn.addEventListener('change', renderConn);
      } else {
        connectionEl.textContent = '—';
      }
    }

    updateRAM();
    updateBattery();
    updateConnection();
    setInterval(updateRAM, 30000);
  })();

  // ========== OFFLINE MODE INDICATOR ==========
  (function() {
    const offlineIndicator = $('#offline-indicator');
    if (!offlineIndicator) return;

    function updateOfflineStatus() {
      offlineIndicator.style.display = navigator.onLine ? 'none' : 'flex';
    }

    window.addEventListener('online', updateOfflineStatus);
    window.addEventListener('offline', updateOfflineStatus);
    updateOfflineStatus();
  })();

  // ========== FOCUS MODE (F11) ==========
  (function() {
    const focusBtn = $('#focus-toggle');
    const focusModeKey = 'focus_mode';

    function setFocusMode(enabled) {
      if (enabled) {
        document.body.classList.add('focus-mode');
        store.set(focusModeKey, true);
        if (focusBtn) focusBtn.style.background = 'var(--accent-dim)';
      } else {
        document.body.classList.remove('focus-mode');
        store.set(focusModeKey, false);
        if (focusBtn) focusBtn.style.background = '';
      }
    }

    function toggleFocusMode() {
      setFocusMode(!document.body.classList.contains('focus-mode'));
    }

    if (focusBtn) {
      focusBtn.addEventListener('click', toggleFocusMode);
    }

    const savedFocusMode = store.get(focusModeKey);
    if (savedFocusMode) {
      setFocusMode(true);
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFocusMode();
      }
    });
  })();

  // ========== FULLSCREEN MODE (F12) ==========
  (function() {
    const fullscreenBtn = $('#fullscreen-toggle');

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn(`Fullscreen error: ${err.message}`);
        });
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'F12') {
        e.preventDefault();
        toggleFullscreen();
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (fullscreenBtn) {
        fullscreenBtn.style.background = document.fullscreenElement ? 'var(--accent-dim)' : '';
      }
    });
  })();

  // ========== ACCURATE TIMEZONE-AWARE CLOCK ==========
  (function() {
    const timeEl = $('#clock-time');
    const secsEl = $('#clock-seconds');
    const ampmEl = $('#clock-ampm');
    const greetEl = $('#greeting');
    const dateEl = $('#date-display');
    const timezoneEl = $('#timezone-info');

    if (!timeEl) return;

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneShort = userTimezone.split('/').pop().replace('_', ' ');

    let lastMin = -1;

    function update() {
      const now = new Date();
      const h24 = now.getHours();
      const h12 = h24 % 12 || 12;
      const m = now.getMinutes();
      const s = now.getSeconds();

      if (secsEl) secsEl.textContent = pad(s);

      if (m !== lastMin) {
        lastMin = m;
        timeEl.textContent = `${pad(h12)}:${pad(m)}`;
        if (ampmEl) ampmEl.textContent = h24 < 12 ? 'AM' : 'PM';

        if (timezoneEl) {
          const formattedTime = now.toLocaleTimeString('en-US', {
            timeZone: userTimezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          timezoneEl.textContent = `${timezoneShort} • ${formattedTime}`;
        }

        if (greetEl) {
          const greeting = h24 < 5 ? 'Good night' : h24 < 12 ? 'Good morning' : h24 < 17 ? 'Good afternoon' : h24 < 21 ? 'Good evening' : 'Good night';
          greetEl.textContent = `${greeting}, Lord Bismark ☥`;
        }

        if (dateEl) {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          dateEl.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
        }
      }
    }

    update();
    setInterval(update, 1000);
  })();

  // ========== LAZY LOAD WEATHER (No permission - uses IP) ==========
  setTimeout(() => {
    const weatherEl = $('#weather-text');
    if (!weatherEl) return;

    const cached = store.get('weather');
    if (cached && Date.now() - cached.ts < 30 * 60 * 1000) {
      weatherEl.textContent = cached.text;
      return;
    }

    fetch('https://wttr.in?format=%t+%C&lang=en', { signal: AbortSignal.timeout(5000) })
      .then(r => r.text())
      .then(text => {
        const clean = text.trim().replace(/\+/g, ' ');
        weatherEl.textContent = clean || '—';
        store.set('weather', { text: clean, ts: Date.now() });
      })
      .catch(() => { weatherEl.textContent = '—'; });
  }, 100);

  // ========== STATE PRESERVATION ==========
  (function initStatePreservation() {
    window.addEventListener('beforeunload', () => {
      store.session.set('workspace_scroll', window.scrollY);
      const searchInput = $('#search-input');
      if (searchInput && searchInput.value.trim()) {
        store.session.set('workspace_search', searchInput.value.trim());
      }
    });

    const savedScroll = store.session.get('workspace_scroll');
    if (savedScroll && savedScroll > 0) {
      setTimeout(() => {
        window.scrollTo({ top: savedScroll, behavior: 'instant' });
        store.session.set('workspace_scroll', null);
      }, 50);
    }

    const savedSearch = store.session.get('workspace_search');
    if (savedSearch) {
      const searchInput = $('#search-input');
      if (searchInput) {
        setTimeout(() => {
          searchInput.value = savedSearch;
          store.session.set('workspace_search', null);
        }, 100);
      }
    }
  })();

  // ========== AURORA BACKGROUND (Optimized for performance) ==========
  (function() {
    const canvas = $('#aurora');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, blobs, raf, frameCount = 0;
    let reducedQuality = false;

    if (navigator.deviceMemory && navigator.deviceMemory < 4) reducedQuality = true;
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) reducedQuality = true;

    const COLORS = reducedQuality ? [[108, 99, 255], [60, 120, 255]] : [[108, 99, 255], [60, 120, 255], [140, 80, 255], [30, 180, 200]];
    const BLOB_COUNT = reducedQuality ? 2 : 4;
    const SPEED_FACTOR = reducedQuality ? 0.08 : 0.18;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      init();
    }

    function makeBlob(i) {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.min(W, H) * (0.35 + Math.random() * 0.3),
        vx: (Math.random() - 0.5) * SPEED_FACTOR,
        vy: (Math.random() - 0.5) * SPEED_FACTOR * 0.8,
        color: COLORS[i % COLORS.length]
      };
    }

    function init() {
      blobs = [];
      for (let i = 0; i < BLOB_COUNT; i++) {
        blobs.push(makeBlob(i));
      }
    }

    function draw(ts) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      if (reducedQuality && frameCount++ % 2 === 0) {
        raf = requestAnimationFrame(draw);
        return;
      }

      for (const b of blobs) {
        b.x += b.vx + Math.sin(ts * 0.0004 + b.r) * 0.1;
        b.y += b.vy + Math.cos(ts * 0.0003 + b.r) * 0.08;
        if (b.x < -b.r) b.x = W + b.r;
        if (b.x > W + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = H + b.r;
        if (b.y > H + b.r) b.y = -b.r;

        const [r, g, bl] = b.color;
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, `rgba(${r},${g},${bl},0.15)`);
        grad.addColorStop(0.5, `rgba(${r},${g},${bl},0.06)`);
        grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    function start() { if (!raf) raf = requestAnimationFrame(draw); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

    const debouncedResize = debounce(resize, 150);
    window.addEventListener('resize', debouncedResize);

    resize();
    start();
  })();

  // ========== MOST VISITED ==========
  (function() {
    const mostVisitedGrid = $('#most-visited-grid');
    const linksGrid = $('#links-grid');
    const clearBtn = $('#most-visited-clear');
    if (!mostVisitedGrid) return;

    let visits = store.get('most_visited') || [];

    function trackVisit(url, label) {
      if (!url || url === '#' || url.startsWith('javascript:')) return;
      const existing = visits.find(v => v.url === url);
      if (existing) {
        existing.count++;
        existing.lastVisited = Date.now();
        if (label) existing.label = label;
      } else {
        visits.push({ url, label, count: 1, lastVisited: Date.now() });
      }
      visits.sort((a, b) => b.count - a.count);
      visits = visits.slice(0, 8);
      store.set('most_visited', visits);
      renderMostVisited();
    }

    function renderMostVisited() {
      if (!mostVisitedGrid) return;
      mostVisitedGrid.textContent = '';

      if (visits.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'most-visited-empty';
        empty.textContent = 'Click links to build your most visited list';
        mostVisitedGrid.appendChild(empty);
        return;
      }

      visits.forEach(visit => {
        const a = document.createElement('a');
        a.href = visit.url;
        a.className = 'most-visited-item';
        a.target = '_blank';
        a.rel = 'noopener';
        const fallbackLabel = (() => {
          try { return new URL(visit.url).hostname; } catch { return 'Link'; }
        })();
        const cleanLabel = visit.label || fallbackLabel;
        a.textContent = `⭐ ${cleanLabel}`;
        a.addEventListener('click', () => {
          trackVisit(visit.url, cleanLabel);
        });
        mostVisitedGrid.appendChild(a);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        visits = [];
        store.set('most_visited', []);
        renderMostVisited();
      });
    }

    if (linksGrid) {
      linksGrid.addEventListener('click', e => {
        const card = e.target.closest('.link-card[href]:not(.link-card--add)');
        if (!card) return;
        const url = card.getAttribute('href');
        const label = card.dataset.label || card.querySelector('.link-card__label')?.textContent?.trim() || '';
        if (url && url !== '#') {
          setTimeout(() => trackVisit(url, label), 10);
        }
      });
    }

    renderMostVisited();
  })();

  // ========== SEARCH ==========
  (function() {
    const input = $('#search-input');
    const submit = $('#search-submit');
    const clearBtn = $('#search-clear');
    const engineBtn = $('#engine-btn');
    const engineMenu = $('#engine-menu');
    const engineOpts = document.querySelectorAll('.engine-opt');
    if (!input || !submit) return;

    let currentUrl = 'https://www.google.com/search?q=';
    let currentName = 'Google';

    const saved = store.get('engine');
    if (saved) {
      currentUrl = saved.url;
      currentName = saved.name;
      engineOpts.forEach(o => {
        o.classList.toggle('active', o.dataset.url === currentUrl);
      });
      input.placeholder = `Search with ${saved.name}…`;
    }

    function doSearch() {
      const q = input.value.trim();
      if (!q) return;
      store.session.set('workspace_scroll', window.scrollY);
      store.session.set('workspace_search', q);

      const looksLikeUrl = /^(https?:\/\/|www\.)[^\s]+/.test(q) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(q);
      const dest = looksLikeUrl ? (q.startsWith('http') ? q : 'https://' + q) : currentUrl + encodeURIComponent(q);
      window.location.href = dest;
    }

    submit.addEventListener('click', doSearch);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

    if (clearBtn) {
      clearBtn.style.opacity = '1';
      clearBtn.style.visibility = 'visible';
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        input.value = '';
        input.focus();
      });
    }

    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== input && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });

    if (engineBtn && engineMenu) {
      let menuOpen = false;
      engineBtn.addEventListener('click', e => {
        e.stopPropagation();
        menuOpen = !menuOpen;
        engineMenu.classList.toggle('open', menuOpen);
      });

      engineOpts.forEach(opt => {
        opt.addEventListener('click', () => {
          currentUrl = opt.dataset.url;
          currentName = opt.dataset.name;
          engineOpts.forEach(o => o.classList.toggle('active', o === opt));
          store.set('engine', { url: currentUrl, name: currentName });
          input.placeholder = `Search with ${currentName}…`;
          menuOpen = false;
          engineMenu.classList.remove('open');
          input.focus();
        });
      });

      document.addEventListener('click', e => {
        if (menuOpen && !engineMenu.contains(e.target) && e.target !== engineBtn) {
          menuOpen = false;
          engineMenu.classList.remove('open');
        }
      });
    }
  })();

  // ========== QUICK LINKS ==========
  (function() {
    const grid = $('#links-grid');
    const addBtn = $('#add-link-btn');
    const backdrop = $('#modal-backdrop');
    const saveBtn = $('#modal-save');
    const cancelBtn = $('#modal-cancel');
    const nameIn = $('#modal-name');
    const urlIn = $('#modal-url');
    const colorIn = $('#modal-color');
    const exportBtn = $('#links-export');
    const importBtn = $('#links-import');

    if (!grid || !addBtn) return;

    const ctxMenu = document.createElement('div');
    ctxMenu.className = 'ctx-menu';
    ctxMenu.innerHTML = '<div class="ctx-menu__item" id="ctx-delete">Remove link</div>';
    document.body.appendChild(ctxMenu);
    let ctxTarget = null;

    function closeCtx() {
      ctxMenu.classList.remove('open');
      ctxTarget = null;
    }

    function getCustom() { return store.get('custom_links') || []; }
    function saveCustom(arr) { store.set('custom_links', arr); }

    function getInitials(name) {
      return name.slice(0, 2).toUpperCase();
    }

    function createCustomCard(link) {
      const a = document.createElement('a');
      a.className = 'link-card';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.dataset.custom = 'true';
      a.dataset.id = link.id;
      a.dataset.label = link.name;

      a.addEventListener('click', () => {
        store.session.set('workspace_scroll', window.scrollY);
        store.session.set('workspace_search', $('#search-input')?.value || '');
      });

      const icon = document.createElement('span');
      icon.className = 'link-card__icon';
      icon.style.background = link.color || '#6C63FF';
      icon.style.color = '#fff';
      icon.style.fontSize = '13px';
      icon.style.fontWeight = '700';
      icon.style.fontFamily = 'var(--font-display)';
      icon.textContent = getInitials(link.name);
      const label = document.createElement('span');
      label.className = 'link-card__label';
      label.textContent = link.name;
      a.appendChild(icon);
      a.appendChild(label);
      a.addEventListener('contextmenu', e => {
        e.preventDefault();
        ctxTarget = link.id;
        const x = Math.min(e.clientX, window.innerWidth - 160);
        const y = Math.min(e.clientY, window.innerHeight - 60);
        ctxMenu.style.left = x + 'px';
        ctxMenu.style.top = y + 'px';
        ctxMenu.classList.add('open');
      });
      return a;
    }

    function renderCustom() {
      const existing = document.querySelectorAll('.link-card[data-custom="true"]');
      existing.forEach(el => el.remove());
      const links = getCustom();
      links.forEach(link => {
        grid.insertBefore(createCustomCard(link), addBtn);
      });
    }

    document.querySelectorAll('.link-card[href][target="_blank"]:not([data-custom])').forEach(link => {
      link.addEventListener('click', () => {
        store.session.set('workspace_scroll', window.scrollY);
        store.session.set('workspace_search', $('#search-input')?.value || '');
      });
    });

    function openModal() {
      if (!backdrop || !nameIn || !urlIn || !colorIn) return;
      nameIn.value = '';
      urlIn.value = '';
      colorIn.value = '#6C63FF';
      backdrop.classList.add('open');
      backdrop.removeAttribute('aria-hidden');
      nameIn.focus();
    }

    function closeModal() {
      if (backdrop) {
        backdrop.classList.remove('open');
        backdrop.setAttribute('aria-hidden', 'true');
      }
    }

    addBtn.addEventListener('click', e => { e.preventDefault(); openModal(); });
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeCtx(); } });

    if (saveBtn && nameIn && urlIn && colorIn) {
      saveBtn.addEventListener('click', () => {
        const name = nameIn.value.trim();
        let url = urlIn.value.trim();
        const color = colorIn.value;
        if (!name || !url) return;
        if (!/^https?:\/\//.test(url)) url = 'https://' + url;
        const link = { id: Date.now().toString(36), name, url, color };
        const links = getCustom();
        links.push(link);
        saveCustom(links);
        renderCustom();
        closeModal();
      });
      [nameIn, urlIn].forEach(el => {
        el.addEventListener('keydown', e => { if (e.key === 'Enter' && saveBtn) saveBtn.click(); });
      });
    }

    const deleteBtn = $('#ctx-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (!ctxTarget) return;
        const links = getCustom().filter(l => l.id !== ctxTarget);
        saveCustom(links);
        renderCustom();
        closeCtx();
      });
    }
    document.addEventListener('click', e => { if (!ctxMenu.contains(e.target)) closeCtx(); });

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const data = getCustom();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workspace-links-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const imported = JSON.parse(ev.target.result);
              if (Array.isArray(imported)) {
                saveCustom(imported);
                renderCustom();
                alert('Links imported successfully!');
              } else {
                alert('Invalid file format');
              }
            } catch {
              alert('Error parsing file');
            }
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }

    renderCustom();
  })();

  // ========== DARK MODE TOGGLE ==========
  (function() {
    const themeToggle = $('#theme-toggle');
    if (!themeToggle) return;

    const savedTheme = store.get('theme');
    if (savedTheme === 'light') {
      document.body.setAttribute('data-theme', 'light');
      themeToggle.textContent = '☀️';
    } else {
      themeToggle.textContent = '🌙';
    }

    themeToggle.addEventListener('click', () => {
      const isLight = document.body.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.body.removeAttribute('data-theme');
        store.set('theme', 'dark');
        themeToggle.textContent = '🌙';
      } else {
        document.body.setAttribute('data-theme', 'light');
        store.set('theme', 'light');
        themeToggle.textContent = '☀️';
      }
    });
  })();

  // ========== HELP MODAL ==========
  (function() {
    const helpToggle = $('#help-toggle');
    const helpModal = $('#help-modal');
    const helpClose = $('#help-close');

    if (!helpToggle || !helpModal) return;

    function openHelp() {
      helpModal.classList.add('open');
      helpModal.removeAttribute('aria-hidden');
    }

    function closeHelp() {
      helpModal.classList.remove('open');
      helpModal.setAttribute('aria-hidden', 'true');
    }

    helpToggle.addEventListener('click', openHelp);
    if (helpClose) helpClose.addEventListener('click', closeHelp);
    helpModal.addEventListener('click', e => { if (e.target === helpModal) closeHelp(); });

    document.addEventListener('keydown', e => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openHelp();
      }
      if (e.key === 'Escape' && helpModal.classList.contains('open')) {
        closeHelp();
      }
    });
  })();

  // ========== DOUBLE CLICK TO TOP ==========
  (function() {
    document.body.addEventListener('dblclick', (e) => {
      if (e.target === document.body || e.target.classList?.contains('page-wrapper') || e.target === document.documentElement) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  })();

  // ========== QUOTES ==========
  (function() {
    const quotes = [
      "Focus on being productive instead of busy.",
      "The secret of getting ahead is getting started.",
      "Small steps every day lead to big results.",
      "Systems beat motivation every time.",
      "Done is better than perfect.",
      "Energy flows where attention goes.",
      "Consistency compounds.",
      "A calm mind is a productive mind.",
      "Think long-term. Act today.",
      "Open source is the heart of innovation.",
      "Linux: the freedom to create.",
      "Code is poetry, debug is prose."
    ];
    const el = $('#quote-text');
    if (!el) return;
    const now = new Date();
    const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    el.textContent = quotes[doy % quotes.length];
  })();

})();
