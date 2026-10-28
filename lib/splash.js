/**
 * NieR:Automata / YoRHa style boot splash — browser half.
 *
 * Injected by lib/index.js as a body script that runs before the DeepSeek
 * Harness shell boots. It builds a full-window overlay: a faint engraved YoRHa
 * lockup, a CRT field, a red-fringed LOADING readout with the self-check log
 * that types itself out line by line, a rotating boot meter, and a
 * shutdown-style exit once the minimum duration has passed and the shell has
 * rendered into #root (or maxWait elapses). Config arrives on
 * globalThis.__NIER_SPLASH__; every key has a local fallback so the script also
 * runs standalone (see preview/).
 */
(() => {
  'use strict'

  function mount(overrides = {}) {
    const ID = 'nier-splash'
    const PLAYED_KEY = 'nier-splash:played'
    const RELOAD_GUARD_MS = 60_000
    const BASE_MS = 4500 // the timeline below is authored for this duration
    const EXITS = { collapse: 620, fade: 460, glitch: 700 }
    const REDUCED_HOLD_MS = 900
    const REDUCED_EXIT_MS = 320

    const DEFAULTS = {
      duration: BASE_MS,
      maxWait: 8000,
      exit: 'collapse',
      lang: 'zh',
      skippable: true,
      replayOnReload: false,
      scanlines: true,
      accent: '#b3272d',
      serial: 'YORHA-OS / UNIT 2B-042',
      captionPalette: 'auto',
    }

    // [text, tone] — tone 'warn' paints the line in the accent red.
    const LOG = {
      zh: [
        ['系統確認開始'],
        ['記憶體裝置確認：無異常'],
        ['戰術履歷：恢復預設', 'warn'],
        ['地形資料：開始載入'],
        ['生命徵象確認：無異常'],
        ['MP 剩餘量確認：100%'],
        ['黑盒溫度：適當'],
        ['黑盒內壓力正常'],
        ['發動機 IFF'],
        ['發動機 FCS'],
        ['輔助機通訊連接開始'],
        ['建立 DBU'],
        ['慣性控制系統啟動'],
        ['環境感測器啟動'],
        ['裝備認證：完畢'],
        ['裝備狀態確認：完成'],
        ['系統：一切正常', 'warn'],
        ['戰鬥準備完畢'],
      ],
      en: [
        ['SYSTEM CHECK START'],
        ['MEMORY UNITS: NOMINAL'],
        ['TACTICAL HISTORY: DEFAULTS RESTORED', 'warn'],
        ['TERRAIN DATA: LOADING'],
        ['VITAL SIGNS: NOMINAL'],
        ['MP REMAINING: 100%'],
        ['BLACK BOX TEMP: NORMAL'],
        ['BLACK BOX PRESSURE: NORMAL'],
        ['ENGINE IFF'],
        ['ENGINE FCS'],
        ['SUPPORT UNIT LINK START'],
        ['DBU ESTABLISHED'],
        ['INERTIAL CONTROL: START'],
        ['ENVIRONMENT SENSORS: START'],
        ['EQUIPMENT AUTH: COMPLETE'],
        ['EQUIPMENT STATUS: CONFIRMED'],
        ['SYSTEM: ALL NORMAL', 'warn'],
        ['COMBAT READY'],
      ],
    }

    const COPY = {
      zh: { booting: '系統啟動中…', skip: '點擊任意處跳過 · CLICK TO SKIP' },
      en: { booting: 'SYSTEM BOOTING…', skip: 'CLICK TO SKIP · 點擊任意處跳過' },
    }

    // Timeline beats in authoring milliseconds (BASE_MS timeline).
    const BEAT = { log: 500, gap: 150, ready: 3520 }
    const PROGRESS = [[0, 0], [BEAT.log, 0.02], [1100, 0.19], [1900, 0.37], [2600, 0.58], [3150, 0.84], [BEAT.ready, 0.995]]

    const doc = document
    if (!doc.body || doc.getElementById(ID)) return

    const cfg = Object.assign({}, DEFAULTS, globalThis.__NIER_SPLASH__ || {}, overrides)

    // Guards a quick reload (the page reloads itself while booting), but a real
    // restart of the app should play again -- session storage outlives the
    // process here, so a plain "played once" flag would silence every later boot.
    if (!cfg.replayOnReload) {
      try {
        const last = Number(sessionStorage.getItem(PLAYED_KEY)) || 0
        if (last && Date.now() - last < RELOAD_GUARD_MS) return
        sessionStorage.setItem(PLAYED_KEY, String(Date.now()))
      } catch (_) { /* storage blocked: play every time */ }
    }

    const matches = (query) => {
      try { return matchMedia(query).matches } catch (_) { return false }
    }
    const num = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)
    const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value))
    const color = (value, fallback) => {
      try { return typeof value === 'string' && CSS.supports('color', value) ? value : fallback } catch (_) { return fallback }
    }
    const text = (value, fallback) => (typeof value === 'string' && value.trim() ? value.trim() : fallback)

    const lang = cfg.lang === 'en' ? 'en' : 'zh'
    const copy = COPY[lang]
    const rows = LOG[lang]
    const reduced = cfg.reducedMotion === true || matches('(prefers-reduced-motion: reduce)')

    const exitName = Object.hasOwn(EXITS, cfg.exit) ? cfg.exit : DEFAULTS.exit
    const exitMs = reduced ? REDUCED_EXIT_MS : EXITS[exitName]
    const duration = clamp(num(cfg.duration, DEFAULTS.duration), 2000, 12000)
    const speed = clamp(duration / BASE_MS, 0.5, 2.5)
    const exitAt = reduced ? REDUCED_HOLD_MS : Math.max(duration - exitMs, 800)
    const maxWait = Math.max(num(cfg.maxWait, DEFAULTS.maxWait), exitAt)

    // ---------------------------------------------------------------- markup

    // A winged sword crest: upright blade on a ring pommel, swept wings and a
    // splayed tail. Original line work, drawn once here so the mark stays
    // crisp at any scale and carries no third-party artwork.
    const crest = `
<svg class="n-e" viewBox="0 0 240 300" aria-hidden="true">
  <g class="n-e-solid">
    <path d="M120 8L128 118L122 178L118 178L112 118Z"/>
    <path d="M120 202L124 250L120 294L116 250Z"/>
    <path d="M100 176L88 288L94 292L106 190Z"/>
    <path d="M140 176L152 288L146 292L134 190Z"/>
  </g>
  <g class="n-e-stroke">
    <path d="M120 8L120 178"/>
    <path d="M120 152C104 147 86 147 72 152"/>
    <path d="M120 152C136 147 154 147 168 152"/>
    <path d="M98 142C74 128 46 132 26 154C52 160 78 166 98 176Z"/>
    <path d="M142 142C166 128 194 132 214 154C188 160 162 166 142 176Z"/>
    <path d="M96 152C78 144 58 146 44 154"/>
    <path d="M144 152C162 144 182 146 196 154"/>
    <circle cx="120" cy="188" r="14"/>
  </g>
  <g class="n-e-rivets">
    <circle cx="120" cy="188" r="5"/>
    <circle cx="34" cy="168" r="2.6"/>
    <circle cx="206" cy="168" r="2.6"/>
  </g>
</svg>`

    const spinner = `
<svg class="n-spin" viewBox="0 0 64 64" aria-hidden="true">
  <circle class="n-spin-track" cx="32" cy="32" r="27"/>
  <circle class="n-spin-a" cx="32" cy="32" r="27" pathLength="360" stroke-dasharray="58 302" transform="rotate(0 32 32)"/>
  <circle class="n-spin-b" cx="32" cy="32" r="20" pathLength="360" stroke-dasharray="24 336" transform="rotate(120 32 32)"/>
</svg>`

    const root = doc.createElement('div')
    root.id = ID
    root.className = 'n-root'
    root.dataset.exit = exitName
    root.dataset.lang = lang
    root.setAttribute('aria-hidden', 'true')
    root.style.setProperty('--n-accent', color(cfg.accent, DEFAULTS.accent))
    root.style.setProperty('--n-k', String(speed))
    if (reduced) root.classList.add('is-reduced')
    if (cfg.scanlines === false) root.classList.add('no-scan')

    root.innerHTML = `
<div class="n-field"></div>
<div class="n-scan"></div>
<div class="n-vig"></div>
<div class="n-scene">
<div class="n-mark">
  ${crest}
  <div class="n-lockup">
    <div class="n-word">YoRHa</div>
    <div class="n-motto">For the Glory of Mankind</div>
  </div>
</div>
<div class="n-stage">
  <div class="n-hud n-tl">
    <div class="n-reading">
      <span class="n-ld">LOADING</span>
      <span class="n-dots"><i>.</i><i>.</i><i>.</i></span>
      <span class="n-sub">- ${copy.booting}</span>
    </div>
    <ul class="n-log"></ul>
  </div>
  <div class="n-hud n-tr">
    ${spinner}
    <div class="n-meter"><span class="n-pct">000</span><span class="n-unit">%</span></div>
    <div class="n-tag">BOOT SEQUENCE</div>
  </div>
  <div class="n-hud n-bl">
    <div class="n-serial"></div>
    <div class="n-brand">DEEPSEEK HARNESS</div>
  </div>
  <div class="n-hud n-br"><div class="n-clock"></div></div>
</div>
<div class="n-bar"><i></i></div>
</div>
<div class="n-flash"></div>
<div class="n-hint">${copy.skip}</div>`

    const $ = (selector) => root.querySelector(selector)
    const logEl = $('.n-log')
    const pctEl = $('.n-pct')
    const subEl = $('.n-sub')
    $('.n-serial').textContent = text(cfg.serial, DEFAULTS.serial)
    if (!cfg.skippable) $('.n-hint').remove()

    // The desktop shell paints the Windows caption buttons *above* page content,
    // with colours sampled from --dsw-specific-sidebar-fill / --dsw-alias-label-
    // primary (see the Electron preload). Overriding those two custom properties
    // on <body> makes the shell's own observer push our palette to the native
    // overlay, so the three buttons sit on the splash background instead of a
    // white strip. The previous inline values are restored on teardown.
    const SHELL_KEYS = ['--dsw-specific-sidebar-fill', '--dsw-alias-label-primary']
    const SHELL_VALUES = ['#191919', '#f2ece3']
    let shellRestore = null

    // Another boot overlay (e.g. dsh-rhine-splash) may already own the screen.
    // Its theme is the user's choice, so we stay out of the way entirely instead
    // of spending 4.5s painting underneath it.
    const rivalSplash = doc.querySelector('[id$="-splash"]')
    if (rivalSplash) return

    // A theme plugin (Rhine Lab and friends) recolours the shell through the same
    // custom properties we borrow. Only steal them while nobody else has: a stock
    // shell leaves a neutral grey here, a themed one leaves something saturated.
    const shellPaletteIsStock = () => {
      try {
        const raw = getComputedStyle(doc.body).getPropertyValue(SHELL_KEYS[0]).trim()
        if (!raw) return true
        const probe = doc.createElement('span')
        probe.style.color = raw
        probe.style.display = 'none'
        doc.body.append(probe)
        const rgb = getComputedStyle(probe).color
        probe.remove()
        const m = rgb.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i)
        if (!m) return true
        const channels = [Number(m[1]), Number(m[2]), Number(m[3])]
        return Math.max(...channels) - Math.min(...channels) <= 12
      } catch (_) { return true }
    }

    const mayTint = () => cfg.captionPalette === 'on'
      || (cfg.captionPalette !== 'off' && shellPaletteIsStock())

    function tintShell(on) {
      const body = doc.body
      if (!body) return
      try {
        if (on) {
          if (shellRestore) return
          if (!mayTint()) return
          shellRestore = SHELL_KEYS.map((key) => [
            key,
            body.style.getPropertyValue(key),
            body.style.getPropertyPriority(key),
          ])
          SHELL_KEYS.forEach((key, i) => body.style.setProperty(key, SHELL_VALUES[i]))
        } else if (shellRestore) {
          const previous = shellRestore
          shellRestore = null
          previous.forEach(([key, value, priority]) => {
            if (value) body.style.setProperty(key, value, priority)
            else body.style.removeProperty(key)
          })
        }
      } catch (_) { /* custom properties unavailable: leave the shell alone */ }
    }

    const pad = (n, w = 2) => String(n).padStart(w, '0')
    const clock = $('.n-clock')
    const renderClock = () => {
      const d = new Date()
      clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
    renderClock()

    doc.body.append(root)
    tintShell(true)

    // -------------------------------------------------------------- timeline

    let started = false
    let leaving = false
    let destroyed = false
    let t0 = 0
    let frame = 0
    let exitFrame = 0
    let leaveAt = 0
    let meters = 0
    let observer
    let clockTimer = 0
    const timers = []
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)) }

    const appReady = () => {
      const app = doc.getElementById('root')
      return app === null || app.childElementCount > 0
    }

    const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
    const along = (stops, ms) => {
      if (ms <= stops[0][0]) return stops[0][1]
      for (let i = 1; i < stops.length; i++) {
        const [t1, v1] = stops[i]
        if (ms <= t1) {
          const [t0_, v0] = stops[i - 1]
          return v0 + (v1 - v0) * easeInOut((ms - t0_) / (t1 - t0_))
        }
      }
      return stops[stops.length - 1][1]
    }

    const cursor = doc.createElement('i')
    cursor.className = 'n-cursor'

    const addRow = (index) => {
      const [label, tone] = rows[index]
      const row = doc.createElement('li')
      row.className = 'n-row'
      row.style.setProperty('--i', String(index))
      if (tone === 'warn') row.classList.add('is-warn')
      const line = doc.createElement('span')
      line.className = 'n-row-t'
      line.textContent = label
      row.append(line)
      logEl.append(row)
      row.append(cursor)
      // Keep the newest line visible on short windows.
      if (logEl.scrollHeight - logEl.clientHeight > 0) {
        const first = logEl.firstElementChild
        if (first && first !== row) first.remove()
      }
    }

    const showRows = () => {
      for (let i = 0; i < rows.length; i++) addRow(i)
    }

    const scramble = (host, target, lead, ms) => {
      const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/'
      const begin = performance.now()
      const settle = Array.from(target, (_, i) => i * 16 + Math.random() * 40)
      const step = (now) => {
        if (destroyed) return
        const t = now - begin
        if (t >= ms) {
          host.textContent = lead + target
          host.classList.remove('is-raw')
          return
        }
        let out = ''
        for (let i = 0; i < target.length; i++) {
          const ch = target[i]
          if (ch === ' ') { out += ' '; continue }
          out += t >= settle[i] ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]
        }
        host.textContent = lead + out
        host.classList.add('is-raw')
        requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    const tick = () => {
      if (destroyed) return
      const now = performance.now()
      const ms = (now - t0) / speed
      let p
      if (reduced) {
        p = easeInOut(Math.min(1, (now - t0) / exitAt)) * 0.99
      } else if (leaving) {
        const k = easeInOut(Math.min(1, (now - leaveAt) / 200))
        p = meters + (1 - meters) * k
      } else {
        p = ms < BEAT.ready
          ? along(PROGRESS, ms)
          : Math.min(0.999, 0.995 + (ms - BEAT.ready) / 60000)
        meters = p
      }
      root.style.setProperty('--n-p', p.toFixed(4))
      pctEl.textContent = pad(Math.round(p * 100), 3)
      frame = requestAnimationFrame(tick)
    }

    const destroy = () => {
      if (destroyed) return
      destroyed = true
      timers.forEach(clearTimeout)
      clearInterval(clockTimer)
      cancelAnimationFrame(frame)
      cancelAnimationFrame(exitFrame)
      observer?.disconnect()
      doc.removeEventListener('visibilitychange', onVisible)
      globalThis.removeEventListener('focus', start)
      globalThis.removeEventListener('keydown', onKey, true)
      tintShell(false)
      root.remove()
    }

    const leave = () => {
      if (leaving || destroyed) return
      leaving = true
      leaveAt = performance.now()
      root.classList.add('is-leaving')
      if (exitName === 'glitch' && !reduced) {
        const stage = $('.n-scene')
        const weights = Array.from({ length: 5 }, () => 0.4 + Math.random())
        const total = weights.reduce((a, b) => a + b, 0)
        let top = 0
        const slices = weights.map((weight, i) => {
          const bottom = i === 4 ? innerHeight : top + innerHeight * weight / total
          const slice = doc.createElement('div')
          slice.className = 'n-slice'
          slice.style.clipPath = `inset(${top}px 0 ${innerHeight - bottom}px 0)`
          slice.append(stage.cloneNode(true))
          root.append(slice)
          top = bottom
          return slice
        })
        stage.style.opacity = '0'
        const jitter = () => (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 44)
        for (const time of [0, 80, 160]) {
          later(() => slices.forEach((slice, i) => {
            slice.style.transform = `translateX(${jitter() + i * 2}px)`
          }), time)
        }
      }
      later(destroy, exitMs + 80)
    }

    const exitWhenReady = () => {
      if (appReady()) return leave()
      const app = doc.getElementById('root')
      if (!app) return leave()
      observer = new MutationObserver(() => { if (appReady()) leave() })
      observer.observe(app, { childList: true })
    }

    function onVisible() {
      if (doc.visibilityState === 'visible') start()
    }

    function onKey(event) {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') leave()
    }

    function start() {
      if (started || destroyed) return
      started = true
      t0 = performance.now()
      let playing = false
      const play = () => {
        if (playing || destroyed) return
        playing = true
        root.classList.add('is-playing')
        tick()
      }
      requestAnimationFrame(play)
      later(play, 80)

      if (reduced) {
        showRows()
        root.classList.add('is-ready')
        subEl.textContent = '- ' + copy.booting
      } else {
        // The subtitle settles into its booting caption right away, then holds
        // it — the finale is carried by the last log line and the cursor.
        later(() => scramble(subEl, copy.booting, '- ', 420), 90)
        for (let i = 0; i < rows.length; i++) {
          later(() => addRow(i), (BEAT.log + i * BEAT.gap + Math.random() * 40) * speed)
        }
        later(() => root.classList.add('is-ready'), BEAT.ready * speed)
      }

      later(exitWhenReady, exitAt)
      later(leave, maxWait)
      later(destroy, maxWait + exitMs + 2000)
      clockTimer = setInterval(renderClock, 1000)
    }

    if (cfg.skippable) {
      root.addEventListener('pointerdown', leave)
      globalThis.addEventListener('keydown', onKey, true)
    }

    // Electron may run this before the window is shown; hold the first frame
    // until the page is visible so the intro is not spent off-screen.
    if (doc.visibilityState === 'visible') start()
    else {
      doc.addEventListener('visibilitychange', onVisible)
      globalThis.addEventListener('focus', start)
      later(start, 2500)
    }
  }

  if (!globalThis.__nierSplash) {
    globalThis.__nierSplash = {
      replay(options = {}) {
        document.getElementById('nier-splash')?.remove()
        mount({ ...options, replayOnReload: true })
      },
    }
  }
  const cfg = globalThis.__NIER_SPLASH__ || {}
  if (cfg.enabled !== false) mount()
})()
