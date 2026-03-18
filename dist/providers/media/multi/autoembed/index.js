// ╔══════════════════════════════════════════════════════════════╗
// ║  AUTO-GENERATED — Do not edit manually                      ║
// ║  Provider: autoembed                                       ║
// ║  Bundled with esbuild — npx bundle-provider                 ║
// ╚══════════════════════════════════════════════════════════════╝

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// node_modules/grabit-engine/dist/esm/src/core/cheerio.js
import * as cheerio from "cheerio";

// node_modules/grabit-engine/dist/esm/src/types/models/Provider.js
var EProviderQueryKey;
(function(EProviderQueryKey2) {
  EProviderQueryKey2[EProviderQueryKey2["id"] = 0] = "id";
  EProviderQueryKey2[EProviderQueryKey2["tmdb"] = 1] = "tmdb";
  EProviderQueryKey2[EProviderQueryKey2["imdb"] = 2] = "imdb";
  EProviderQueryKey2[EProviderQueryKey2["title"] = 3] = "title";
  EProviderQueryKey2[EProviderQueryKey2["year"] = 4] = "year";
  EProviderQueryKey2[EProviderQueryKey2["season"] = 5] = "season";
  EProviderQueryKey2[EProviderQueryKey2["episode"] = 6] = "episode";
  EProviderQueryKey2[EProviderQueryKey2["ep_id"] = 7] = "ep_id";
  EProviderQueryKey2[EProviderQueryKey2["ep_tmdb"] = 8] = "ep_tmdb";
  EProviderQueryKey2[EProviderQueryKey2["ep_imdb"] = 9] = "ep_imdb";
})(EProviderQueryKey || (EProviderQueryKey = {}));

// node_modules/grabit-engine/dist/esm/src/types/input/Media.js
var MEDIA_TYPES = ["movie", "serie", "channel"];

// node_modules/grabit-engine/dist/esm/src/utils/extractor.js
var YEAR_REGEX = /(19|20)\d{2}/;
function extractExtension(url) {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  return match ? match[1] : null;
}
function extractYearFromText(text) {
  const yearMatch = text.match(YEAR_REGEX);
  return yearMatch ? parseInt(yearMatch[0], 10) : null;
}
function extractSetCookies(headers) {
  if (!headers)
    return [];
  const maybeGet = headers.get;
  if (typeof maybeGet === "function") {
    const maybeGetAll = headers.getAll;
    if (typeof maybeGetAll === "function") {
      const all = maybeGetAll.call(headers, "set-cookie") || maybeGetAll.call(headers, "Set-Cookie");
      if (Array.isArray(all) && all.length)
        return all;
    }
    const val = maybeGet.call(headers, "set-cookie") ?? maybeGet.call(headers, "Set-Cookie");
    if (!val)
      return [];
    return Array.isArray(val) ? val : [val];
  }
  const sc = headers["set-cookie"] ?? headers["Set-Cookie"] ?? headers["setCookie"];
  if (!sc)
    return [];
  return Array.isArray(sc) ? sc : [sc];
}

// node_modules/grabit-engine/dist/esm/src/utils/logger.js
var DebugLogger = class {
  isProduction = false;
  timestamp = false;
  jumpLine = false;
  context = "LOGGER";
  /**
   * Create a new Logger instance bound to a context label.
   * @param debug When true, enables console output for non-error levels
   * @param context A short label to include with each log message
   */
  constructor(debug, context) {
    this.isProduction = !debug;
    this.context = context;
  }
  /**
   * Toggle debugging (non-production) mode at runtime.
   * @param enable `true` to enable debug logs; `false` to silence them
   */
  enableDebugging(enable) {
    this.isProduction = !enable;
  }
  setTimestamp(enabled) {
    this.timestamp = enabled;
  }
  setJumpLine(enabled) {
    this.jumpLine = enabled;
  }
  getTimestamp() {
    const now = /* @__PURE__ */ new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    return `${hh}:${mm}:${ss}:${ms}`;
  }
  format(level, message) {
    const color = this.getColor(level);
    const white = "\x1B[37m";
    const yellow = "\x1B[33m";
    const blue = "\x1B[34m";
    const green = "\x1B[32m";
    const reset = "\x1B[0m";
    const jumpLine = this.jumpLine ? "\n" : "";
    const timestamp = this.timestamp ? `${yellow}[${this.getTimestamp()}]${reset} ` : "";
    const context = `${green}[${this.context}]${blue} [${level.toUpperCase()}]:${reset} `;
    return `${timestamp}${context}${color}${message}${reset}${jumpLine}`;
  }
  /**
   * Log an informational message when debugging is enabled.
   */
  info(message, ...optionalParams) {
    if (!this.isProduction) {
      console.log(this.format("info", message), ...optionalParams);
    }
  }
  /**
   * Log a warning message when debugging is enabled.
   */
  warn(message, ...optionalParams) {
    if (!this.isProduction) {
      console.warn(this.format("warn", message), ...optionalParams);
    }
  }
  /**
   * Always log a warning message, even in production mode.
   * Use for validation / configuration issues that should never be silenced.
   */
  alwaysWarn(message, ...optionalParams) {
    console.warn(this.format("warn", message), ...optionalParams);
  }
  /**
   * Always log an error message.
   */
  error(message, ...optionalParams) {
    console.error(this.format("error", message), ...optionalParams);
  }
  /**
   * Log a debug message when debugging is enabled.
   */
  debug(message, ...optionalParams) {
    if (!this.isProduction) {
      console.debug(this.format("debug", message), ...optionalParams);
    }
  }
  getColor(level) {
    switch (level) {
      case "info":
        return "\x1B[36m";
      // Cyan
      case "warn":
        return "\x1B[33m";
      // Yellow
      case "error":
        return "\x1B[31m";
      // Red
      case "debug":
        return "\x1B[35m";
      // Magenta
      default:
        return "\x1B[0m";
    }
  }
};
var _Logger = new DebugLogger(false, "GRABIT-ENGINE");

// node_modules/grabit-engine/dist/esm/src/utils/standard.js
var isDevelopment = () => typeof process !== "undefined" && process.env?.ENV !== "production";
var isNode = () => typeof process !== "undefined" && process.versions != null && process.versions.node != null;
var isBrowser = () => typeof window !== "undefined" && typeof window.document !== "undefined";
var sanitizeMessage = (value) => value.replace(/\\"/g, '"').replace(/"/g, "").replace(/\s+/g, " ").trim();
var minutesToMilliseconds = (minutes) => minutes * 60 * 1e3;
function normalizeHeaders(headers) {
  const seen = /* @__PURE__ */ new Map();
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    const canonical = seen.get(lower);
    if (value === void 0) {
      if (canonical !== void 0)
        delete result[canonical];
      else
        seen.set(lower, key);
      continue;
    }
    if (canonical !== void 0) {
      result[canonical] = value;
    } else {
      seen.set(lower, key);
      result[key] = value;
    }
  }
  return result;
}
function createCookiesFromSet(headers) {
  const cookies = extractSetCookies(headers);
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
function deduplicateArray(array) {
  return Array.from(new Set(array));
}

// node_modules/grabit-engine/dist/esm/src/types/ProcessError.js
var ProcessError = class _ProcessError extends Error {
  /** Unique error code identifier (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  code;
  /** Additional error details with type safety via generics */
  details;
  /** Whether to expose error details to the client (use false for sensitive errors) */
  expose;
  /** Optional HTTP status code associated with the error (e.g., 400, 500) */
  status;
  /**
   * Creates a new ProcessError instance
   * @param payload - Error configuration object containing all error properties
   */
  constructor(payload) {
    super(sanitizeMessage(payload.message));
    this.name = "ProcessError";
    this.code = payload.code;
    this.details = payload.details;
    this.expose = payload.expose ?? isDevelopment();
    this.status = payload.status;
    Error.captureStackTrace?.(this, _ProcessError);
  }
};
var isProcessError = (error) => error instanceof ProcessError;

// node_modules/grabit-engine/dist/esm/src/types/HttpError.js
var HttpError = class _HttpError extends Error {
  /** Unique error code identifier (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  code;
  /** Additional error details with type safety via generics */
  details;
  /** HTTP status code (e.g., 404, 500, 401) */
  statusCode;
  /** Whether to expose error details to the client (use false for sensitive errors) */
  expose;
  /**
   * Creates a new ProcessError instance
   * @param payload - Error configuration object containing all error properties
   */
  constructor(payload) {
    super(sanitizeMessage(payload.message));
    this.name = "HttpError";
    this.code = payload.code;
    this.details = payload.details;
    this.statusCode = payload.statusCode ?? 500;
    this.expose = payload.expose ?? isDevelopment();
    Error.captureStackTrace?.(this, _HttpError);
  }
  /**
   * Generates the error payload for HTTP responses
   * @param withDetails - Whether to include error details in the payload (default: false)
   * @returns An object containing the error code, message, and optionally details
   */
  statusPayload(withDetails = false) {
    return {
      code: this.code,
      message: this.message,
      details: withDetails ? this.details : void 0
    };
  }
};
var isHttpError = (error) => error instanceof HttpError;

// node_modules/grabit-engine/dist/esm/src/utils/similarity.js
import ParseDuration from "parse-duration";

// node_modules/grabit-engine/dist/esm/src/services/crypto.js
import Crypto from "crypto";
if (typeof globalThis.atob === "undefined" || typeof globalThis.btoa === "undefined") {
  try {
    const base64 = __require("base-64");
    if (typeof globalThis.btoa === "undefined") {
      globalThis.btoa = base64.encode;
    }
    if (typeof globalThis.atob === "undefined") {
      globalThis.atob = base64.decode;
    }
  } catch {
  }
}

// node_modules/grabit-engine/dist/esm/src/services/cache.js
var Cache = class {
  storage = /* @__PURE__ */ new Map();
  autoCleanupInterval = null;
  maxSize;
  /**
   * @param maxSize Maximum number of entries before LRU-style eviction kicks in.
   *               Defaults to 10,000. Set to `Infinity` to disable eviction.
   */
  constructor(maxSize = 1e4) {
    this.maxSize = maxSize;
    this.startAutoCleanup(minutesToMilliseconds(15));
  }
  set(key, data, ttl) {
    if (this.storage.has(key)) {
      this.storage.delete(key);
    }
    while (this.storage.size >= this.maxSize) {
      const oldestKey = this.storage.keys().next().value;
      if (oldestKey !== void 0)
        this.storage.delete(oldestKey);
      else
        break;
    }
    const entry = {
      data,
      timestamp: Date.now(),
      ttl
    };
    this.storage.set(key, entry);
  }
  get(key) {
    const entry = this.storage.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.storage.delete(key);
      return null;
    }
    return entry.data;
  }
  delete(key) {
    this.storage.delete(key);
  }
  clear() {
    this.storage.clear();
  }
  get size() {
    return this.storage.size;
  }
  has(key) {
    const entry = this.storage.get(key);
    if (!entry) {
      return false;
    }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.storage.delete(key);
      return false;
    }
    return true;
  }
  isExpired(key) {
    const entry = this.storage.get(key);
    if (!entry) {
      return true;
    }
    return Date.now() - entry.timestamp > entry.ttl;
  }
  setMaxSize(maxSize) {
    this.maxSize = maxSize;
  }
  startAutoCleanup(interval = 6e4) {
    if (this.autoCleanupInterval) {
      clearInterval(this.autoCleanupInterval);
    }
    this.autoCleanupInterval = setInterval(() => {
      this.clearExpired();
    }, interval);
    if (typeof this.autoCleanupInterval === "object" && "unref" in this.autoCleanupInterval) {
      this.autoCleanupInterval.unref();
    }
  }
  /** Stop the auto-cleanup interval. Call this when the cache is no longer needed. */
  stopAutoCleanup() {
    if (this.autoCleanupInterval) {
      clearInterval(this.autoCleanupInterval);
      this.autoCleanupInterval = null;
    }
  }
  clearExpired() {
    const now = Date.now();
    const expiredKeys = [];
    for (const [key, entry] of this.storage.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }
    for (const key of expiredKeys) {
      this.storage.delete(key);
    }
  }
};
var CACHE = new Cache();

// node_modules/grabit-engine/dist/esm/src/services/fetcher.js
var _resolvedFetch = null;
var _resolvedImpitClass = null;
async function resolveImpitClass() {
  if (_resolvedImpitClass)
    return _resolvedImpitClass;
  try {
    const mod = await import("impit");
    const ImpitClass = mod.Impit ?? mod.default?.Impit;
    if (!ImpitClass) {
      throw new Error(`Impit class not found in module exports. Available keys: [${Object.keys(mod).join(", ")}]` + (mod.default ? `, default keys: [${Object.keys(mod.default).join(", ")}]` : ""));
    }
    _resolvedImpitClass = ImpitClass;
    return ImpitClass;
  } catch (error) {
    throw new ProcessError({
      code: "IMPIT_IMPORT_FAILED",
      message: error instanceof Error ? `Failed to import impit: ${error.message}` : "Failed to import impit native module",
      expose: false
    });
  }
}
async function resolveFetch(agent) {
  const useBareFetch = !isNode() || isBrowser();
  if (_resolvedFetch && (useBareFetch || agent == void 0))
    return _resolvedFetch;
  if (typeof globalThis.fetch === "function" && useBareFetch) {
    _resolvedFetch = globalThis.fetch.bind(globalThis);
  } else {
    try {
      const Impit = await resolveImpitClass();
      const proxyUrl = extractProxyUrl(agent);
      const BrowserClient = new Impit({ browser: "firefox", proxyUrl });
      _resolvedFetch = BrowserClient.fetch.bind(BrowserClient);
    } catch (error) {
      if (error instanceof ProcessError)
        throw error;
      throw new ProcessError({
        code: "FETCH_NOT_AVAILABLE",
        message: error instanceof Error ? `No fetch implementation found: ${error.message}` : "No fetch implementation found. Use an environment with native fetch support or install impit.",
        expose: false
      });
    }
  }
  return _resolvedFetch;
}
function createRequestCacheKey(request, method = "GET") {
  const urlString = typeof request === "string" ? request : request.toString();
  return Crypto.createHash("md5").update(`${method.toUpperCase()}:${urlString}`).digest("hex");
}
async function serializeResponse(response) {
  const cloned = response.clone?.() ?? response;
  const body = await cloned.text();
  const headers = [];
  cloned.headers.forEach((value, key) => {
    headers.push([key, value]);
  });
  return { body, status: cloned.status, statusText: cloned.statusText, headers };
}
function reconstructResponse(cached) {
  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers: new Headers(cached.headers)
  });
}
function extractProxyUrl(agent) {
  if (!agent)
    return void 0;
  const proxy = agent.proxy;
  if (proxy instanceof URL)
    return proxy.href;
  if (typeof proxy === "string")
    return proxy;
  if (proxy?.href)
    return proxy.href;
  if (proxy && typeof proxy === "object" && "host" in proxy && "type" in proxy) {
    const socksType = { 4: "socks4", 5: "socks5" };
    const protocol = socksType[proxy.type] ?? "socks5";
    const auth = proxy.userId ? proxy.password ? `${encodeURIComponent(proxy.userId)}:${encodeURIComponent(proxy.password)}@` : `${encodeURIComponent(proxy.userId)}@` : "";
    const port = proxy.port ? `:${proxy.port}` : "";
    return `${protocol}://${auth}${proxy.host}${port}`;
  }
  return void 0;
}
async function handleResponse(requestResponse) {
  const contentType = requestResponse.headers.get("content-type");
  if (requestResponse.ok) {
    if (contentType?.includes("application/json")) {
      try {
        return await requestResponse.json();
      } catch (error) {
        throw new HttpError({
          code: "FETCH_JSON_PARSE_ERROR",
          message: error instanceof Error ? `Error parsing JSON: ${error.message}` : "Error parsing JSON",
          statusCode: 500,
          expose: false
        });
      }
    } else {
      return await requestResponse.text();
    }
  }
  let fetchError;
  const errorBody = await requestResponse.text();
  try {
    fetchError = JSON.parse(errorBody);
  } catch {
    fetchError = errorBody;
  }
  throw new HttpError({
    code: "FETCH_REQUEST_ERROR",
    statusCode: requestResponse.status,
    message: `Fetch request failed with status ${requestResponse.status}: ${requestResponse.statusText}`,
    details: fetchError,
    expose: false
  });
}
async function appFetch(request, options = {}) {
  const { cacheTTL, customCacheKey, ...fetchableOptions } = options;
  const method = (options.method ?? "GET").toUpperCase();
  const cacheEnabled = cacheTTL != null && cacheTTL > 0;
  const cacheKey = cacheEnabled ? customCacheKey ?? createRequestCacheKey(request, method) : void 0;
  if (cacheKey) {
    const cached = CACHE.get(cacheKey);
    if (cached)
      return reconstructResponse(cached);
  }
  const fetch = await resolveFetch(fetchableOptions.agent);
  const defaultOptions = {
    method: "GET",
    // credentials: 'include', // Include cookies in the request
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  };
  const mergedOptions = {
    ...defaultOptions,
    ...fetchableOptions,
    headers: normalizeHeaders(fetchableOptions.clean ? fetchableOptions.headers ?? {} : {
      ...defaultOptions.headers,
      ...fetchableOptions.headers || {}
    })
  };
  const response = await fetch(request, mergedOptions);
  if (cacheKey && cacheTTL && response.ok) {
    const serialized = await serializeResponse(response);
    CACHE.set(cacheKey, serialized, cacheTTL);
    return reconstructResponse(serialized);
  }
  return response;
}
async function fetchResponse(request, options) {
  const requestResponse = await appFetch(request, options);
  return handleResponse(requestResponse);
}

// node_modules/grabit-engine/dist/esm/src/controllers/manager.js
import pLimit from "p-limit";

// node_modules/grabit-engine/dist/esm/src/utils/path.js
var SFPattern = /\{\s*(\w+)\s*:\s*(\d+|string|uri|form-uri)\s*\}/g;
var NON_DIGIT_PATTERN = /\D/g;
var REPLACE_URI_SPACE_PATTERN = /%20/g;
var REMOVE_TRAILING_SLASH_PATTERN = /\/+$/;
var REMOVE_LEADING_TRAILING_SLASH_PATTERN = /^\/+|\/+$/g;
function stringFromPattern(pattern, params = {}) {
  return pattern.replace(SFPattern, (match, key, spec) => {
    const value = params[key];
    if (spec === "string") {
      return String(value !== void 0 && value !== null ? value : "");
    } else if (spec === "uri") {
      return encodeURI(String(value !== void 0 && value !== null ? value : ""));
    } else if (spec === "form-uri") {
      return encodeURI(String(value !== void 0 && value !== null ? value : ""), "form-uri");
    }
    const digits = parseInt(spec, 10);
    if (!isNaN(digits)) {
      const extractNumber = (val) => {
        if (typeof val === "number")
          return val;
        const numericStr = String(val ?? "").replace(NON_DIGIT_PATTERN, "");
        return numericStr === "" ? 0 : parseInt(numericStr, 10);
      };
      const num = extractNumber(value);
      return String(num).padStart(digits, "0");
    }
    return match;
  });
}
function encodeURI(str, type = "uri") {
  const encoded = encodeURIComponent(str);
  if (type === "form-uri") {
    return encoded.replace(REPLACE_URI_SPACE_PATTERN, "+");
  }
  return encoded;
}
function buildRelativePath(entry, params, includePattern = false) {
  let path = entry.endpoint;
  path = stringFromPattern(path, params);
  const pattern = includePattern && entry.pattern && stringFromPattern(entry.pattern, params);
  if (pattern) {
    const pathHasQuery = path.includes("?");
    const patternStartsWithQuery = pattern.startsWith("?");
    const patternStartsWithAmp = pattern.startsWith("&");
    if (pathHasQuery && patternStartsWithQuery) {
      path = path + "&" + pattern.slice(1);
    } else if (pathHasQuery && patternStartsWithAmp) {
      path = path + pattern;
    } else if (!pathHasQuery && patternStartsWithQuery) {
      path = path + pattern;
    } else if (!pathHasQuery && patternStartsWithAmp) {
      path = path + "?" + pattern.slice(1);
    } else {
      path = path + pattern;
    }
  }
  if (entry.queries && Object.keys(entry.queries).length > 0) {
    const queryString = Object.entries(entry.queries).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&");
    if (path.includes("?")) {
      path = path + "&" + queryString;
    } else {
      path = path + "?" + queryString;
    }
  }
  return path;
}
function pathJoin(...parts) {
  return parts.map((part, index) => {
    if (index === 0) {
      return part?.replace(REMOVE_TRAILING_SLASH_PATTERN, "") ?? "";
    } else {
      return part?.replace(REMOVE_LEADING_TRAILING_SLASH_PATTERN, "") ?? "";
    }
  }).filter((part) => part.length > 0).join("/");
}

// node_modules/grabit-engine/dist/esm/src/utils/validator.js
import { isURL } from "validator";
var SCHEME_REGEX = /^[a-z][a-z0-9._-]*$/;
var VERSION_REGEX = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/;
function isValidScheme(scheme) {
  return SCHEME_REGEX.test(scheme);
}
function isValidVersion(version) {
  return VERSION_REGEX.test(version);
}
function validateProvidersManifest(manifest) {
  const errors = [];
  const warnings = [];
  if (!manifest.name || typeof manifest.name !== "string" || manifest.name.trim().length === 0) {
    errors.push("Manifest name is required and must be a non-empty string.");
  }
  if (manifest.author !== void 0 && (typeof manifest.author !== "string" || manifest.author.trim().length === 0)) {
    warnings.push("Manifest author must be a non-empty string if specified.");
  }
  if (!manifest.providers || typeof manifest.providers !== "object" || Object.keys(manifest.providers).length === 0) {
    errors.push("Manifest must contain a 'providers' object with at least one provider entry.");
  }
  return {
    valid: errors.length === 0,
    manifest,
    errors,
    warnings
  };
}
function validateProviderModule(module) {
  const errors = [];
  const warnings = [];
  const provideConfig = module.provider.config;
  const meta = module.meta ?? {};
  const workers = module.workers ?? {};
  if (!meta.name || typeof meta.name !== "string" || meta.name.trim().length === 0) {
    warnings.push("Provider name is required and must be a non-empty string.");
  }
  if (!provideConfig.scheme || typeof provideConfig.scheme !== "string" || !isValidScheme(provideConfig.scheme)) {
    errors.push("Provider scheme is required and must be a valid scheme string (e.g., 'social/twitter', 'movie', 'serie').");
  }
  if (!meta.version || typeof meta.version !== "string" || !isValidVersion(meta.version)) {
    warnings.push("Provider version is required and must be a valid version string (e.g., '1.0.0', '2.1', '0.5.3-beta').");
  }
  if (meta.active !== void 0 && typeof meta.active !== "boolean") {
    errors.push("Provider active status must be a boolean.");
  }
  if (meta.language !== void 0) {
    if (Array.isArray(meta.language)) {
      if (meta.language.length === 0) {
        errors.push("Provider language array must contain at least one language code.");
      } else if (!meta.language.every((lang) => typeof lang === "string" && lang.trim().length > 0)) {
        errors.push("Provider language array must contain only non-empty strings.");
      }
    } else if (typeof meta.language !== "string" || meta.language.trim().length === 0) {
      errors.push("Provider language must be a non-empty string or array of strings if specified.");
    }
  }
  if (!meta.env || typeof meta.env !== "string" || !["node", "universal"].includes(meta.env)) {
    errors.push("Provider env is required and must be either 'node' or 'universal'.");
  }
  if (meta.type !== void 0 && typeof meta.type !== "string") {
    errors.push("Provider type must be a string if specified.");
  } else if (meta.type !== void 0 && !["media", "subtitle"].includes(meta.type)) {
    errors.push("Provider type must be either 'media' or 'subtitle' if specified.");
  }
  if (!meta.supportedMediaTypes || !Array.isArray(meta.supportedMediaTypes) || meta.supportedMediaTypes.length === 0) {
    errors.push("Provider must specify at least one supported media type.");
  } else {
    for (const mediaType of meta.supportedMediaTypes) {
      if (!MEDIA_TYPES.includes(mediaType)) {
        errors.push(`Provider supported media type '${mediaType}' is not a valid media type.`);
      }
    }
  }
  if (meta.priority !== void 0 && typeof meta.priority !== "number") {
    errors.push("Provider priority must be a number if specified.");
  }
  if (meta.dir !== void 0 && (typeof meta.dir !== "string" || meta.dir.trim().length === 0)) {
    errors.push("Provider dir must be a non-empty string if specified.");
  }
  if (workers.getStreams !== void 0 && typeof workers.getStreams !== "function") {
    errors.push("Provider getStreams must be a function if specified.");
  } else if (meta.type == "media" && workers.getStreams === void 0) {
    warnings.push("Provider of type 'media' should implement getStreams method.");
  }
  if (workers.getSubtitles !== void 0 && typeof workers.getSubtitles !== "function") {
    errors.push("Provider getSubtitles must be a function if specified.");
  } else if (meta.type == "subtitle" && workers.getSubtitles === void 0) {
    warnings.push("Provider of type 'subtitle' should implement getSubtitles method.");
  }
  return { errors, warnings };
}
function validateProviderModules(registry) {
  const errors = [];
  const warnings = [];
  const validModules = /* @__PURE__ */ new Map();
  for (const [scheme, mod] of registry) {
    if (!mod) {
      warnings.push([scheme, ["Provider module could not be loaded."]]);
      continue;
    }
    const v = validateProviderModule(mod);
    errors.push([scheme, v.errors]);
    warnings.push([scheme, v.warnings]);
    if (v.errors.length === 0) {
      validModules.set(scheme, mod);
    }
  }
  if (validModules.size === 0) {
    errors.push(["registry", ["No valid provider modules found in the registry."]]);
  }
  return {
    valid: errors.length === 0,
    validModules,
    errors,
    warnings
  };
}
function validateManifestConfiguration(provider, manifest) {
  const config2 = provider.config;
  const prefix = `\x1B[41m\x1B[37m ${manifest.name} \x1B[0m`;
  if (config2.name !== manifest.name) {
    _Logger.alwaysWarn(`${prefix} Provider config name "${config2.name}" does not match manifest name "${manifest.name}".`);
  }
  const configLangs = Array.isArray(config2.language) ? config2.language : [config2.language];
  const manifestLangs = Array.isArray(manifest.language) ? manifest.language : [manifest.language];
  const missingInManifest = configLangs.filter((lang) => !manifestLangs.includes(lang));
  const missingInConfig = manifestLangs.filter((lang) => !configLangs.includes(lang));
  if (missingInManifest.length > 0) {
    _Logger.alwaysWarn(`${prefix} Languages in config but missing in manifest: [${missingInManifest.join(", ")}]`);
  }
  if (missingInConfig.length > 0) {
    _Logger.alwaysWarn(`${prefix} Languages in manifest but missing in config: [${missingInConfig.join(", ")}]`);
  }
  if (missingInManifest.length === 0 && missingInConfig.length === 0 && configLangs.join(",") !== manifestLangs.join(",")) {
    _Logger.alwaysWarn(`${prefix} Language order mismatch \u2014 config: [${configLangs.join(", ")}], manifest: [${manifestLangs.join(", ")}]`);
  }
  const configEntryKeys = [...new Set(Object.keys(config2.entries).map((k) => k.replace(/^search_/, "")))].sort();
  const manifestMediaTypes = [...manifest.supportedMediaTypes].sort();
  if (configEntryKeys.length !== manifestMediaTypes.length || !configEntryKeys.every((key, i) => key === manifestMediaTypes[i])) {
    _Logger.alwaysWarn(`${prefix} Provider config entry types [${configEntryKeys}] do not match manifest supportedMediaTypes [${manifestMediaTypes}].`);
  }
}

// node_modules/grabit-engine/dist/esm/src/services/github.js
var GithubService;
(function(GithubService2) {
  const GITHUB_REGEX = [/^https?:\/\/github\.com\/([^/]+)\/([^/.]+)(\.git)?$/, /^github\.com\/([^/]+)\/([^/.]+)(\.git)?$/, /^([^/]+)\/([^/]+)$/];
  async function initializeProviders(source) {
    const fetchOpts = createOptions(source);
    const manifest = await githubFetchManifest(fetchOpts);
    const modules = await fetchModuleFromGithub(fetchOpts, manifest.providers, source.moduleResolver);
    const registry = new Map(Object.entries(modules));
    const validations = validateProviderModules(registry);
    return {
      meta: manifest,
      providers: validations.validModules,
      validations: {
        errors: validations.errors,
        warnings: validations.warnings
      }
    };
  }
  GithubService2.initializeProviders = initializeProviders;
  async function getManifest(source) {
    const fetchOpts = createOptions(source);
    const manifest = await githubFetchManifest(fetchOpts);
    return manifest;
  }
  GithubService2.getManifest = getManifest;
  async function getModule([scheme, manifest], source) {
    const fetchOpts = createOptions(source);
    const modules = await fetchModuleFromGithub(fetchOpts, { [scheme]: manifest }, source.moduleResolver);
    const registry = new Map(Object.entries(modules));
    const validations = validateProviderModules(registry);
    return {
      module: registry.get(scheme) ?? null,
      validations: {
        errors: validations.errors,
        warnings: validations.warnings
      }
    };
  }
  GithubService2.getModule = getModule;
  function createOptions(source) {
    const parsed = parseGithubURL(source.url);
    if (!parsed) {
      throw new ProcessError({
        code: "INVALID_GITHUB_URL",
        message: `Invalid GitHub URL: ${source.url}. Expected formats: https://github.com/owner/repo, github.com/owner/repo, or owner/repo`
      });
    }
    const branch = source.branch ?? "main";
    const token = source.token;
    const rawRoot = (source.rootDir ?? "").replace(/^\/+|\/+$/g, "");
    const rootDir = rawRoot ? `${rawRoot}/` : "";
    const fetchOpts = { owner: parsed.owner, repo: parsed.repo, branch, token, rootDir };
    return fetchOpts;
  }
  function parseGithubURL(url) {
    for (const p of GITHUB_REGEX) {
      const m = url.match(p);
      if (m)
        return { owner: m[1], repo: m[2] };
    }
    return null;
  }
  async function githubFetch(apiPath, opts = {}) {
    const headers = {
      "User-Agent": "grabit-engine",
      Accept: opts.raw ? "application/vnd.github.v3.raw" : "application/vnd.github.v3+json"
    };
    if (opts.token)
      headers["Authorization"] = `Bearer ${opts.token}`;
    const res = await appFetch(`https://api.github.com${apiPath}`, { headers, clean: true });
    if (!res.ok) {
      const body = await res.text();
      throw new HttpError({
        code: "GITHUB_API_ERROR",
        message: `GitHub API request failed with status ${res.status}: ${res.statusText}`,
        details: body,
        statusCode: res.status,
        expose: false
      });
    }
    return opts.raw ? await res.text() : await res.json();
  }
  async function githubFetchManifest(opts) {
    try {
      const apiPath = `/repos/${opts.owner}/${opts.repo}/contents/${opts.rootDir}manifest.json?ref=${opts.branch}`;
      const manifestText = await githubFetch(apiPath, { token: opts.token, raw: true });
      const validated = validateProvidersManifest(JSON.parse(manifestText));
      if (!validated.valid) {
        throw new ProcessError({
          code: "PROVIDERS_MANIFEST_INVALID",
          message: `Invalid GitHub manifest for repo ${opts.owner}/${opts.repo}`,
          details: validated.errors
        });
      }
      return validated.manifest;
    } catch (error) {
      if (isHttpError(error) || isProcessError(error))
        throw error;
      throw new ProcessError({
        code: "PROVIDERS_MANIFEST_PARSE_ERROR",
        message: `Failed to parse GitHub manifest for repo ${opts.owner}/${opts.repo}`,
        details: error
      });
    }
  }
  async function fetchFileFromGitHub(opts, filePath) {
    const apiPath = `/repos/${opts.owner}/${opts.repo}/contents/${opts.rootDir}${filePath}?ref=${opts.branch}`;
    return githubFetch(apiPath, { token: opts.token, raw: true });
  }
  async function fetchModuleFromGithub(opts, providers, moduleResolver) {
    const modules = {};
    for (const [scheme, manifest] of Object.entries(providers)) {
      let sourceCode;
      const fetchPath = `${pathJoin(manifest.dir, scheme)}/index.js`;
      const fullApiUrl = `https://api.github.com/repos/${opts.owner}/${opts.repo}/contents/${opts.rootDir}${fetchPath}?ref=${opts.branch}`;
      try {
        sourceCode = await fetchFileFromGitHub(opts, fetchPath);
      } catch (error) {
        _Logger.error(`[GithubService] Failed to fetch source for provider "${scheme}":
  URL: ${fullApiUrl}
  rootDir: "${opts.rootDir || "(none)"}"
  manifest.dir: "${manifest.dir ?? "(none)"}"
  Error: ${error instanceof Error ? error.message : error}`);
        modules[scheme] = null;
        continue;
      }
      try {
        if (moduleResolver) {
          modules[scheme] = await moduleResolver(scheme, sourceCode);
        } else if (isNode()) {
          modules[scheme] = await defaultNodeResolver(scheme, sourceCode);
        }
      } catch (error) {
        _Logger.error(`[GithubService] Failed to resolve module for provider "${scheme}": ${error instanceof Error ? error.message : error}`);
        modules[scheme] = null;
      }
    }
    return modules;
  }
  async function defaultNodeResolver(scheme, sourceCode) {
    let fs;
    let path;
    let os;
    let urlMod;
    try {
      fs = await import("fs");
      path = await import("path");
      os = await import("os");
      urlMod = await import("url");
    } catch {
      throw new ProcessError({
        code: "NODE_ENV_REQUIRED",
        message: "Default module resolver requires Node.js environment. Please provide a custom resolver for browser or React Native environments."
      });
    }
    const safeName = scheme.replace(/\//g, "_");
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `provider-${safeName}-`));
    const filePath = path.join(tmpDir, "index.js");
    fs.writeFileSync(filePath, sourceCode, "utf-8");
    const mod = await import(urlMod.pathToFileURL(filePath).href);
    return mod.default ?? mod;
  }
})(GithubService || (GithubService = {}));

// node_modules/grabit-engine/dist/esm/src/services/registry.js
var RegistryService;
(function(RegistryService2) {
  async function initializeProviders(source) {
    const registry = new Map(Object.entries(source.providers));
    const validations = validateProviderModules(registry);
    return {
      meta: {
        name: source.name,
        author: source.author ?? "unknown",
        providers: Object.fromEntries(Object.entries(source.providers).map(([scheme, mod]) => {
          return [scheme, mod.meta];
        }))
      },
      providers: validations.validModules,
      validations: {
        errors: validations.errors,
        warnings: validations.warnings
      }
    };
  }
  RegistryService2.initializeProviders = initializeProviders;
  async function getManifest(source) {
    return {
      name: source.name,
      author: source.author ?? "unknown",
      providers: Object.fromEntries(Object.entries(source.providers).map(([scheme, mod]) => {
        return [scheme, mod.meta];
      }))
    };
  }
  RegistryService2.getManifest = getManifest;
})(RegistryService || (RegistryService = {}));

// node_modules/grabit-engine/dist/esm/src/services/require.js
var RequireService;
(function(RequireService2) {
  async function initializeProviders(source) {
    let rootDir = source.rootDir ?? "./";
    if (!rootDir.endsWith("/"))
      rootDir += "/";
    const registry = /* @__PURE__ */ new Map();
    for (const [scheme, manifest] of Object.entries(source.manifest.providers)) {
      const resolved = await source.resolve(pathJoin(rootDir, manifest.dir, scheme));
      const mod = resolved.default ?? resolved;
      registry.set(scheme, mod);
    }
    const validations = validateProviderModules(registry);
    return {
      meta: source.manifest,
      providers: registry,
      validations: {
        errors: validations.errors,
        warnings: validations.warnings
      }
    };
  }
  RequireService2.initializeProviders = initializeProviders;
  async function getManifest(source) {
    return source.manifest;
  }
  RequireService2.getManifest = getManifest;
})(RequireService || (RequireService = {}));

// node_modules/grabit-engine/dist/esm/src/services/tmdb.js
var TMDB;
(function(TMDB2) {
  const API_BASE_URL = "https://api.themoviedb.org/3";
  const API_KEYS = [];
  let CACHE_TTL = 0;
  function getRandomApiKey() {
    if (API_KEYS.length === 0) {
      throw new ProcessError({
        code: "TMDB_API_KEY_MISSING",
        message: "No TMDB API keys provided. Please set the API keys before making requests."
      });
    }
    const randomIndex = Math.floor(Math.random() * API_KEYS.length);
    return API_KEYS[randomIndex];
  }
  async function apiFetchResponse(request, options = {}) {
    const { headers, ...restOptions } = options;
    if (typeof request === "string" && request.startsWith("/")) {
      request = new URL(request, API_BASE_URL);
      request.pathname = "/3" + request.pathname;
      request.searchParams.append("api_key", getRandomApiKey());
    }
    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
        // Authorization: `Bearer ${getRandomApiKey()}`
      },
      cacheTTL: CACHE_TTL
      // Use the configured cache TTL
    };
    const mergedOptions = {
      ...defaultOptions,
      headers: {
        ...defaultOptions.headers,
        ...headers
      },
      ...restOptions
    };
    return await fetchResponse(request, mergedOptions).catch((error) => {
      if (error instanceof HttpError) {
        _Logger.error(`[TMDB API] link: ${request.toString()}
error: ${error.message}`);
        return null;
      } else {
        _Logger.error(`[TMDB API] Unexpected error in API call: ${error}`);
        throw error;
      }
    });
  }
  async function tvDetails(id, lang = "en") {
    const paramsObj = {
      language: lang,
      append_to_response: "translations,external_ids"
      // Extra data to retrieve
    };
    const params = new URLSearchParams(paramsObj).toString();
    const response = await apiFetchResponse(`/tv/${id}?${params}`);
    if (!response)
      return null;
    return response;
  }
  async function movieDetails(id, lang = "en") {
    const paramsObj = {
      language: lang,
      append_to_response: "translations,external_ids"
      // Retrieve additional video, release date, and external IDs info
    };
    const params = new URLSearchParams(paramsObj).toString();
    const response = await apiFetchResponse(`/movie/${id}?${params}`);
    if (!response)
      return null;
    return response;
  }
  async function episodeIds(tmdbId, season, episode) {
    const response = await apiFetchResponse(`/tv/${tmdbId}/season/${season}/episode/${episode}/external_ids`);
    if (!response)
      return null;
    return response;
  }
  function init(keys, options) {
    API_KEYS.length = 0;
    API_KEYS.push(...keys);
    if (options?.cacheTTL !== void 0) {
      CACHE_TTL = options.cacheTTL;
    }
  }
  TMDB2.init = init;
  async function createRequesterMedia(requester) {
    const response = requester.media.type === "movie" ? await movieDetails(requester.media.tmdbId, requester.targetLanguageISO) : requester.media.type === "serie" ? await tvDetails(requester.media.tmdbId, requester.targetLanguageISO) : null;
    if (response === null) {
      throw new ProcessError({
        code: "TMDB_MEDIA_NOT_FOUND",
        message: `Media not found on TMDB for ID: ${requester.media.tmdbId} and type: ${requester.media.type}`
      });
    }
    const translatedTitles = response.translations.translations.map((t) => ({
      iso_639_1: t.iso_639_1,
      title: "title" in t.data ? t.data.title : t.data.name
    })).filter((t) => {
      const matchesTargetLanguage = t.iso_639_1.toLowerCase().includes(requester.targetLanguageISO);
      return matchesTargetLanguage && !!t.title && t.title.length > 0;
    });
    if (requester.media.type === "movie" && "original_title" in response) {
      return {
        type: "movie",
        tmdbId: response.id.toString(),
        imdbId: requester.media.imdbId ?? response.external_ids.imdb_id ?? void 0,
        title: requester.media.title ?? response.original_title,
        localizedTitles: [...requester.media.localizedTitles ?? [], ...translatedTitles.map((t) => t.title)],
        original_language: requester.media.original_language ?? response.original_language,
        duration: requester.media.duration ?? response.runtime,
        releaseYear: (requester.media.releaseYear ?? parseInt(response.release_date?.split("-")[0] ?? "0")) || 0
      };
    } else if (requester.media.type === "serie" && "original_name" in response) {
      const epIds = await episodeIds(response.id.toString(), requester.media.season, requester.media.episode);
      return {
        type: "serie",
        tmdbId: response.id.toString(),
        imdbId: requester.media.imdbId ?? response.external_ids.imdb_id ?? void 0,
        ep_tmdbId: requester.media.ep_tmdbId ?? epIds?.id.toString() ?? void 0,
        title: requester.media.title ?? response.original_name,
        localizedTitles: [...requester.media.localizedTitles ?? [], ...translatedTitles.map((t) => t.title)],
        original_language: requester.media.original_language ?? response.original_language,
        duration: requester.media.duration ?? response.translations.translations[0]?.data.runtime ?? 0,
        releaseYear: (requester.media.releaseYear ?? parseInt(response.first_air_date?.split("-")[0] ?? "0")) || 0,
        season: requester.media.season,
        episode: requester.media.episode
      };
    } else {
      throw new ProcessError({
        code: "TMDB_UNSUPPORTED_MEDIA_TYPE",
        message: `Unsupported media type for TMDB requester media creation: ${requester.media.type}`
      });
    }
  }
  TMDB2.createRequesterMedia = createRequesterMedia;
})(TMDB || (TMDB = {}));

// node_modules/grabit-engine/dist/esm/src/controllers/provider.js
import { default as ISO6391 } from "iso-639-1";
function defineProviderModule(_this, manifest, workers) {
  return {
    meta: manifest,
    provider: _this,
    workers: createModuleWorkers(_this, manifest, workers)
  };
}
function createModuleWorkers(provider, manifest, workers) {
  validateManifestConfiguration(provider, manifest);
  const shouldValidate = provider.config.xhr?.validateSources === true;
  return {
    cleanup: workers.cleanup,
    getStreams: workers.getStreams ? async (requester, context) => {
      try {
        const sources = await workers.getStreams(requester, context);
        const withMeta = sources.map((source) => {
          const format = source.format ?? (typeof source.playlist === "string" ? extractExtension(source.playlist) ?? "m3u8" : "m3u8");
          return {
            ...source,
            xhr: {
              ...source.xhr,
              headers: normalizeHeaders({
                ...source.xhr?.headers,
                "User-Agent": requester.userAgent
              })
            },
            format,
            fileName: `[${manifest.name}][${format.toUpperCase()}] - ${ISO6391.getName(source.language)} - ${source.fileName ?? "Source"} `,
            providerName: manifest.name,
            scheme: provider.config.scheme
          };
        });
        if (!shouldValidate)
          return withMeta;
        return validateMediaSources(withMeta, requester, context);
      } catch (error) {
        context.log.error(`Error in getStreams of provider ${manifest.name}:`, error);
        throw error;
      }
    } : void 0,
    getSubtitles: workers.getSubtitles ? async (requester, context) => {
      try {
        const sources = await workers.getSubtitles(requester, context);
        const withMeta = sources.map((source) => ({
          ...source,
          xhr: {
            ...source.xhr,
            headers: normalizeHeaders({
              ...source.xhr?.headers,
              "User-Agent": requester.userAgent
            })
          },
          fileName: `[${manifest.name}][${source.format.toUpperCase()}] - ${source.fileName ?? "Subtitles"} `,
          providerName: manifest.name,
          scheme: provider.config.scheme
        }));
        if (!shouldValidate)
          return withMeta;
        return validateSubtitleSources(withMeta, requester, context);
      } catch (error) {
        context.log.error(`Error in getSubtitles of provider ${manifest.name}:`, error);
        throw error;
      }
    } : void 0
  };
}
async function validateMediaSources(sources, requester, context) {
  const results = await Promise.all(sources.map(async (source) => {
    const url = typeof source.playlist === "string" ? source.playlist : source.playlist[0]?.source;
    if (!url)
      return null;
    const { ok } = await context.xhr.status(url, { attachUserAgent: true, attachProxy: true, headers: source.xhr.headers }, requester);
    return ok ? source : null;
  }));
  return results.filter((s) => s !== null).sort((a, b) => {
    const aMatch = a.language === requester.targetLanguageISO ? 0 : 1;
    const bMatch = b.language === requester.targetLanguageISO ? 0 : 1;
    return aMatch - bMatch;
  });
}
async function validateSubtitleSources(sources, requester, context) {
  const results = await Promise.all(sources.map(async (source) => {
    if (!source.url)
      return null;
    const { ok } = await context.xhr.status(source.url, { attachUserAgent: true, attachProxy: true, headers: source.xhr.headers }, requester);
    return ok ? source : null;
  }));
  return results.filter((s) => s !== null).sort((a, b) => {
    const aMatch = a.language === requester.targetLanguageISO ? 0 : 1;
    const bMatch = b.language === requester.targetLanguageISO ? 0 : 1;
    return aMatch - bMatch;
  });
}

// node_modules/grabit-engine/dist/esm/src/services/tldts.js
import * as _tldts from "tldts";

// node_modules/grabit-engine/dist/esm/src/models/provider.js
function normalizeLanguages(language) {
  return Array.isArray(language) ? language : [language];
}
var Provider = class _Provider {
  config;
  constructor(config2) {
    this.config = config2;
  }
  static create(config2) {
    return new _Provider(config2);
  }
  /** Constructs query parameters for a provider based on the media information and the provider's expected query format
   * @param localizedTextIndex Index into `media.localizedTitles` to pick a translated title.
   *   - `undefined` (default) — auto-selects a localized title when the provider's language differs from the media's original language.
   *   - `number` — uses that specific index (wraps around via modulo).
   *   - `null` — forces the original title, skipping localization entirely.
   */
  createQueries(media, localizedTextIndex) {
    let indexMapping = {};
    let nameMapping = {};
    const useTranslatated = localizedTextIndex !== null && media.type !== "channel" && (this.useTranslation(media) || localizedTextIndex !== void 0 && media.localizedTitles[Math.max(localizedTextIndex, 0) % media.localizedTitles.length]);
    const safeLocalizedTextIndex = media.type !== "channel" ? Math.max(localizedTextIndex ?? 0, 0) % media.localizedTitles.length : 0;
    if (media.type === "movie") {
      const supportedId = this.retrievePreferedIds(media);
      indexMapping = {
        [EProviderQueryKey.id]: supportedId.id,
        [EProviderQueryKey.tmdb]: media.tmdbId,
        [EProviderQueryKey.imdb]: media.imdbId ?? "",
        [EProviderQueryKey.title]: useTranslatated ? media.localizedTitles[safeLocalizedTextIndex] ?? media.title : media.title,
        [EProviderQueryKey.year]: media.releaseYear
      };
      nameMapping = {
        id: indexMapping[EProviderQueryKey.id],
        tmdb: indexMapping[EProviderQueryKey.tmdb],
        imdb: indexMapping[EProviderQueryKey.imdb],
        title: indexMapping[EProviderQueryKey.title],
        year: indexMapping[EProviderQueryKey.year]
      };
    }
    if (media.type === "serie") {
      const supportedId = this.retrievePreferedIds(media);
      indexMapping = {
        [EProviderQueryKey.id]: supportedId.id,
        [EProviderQueryKey.tmdb]: media.tmdbId,
        [EProviderQueryKey.imdb]: media.imdbId ?? "",
        [EProviderQueryKey.title]: useTranslatated ? media.localizedTitles[safeLocalizedTextIndex] ?? media.title : media.title,
        [EProviderQueryKey.year]: media.releaseYear,
        [EProviderQueryKey.season]: media.season,
        [EProviderQueryKey.episode]: media.episode,
        [EProviderQueryKey.ep_id]: supportedId.ep_id,
        [EProviderQueryKey.ep_tmdb]: media.ep_tmdbId,
        [EProviderQueryKey.ep_imdb]: media.ep_imdbId
      };
      nameMapping = {
        id: indexMapping[EProviderQueryKey.id],
        tmdb: indexMapping[EProviderQueryKey.tmdb],
        imdb: indexMapping[EProviderQueryKey.imdb],
        title: indexMapping[EProviderQueryKey.title],
        year: indexMapping[EProviderQueryKey.year],
        season: indexMapping[EProviderQueryKey.season],
        episode: indexMapping[EProviderQueryKey.episode],
        ep_id: indexMapping[EProviderQueryKey.ep_id],
        ep_tmdb: indexMapping[EProviderQueryKey.ep_tmdb],
        ep_imdb: indexMapping[EProviderQueryKey.ep_imdb]
      };
    } else if (media.type === "channel") {
      const supportedId = this.retrievePreferedIds(media);
      indexMapping = {
        [EProviderQueryKey.id]: supportedId.id,
        [EProviderQueryKey.title]: media.channelName
      };
      nameMapping = {
        id: indexMapping[EProviderQueryKey.id],
        title: indexMapping[EProviderQueryKey.title]
      };
    }
    return { ...indexMapping, ...nameMapping };
  }
  /** Creates a URL for the media resource based on the provider's configuration and the media information provided in the requester.
   *
   * @param localizedTextIndex Index into `localizedTitles` to pick a translated title.
   *   - `undefined` — auto-selects based on provider language.
   *   - `number` — uses that index (wraps via modulo).
   *   - `null` — forces the original title, skipping localization.
   * @description Throws an error if the media type is not supported by the provider.
   * @returns A URL object representing the full URL to access the media resource on the provider's platform.
   */
  createResourceURL(requester, localizedTextIndex) {
    const entry = this.config.entries[requester.media.type] || this.config.entries[`search_${requester.media.type}`];
    if (!entry) {
      throw new ProcessError({
        code: "ProviderError",
        status: 400,
        message: `Provider ${this.config.name} does not support media type ${requester.media.type}`
      });
    }
    const relativePath = buildRelativePath(entry, this.createQueries(requester.media, localizedTextIndex));
    return new URL(relativePath, this.config.baseUrl);
  }
  /** Generates a deduplicated, prioritized list of resource URLs for the media request,
   * combining ID-based and localized-title-based variants.
   * @throws If the media type is not supported by the provider.
   * @returns Deduplicated URL array ordered by priority.
   */
  createResourceUrls(requester, customURL) {
    const entry = this.config.entries[requester.media.type] || this.config.entries[`search_${requester.media.type}`];
    if (!entry) {
      throw new ProcessError({
        code: "ProviderError",
        status: 400,
        message: `Provider ${this.config.name} does not support media type ${requester.media.type}`
      });
    }
    const useTranslation = this.useTranslation(requester.media);
    const titleCount = requester.media.type === "channel" ? -1 : requester.media.localizedTitles.length;
    const urls = [
      // First: ID-based search (default createResourceURL)
      customURL?.href ?? this.createResourceURL(requester, void 0).href,
      // Then: localized title variants following the translation priority order
      ...Array.from({ length: titleCount + 1 }, (_, i) => {
        const localizedIndex = useTranslation ? i < titleCount ? i : null : i === 0 ? null : i - 1;
        return this.createResourceURL(requester, localizedIndex).href;
      })
    ];
    return deduplicateArray(urls).map((url) => new URL(url));
  }
  /** Creates a pattern string by replacing placeholders
   *  in the given `pattern` with corresponding values from the media object and any additional custom parameters `customPattern`.
   *
   * For formatting patterns:
   * `{key:<digits>}` for zero-padded numeric values
   * `{key:string}` for string-based values
   * `{key:uri}` for URI-encoded values
   * `{key:form-uri}` for form URI-encoded values}
   *
   * - id = 0 → Media ID (TMDB or IMDB based on provider's mediaIds preference)
   * - tmdb = 1 → Media TMDB ID
   * - imdb = 2 → Media IMDB ID
   * - title = 3 → Media title
   * - year = 4 → Release year
   * - season = 5 → Season number
   * - episode = 6 → Episode number
   * - ep_id = 7 → Episode ID Based on provider's mediaIds preference (for series)
   * - ep_tmdb = 8 → Episode TMDB ID (for series)
   * - ep_imdb = 9 → Episode IMDB ID (for series)
   * @param localizedTextIndex Index into `localizedTitles` to pick a translated title.
   *   - `undefined` — auto-selects based on provider language.
   *   - `number` — uses that index (wraps via modulo).
   *   - `null` — forces the original title, skipping localization.
   * @see {@link EProviderQueryKey} for numeric placeholder index mappings}
   */
  createPatternString(pattern, media, customPattern, localizedTextIndex) {
    return stringFromPattern(pattern, {
      ...this.createQueries(media, localizedTextIndex),
      ...customPattern
    });
  }
  /** Applies the provider's pattern to a given URL or path, replacing placeholders with media information from the requester */
  applyPatternURL(urlOrPath, requester) {
    const entry = this.config.entries[requester.media.type] || this.config.entries[`search_${requester.media.type}`];
    if (!entry) {
      throw new ProcessError({
        code: "ProviderError",
        status: 400,
        message: `Provider ${this.config.name} does not support media type ${requester.media.type}`
      });
    }
    const relativePath = buildRelativePath(entry, this.createQueries(requester.media), true);
    return new URL(relativePath, urlOrPath);
  }
  /** Checks if the provider supports the given media based on the provider's configuration and the media's properties */
  isMediaSupported(media) {
    const entrySupported = Object.keys(this.config.entries).map((key) => key.replace("search_", "")).includes(media.type);
    if (media.type !== "channel") {
      const supportedMediaIdTypes = this.config.mediaIds || ["tmdb"];
      return (
        // For provider that use search Algoritm this check is optional as they can still attempt to search using title
        // and other media information, but for provider that rely on direct media ID matching, this check is crucial
        // to ensure that the provider can actually process the media request based on its configuration.
        entrySupported && supportedMediaIdTypes.some((type) => {
          const value = type === "tmdb" ? media.tmdbId : media.imdbId;
          return typeof value === "string" && value.trim().length > 0;
        })
      );
    } else
      return entrySupported;
  }
  /** Retrieves the preferred media ID(s) for the given media
   * This function checks the media type and retrieves the appropriate ID(s) (TMDB or IMDB) based on the provider's expected media ID types.
   * If the media type is not supported or if the required IDs are not available,
   * it throws an error.
   * @description Throws Error if not supported or invalid media ID is found based on provider's configuration. For series, it checks for both media ID and episode ID based on the provider's mediaIds preference.
   * @returns An object containing the supported media ID(s) for the given media.
   * - For movies: { id: string }
   * - For series: { id: string, ep_id: string }
   * - For channels: { id: string }
   */
  retrievePreferedIds(media) {
    if (!this.isMediaSupported(media))
      throw new ProcessError({
        code: "ProviderUnsupportedMedia",
        status: 400,
        message: `Media type ${media.type} is not supported by provider or No valid media ID found ${this.config.name}.`
      });
    const supportedMediaIdTypes = this.config.mediaIds || ["tmdb"];
    if (media.type === "channel") {
      return {
        id: media.channelId
      };
    } else if (media.type === "movie") {
      const id = supportedMediaIdTypes.map((type) => type === "tmdb" ? media.tmdbId : media.imdbId).filter((id2) => !!id2 && id2?.trim().length > 0)[0];
      if (!id) {
        throw new ProcessError({
          code: "ProviderUnsupportedMedia",
          status: 400,
          message: `No valid media ID found for provider ${this.config.name}.`
        });
      }
      return {
        id
      };
    } else {
      const id = supportedMediaIdTypes.map((type) => type === "tmdb" ? media.tmdbId : media.imdbId).filter((id2) => !!id2 && id2?.trim().length > 0)[0];
      const ep_id = supportedMediaIdTypes.map((type) => type === "tmdb" ? media.ep_tmdbId : media.ep_imdbId).filter((id2) => !!id2 && id2?.trim().length > 0)[0];
      if (!id || !ep_id) {
        throw new ProcessError({
          code: "ProviderUnsupportedMedia",
          status: 400,
          message: `No valid series IDs found for provider ${this.config.name}. Missing media ID or episode ID based on provider's mediaIds preference.
						Provided media ID: ${id}, Provided episode ID: ${ep_id} 
 Media IDs should be based on provider's mediaIds preference: ${supportedMediaIdTypes.join(", ")}.`
        });
      }
      return {
        id,
        ep_id
      };
    }
  }
  /** Retrieves the primary language code from the provider's configuration */
  getPrimaryLanguage() {
    const languages = normalizeLanguages(this.config.language);
    return languages.length > 0 ? languages[0] : "en";
  }
  useTranslation(media) {
    if (media.type === "channel")
      return false;
    if (!media.original_language || !media.localizedTitles?.length)
      return false;
    const providerLanguages = normalizeLanguages(this.config.language);
    return !providerLanguages.includes(media.original_language.toLowerCase().split("-")[0]) && media.localizedTitles.length > 0;
  }
};

// node_modules/grabit-engine/dist/esm/src/index.node.js
import { default as default2 } from "iso-639-1";

// manifest.json
var manifest_default = {
  name: "providers",
  author: "",
  providers: {
    ip: {
      name: "Ipadress Checker",
      version: "1.0.0",
      active: true,
      language: "en",
      type: "media",
      env: "universal",
      supportedMediaTypes: ["movie", "serie", "channel"],
      priority: 100,
      dir: "providers/debug"
    },
    ekola405gmt: {
      name: "Ekola405gmt",
      version: "1.0.0",
      active: true,
      language: "en",
      type: "media",
      env: "universal",
      supportedMediaTypes: ["movie", "serie"],
      priority: 100,
      dir: "providers/media/multi"
    },
    autoembed: {
      name: "AutoEmbed",
      version: "1.0.0",
      active: true,
      language: ["en", "fr", "es"],
      type: "media",
      env: "universal",
      supportedMediaTypes: ["movie", "serie"],
      priority: 100,
      dir: "providers/media/multi"
    },
    "9filmyzilla": {
      name: "9filmyzilla",
      version: "1.0.0",
      active: true,
      language: ["en", "es"],
      type: "media",
      env: "universal",
      supportedMediaTypes: ["movie", "serie"],
      priority: 100,
      dir: "providers/media/en"
    },
    primewire: {
      name: "Primewire",
      version: "1.0.0",
      active: true,
      language: "en",
      type: "media",
      env: "universal",
      supportedMediaTypes: ["movie", "serie"],
      priority: 100,
      dir: "providers/media/en"
    },
    repelishd: {
      name: "Repelishd",
      version: "1.0.0",
      active: true,
      language: ["es", "en", "fr"],
      type: "media",
      env: "universal",
      supportedMediaTypes: ["movie", "serie"],
      priority: 100,
      dir: "providers/media/es"
    },
    lamovie: {
      name: "Lamovie",
      version: "1.0.0",
      active: true,
      language: "es",
      type: "media",
      env: "universal",
      supportedMediaTypes: ["movie", "serie"],
      priority: 100,
      dir: "providers/media/es"
    },
    wyziesubs: {
      name: "Wyziesubs",
      version: "1.0.0",
      active: true,
      language: "*",
      type: "media",
      env: "universal",
      supportedMediaTypes: ["movie", "serie"],
      priority: 100,
      dir: "providers/subtitle"
    }
  }
};

// providers/media/multi/autoembed/config.ts
var config = {
  scheme: "autoembed",
  name: "AutoEmbed",
  language: ["en", "fr", "es"],
  baseUrl: "https://test.autoembed.cc",
  entries: {
    movie: {
      endpoint: "embed/movie/{id:string}"
    },
    serie: {
      endpoint: "embed/tv/{id:string}/{season:1}/{episode:1}"
    }
  },
  mediaIds: ["tmdb", "imdb"],
  contentAreCORSProtected: false
};
var PROVIDER = Provider.create(config);

// providers/media/multi/autoembed/stream.ts
async function getStreams(requester, ctx) {
  const resourceURL = PROVIDER.createResourceURL(requester);
  ctx.log.debug(`Created resource URL: ${resourceURL}`);
  const pageRequestOpt = {
    ...requester,
    extraHeaders: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en;q=0.9,es;q=0.8",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=0, i",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
      Referer: resourceURL.origin + "/",
      cookie: createCookies()
    }
  };
  ctx.log.debug(`Page request options: ${JSON.stringify(pageRequestOpt)}`);
  const resultsPage = await ctx.cheerio.load(resourceURL, pageRequestOpt, ctx.xhr);
  const htmlTitle = resultsPage.$("head > title").text();
  const title = htmlTitle.split("(")[0]?.trim() ?? requester.media.title;
  const year = extractYearFromText(htmlTitle);
  ctx.log.info(`Extracted title: ${title}, year: ${year}`);
  const servers = siteServers().filter((s) => default2.getCode(s.language) === requester.targetLanguageISO).splice(0, 2);
  ctx.log.info(`Filtered servers based on media language (${requester.targetLanguageISO}): ${JSON.stringify(servers)}`);
  const results = [];
  const apiURL = new URL("api/server", resourceURL.origin);
  const apiOpts = {
    clean: true,
    attachUserAgent: true,
    method: "GET",
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9,es;q=0.8",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      cookie: pageRequestOpt.extraHeaders.cookie,
      Referer: resourceURL.origin + "/"
    }
  };
  for (const server of servers) {
    try {
      const params = new URLSearchParams({
        ...requester.media.type === "movie" ? {
          id: requester.media.tmdbId,
          sr: "2",
          // this is server index
          args: `${title}*${year}*${requester.media.imdbId}`
        } : {},
        ...requester.media.type === "serie" ? {
          id: requester.media.tmdbId,
          sr: "2",
          // this is server index
          args: `${title}*${year}*${requester.media.imdbId}`,
          ep: `${requester.media.season}`,
          ss: `${requester.media.episode}`
        } : {}
      });
      apiURL.search = params.toString();
      ctx.log.info(`API URL: ${apiURL.toString()}`);
      const apiResponse = await ctx.xhr.fetchResponse(apiURL, apiOpts, requester);
      ctx.log.debug(`API Response: ${JSON.stringify(apiResponse)}`);
      const decryptedData = await decryptData(apiResponse.data);
      ctx.log.debug(`Decrypted API data: ${JSON.stringify(decryptedData)}`);
      results.push({
        fileName: `${server.name} Server - ${title} (${year})`,
        playlist: decryptedData.url,
        language: default2.getCode(server.language) ?? "en",
        xhr: {
          // I have notice that cf url is not cors blocked
          haveCorsPolicy: false,
          headers: decryptedData.headers
        }
      });
    } catch (error) {
      ctx.log.error(`Error processing server ${server.name}: ${error.message}`);
    }
  }
  return results;
}
function siteServers() {
  const server = [
    {
      flag: "US",
      name: "Crown",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "VN",
      name: "Viet",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "US",
      name: "Wink",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "AU",
      name: "Orion",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "US",
      name: "Cine",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "US",
      name: "Beta",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "US",
      name: "Nexon",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "GB",
      name: "Gork",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "US",
      name: "Vox",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "US",
      name: "Minecloud",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "US",
      name: "Joker",
      audioLanguage: "English audio",
      language: "English"
    },
    {
      flag: "GB",
      name: "Leo",
      audioLanguage: "Original audio",
      language: "English"
    },
    {
      flag: "4K",
      name: "4K",
      audioLanguage: "Original audio",
      language: "English"
    },
    {
      flag: "IN",
      name: "Hindi",
      audioLanguage: "Hindi audio",
      language: "Hindi"
    },
    {
      flag: "IN",
      name: "Indus",
      audioLanguage: "Hindi audio",
      language: "Hindi"
    },
    {
      flag: "IN",
      name: "Delta",
      audioLanguage: "Bengali audio",
      language: "Bengali"
    },
    {
      flag: "IN",
      name: "Ben",
      audioLanguage: "Bengali audio",
      language: "Bengali"
    },
    {
      flag: "IN",
      name: "Pearl",
      audioLanguage: "Tamil audio",
      language: "Tamil"
    },
    {
      flag: "IN",
      name: "Tamil",
      audioLanguage: "Tamil audio",
      language: "Tamil"
    },
    {
      flag: "IN",
      name: "Ruby",
      audioLanguage: "Telugu audio",
      language: "Telugu"
    },
    {
      flag: "IN",
      name: "Tel",
      audioLanguage: "Telugu audio",
      language: "Telugu"
    },
    {
      flag: "IN",
      name: "Mal",
      audioLanguage: "Malayalam audio",
      language: "Malayalam"
    },
    {
      flag: "IN",
      name: "Kan",
      audioLanguage: "Kannada audio",
      language: "Kannada"
    },
    {
      flag: "FR",
      name: "Lava",
      audioLanguage: "French audio",
      language: "French"
    }
  ];
  return server.map((s, index) => ({ ...s, id: index + 1 }));
}
function createCookies() {
  return createCookiesFromSet({
    setCookie: [
      "cf_clearance=iTDt9G3tSANGCfJMRHzEz_MlFJZwOAq6iKVF3AR8CdA-1772285363-1.2.1.1-v_FD2wJTlmh6SUOH58FG4j62K29B.t7I47whnCvkoyDmfrWowHE39ThbdvGJRpjtbsQ5LfkGoSMwVbaFLrvaCVoSAL_Kchr8WPqHFV56qJxu3YGjRc8ozYOu7XAq0AHGXNUCtzUGzsgjrKv_cwV3qxQEXfvisjaNQBKzQcchbMu6hSsnKRUToLr55XW9CHmNu_p9qeW96rGClMDKkLps8tu9FF2qM2L9aFN6CfgqLCs"
    ]
  });
}
async function decryptData(data) {
  const vAtob = atob(data);
  const p250 = JSON.parse(vAtob);
  const salt = Buffer.from(p250.salt, "hex");
  const iv = Buffer.from(p250.iv, "hex");
  const encrypted = Buffer.from(p250.encryptedData, "base64");
  const key = Crypto.pbkdf2Sync(
    p250.key,
    salt,
    p250.iterations,
    32,
    // 256-bit key = 32 bytes
    "sha256"
  );
  const decipher = Crypto.createDecipheriv("aes-256-cbc", key, iv);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(encrypted, void 0, "utf8");
  decrypted += decipher.final("utf8");
  if (!decrypted) {
    throw new ProcessError({
      code: "DECRYPTION_FAILED",
      message: "Failed to decrypt data from provider",
      details: { data }
    });
  }
  return JSON.parse(decrypted);
}

// providers/media/multi/autoembed/index.ts
var index_default = defineProviderModule(PROVIDER, manifest_default.providers["autoembed"], {
  getStreams
});
export {
  index_default as default
};
