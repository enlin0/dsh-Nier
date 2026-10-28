import { readFileSync } from 'node:fs'

let z
try { z = (await import('@deepseek-ai/schemastery')).default } catch { z = undefined }

/** Cordis host plugin name. */
export const name = 'nier-splash'

/**
 * @typedef {object} SplashConfig
 * @property {boolean} enabled Whether to play the boot sequence on launch.
 * @property {number} duration Minimum on-screen time in milliseconds.
 * @property {number} maxWait Maximum wait for the shell to render, in milliseconds.
 * @property {'collapse' | 'fade' | 'glitch'} exit Exit animation.
 * @property {'zh' | 'en'} lang Language of the self-check log.
 * @property {boolean} skippable Whether clicking or pressing a key skips the animation.
 * @property {boolean} replayOnReload Disable the 60s reload guard, so every reload replays.
 * @property {boolean} scanlines Whether to draw the CRT scanlines.
 * @property {string} accent Accent color (the LOADING red).
 * @property {string} serial Corner HUD identifier.
 * @property {'auto' | 'on' | 'off'} captionPalette Whether to lend the native window
 *   caption buttons this splash's palette. `auto` backs off as soon as another plugin
 *   themed the shell, so a theme plugin (e.g. dsh-rhine-splash) keeps its colours.
 */

/** @type {Readonly<SplashConfig>} Defaults shared with the browser half. */
export const DEFAULTS = Object.freeze({
  enabled: true,
  duration: 4500,
  maxWait: 8000,
  exit: 'collapse',
  lang: 'zh',
  skippable: true,
  replayOnReload: false,
  scanlines: true,
  accent: '#b3272d',
  serial: 'YORHA-OS / UNIT 2B-042',
  captionPalette: 'auto',
})

export const Config = z ? z.object({
  enabled: z.boolean().default(DEFAULTS.enabled).volatile().description('开机动画开关'),
  duration: z.number().min(2000).max(12000).step(100).default(DEFAULTS.duration).volatile().description('显示时长（毫秒）'),
  maxWait: z.number().min(0).max(20000).step(100).default(DEFAULTS.maxWait).volatile().description('最长等待时间（毫秒）'),
  exit: z.union(['collapse', 'fade', 'glitch']).default(DEFAULTS.exit).volatile().description('退场动画'),
  lang: z.union(['zh', 'en']).default(DEFAULTS.lang).volatile().description('自检日志语言'),
  skippable: z.boolean().default(DEFAULTS.skippable).volatile().description('允许点击跳过'),
  replayOnReload: z.boolean().default(DEFAULTS.replayOnReload).volatile().description('关掉 60 秒内的重播保护'),
  scanlines: z.boolean().default(DEFAULTS.scanlines).volatile().description('扫描线'),
  accent: z.string().default(DEFAULTS.accent).volatile().description('强调色'),
  serial: z.string().default(DEFAULTS.serial).volatile().description('角落编号'),
  captionPalette: z.union(['auto', 'on', 'off']).default(DEFAULTS.captionPalette).volatile().description('标题栏按钮配色：auto 在别的插件已改主题色时不覆盖'),
}) : undefined

/**
 * Unwrap volatile settings at the point of use.
 *
 * @param {object} [config] Cordis configuration.
 * @returns {SplashConfig} A fresh plain object.
 */
export function readConfig(config) {
  const values = {}
  for (const key of Object.keys(DEFAULTS)) {
    const value = config?.[key]
    values[key] = value && typeof value.get === 'function' ? value.get() : value
  }
  return resolveConfig(values)
}

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value))

/**
 * Normalize user configuration without retaining unknown keys or mutating input.
 *
 * @param {unknown} [input] User-supplied Cordis configuration.
 * @returns {SplashConfig} A fresh, plain configuration object.
 */
export function resolveConfig(input) {
  const source = input !== null && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const resolved = { ...DEFAULTS }

  for (const key of ['enabled', 'skippable', 'replayOnReload', 'scanlines']) {
    if (typeof source[key] === 'boolean') resolved[key] = source[key]
  }

  if (typeof source.duration === 'number' && Number.isFinite(source.duration)) {
    resolved.duration = clamp(source.duration, 2000, 12000)
  }
  if (typeof source.maxWait === 'number' && Number.isFinite(source.maxWait)) {
    resolved.maxWait = clamp(source.maxWait, resolved.duration, 20000)
  } else {
    resolved.maxWait = Math.max(resolved.duration, DEFAULTS.maxWait)
  }

  if (typeof source.exit === 'string' && ['collapse', 'fade', 'glitch'].includes(source.exit.trim())) {
    resolved.exit = source.exit.trim()
  }
  if (typeof source.lang === 'string' && ['zh', 'en'].includes(source.lang.trim())) {
    resolved.lang = source.lang.trim()
  }
  if (typeof source.accent === 'string' && /^#[0-9a-f]{3,8}$/i.test(source.accent.trim())) {
    resolved.accent = source.accent.trim()
  }
  if (typeof source.serial === 'string' && source.serial.trim()) {
    resolved.serial = source.serial.trim().slice(0, 48)
  }
  if (typeof source.captionPalette === 'string' && ['auto', 'on', 'off'].includes(source.captionPalette.trim())) {
    resolved.captionPalette = source.captionPalette.trim()
  }
  return resolved
}

/**
 * Build the HTML injected into the web shell: the scoped stylesheet, then a body
 * script carrying the configuration and the browser half of the animation.
 *
 * @param {SplashConfig} config Resolved configuration.
 * @param {{ css: string, js: string }} assets Loaded sources.
 * @returns {Array<{kind: 'style', text: string} | {kind: 'script', placement: 'body', text: string}>}
 */
export function buildInjections(config, assets) {
  const safeJson = (value) => JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  const safeStyle = (css) => css.replace(/<\/style/gi, '<\\/style')
  return [
    { kind: 'style', text: safeStyle(assets.css) },
    {
      kind: 'script',
      placement: 'body',
      text: 'globalThis.__NIER_SPLASH__=' + safeJson(config) + ';\n' + assets.js,
    },
  ]
}

/** Report a failure through the optional host logger. */
function warn(ctx, message) {
  try {
    const logger = ctx.logger?.('nier-splash')
    if (typeof logger?.warn === 'function') {
      logger.warn(message)
      return
    }
  } catch {
    // Logging support is optional and must not prevent host startup.
  }
  console.warn(message)
}

/**
 * Register the host half of the splash plugin. Assets are read once at apply
 * time; live configuration is read on every injection.
 *
 * @param {object} ctx Cordis context.
 * @param {unknown} [config] User-supplied configuration.
 * @returns {void}
 */
export function apply(ctx, config) {
  let assets
  try {
    assets = {
      css: readFileSync(new URL('./splash.css', import.meta.url), 'utf8'),
      js: readFileSync(new URL('./splash.js', import.meta.url), 'utf8'),
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    warn(ctx, `Unable to load the NieR splash assets; injection disabled. ${detail}`)
    return
  }

  ctx.on('webserver/index-inject', (table) => {
    table.push(...buildInjections(readConfig(config), assets))
  })
}
