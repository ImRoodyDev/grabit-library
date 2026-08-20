// ╔══════════════════════════════════════════════════════════════╗
// ║  AUTO-GENERATED — Do not edit manually                      ║
// ║  Provider: vega                                            ║
// ║  Bundled with esbuild — npx bundle-provider                 ║
// ╚══════════════════════════════════════════════════════════════╝

"use strict";

function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(t, e) { if (e && ("object" == typeof e || "function" == typeof e)) return e; if (void 0 !== e) throw new TypeError("Derived constructors may only return object or undefined"); return _assertThisInitialized(t); }
function _assertThisInitialized(e) { if (void 0 === e) throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); return e; }
function _inherits(t, e) { if ("function" != typeof e && null !== e) throw new TypeError("Super expression must either be null or a function"); t.prototype = Object.create(e && e.prototype, { constructor: { value: t, writable: !0, configurable: !0 } }), Object.defineProperty(t, "prototype", { writable: !1 }), e && _setPrototypeOf(t, e); }
function _wrapNativeSuper(t) { var r = "function" == typeof Map ? new Map() : void 0; return _wrapNativeSuper = function (t) { if (null === t || !_isNativeFunction(t)) return t; if ("function" != typeof t) throw new TypeError("Super expression must either be null or a function"); if (void 0 !== r) { if (r.has(t)) return r.get(t); r.set(t, Wrapper); } function Wrapper() { return _construct(t, arguments, _getPrototypeOf(this).constructor); } return Wrapper.prototype = Object.create(t.prototype, { constructor: { value: Wrapper, enumerable: !1, writable: !0, configurable: !0 } }), _setPrototypeOf(Wrapper, t); }, _wrapNativeSuper(t); }
function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function () { return !!t; })(); }
function _isNativeFunction(t) { try { return -1 !== Function.toString.call(t).indexOf("[native code]"); } catch (n) { return "function" == typeof t; } }
function _setPrototypeOf(t, e) { return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function (t, e) { return t.__proto__ = e, t; }, _setPrototypeOf(t, e); }
function _getPrototypeOf(t) { return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function (t) { return t.__proto__ || Object.getPrototypeOf(t); }, _getPrototypeOf(t); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = {
    exports: {}
  }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all) __defProp(target, name, {
    get: all[name],
    enumerable: true
  });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
      get: () => from[key],
      enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
    });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
// If the importer is in node compatibility mode or this is not an ESM
// file that has been converted to a CommonJS file using a Babel-
// compatible transform (i.e. "__esModule" has not been set), then set
// "default" to the CommonJS "module.exports" for node compatibility.
isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
  value: mod,
  enumerable: true
}) : target, mod));
var __toCommonJS = mod => __copyProps(__defProp({}, "__esModule", {
  value: true
}), mod);

// node_modules/iso-639-1/src/data.js
var require_data = __commonJS({
  "node_modules/iso-639-1/src/data.js"(exports2, module2) {
    var LANGUAGES_LIST = {
      aa: {
        name: "Afar",
        nativeName: "Afaraf"
      },
      ab: {
        name: "Abkhaz",
        nativeName: "\u0430\u04A7\u0441\u0443\u0430 \u0431\u044B\u0437\u0448\u04D9\u0430"
      },
      ae: {
        name: "Avestan",
        nativeName: "avesta"
      },
      af: {
        name: "Afrikaans",
        nativeName: "Afrikaans"
      },
      ak: {
        name: "Akan",
        nativeName: "Akan"
      },
      am: {
        name: "Amharic",
        nativeName: "\u12A0\u121B\u122D\u129B"
      },
      an: {
        name: "Aragonese",
        nativeName: "aragon\xE9s"
      },
      ar: {
        name: "Arabic",
        nativeName: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629"
      },
      as: {
        name: "Assamese",
        nativeName: "\u0985\u09B8\u09AE\u09C0\u09AF\u09BC\u09BE"
      },
      av: {
        name: "Avaric",
        nativeName: "\u0430\u0432\u0430\u0440 \u043C\u0430\u0446\u04C0"
      },
      ay: {
        name: "Aymara",
        nativeName: "aymar aru"
      },
      az: {
        name: "Azerbaijani",
        nativeName: "az\u0259rbaycan dili"
      },
      ba: {
        name: "Bashkir",
        nativeName: "\u0431\u0430\u0448\u04A1\u043E\u0440\u0442 \u0442\u0435\u043B\u0435"
      },
      be: {
        name: "Belarusian",
        nativeName: "\u0431\u0435\u043B\u0430\u0440\u0443\u0441\u043A\u0430\u044F \u043C\u043E\u0432\u0430"
      },
      bg: {
        name: "Bulgarian",
        nativeName: "\u0431\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438 \u0435\u0437\u0438\u043A"
      },
      bi: {
        name: "Bislama",
        nativeName: "Bislama"
      },
      bm: {
        name: "Bambara",
        nativeName: "bamanankan"
      },
      bn: {
        name: "Bengali",
        nativeName: "\u09AC\u09BE\u0982\u09B2\u09BE"
      },
      bo: {
        name: "Tibetan",
        nativeName: "\u0F56\u0F7C\u0F51\u0F0B\u0F61\u0F72\u0F42"
      },
      br: {
        name: "Breton",
        nativeName: "brezhoneg"
      },
      bs: {
        name: "Bosnian",
        nativeName: "bosanski jezik"
      },
      ca: {
        name: "Catalan",
        nativeName: "Catal\xE0"
      },
      ce: {
        name: "Chechen",
        nativeName: "\u043D\u043E\u0445\u0447\u0438\u0439\u043D \u043C\u043E\u0442\u0442"
      },
      ch: {
        name: "Chamorro",
        nativeName: "Chamoru"
      },
      co: {
        name: "Corsican",
        nativeName: "corsu"
      },
      cr: {
        name: "Cree",
        nativeName: "\u14C0\u1426\u1403\u152D\u140D\u140F\u1423"
      },
      cs: {
        name: "Czech",
        nativeName: "\u010Ce\u0161tina"
      },
      cu: {
        name: "Old Church Slavonic",
        nativeName: "\u0469\u0437\u044B\u043A\u044A \u0441\u043B\u043E\u0432\u0463\u043D\u044C\u0441\u043A\u044A"
      },
      cv: {
        name: "Chuvash",
        nativeName: "\u0447\u04D1\u0432\u0430\u0448 \u0447\u04D7\u043B\u0445\u0438"
      },
      cy: {
        name: "Welsh",
        nativeName: "Cymraeg"
      },
      da: {
        name: "Danish",
        nativeName: "Dansk"
      },
      de: {
        name: "German",
        nativeName: "Deutsch"
      },
      dv: {
        name: "Divehi",
        nativeName: "\u078B\u07A8\u0788\u07AC\u0780\u07A8"
      },
      dz: {
        name: "Dzongkha",
        nativeName: "\u0F62\u0FAB\u0F7C\u0F44\u0F0B\u0F41"
      },
      ee: {
        name: "Ewe",
        nativeName: "E\u028Begbe"
      },
      el: {
        name: "Greek",
        nativeName: "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC"
      },
      en: {
        name: "English",
        nativeName: "English"
      },
      eo: {
        name: "Esperanto",
        nativeName: "Esperanto"
      },
      es: {
        name: "Spanish",
        nativeName: "Espa\xF1ol"
      },
      et: {
        name: "Estonian",
        nativeName: "eesti"
      },
      eu: {
        name: "Basque",
        nativeName: "euskara"
      },
      fa: {
        name: "Persian",
        nativeName: "\u0641\u0627\u0631\u0633\u06CC"
      },
      ff: {
        name: "Fula",
        nativeName: "Fulfulde"
      },
      fi: {
        name: "Finnish",
        nativeName: "suomi"
      },
      fj: {
        name: "Fijian",
        nativeName: "vosa Vakaviti"
      },
      fo: {
        name: "Faroese",
        nativeName: "F\xF8royskt"
      },
      fr: {
        name: "French",
        nativeName: "Fran\xE7ais"
      },
      fy: {
        name: "Western Frisian",
        nativeName: "Frysk"
      },
      ga: {
        name: "Irish",
        nativeName: "Gaeilge"
      },
      gd: {
        name: "Scottish Gaelic",
        nativeName: "G\xE0idhlig"
      },
      gl: {
        name: "Galician",
        nativeName: "galego"
      },
      gn: {
        name: "Guaran\xED",
        nativeName: "Ava\xF1e'\u1EBD"
      },
      gu: {
        name: "Gujarati",
        nativeName: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0"
      },
      gv: {
        name: "Manx",
        nativeName: "Gaelg"
      },
      ha: {
        name: "Hausa",
        nativeName: "\u0647\u064E\u0648\u064F\u0633\u064E"
      },
      he: {
        name: "Hebrew",
        nativeName: "\u05E2\u05D1\u05E8\u05D9\u05EA"
      },
      hi: {
        name: "Hindi",
        nativeName: "\u0939\u093F\u0928\u094D\u0926\u0940"
      },
      ho: {
        name: "Hiri Motu",
        nativeName: "Hiri Motu"
      },
      hr: {
        name: "Croatian",
        nativeName: "Hrvatski"
      },
      ht: {
        name: "Haitian",
        nativeName: "Krey\xF2l ayisyen"
      },
      hu: {
        name: "Hungarian",
        nativeName: "magyar"
      },
      hy: {
        name: "Armenian",
        nativeName: "\u0540\u0561\u0575\u0565\u0580\u0565\u0576"
      },
      hz: {
        name: "Herero",
        nativeName: "Otjiherero"
      },
      ia: {
        name: "Interlingua",
        nativeName: "Interlingua"
      },
      id: {
        name: "Indonesian",
        nativeName: "Bahasa Indonesia"
      },
      ie: {
        name: "Interlingue",
        nativeName: "Interlingue"
      },
      ig: {
        name: "Igbo",
        nativeName: "As\u1EE5s\u1EE5 Igbo"
      },
      ii: {
        name: "Nuosu",
        nativeName: "\uA188\uA320\uA4BF Nuosuhxop"
      },
      ik: {
        name: "Inupiaq",
        nativeName: "I\xF1upiaq"
      },
      io: {
        name: "Ido",
        nativeName: "Ido"
      },
      is: {
        name: "Icelandic",
        nativeName: "\xCDslenska"
      },
      it: {
        name: "Italian",
        nativeName: "Italiano"
      },
      iu: {
        name: "Inuktitut",
        nativeName: "\u1403\u14C4\u1483\u144E\u1450\u1466"
      },
      ja: {
        name: "Japanese",
        nativeName: "\u65E5\u672C\u8A9E"
      },
      jv: {
        name: "Javanese",
        nativeName: "basa Jawa"
      },
      ka: {
        name: "Georgian",
        nativeName: "\u10E5\u10D0\u10E0\u10D7\u10E3\u10DA\u10D8"
      },
      kg: {
        name: "Kongo",
        nativeName: "Kikongo"
      },
      ki: {
        name: "Kikuyu",
        nativeName: "G\u0129k\u0169y\u0169"
      },
      kj: {
        name: "Kwanyama",
        nativeName: "Kuanyama"
      },
      kk: {
        name: "Kazakh",
        nativeName: "\u049B\u0430\u0437\u0430\u049B \u0442\u0456\u043B\u0456"
      },
      kl: {
        name: "Kalaallisut",
        nativeName: "kalaallisut"
      },
      km: {
        name: "Khmer",
        nativeName: "\u1781\u17C1\u1798\u179A\u1797\u17B6\u179F\u17B6"
      },
      kn: {
        name: "Kannada",
        nativeName: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1"
      },
      ko: {
        name: "Korean",
        nativeName: "\uD55C\uAD6D\uC5B4"
      },
      kr: {
        name: "Kanuri",
        nativeName: "Kanuri"
      },
      ks: {
        name: "Kashmiri",
        nativeName: "\u0915\u0936\u094D\u092E\u0940\u0930\u0940"
      },
      ku: {
        name: "Kurdish",
        nativeName: "Kurd\xEE"
      },
      kv: {
        name: "Komi",
        nativeName: "\u043A\u043E\u043C\u0438 \u043A\u044B\u0432"
      },
      kw: {
        name: "Cornish",
        nativeName: "Kernewek"
      },
      ky: {
        name: "Kyrgyz",
        nativeName: "\u041A\u044B\u0440\u0433\u044B\u0437\u0447\u0430"
      },
      la: {
        name: "Latin",
        nativeName: "latine"
      },
      lb: {
        name: "Luxembourgish",
        nativeName: "L\xEBtzebuergesch"
      },
      lg: {
        name: "Ganda",
        nativeName: "Luganda"
      },
      li: {
        name: "Limburgish",
        nativeName: "Limburgs"
      },
      ln: {
        name: "Lingala",
        nativeName: "Ling\xE1la"
      },
      lo: {
        name: "Lao",
        nativeName: "\u0E9E\u0EB2\u0EAA\u0EB2\u0EA5\u0EB2\u0EA7"
      },
      lt: {
        name: "Lithuanian",
        nativeName: "lietuvi\u0173 kalba"
      },
      lu: {
        name: "Luba-Katanga",
        nativeName: "Kiluba"
      },
      lv: {
        name: "Latvian",
        nativeName: "latvie\u0161u valoda"
      },
      mg: {
        name: "Malagasy",
        nativeName: "fiteny malagasy"
      },
      mh: {
        name: "Marshallese",
        nativeName: "Kajin M\u0327aje\u013C"
      },
      mi: {
        name: "M\u0101ori",
        nativeName: "te reo M\u0101ori"
      },
      mk: {
        name: "Macedonian",
        nativeName: "\u043C\u0430\u043A\u0435\u0434\u043E\u043D\u0441\u043A\u0438 \u0458\u0430\u0437\u0438\u043A"
      },
      ml: {
        name: "Malayalam",
        nativeName: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02"
      },
      mn: {
        name: "Mongolian",
        nativeName: "\u041C\u043E\u043D\u0433\u043E\u043B \u0445\u044D\u043B"
      },
      mr: {
        name: "Marathi",
        nativeName: "\u092E\u0930\u093E\u0920\u0940"
      },
      ms: {
        name: "Malay",
        nativeName: "Bahasa Melayu"
      },
      mt: {
        name: "Maltese",
        nativeName: "Malti"
      },
      my: {
        name: "Burmese",
        nativeName: "\u1017\u1019\u102C\u1005\u102C"
      },
      na: {
        name: "Nauru",
        nativeName: "Dorerin Naoero"
      },
      nb: {
        name: "Norwegian Bokm\xE5l",
        nativeName: "Norsk bokm\xE5l"
      },
      nd: {
        name: "Northern Ndebele",
        nativeName: "isiNdebele"
      },
      ne: {
        name: "Nepali",
        nativeName: "\u0928\u0947\u092A\u093E\u0932\u0940"
      },
      ng: {
        name: "Ndonga",
        nativeName: "Owambo"
      },
      nl: {
        name: "Dutch",
        nativeName: "Nederlands"
      },
      nn: {
        name: "Norwegian Nynorsk",
        nativeName: "Norsk nynorsk"
      },
      no: {
        name: "Norwegian",
        nativeName: "Norsk"
      },
      nr: {
        name: "Southern Ndebele",
        nativeName: "isiNdebele"
      },
      nv: {
        name: "Navajo",
        nativeName: "Din\xE9 bizaad"
      },
      ny: {
        name: "Chichewa",
        nativeName: "chiChe\u0175a"
      },
      oc: {
        name: "Occitan",
        nativeName: "occitan"
      },
      oj: {
        name: "Ojibwe",
        nativeName: "\u140A\u14C2\u1511\u14C8\u142F\u14A7\u140E\u14D0"
      },
      om: {
        name: "Oromo",
        nativeName: "Afaan Oromoo"
      },
      or: {
        name: "Oriya",
        nativeName: "\u0B13\u0B21\u0B3C\u0B3F\u0B06"
      },
      os: {
        name: "Ossetian",
        nativeName: "\u0438\u0440\u043E\u043D \xE6\u0432\u0437\u0430\u0433"
      },
      pa: {
        name: "Panjabi",
        nativeName: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40"
      },
      pi: {
        name: "P\u0101li",
        nativeName: "\u092A\u093E\u0934\u093F"
      },
      pl: {
        name: "Polish",
        nativeName: "Polski"
      },
      ps: {
        name: "Pashto",
        nativeName: "\u067E\u069A\u062A\u0648"
      },
      pt: {
        name: "Portuguese",
        nativeName: "Portugu\xEAs"
      },
      qu: {
        name: "Quechua",
        nativeName: "Runa Simi"
      },
      rm: {
        name: "Romansh",
        nativeName: "rumantsch grischun"
      },
      rn: {
        name: "Kirundi",
        nativeName: "Ikirundi"
      },
      ro: {
        name: "Romanian",
        nativeName: "Rom\xE2n\u0103"
      },
      ru: {
        name: "Russian",
        nativeName: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439"
      },
      rw: {
        name: "Kinyarwanda",
        nativeName: "Ikinyarwanda"
      },
      sa: {
        name: "Sanskrit",
        nativeName: "\u0938\u0902\u0938\u094D\u0915\u0943\u0924\u092E\u094D"
      },
      sc: {
        name: "Sardinian",
        nativeName: "sardu"
      },
      sd: {
        name: "Sindhi",
        nativeName: "\u0938\u093F\u0928\u094D\u0927\u0940"
      },
      se: {
        name: "Northern Sami",
        nativeName: "Davvis\xE1megiella"
      },
      sg: {
        name: "Sango",
        nativeName: "y\xE2ng\xE2 t\xEE s\xE4ng\xF6"
      },
      si: {
        name: "Sinhala",
        nativeName: "\u0DC3\u0DD2\u0D82\u0DC4\u0DBD"
      },
      sk: {
        name: "Slovak",
        nativeName: "Sloven\u010Dina"
      },
      sl: {
        name: "Slovenian",
        nativeName: "sloven\u0161\u010Dina"
      },
      sm: {
        name: "Samoan",
        nativeName: "gagana fa'a Samoa"
      },
      sn: {
        name: "Shona",
        nativeName: "chiShona"
      },
      so: {
        name: "Somali",
        nativeName: "Soomaaliga"
      },
      sq: {
        name: "Albanian",
        nativeName: "Shqip"
      },
      sr: {
        name: "Serbian",
        nativeName: "\u0441\u0440\u043F\u0441\u043A\u0438 \u0458\u0435\u0437\u0438\u043A"
      },
      ss: {
        name: "Swati",
        nativeName: "SiSwati"
      },
      st: {
        name: "Southern Sotho",
        nativeName: "Sesotho"
      },
      su: {
        name: "Sundanese",
        nativeName: "Basa Sunda"
      },
      sv: {
        name: "Swedish",
        nativeName: "Svenska"
      },
      sw: {
        name: "Swahili",
        nativeName: "Kiswahili"
      },
      ta: {
        name: "Tamil",
        nativeName: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD"
      },
      te: {
        name: "Telugu",
        nativeName: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41"
      },
      tg: {
        name: "Tajik",
        nativeName: "\u0442\u043E\u04B7\u0438\u043A\u04E3"
      },
      th: {
        name: "Thai",
        nativeName: "\u0E44\u0E17\u0E22"
      },
      ti: {
        name: "Tigrinya",
        nativeName: "\u1275\u130D\u122D\u129B"
      },
      tk: {
        name: "Turkmen",
        nativeName: "T\xFCrkmen\xE7e"
      },
      tl: {
        name: "Tagalog",
        nativeName: "Wikang Tagalog"
      },
      tn: {
        name: "Tswana",
        nativeName: "Setswana"
      },
      to: {
        name: "Tonga",
        nativeName: "faka Tonga"
      },
      tr: {
        name: "Turkish",
        nativeName: "T\xFCrk\xE7e"
      },
      ts: {
        name: "Tsonga",
        nativeName: "Xitsonga"
      },
      tt: {
        name: "Tatar",
        nativeName: "\u0442\u0430\u0442\u0430\u0440 \u0442\u0435\u043B\u0435"
      },
      tw: {
        name: "Twi",
        nativeName: "Twi"
      },
      ty: {
        name: "Tahitian",
        nativeName: "Reo Tahiti"
      },
      ug: {
        name: "Uyghur",
        nativeName: "\u0626\u06C7\u064A\u063A\u06C7\u0631\u0686\u06D5\u200E"
      },
      uk: {
        name: "Ukrainian",
        nativeName: "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430"
      },
      ur: {
        name: "Urdu",
        nativeName: "\u0627\u0631\u062F\u0648"
      },
      uz: {
        name: "Uzbek",
        nativeName: "\u040E\u0437\u0431\u0435\u043A"
      },
      ve: {
        name: "Venda",
        nativeName: "Tshiven\u1E13a"
      },
      vi: {
        name: "Vietnamese",
        nativeName: "Ti\u1EBFng Vi\u1EC7t"
      },
      vo: {
        name: "Volap\xFCk",
        nativeName: "Volap\xFCk"
      },
      wa: {
        name: "Walloon",
        nativeName: "walon"
      },
      wo: {
        name: "Wolof",
        nativeName: "Wollof"
      },
      xh: {
        name: "Xhosa",
        nativeName: "isiXhosa"
      },
      yi: {
        name: "Yiddish",
        nativeName: "\u05D9\u05D9\u05B4\u05D3\u05D9\u05E9"
      },
      yo: {
        name: "Yoruba",
        nativeName: "Yor\xF9b\xE1"
      },
      za: {
        name: "Zhuang",
        nativeName: "Sa\u026F cue\u014B\u0185"
      },
      zh: {
        name: "Chinese",
        nativeName: "\u4E2D\u6587"
      },
      zu: {
        name: "Zulu",
        nativeName: "isiZulu"
      }
    };
    module2.exports = LANGUAGES_LIST;
  }
});

// node_modules/iso-639-1/src/index.js
var require_src = __commonJS({
  "node_modules/iso-639-1/src/index.js"(exports2, module2) {
    var LANGUAGES_LIST = require_data();
    var LANGUAGES = {};
    var LANGUAGES_BY_NAME = {};
    var LANGUAGE_CODES = [];
    var LANGUAGE_NAMES = [];
    var LANGUAGE_NATIVE_NAMES = [];
    for (const code in LANGUAGES_LIST) {
      const {
        name,
        nativeName
      } = LANGUAGES_LIST[code];
      LANGUAGES[code] = LANGUAGES_BY_NAME[name.toLowerCase()] = LANGUAGES_BY_NAME[nativeName.toLowerCase()] = {
        code,
        name,
        nativeName
      };
      LANGUAGE_CODES.push(code);
      LANGUAGE_NAMES.push(name);
      LANGUAGE_NATIVE_NAMES.push(nativeName);
    }
    module2.exports = /*#__PURE__*/function () {
      function ISO63912() {
        _classCallCheck(this, ISO63912);
      }
      return _createClass(ISO63912, null, [{
        key: "getLanguages",
        value: function getLanguages(codes = []) {
          return codes.map(code => ISO63912.validate(code) ? Object.assign({}, LANGUAGES[code]) : {
            code,
            name: "",
            nativeName: ""
          });
        }
      }, {
        key: "getName",
        value: function getName(code) {
          return ISO63912.validate(code) ? LANGUAGES_LIST[code].name : "";
        }
      }, {
        key: "getAllNames",
        value: function getAllNames() {
          return LANGUAGE_NAMES.slice();
        }
      }, {
        key: "getNativeName",
        value: function getNativeName(code) {
          return ISO63912.validate(code) ? LANGUAGES_LIST[code].nativeName : "";
        }
      }, {
        key: "getAllNativeNames",
        value: function getAllNativeNames() {
          return LANGUAGE_NATIVE_NAMES.slice();
        }
      }, {
        key: "getCode",
        value: function getCode(name) {
          name = name.toLowerCase();
          return LANGUAGES_BY_NAME.hasOwnProperty(name) ? LANGUAGES_BY_NAME[name].code : "";
        }
      }, {
        key: "getAllCodes",
        value: function getAllCodes() {
          return LANGUAGE_CODES.slice();
        }
      }, {
        key: "validate",
        value: function validate(code) {
          return LANGUAGES_LIST.hasOwnProperty(code);
        }
      }]);
    }();
  }
});

// providers/media/multi/vega/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

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

// node_modules/grabit-engine/dist/esm/src/controllers/provider.js
var import_iso_639_1 = __toESM(require_src(), 1);

// node_modules/grabit-engine/dist/esm/src/utils/internal.js
function sortByTargetLanguage(sources, targetLanguageISO) {
  const matches = [];
  const rest = [];
  for (const source of sources) {
    if (source.language === targetLanguageISO) matches.push(source);else rest.push(source);
  }
  return [...matches, ...rest];
}
var sanitizeMessage = value => value.replace(/\\"/g, '"').replace(/"/g, "").replace(/\s+/g, " ").trim();

// node_modules/grabit-engine/dist/esm/src/utils/env.js
var isDevelopment = () => {
  if (typeof process !== "undefined") {
    return (process.env?.NODE_ENV ?? process.env?.ENV) !== "production";
  }
  return false;
};

// node_modules/grabit-engine/dist/esm/src/types/ProcessError.js
var ProcessError = /*#__PURE__*/function (_Error) {
  /**
   * Creates a new ProcessError instance
   * @param payload - Error configuration object containing all error properties
   */
  function _ProcessError(payload) {
    var _this2;
    _classCallCheck(this, _ProcessError);
    _this2 = _callSuper(this, _ProcessError, [sanitizeMessage(payload.message)]);
    /** Unique error code identifier (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
    _defineProperty(_this2, "code", void 0);
    /** Additional error details with type safety via generics */
    _defineProperty(_this2, "details", void 0);
    /** Whether to expose error details to the client (use false for sensitive errors) */
    _defineProperty(_this2, "expose", void 0);
    /** Optional HTTP status code associated with the error (e.g., 400, 500) */
    _defineProperty(_this2, "status", void 0);
    _this2.name = "ProcessError";
    _this2.code = payload.code;
    _this2.details = payload.details;
    _this2.expose = payload.expose ?? isDevelopment();
    _this2.status = payload.status;
    Error.captureStackTrace?.(_this2, _ProcessError);
    return _this2;
  }
  _inherits(_ProcessError, _Error);
  return _createClass(_ProcessError);
}(/*#__PURE__*/_wrapNativeSuper(Error));
var isProcessError = error => error instanceof ProcessError;

// node_modules/grabit-engine/dist/esm/src/utils/logger.js
var DebugLogger = /*#__PURE__*/function () {
  /**
   * Create a new Logger instance bound to a context label.
   * @param debug When true, enables console output for non-error levels
   * @param context A short label to include with each log message
   */
  function DebugLogger(debug, context) {
    _classCallCheck(this, DebugLogger);
    _defineProperty(this, "isProduction", false);
    _defineProperty(this, "timestamp", false);
    _defineProperty(this, "jumpLine", false);
    _defineProperty(this, "context", "LOGGER");
    this.isProduction = !debug;
    this.context = context;
  }
  /**
   * Toggle debugging (non-production) mode at runtime.
   * @param enable `true` to enable debug logs; `false` to silence them
   */
  return _createClass(DebugLogger, [{
    key: "enableDebugging",
    value: function enableDebugging(enable) {
      this.isProduction = !enable;
    }
  }, {
    key: "setTimestamp",
    value: function setTimestamp(enabled) {
      this.timestamp = enabled;
    }
  }, {
    key: "setJumpLine",
    value: function setJumpLine(enabled) {
      this.jumpLine = enabled;
    }
  }, {
    key: "getTimestamp",
    value: function getTimestamp() {
      const now = /* @__PURE__ */new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      const ms = String(now.getMilliseconds()).padStart(3, "0");
      return `${hh}:${mm}:${ss}:${ms}`;
    }
  }, {
    key: "format",
    value: function format(level, message) {
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
  }, {
    key: "info",
    value: function info(message, ...optionalParams) {
      if (!this.isProduction) {
        console.log(this.format("info", message), ...optionalParams);
      }
    }
    /**
     * Log a warning message when debugging is enabled.
     */
  }, {
    key: "warn",
    value: function warn(message, ...optionalParams) {
      if (!this.isProduction) {
        console.warn(this.format("warn", message), ...optionalParams);
      }
    }
    /**
     * Always log a warning message, even in production mode.
     * Use for validation / configuration issues that should never be silenced.
     */
  }, {
    key: "alwaysWarn",
    value: function alwaysWarn(message, ...optionalParams) {
      console.warn(this.format("warn", message), ...optionalParams);
    }
    /**
     * Log an error message when debugging is enabled.
     *
     * Every `error()` call site in this package reports a condition that is already
     * handled — a provider that could not be reached is skipped, its metrics recorded,
     * and the scrape continues. Printing those unconditionally meant `debug: false`
     * still filled a consumer's console with routine scraping noise. Failures remain
     * observable through `getMetricsReport()`, thrown `ProcessError`s, and the `error`
     * returned by the hooks. Use {@link alwaysWarn} for problems that must never be
     * silenced, such as a misconfigured provider.
     */
  }, {
    key: "error",
    value: function error(message, ...optionalParams) {
      if (!this.isProduction) {
        console.error(this.format("error", message), ...optionalParams);
      }
    }
    /**
     * Log a debug message when debugging is enabled.
     */
  }, {
    key: "debug",
    value: function debug(message, ...optionalParams) {
      if (!this.isProduction) {
        console.debug(this.format("debug", message), ...optionalParams);
      }
    }
  }, {
    key: "getColor",
    value: function getColor(level) {
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
  }]);
}();
var _Logger = new DebugLogger((process.env?.NODE_ENV ?? process.env?.ENV) !== "production", "GRABIT-ENGINE");

// node_modules/grabit-engine/dist/esm/src/utils/standard.js
function normalizeHeaders(headers) {
  const seen = /* @__PURE__ */new Map();
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    const canonical = seen.get(lower);
    if (value === void 0) {
      if (canonical !== void 0) delete result[canonical];else seen.set(lower, key);
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
function deduplicateArray(array) {
  return Array.from(new Set(array));
}

// node_modules/grabit-engine/dist/esm/src/types/models/Provider.js
var EProviderQueryKey;
(function (EProviderQueryKey2) {
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

// node_modules/grabit-engine/dist/esm/src/utils/validator.js
function validateManifestConfiguration(provider, manifest) {
  const config2 = provider.config;
  const label = `${manifest.name || config2.name || "unknown-provider"} (${config2.scheme || "unknown-scheme"})`;
  const prefix = `[${label}]`;
  if (config2.name !== manifest.name) {
    _Logger.alwaysWarn(`${prefix} Provider config name "${config2.name}" does not match manifest name "${manifest.name}".`);
  }
  const configLangs = Array.isArray(config2.language) ? config2.language : [config2.language];
  const manifestLangs = Array.isArray(manifest.language) ? manifest.language : [manifest.language];
  const missingInManifest = configLangs.filter(lang => !manifestLangs.includes(lang));
  const missingInConfig = manifestLangs.filter(lang => !configLangs.includes(lang));
  if (missingInManifest.length > 0) {
    _Logger.alwaysWarn(`${prefix} Languages in config but missing in manifest: [${missingInManifest.join(", ")}]`);
  }
  if (missingInConfig.length > 0) {
    _Logger.alwaysWarn(`${prefix} Languages in manifest but missing in config: [${missingInConfig.join(", ")}]`);
  }
  if (missingInManifest.length === 0 && missingInConfig.length === 0 && configLangs.join(",") !== manifestLangs.join(",")) {
    _Logger.alwaysWarn(`${prefix} Language order mismatch \u2014 config: [${configLangs.join(", ")}], manifest: [${manifestLangs.join(", ")}]`);
  }
  const configEntryKeys = [...new Set(Object.keys(config2.entries).map(k => k.replace(/^search_/, "")))].sort();
  const manifestMediaTypes = [...manifest.supportedMediaTypes].sort();
  if (configEntryKeys.length !== manifestMediaTypes.length || !configEntryKeys.every((key, i) => key === manifestMediaTypes[i])) {
    _Logger.alwaysWarn(`${prefix} Provider config entry types [${configEntryKeys}] do not match manifest supportedMediaTypes [${manifestMediaTypes}].`);
  }
}

// node_modules/grabit-engine/dist/esm/src/controllers/provider.js
function describeProviderWorkerError(workerName, manifest, error) {
  const base = `Provider ${manifest.name} ${workerName} failed`;
  if (isProcessError(error)) {
    const details = typeof error.details === "string" ? error.details : void 0;
    return {
      summary: `${base} [${error.code}]: ${error.message}`,
      details
    };
  }
  if (error instanceof Error) {
    return {
      summary: `${base}: ${error.message}`,
      details: error.stack
    };
  }
  return {
    summary: `${base}: ${String(error)}`,
    details: void 0
  };
}
function defineProviderModule(_this, manifest, workers) {
  return {
    meta: manifest,
    provider: _this,
    workers: createModuleWorkers(_this, manifest, workers)
  };
}
function augmentMediaSource(source, manifest, provider, userAgent) {
  const format = source.format ?? (typeof source.playlist === "string" ? extractExtension(source.playlist) ?? "m3u8" : "m3u8");
  return {
    ...source,
    xhr: {
      ...source.xhr,
      headers: normalizeHeaders({
        ...source.xhr?.headers,
        "User-Agent": userAgent
      })
    },
    format,
    fileName: `[${manifest.name}][${format.toUpperCase()}] - ${import_iso_639_1.default.getName(source.language)} - ${source.fileName ?? "Source"} `,
    providerName: manifest.name,
    scheme: provider.config.scheme
  };
}
function createModuleWorkers(provider, manifest, workers) {
  validateManifestConfiguration(provider, manifest);
  const shouldValidate = provider.config.xhr?.validateSources === true;
  return {
    cleanup: workers.cleanup,
    getStreams: workers.getStreams ? (/*#__PURE__*/function () {
      var _ref = _asyncToGenerator(function* (requester, context) {
        try {
          const sources = yield workers.getStreams(requester, context);
          const withMeta = sources.map(source => augmentMediaSource(source, manifest, provider, requester.userAgent));
          const sorted = sortByTargetLanguage(withMeta, requester.targetLanguageISO);
          if (!shouldValidate) return sorted;
          return validateMediaSources(sorted, requester, context);
        } catch (error) {
          const logEntry = describeProviderWorkerError("getStreams", manifest, error);
          context.log.error(logEntry.summary);
          if (logEntry.details) {
            context.log.debug(`Provider ${manifest.name} getStreams details`, logEntry.details);
          }
          throw error;
        }
      });
      return function (_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }()) : void 0,
    // Lazy listing: augment each handle like getStreams but never validate — lazy sources
    // have no URL yet (resolved on play via resolveLazy).
    getLazyStreams: workers.getLazyStreams ? (/*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator(function* (requester, context) {
        try {
          const sources = yield workers.getLazyStreams(requester, context);
          const withMeta = sources.map(source => augmentMediaSource(source, manifest, provider, requester.userAgent));
          return sortByTargetLanguage(withMeta, requester.targetLanguageISO);
        } catch (error) {
          const logEntry = describeProviderWorkerError("getLazyStreams", manifest, error);
          context.log.error(logEntry.summary);
          if (logEntry.details) {
            context.log.debug(`Provider ${manifest.name} getLazyStreams details`, logEntry.details);
          }
          throw error;
        }
      });
      return function (_x3, _x4) {
        return _ref2.apply(this, arguments);
      };
    }()) : void 0,
    getSubtitles: workers.getSubtitles ? (/*#__PURE__*/function () {
      var _ref3 = _asyncToGenerator(function* (requester, context) {
        try {
          const sources = yield workers.getSubtitles(requester, context);
          const withMeta = sources.map(source => ({
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
          const sorted = sortByTargetLanguage(withMeta, requester.targetLanguageISO);
          if (!shouldValidate) return sorted;
          return validateSubtitleSources(sorted, requester, context);
        } catch (error) {
          const logEntry = describeProviderWorkerError("getSubtitles", manifest, error);
          context.log.error(logEntry.summary);
          if (logEntry.details) {
            context.log.debug(`Provider ${manifest.name} getSubtitles details`, logEntry.details);
          }
          throw error;
        }
      });
      return function (_x5, _x6) {
        return _ref3.apply(this, arguments);
      };
    }()) : void 0,
    // Lazy resolution: shape the single resolved source like getStreams.
    resolveLazy: workers.resolveLazy ? (/*#__PURE__*/function () {
      var _ref4 = _asyncToGenerator(function* (id, context, requester) {
        const source = yield workers.resolveLazy(id, context, requester);
        if (!source) return null;
        return augmentMediaSource(source, manifest, provider, requester.userAgent);
      });
      return function (_x7, _x8, _x9) {
        return _ref4.apply(this, arguments);
      };
    }()) : void 0
  };
}
function validateMediaSources(_x0, _x1, _x10) {
  return _validateMediaSources.apply(this, arguments);
}
function _validateMediaSources() {
  _validateMediaSources = _asyncToGenerator(function* (sources, requester, context) {
    const results = yield Promise.all(sources.map(/*#__PURE__*/function () {
      var _ref5 = _asyncToGenerator(function* (source) {
        if (source.lazy) return source;
        const url = typeof source.playlist === "string" ? source.playlist : source.playlist?.[0]?.source;
        if (!url) return null;
        const {
          ok
        } = yield context.xhr.status(url, {
          attachUserAgent: true,
          headers: source.xhr.headers
        }, requester);
        return ok ? source : null;
      });
      return function (_x75) {
        return _ref5.apply(this, arguments);
      };
    }()));
    return results.filter(s => s !== null);
  });
  return _validateMediaSources.apply(this, arguments);
}
function validateSubtitleSources(_x11, _x12, _x13) {
  return _validateSubtitleSources.apply(this, arguments);
} // node_modules/grabit-engine/dist/esm/src/utils/path.js
function _validateSubtitleSources() {
  _validateSubtitleSources = _asyncToGenerator(function* (sources, requester, context) {
    const results = yield Promise.all(sources.map(/*#__PURE__*/function () {
      var _ref6 = _asyncToGenerator(function* (source) {
        if (!source.url) return null;
        const {
          ok
        } = yield context.xhr.status(source.url, {
          attachUserAgent: true,
          headers: source.xhr.headers
        }, requester);
        return ok ? source : null;
      });
      return function (_x76) {
        return _ref6.apply(this, arguments);
      };
    }()));
    return results.filter(s => s !== null);
  });
  return _validateSubtitleSources.apply(this, arguments);
}
var SFPattern = /\{\s*(\w+)\s*:\s*(\d+|string|uri|form-uri)\s*\}/g;
var NON_DIGIT_PATTERN = /\D/g;
var REPLACE_URI_SPACE_PATTERN = /%20/g;
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
      const extractNumber = val => {
        if (typeof val === "number") return val;
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

// node_modules/grabit-engine/dist/esm/src/models/provider.js
function normalizeLanguages(language) {
  return Array.isArray(language) ? language : [language];
}
var Provider = /*#__PURE__*/function () {
  function _Provider(config2) {
    _classCallCheck(this, _Provider);
    _defineProperty(this, "config", void 0);
    this.config = config2;
  }
  return _createClass(_Provider, [{
    key: "createQueries",
    value:
    /** Constructs query parameters for a provider based on the media information and the provider's expected query format
     * @param localizedTextIndex Index into `media.localizedTitles` to pick a translated title.
     *   - `undefined` (default) — auto-selects a localized title when the provider's language differs from the media's original language.
     *   - `number` — uses that specific index (wraps around via modulo).
     *   - `null` — forces the original title, skipping localization entirely.
     */
    function createQueries(media, localizedTextIndex) {
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
      return {
        ...indexMapping,
        ...nameMapping
      };
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
  }, {
    key: "createResourceURL",
    value: function createResourceURL(requester, localizedTextIndex) {
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
  }, {
    key: "createResourceUrls",
    value: function createResourceUrls(requester, customURL) {
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
      ...Array.from({
        length: titleCount + 1
      }, (_, i) => {
        const localizedIndex = useTranslation ? i < titleCount ? i : null : i === 0 ? null : i - 1;
        return this.createResourceURL(requester, localizedIndex).href;
      })];
      return deduplicateArray(urls).map(url => new URL(url));
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
  }, {
    key: "createPatternString",
    value: function createPatternString(pattern, media, customPattern, localizedTextIndex) {
      return stringFromPattern(pattern, {
        ...this.createQueries(media, localizedTextIndex),
        ...customPattern
      });
    }
    /** Applies the provider's pattern to a given URL or path, replacing placeholders with media information from the requester */
  }, {
    key: "applyPatternURL",
    value: function applyPatternURL(urlOrPath, requester) {
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
  }, {
    key: "isMediaSupported",
    value: function isMediaSupported(media) {
      const entrySupported = Object.keys(this.config.entries).map(key => key.replace("search_", "")).includes(media.type);
      if (media.type !== "channel") {
        const supportedMediaIdTypes = this.config.mediaIds || ["tmdb"];
        return (
          // For provider that use search Algoritm this check is optional as they can still attempt to search using title
          // and other media information, but for provider that rely on direct media ID matching, this check is crucial
          // to ensure that the provider can actually process the media request based on its configuration.
          entrySupported && supportedMediaIdTypes.some(type => {
            const value = type === "tmdb" ? media.tmdbId : media.imdbId;
            return typeof value === "string" && value.trim().length > 0;
          })
        );
      } else return entrySupported;
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
  }, {
    key: "retrievePreferedIds",
    value: function retrievePreferedIds(media) {
      if (!this.isMediaSupported(media)) throw new ProcessError({
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
        const id = supportedMediaIdTypes.map(type => type === "tmdb" ? media.tmdbId : media.imdbId).filter(id2 => !!id2 && id2?.trim().length > 0)[0];
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
        const id = supportedMediaIdTypes.map(type => type === "tmdb" ? media.tmdbId : media.imdbId).filter(id2 => !!id2 && id2?.trim().length > 0)[0];
        const ep_id = supportedMediaIdTypes.map(type => type === "tmdb" ? media.ep_tmdbId : media.ep_imdbId).filter(id2 => !!id2 && id2?.trim().length > 0)[0];
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
  }, {
    key: "getPrimaryLanguage",
    value: function getPrimaryLanguage() {
      const languages = normalizeLanguages(this.config.language);
      return languages.length > 0 ? languages[0] : "en";
    }
  }, {
    key: "useTranslation",
    value: function useTranslation(media) {
      if (media.type === "channel") return false;
      if (!media.original_language || !media.localizedTitles?.length) return false;
      const providerLanguages = normalizeLanguages(this.config.language);
      return !providerLanguages.includes(media.original_language.toLowerCase().split("-")[0]) && media.localizedTitles.length > 0;
    }
  }], [{
    key: "create",
    value: function create(config2) {
      return new _Provider(config2);
    }
  }]);
}();

// node_modules/parse-duration/locale/en.js
var unit = /* @__PURE__ */Object.create(null);
var m = 6e4;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;
unit.year = unit.yr = unit.y = y;
unit.month = unit.mo = unit.mth = y / 12;
unit.week = unit.wk = unit.w = d * 7;
unit.day = unit.d = d;
unit.hour = unit.hr = unit.h = h;
unit.minute = unit.min = unit.m = m;
unit.second = unit.sec = unit.s = 1e3;
unit.millisecond = unit.millisec = unit.ms = 1;
unit.microsecond = unit.microsec = unit.us = unit.µs = 1e-3;
unit.nanosecond = unit.nanosec = unit.ns = 1e-6;
unit.group = ",";
unit.decimal = ".";
unit.placeholder = " _";
var en_default = unit;

// node_modules/parse-duration/index.js
var durationRE = /((?:\d{1,16}(?:\.\d{1,16})?|\.\d{1,16})(?:[eE][-+]?\d{1,4})?)\s?([\p{L}]{0,14})/gu;
parse.unit = en_default;
function parse(str = "", format = "ms") {
  let result = null,
    prevUnits;
  String(str).replace(new RegExp(`(\\d)[${parse.unit.placeholder}${parse.unit.group}](\\d)`, "g"), "$1$2").replace(parse.unit.decimal, ".").replace(durationRE, (_, n, units) => {
    if (!units) {
      if (prevUnits) {
        for (const u in parse.unit) if (parse.unit[u] < prevUnits) {
          units = u;
          break;
        }
      } else units = format;
    } else units = units.toLowerCase();
    prevUnits = units = parse.unit[units] || parse.unit[units.replace(/s$/, "")];
    if (units) result = (result || 0) + n * units;
  });
  return result && result / (parse.unit[format] || 1) * (str[0] === "-" ? -1 : 1);
}

// node_modules/grabit-engine/dist/esm/src/utils/similarity.js
function calculateMatchScore(criteria, media) {
  let score = 0;
  if (media.type == "channel") return cosineSimilarity(media.channelName, criteria.title || "") * 100;
  if (media.title && criteria.title) {
    const queryVector = buildVector(criteria.title);
    const distance = cosineSimilarityVectors(buildVector(media.title), queryVector);
    const distances = media.localizedTitles.map(t => cosineSimilarityVectors(buildVector(t), queryVector));
    score += Math.max(distance, ...distances) * 100;
  }
  if (media.releaseYear && criteria.year && media.releaseYear.toString() === criteria.year) {
    score += 50;
  }
  if (media.duration && criteria.duration) {
    const parsed = (parse(criteria.duration) ?? 0) / 6e4;
    const diff = Math.abs(media.duration - parsed);
    score += 20 - Math.min(diff, 20);
  }
  return score;
}
function cosineSimilarity(a, b) {
  return cosineSimilarityVectors(buildVector(a), buildVector(b));
}
function cosineSimilarityVectors(vecA, vecB) {
  const allWords = /* @__PURE__ */new Set([...vecA.keys(), ...vecB.keys()]);
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (const word of allWords) {
    const valA = vecA.get(word) || 0;
    const valB = vecB.get(word) || 0;
    dotProduct += valA * valB;
    magnitudeA += valA * valA;
    magnitudeB += valB * valB;
  }
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}
function buildVector(text) {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  const freq = /* @__PURE__ */new Map();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
}

// provider-shim:grabit-engine-provider-crypto-shim
var runtimeRequire = typeof require === "function" ? require : void 0;
var globalCryptoCandidates = [globalThis.__grabitCrypto, globalThis.Crypto, globalThis.crypto];
var isReactNative = typeof navigator !== "undefined" && navigator.product === "ReactNative";
var Crypto;
if (runtimeRequire) {
  const moduleNames = isReactNative ? ["react-native-quick-crypto", "crypto"] : ["crypto", "react-native-quick-crypto"];
  for (const moduleName of moduleNames) {
    try {
      Crypto = runtimeRequire(moduleName);
      if (Crypto) break;
    } catch {}
  }
}
if (!Crypto) {
  Crypto = globalCryptoCandidates.find(candidate => candidate && typeof candidate.createHash === "function");
}
if (!Crypto) {
  throw new Error('Crypto is not available in this runtime. In React Native, install react-native-quick-crypto and expose it via require("react-native-quick-crypto") or set globalThis.__grabitCrypto/globalThis.crypto before evaluating GitHub provider bundles.');
}

// provider-manifest:D:\Softwares\Javascript\Packages\grabit-library\manifest.json
var manifest_default = {
  name: "providers",
  author: "",
  providers: {
    vega: {
      name: "VMovies",
      version: "1.0.0",
      active: true,
      language: ["hi", "en"],
      type: "media",
      env: "universal",
      supportedMediaTypes: ["movie", "serie"],
      priority: 100,
      dir: "providers/media/multi"
    }
  }
};

// providers/media/multi/vega/config.ts
var config = {
  scheme: "vega",
  name: "VMovies",
  language: ["hi", "en"],
  baseUrl: "https://vegamovies.catering",
  entries: {
    movie: {
      endpoint: "/search.php?q={title:form-uri}&page=1"
    },
    serie: {
      endpoint: "/search.php?q={title:form-uri}&page=1"
    }
  },
  mediaIds: ["imdb", "tmdb"],
  contentAreCORSProtected: true
};
var PROVIDER = Provider.create(config);

// providers/extractors/hubcloud.ts
function extractUrlFromScript(html) {
  const doubleAtobMatch = html.match(/(?:var|let|const)\s+\w+\s*=\s*atob\(atob\(['"]([^'"]+)['"]\)\)/);
  if (doubleAtobMatch?.[1]) {
    try {
      return atob(atob(doubleAtobMatch[1]));
    } catch {}
  }
  const plainMatch = html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
  const rSegment = plainMatch?.[1]?.split("r=")?.[1];
  if (rSegment) {
    try {
      return atob(rSegment);
    } catch {}
  }
  return plainMatch?.[1] || "";
}
function getRedirectedPixelDrainUrl(...htmlSources) {
  for (const html of htmlSources) {
    if (!html) continue;
    const match = html.match(/var\s+pxl\s*=\s*['"]([^'"]+)['"];?/i);
    if (match?.[1]) return match[1];
  }
  return "";
}
function fetchTextWithCloudflareFallback(_x14, _x15, _x16, _x17, _x18) {
  return _fetchTextWithCloudflareFallback.apply(this, arguments);
}
function _fetchTextWithCloudflareFallback() {
  _fetchTextWithCloudflareFallback = _asyncToGenerator(function* (target, headers, requester, ctx, cookieJar) {
    const requestHeaders = {
      ...headers
    };
    if (cookieJar.cookie) requestHeaders.cookie = cookieJar.cookie;
    try {
      const response = yield ctx.xhr.fetch(target, {
        method: "GET",
        attachUserAgent: true,
        clean: true,
        headers: requestHeaders
      }, requester);
      if (response.status !== 403 && response.ok) {
        return yield response.text();
      }
      if (response.status !== 403) {
        ctx.log.warn(`[hubcloud] ${target.href} -> HTTP ${response.status}`);
        return yield response.text().catch(() => null);
      }
      ctx.log.warn(`[hubcloud] Cloudflare 403 for ${target.href}, falling back to browser session.`);
    } catch (error) {
      ctx.log.warn(`[hubcloud] xhr fetch failed for ${target.href} (${error.message}), trying browser session.`);
    }
    try {
      const solved = yield ctx.solveChallenge(target, requester, {
        waitForCookie: "cf_clearance"
      });
      if (solved.cookies) cookieJar.cookie = solved.cookies;
      return solved.html;
    } catch (error) {
      ctx.log.error(`[hubcloud] Challenge solve failed for ${target.href}: ${error.message}`);
      return null;
    }
  });
  return _fetchTextWithCloudflareFallback.apply(this, arguments);
}
function extractHubcloudStreams(_x19, _x20, _x21, _x22) {
  return _extractHubcloudStreams.apply(this, arguments);
}
function _extractHubcloudStreams() {
  _extractHubcloudStreams = _asyncToGenerator(function* (link, requester, ctx, meta) {
    const startURL = typeof link === "string" ? new URL(link) : link;
    ctx.log.debug(`[hubcloud] Resolving: ${startURL.href}`);
    const headers = {
      Referer: startURL.origin + "/"
    };
    const cookieJar = {
      cookie: "ext_name=ojplmecpdpgccookcobabopnaifgidhf; xla=s4t"
    };
    if (startURL.pathname.includes("search-recover.php")) {
      return handleSearchRecover(startURL, headers, cookieJar, requester, ctx, meta);
    }
    return resolveDrivePage(startURL, headers, cookieJar, requester, ctx, meta);
  });
  return _extractHubcloudStreams.apply(this, arguments);
}
function handleSearchRecover(_x23, _x24, _x25, _x26, _x27, _x28) {
  return _handleSearchRecover.apply(this, arguments);
}
function _handleSearchRecover() {
  _handleSearchRecover = _asyncToGenerator(function* (recoverURL, headers, cookieJar, requester, ctx, meta) {
    let resolvedURL = recoverURL;
    try {
      const probe = yield ctx.xhr.fetch(recoverURL, {
        method: "GET",
        attachUserAgent: true,
        clean: true,
        headers: {
          ...headers
        },
        redirect: "follow"
      }, requester);
      if (probe.url && /search-recover\.php/i.test(probe.url)) resolvedURL = new URL(probe.url);
    } catch {}
    const apiURL = new URL(resolvedURL.href);
    apiURL.searchParams.set("api", "search");
    apiURL.searchParams.set("page", "1");
    let hits = [];
    try {
      const json = yield ctx.xhr.fetchResponse(apiURL, {
        method: "GET",
        attachUserAgent: true,
        clean: true,
        headers: {
          ...headers,
          Accept: "application/json"
        }
      }, requester);
      hits = Array.isArray(json?.hits) ? json.hits : [];
    } catch (error) {
      ctx.log.warn(`[hubcloud] search-recover API failed: ${error.message}`);
      return [];
    }
    const tokens = (meta.matchTokens ?? []).map(t => t.toLowerCase()).filter(t => t.length >= 3);
    const accepted = hits.filter(hit => {
      if (!hit.url) return false;
      if (tokens.length === 0) return true;
      const name = (hit.file_name ?? "").toLowerCase();
      return tokens.some(t => name.includes(t));
    });
    ctx.log.info(`[hubcloud] search-recover: ${hits.length} hit(s), ${accepted.length} passed the title guard (tokens: ${tokens.join(",") || "none"}).`);
    if (accepted.length === 0 && hits.length > 0) {
      ctx.log.warn("[hubcloud] All recovered hits looked unrelated to the requested title; skipping.");
    }
    const results = [];
    for (const hit of accepted.slice(0, 3)) {
      try {
        const sources = yield resolveDrivePage(new URL(hit.url), headers, cookieJar, requester, ctx, {
          ...meta,
          fileName: hit.file_name ?? meta.fileName
        });
        results.push(...sources);
      } catch (error) {
        ctx.log.debug(`[hubcloud] Failed resolving recovered hit ${hit.url}: ${error.message}`);
      }
    }
    return results;
  });
  return _handleSearchRecover.apply(this, arguments);
}
function resolveDrivePage(_x29, _x30, _x31, _x32, _x33, _x34) {
  return _resolveDrivePage.apply(this, arguments);
}
function _resolveDrivePage() {
  _resolveDrivePage = _asyncToGenerator(function* (startURL, headers, cookieJar, requester, ctx, meta) {
    const baseUrl = startURL.origin;
    const vLinkText = yield fetchTextWithCloudflareFallback(startURL, headers, requester, ctx, cookieJar);
    if (!vLinkText) {
      ctx.log.warn("[hubcloud] Could not load the initial HubCloud page.");
      return [];
    }
    const $vLink = ctx.cheerio.$load(vLinkText);
    let vcloudLink = extractUrlFromScript(vLinkText) || $vLink(".fa-file-download.fa-lg").parent().attr("href") || startURL.href;
    if (vcloudLink.startsWith("/")) vcloudLink = `${baseUrl}${vcloudLink}`;
    ctx.log.debug(`[hubcloud] vcloud link: ${vcloudLink}`);
    const vcloudURL = new URL(vcloudLink);
    const vcloudText = yield fetchTextWithCloudflareFallback(vcloudURL, headers, requester, ctx, cookieJar);
    if (!vcloudText) {
      ctx.log.warn("[hubcloud] Could not load the vcloud page.");
      return [];
    }
    const $ = ctx.cheerio.$load(vcloudText);
    const rawLinks = [];
    const buttons = $(".btn-success.btn-lg.h6,.btn-danger,.btn-secondary").toArray();
    for (const element of buttons) {
      let href = $(element).attr("href") || "";
      if (!href) continue;
      if (href.includes("pixeld")) {
        if (!href.includes("api")) {
          const redirected = getRedirectedPixelDrainUrl(vLinkText, vcloudText);
          if (redirected) href = redirected;
          const token = href.split("/").pop()?.split("?")[0];
          const pxlBase = href.split("/").slice(0, -2).join("/");
          href = `${pxlBase}/api/file/${token}?download`;
        }
        rawLinks.push({
          server: "Pixeldrain",
          url: href
        });
      } else if (href.includes(".dev") && !href.includes("/?id=")) {
        rawLinks.push({
          server: "Cf-Worker",
          url: href
        });
      } else if (href.includes("hubcloud") || href.includes("/?id=")) {
        const resolved = yield resolveNestedHubcloud(href, headers, cookieJar, requester, ctx);
        if (resolved) rawLinks.push({
          server: "HubCloud",
          url: resolved
        });
      } else if (href.includes("cloudflarestorage")) {
        rawLinks.push({
          server: "CfStorage",
          url: href
        });
      } else if (href.includes("fastdl") || href.includes("fsl.")) {
        rawLinks.push({
          server: "FastDl",
          url: href
        });
      } else if (href.includes("hubcdn") && !href.includes("/?id=")) {
        rawLinks.push({
          server: "HubCdn",
          url: href
        });
      } else if (href.includes(".mkv") || href.includes("?token=")) {
        const serverName = href.match(/^(?:https?:\/\/)?(?:www\.)?([^/]+)/i)?.[1]?.replace(/\./g, " ") || "Direct";
        rawLinks.push({
          server: serverName,
          url: href
        });
      }
    }
    ctx.log.info(`[hubcloud] Resolved ${rawLinks.length} mirror link(s).`);
    const label = [meta.fileName, meta.quality].filter(Boolean).join(" ").trim() || "HubCloud";
    return rawLinks.map(raw => {
      const format = guessFormat(raw.url);
      return {
        fileName: `[${raw.server}] ${label}`.trim(),
        playlist: raw.url,
        language: meta.language,
        ...(format ? {
          format
        } : {}),
        xhr: {
          flags: ["CORS_BLOCKED"],
          headers: {}
        }
      };
    });
  });
  return _resolveDrivePage.apply(this, arguments);
}
function resolveNestedHubcloud(_x35, _x36, _x37, _x38, _x39) {
  return _resolveNestedHubcloud.apply(this, arguments);
}
function _resolveNestedHubcloud() {
  _resolveNestedHubcloud = _asyncToGenerator(function* (href, headers, cookieJar, requester, ctx) {
    try {
      const headHeaders = {
        ...headers,
        ...(cookieJar.cookie ? {
          cookie: cookieJar.cookie
        } : {})
      };
      const first = yield ctx.xhr.fetch(new URL(href), {
        method: "HEAD",
        attachUserAgent: true,
        clean: true,
        headers: headHeaders,
        redirect: "manual"
      }, requester);
      let newLink = first.headers.get("location") || (first.url && first.url !== href ? first.url : href);
      if (newLink.includes("googleusercontent")) {
        return newLink.split("?link=")[1] || newLink;
      }
      const second = yield ctx.xhr.fetch(new URL(newLink), {
        method: "HEAD",
        attachUserAgent: true,
        clean: true,
        headers: headHeaders,
        redirect: "manual"
      }, requester);
      const secondLoc = second.headers.get("location");
      if (secondLoc) return secondLoc.split("?link=")[1] || secondLoc;
      if (second.url && second.url !== newLink) return second.url.split("?link=")[1] || second.url;
      return newLink;
    } catch (error) {
      ctx.log.debug(`[hubcloud] Nested resolution failed for ${href}: ${error.message}`);
      return href;
    }
  });
  return _resolveNestedHubcloud.apply(this, arguments);
}
function guessFormat(url) {
  const lower = url.toLowerCase();
  if (lower.includes(".m3u8")) return "m3u8";
  if (lower.includes(".mkv")) return "mkv";
  if (lower.includes(".mp4")) return "mp4";
  if (lower.includes(".webm")) return "webm";
  return void 0;
}

// providers/extractors/hubchain.ts
function detectQuality(text) {
  const t = text.toLowerCase();
  if (t.includes("2160p") || t.includes("4k")) return "4k";
  if (t.includes("1080p")) return "1080p";
  if (t.includes("720p")) return "720p";
  if (t.includes("480p")) return "480p";
  return "Unknown";
}

// providers/extractors/postMatch.ts
function cleanTitle(raw) {
  return raw.replace(/\(.*?\)/g, " ").replace(/\[.*?\]/g, " ").replace(/\b(480p|720p|1080p|2160p|4k|hd|web[- ]?dl|webrip|bluray|hevc|x264|x265|hindi|english|dual audio|dubbed|season\s*\d+|s\d+|complete|full movie)\b/gi, " ").replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();
}
function getSeasonFromText(text) {
  const m2 = text.match(/\bseason\s*(\d{1,2})\b/i) || text.match(/\bs(\d{1,2})(?:\b|e)/i);
  return m2 ? Number(m2[1]) : null;
}
function pickBestPost(posts, media, minScore = 45) {
  const wantSeason = media.type === "serie" ? Number(media.season) : null;
  const scored = posts.map(post => {
    const year = extractYearFromText(post.title)?.toString() || "";
    let score = calculateMatchScore({
      title: cleanTitle(post.title),
      year
    }, media);
    if (wantSeason != null) {
      const postSeason = getSeasonFromText(post.title);
      if (postSeason != null) score += postSeason === wantSeason ? 25 : -60;
    }
    return {
      post,
      score
    };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score < minScore) return null;
  return top;
}

// providers/media/multi/vega/stream.ts
var VEGA_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  cookie: "xla=s4t"
};
var MAX_CANDIDATES = 3;
function getStreams(_x40, _x41) {
  return _getStreams.apply(this, arguments);
}
function _getStreams() {
  _getStreams = _asyncToGenerator(function* (requester, ctx) {
    if (requester.media.type === "channel") return [];
    const media = requester.media;
    const pageOpt = {
      ...requester,
      followRedirects: true,
      extraHeaders: {
        ...VEGA_HEADERS
      }
    };
    let posts = [];
    for (const url of PROVIDER.createResourceUrls(requester)) {
      posts = yield searchPosts(url, requester, ctx);
      if (posts.length > 0) break;
    }
    if (posts.length === 0) {
      ctx.log.warn("[vega] No search results.");
      return [];
    }
    const best = pickBestPost(posts, media);
    if (!best) {
      ctx.log.warn("[vega] No post cleared the match threshold.");
      return [];
    }
    ctx.log.info(`[vega] Best match: "${best.post.title}" (score ${best.score}) -> ${best.post.link}`);
    const candidates = yield getCandidateLinks(best.post.link, requester, ctx, pageOpt);
    if (candidates.length === 0) {
      ctx.log.warn("[vega] No download candidates on the post page.");
      return [];
    }
    ctx.log.info(`[vega] ${candidates.length} candidate link(s) before resolution.`);
    const results = [];
    for (const cand of candidates.slice(0, MAX_CANDIDATES)) {
      try {
        const cloudLink = yield resolveVegaLink(cand.link, requester, ctx);
        if (!cloudLink) {
          ctx.log.debug(`[vega] Could not resolve candidate to a cloud link: ${cand.link}`);
          continue;
        }
        const sources = yield extractHubcloudStreams(cloudLink, requester, ctx, {
          fileName: `${best.post.title} ${cand.label}`.trim(),
          quality: cand.quality,
          language: "hi"
        });
        results.push(...sources);
      } catch (error) {
        ctx.log.error(`[vega] Candidate resolution failed (${cand.link}): ${error.message}`);
      }
    }
    ctx.log.info(`[vega] Returning ${results.length} source(s).`);
    return results;
  });
  return _getStreams.apply(this, arguments);
}
function searchPosts(_x42, _x43, _x44) {
  return _searchPosts.apply(this, arguments);
}
function _searchPosts() {
  _searchPosts = _asyncToGenerator(function* (url, requester, ctx) {
    const baseUrl = PROVIDER.config.baseUrl;
    try {
      const json = yield ctx.xhr.fetchResponse(url, {
        method: "GET",
        attachUserAgent: true,
        clean: true,
        headers: {
          ...VEGA_HEADERS,
          Referer: baseUrl + "/"
        }
      }, requester);
      const hits = Array.isArray(json?.hits) ? json.hits : [];
      const posts = [];
      for (const hit of hits) {
        const doc = hit?.document || {};
        const title = String(doc.post_title || "").replace(/Download/gi, "").trim();
        const permalink = String(doc.permalink || "");
        if (!title || !permalink) continue;
        const postUrl = new URL(permalink, `${baseUrl}/`);
        posts.push({
          title,
          link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`,
          image: String(doc.post_thumbnail || "")
        });
      }
      ctx.log.debug(`[vega] Search ${url.href} -> ${posts.length} hit(s).`);
      return posts;
    } catch (error) {
      ctx.log.warn(`[vega] Search failed for ${url.href}: ${error.message}`);
      return [];
    }
  });
  return _searchPosts.apply(this, arguments);
}
function getCandidateLinks(_x45, _x46, _x47, _x48) {
  return _getCandidateLinks.apply(this, arguments);
}
function _getCandidateLinks() {
  _getCandidateLinks = _asyncToGenerator(function* (link, requester, ctx, pageOpt) {
    const url = new URL(link, `${PROVIDER.config.baseUrl}/`);
    const {
      $
    } = yield ctx.cheerio.load(url, pageOpt, ctx.xhr);
    const media = requester.media;
    const candidates = [];
    if (media.type === "serie") {
      const wantSeason = Number(media.season);
      const wantEpisode = Number(media.episode);
      const episodePages = [];
      $("h3").each((_, h2) => {
        const heading = $(h2).text();
        if (getSeasonFromText(heading) !== wantSeason) return;
        const quality = detectQuality(heading);
        let node = $(h2).next();
        let guard = 0;
        while (node.length && !node.is("h3") && guard++ < 8) {
          const link2 = node.find("a").filter((__, a) => /episode/i.test($(a).text())).first().attr("href");
          if (link2) {
            episodePages.push({
              quality,
              href: link2
            });
            break;
          }
          node = node.next();
        }
      });
      for (const page of dedupeBy(episodePages, p => p.href).slice(0, 3)) {
        const eps = yield getEpisodeList(page.href, requester, ctx, pageOpt);
        const ep = eps.find(e => episodeNumberOf(e.title) === wantEpisode);
        if (ep) candidates.push({
          quality: page.quality,
          link: ep.link,
          label: `E${wantEpisode}`
        });
      }
    } else {
      for (const a of $("a:has(.dwd-button)").toArray()) {
        const href = $(a).attr("href");
        if (!href) continue;
        const label = `${$(a).closest("p").prevAll("h3,h4,h5,p").first().text()} ${$(a).text()}`;
        candidates.push({
          quality: detectQuality(label),
          link: href,
          label: detectQuality(label)
        });
      }
    }
    const order = {
      "4k": 4,
      "2160p": 4,
      "1080p": 3,
      "720p": 2,
      "480p": 1,
      unknown: 0
    };
    return dedupeBy(candidates, c => c.link).sort((a, b) => (order[b.quality.toLowerCase()] || 0) - (order[a.quality.toLowerCase()] || 0));
  });
  return _getCandidateLinks.apply(this, arguments);
}
function getEpisodeList(_x49, _x50, _x51, _x52) {
  return _getEpisodeList.apply(this, arguments);
}
function _getEpisodeList() {
  _getEpisodeList = _asyncToGenerator(function* (episodesLink, requester, ctx, pageOpt) {
    try {
      let target = episodesLink;
      if (target.includes("url=")) {
        const decoded = safeAtob(target.split("url=")[1]);
        if (decoded) target = decoded;
      }
      const {
        $
      } = yield ctx.cheerio.load(new URL(target, `${PROVIDER.config.baseUrl}/`), pageOpt, ctx.xhr);
      const container = $(".entry-content,.entry-inner").length ? $(".entry-content,.entry-inner") : $("body");
      const episodes = [];
      container.find("h3,h4").each((_, el) => {
        const title = $(el).text().replace(/\s+/g, " ").trim();
        if (!/episode/i.test(title)) return;
        const hrefs = $(el).nextUntil("h3,h4").find("a").map((__, a) => $(a).attr("href")).get().filter(h2 => h2 && h2 !== "#");
        const href = hrefs.find(h2 => /vcloud|hubcloud|v-cloud|\/drive\/|hubdrive|cloud\./i.test(h2)) || hrefs.find(h2 => /nexdrive/i.test(h2)) || hrefs[0];
        if (title && href) episodes.push({
          title,
          link: href
        });
      });
      return episodes;
    } catch (error) {
      ctx.log.debug(`[vega] Episode list failed for ${episodesLink}: ${error.message}`);
      return [];
    }
  });
  return _getEpisodeList.apply(this, arguments);
}
function resolveVegaLink(_x53, _x54, _x55) {
  return _resolveVegaLink.apply(this, arguments);
}
function _resolveVegaLink() {
  _resolveVegaLink = _asyncToGenerator(function* (link, requester, ctx) {
    if (!link) return null;
    if (/(?:hubcloud|vcloud|v-cloud|\/drive\/|hubdrive|cloud\.)/i.test(link)) return link;
    try {
      const res = yield ctx.xhr.fetch(new URL(link), {
        method: "GET",
        attachUserAgent: true,
        clean: true,
        headers: {
          ...VEGA_HEADERS
        }
      }, requester);
      const text = yield res.text();
      const m2 = text.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i) || text.match(/href="(https?:\/\/[^"]*(?:vcloud|hubcloud|hubdrive)[^"]*)"/i);
      return m2?.[1] || null;
    } catch (error) {
      ctx.log.debug(`[vega] Dotlink resolution failed for ${link}: ${error.message}`);
      return null;
    }
  });
  return _resolveVegaLink.apply(this, arguments);
}
function episodeNumberOf(title) {
  const m2 = title.match(/episodes?\s*:?\s*(\d+)/i) ||
  // "Episode 1", "-:Episodes: 1:-"
  title.match(/\be\s*p?\s*(\d+)\b/i) ||
  // "E1", "Ep 1"
  title.match(/\be(\d+)\b/i);
  return m2 ? Number(m2[1]) : null;
}
function dedupeBy(arr, key) {
  const seen = /* @__PURE__ */new Set();
  return arr.filter(item => {
    const k = key(item);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function safeAtob(str) {
  if (!str) return null;
  try {
    return atob(str);
  } catch {
    return null;
  }
}

// providers/media/multi/vega/lazy.ts
var HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
  cookie: "xla=s4t"
};
var MAX_CANDIDATES2 = 3;
function getLazyStreams(_x56, _x57) {
  return _getLazyStreams.apply(this, arguments);
}
function _getLazyStreams() {
  _getLazyStreams = _asyncToGenerator(function* (requester, ctx) {
    if (requester.media.type === "channel") return [];
    const pageOpt = {
      ...requester,
      followRedirects: true,
      extraHeaders: {
        ...HEADERS
      }
    };
    let posts = [];
    for (const url of PROVIDER.createResourceUrls(requester)) {
      posts = yield searchPosts2(url, requester, ctx);
      if (posts.length) break;
    }
    const best = pickBestPost(posts, requester.media);
    if (!best) return [];
    const candidates = yield getCandidateLinks2(best.post.link, requester, ctx, pageOpt);
    return candidates.slice(0, MAX_CANDIDATES2).map(candidate => ({
      fileName: `${best.post.title} ${candidate.label}`.trim(),
      language: "hi",
      lazy: {
        id: encodeURIComponent(JSON.stringify({
          ...candidate,
          title: best.post.title
        })),
        label: candidate.label
      },
      xhr: {
        flags: [],
        headers: {}
      }
    }));
  });
  return _getLazyStreams.apply(this, arguments);
}
function resolveLazy(_x58, _x59, _x60) {
  return _resolveLazy.apply(this, arguments);
}
function _resolveLazy() {
  _resolveLazy = _asyncToGenerator(function* (id, ctx, requester) {
    let handle;
    try {
      handle = JSON.parse(decodeURIComponent(id));
    } catch {
      return null;
    }
    if (!handle?.title || !isAllowedVegaLink(handle.link)) return null;
    try {
      const cloudLink = yield resolveVegaLink2(handle.link, requester, ctx);
      if (!cloudLink) return null;
      const sources = yield extractHubcloudStreams(cloudLink, requester, ctx, {
        fileName: `${handle.title} ${handle.label}`.trim(),
        quality: handle.quality,
        language: "hi"
      });
      return sources[0] ?? null;
    } catch {
      return null;
    }
  });
  return _resolveLazy.apply(this, arguments);
}
function searchPosts2(_x61, _x62, _x63) {
  return _searchPosts2.apply(this, arguments);
}
function _searchPosts2() {
  _searchPosts2 = _asyncToGenerator(function* (url, requester, ctx) {
    try {
      const json = yield ctx.xhr.fetchResponse(url, {
        method: "GET",
        attachUserAgent: true,
        clean: true,
        headers: {
          ...HEADERS,
          Referer: PROVIDER.config.baseUrl + "/"
        }
      }, requester);
      return (Array.isArray(json?.hits) ? json.hits : []).map(hit => hit.document || {}).map(doc => {
        const postUrl = new URL(String(doc.permalink || ""), `${PROVIDER.config.baseUrl}/`);
        return {
          title: String(doc.post_title || "").replace(/Download/gi, "").trim(),
          link: `${postUrl.pathname}${postUrl.search}${postUrl.hash}`,
          image: String(doc.post_thumbnail || "")
        };
      }).filter(post => post.title && post.link);
    } catch {
      return [];
    }
  });
  return _searchPosts2.apply(this, arguments);
}
function getCandidateLinks2(_x64, _x65, _x66, _x67) {
  return _getCandidateLinks2.apply(this, arguments);
}
function _getCandidateLinks2() {
  _getCandidateLinks2 = _asyncToGenerator(function* (link, requester, ctx, pageOpt) {
    const {
      $
    } = yield ctx.cheerio.load(new URL(link, `${PROVIDER.config.baseUrl}/`), pageOpt, ctx.xhr);
    const candidates = [];
    if (requester.media.type === "serie") {
      const media = requester.media;
      const episodePages = [];
      $("h3").each((_, heading) => {
        if (getSeasonFromText($(heading).text()) !== Number(media.season)) return;
        let node = $(heading).next();
        let guard = 0;
        while (node.length && !node.is("h3") && guard++ < 8) {
          const href = node.find("a").filter((__, anchor) => /episode/i.test($(anchor).text())).first().attr("href");
          if (href && isAllowedVegaLink(href)) {
            episodePages.push({
              quality: detectQuality($(heading).text()),
              href
            });
            break;
          }
          node = node.next();
        }
      });
      for (const page of unique(episodePages.map(item => item.href)).slice(0, 3).map(href => episodePages.find(item => item.href === href))) {
        const episodePage = yield getEpisodeList2(page.href, requester, ctx, pageOpt);
        const episode = episodePage.find(item => episodeNumberOf2(item.title) === Number(media.episode));
        if (episode && isAllowedVegaLink(episode.link)) candidates.push({
          quality: page.quality,
          link: episode.link,
          label: `E${media.episode}`
        });
      }
    } else {
      $("a:has(.dwd-button)").each((_, anchor) => {
        const href = $(anchor).attr("href");
        if (!href || !isAllowedVegaLink(href)) return;
        const label = `${$(anchor).closest("p").prevAll("h3,h4,h5,p").first().text()} ${$(anchor).text()}`;
        candidates.push({
          quality: detectQuality(label),
          link: href,
          label: detectQuality(label)
        });
      });
    }
    return uniqueCandidates(candidates).sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality));
  });
  return _getCandidateLinks2.apply(this, arguments);
}
function getEpisodeList2(_x68, _x69, _x70, _x71) {
  return _getEpisodeList2.apply(this, arguments);
}
function _getEpisodeList2() {
  _getEpisodeList2 = _asyncToGenerator(function* (link, requester, ctx, pageOpt) {
    try {
      let target = link;
      if (target.includes("url=")) {
        try {
          target = atob(target.split("url=")[1]);
        } catch {
          return [];
        }
      }
      if (!isAllowedVegaLink(target)) return [];
      const {
        $
      } = yield ctx.cheerio.load(new URL(target, `${PROVIDER.config.baseUrl}/`), pageOpt, ctx.xhr);
      const container = $(".entry-content,.entry-inner").length ? $(".entry-content,.entry-inner") : $("body");
      const episodes = [];
      container.find("h3,h4").each((_, element) => {
        const title = $(element).text().replace(/\s+/g, " ").trim();
        if (!/episode/i.test(title)) return;
        const hrefs = $(element).nextUntil("h3,h4").find("a").map((__, anchor) => $(anchor).attr("href")).get().filter(href2 => href2 && href2 !== "#");
        const href = hrefs.find(value => /vcloud|hubcloud|v-cloud|\/drive\/|hubdrive|cloud\./i.test(value)) || hrefs.find(value => /nexdrive/i.test(value)) || hrefs[0];
        if (href && isAllowedVegaLink(href)) episodes.push({
          title,
          link: href
        });
      });
      return episodes;
    } catch {
      return [];
    }
  });
  return _getEpisodeList2.apply(this, arguments);
}
function resolveVegaLink2(_x72, _x73, _x74) {
  return _resolveVegaLink2.apply(this, arguments);
}
function _resolveVegaLink2() {
  _resolveVegaLink2 = _asyncToGenerator(function* (link, requester, ctx) {
    if (!isAllowedVegaLink(link)) return null;
    if (/(?:hubcloud|vcloud|v-cloud|\/drive\/|hubdrive|cloud\.)/i.test(link)) return link;
    try {
      const response = yield ctx.xhr.fetch(new URL(link, PROVIDER.config.baseUrl), {
        method: "GET",
        attachUserAgent: true,
        clean: true,
        headers: {
          ...HEADERS
        }
      }, requester);
      const text = yield response.text();
      return text.match(/<a\s+href="([^"]*cloud\.[^"]*)"/i)?.[1] || text.match(/href="(https?:\/\/[^\"]*(?:vcloud|hubcloud|hubdrive)[^\"]*)"/i)?.[1] || null;
    } catch {
      return null;
    }
  });
  return _resolveVegaLink2.apply(this, arguments);
}
function isAllowedVegaLink(value) {
  try {
    const url = new URL(value, PROVIDER.config.baseUrl);
    if (url.protocol !== "https:") return false;
    return url.origin === new URL(PROVIDER.config.baseUrl).origin || /nexdrive|hubcloud|vcloud|hubdrive|cloud\./i.test(url.hostname + url.pathname);
  } catch {
    return false;
  }
}
function episodeNumberOf2(title) {
  const match = title.match(/episodes?\s*:?\s*(\d+)/i) || title.match(/\be\s*p?\s*(\d+)\b/i) || title.match(/\be(\d+)\b/i);
  return match ? Number(match[1]) : null;
}
function unique(items) {
  return [...new Set(items)];
}
function uniqueCandidates(items) {
  return items.filter((item, index) => items.findIndex(other => other.link === item.link) === index);
}
function qualityRank(value) {
  return {
    "4k": 4,
    "2160p": 4,
    "1080p": 3,
    "720p": 2,
    "480p": 1
  }[value.toLowerCase()] || 0;
}

// providers/media/multi/vega/index.ts
var index_default = defineProviderModule(PROVIDER, manifest_default.providers["vega"], {
  getStreams,
  getLazyStreams,
  resolveLazy
});