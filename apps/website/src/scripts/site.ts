// Margin marketing site — runtime interactivity only.
// All translation strings are rendered server-side via Astro's i18n
// routing, so this script no longer carries a dictionary.

// =========================================
// Demo: translate-on-click + auto on scroll
// =========================================
const demoStage = document.getElementById("demoStage");
const translateBtn = document.getElementById(
  "translateBtn",
) as HTMLButtonElement | null;
const modeBtn = document.getElementById("modeBtn") as HTMLButtonElement | null;

// Pre-rendered labels live on the demo stage (data-label-* attributes)
// so each locale can supply its own copy without a JS dictionary.
const labels = {
  integrated: demoStage?.dataset.labelIntegrated ?? "Integrated",
  highlight: demoStage?.dataset.labelHighlight ?? "Highlighted",
  translate: demoStage?.dataset.labelTranslate ?? "Translate this page",
  translated: demoStage?.dataset.labelTranslated ?? "Translated ✓",
};

let translated = false;

function translations(): NodeListOf<HTMLElement> {
  return (
    demoStage?.querySelectorAll<HTMLElement>("[data-tr]") ??
    (document.createDocumentFragment().childNodes as unknown as NodeListOf<HTMLElement>)
  );
}

function setTranslateBtnText(text: string): void {
  const span = translateBtn?.querySelector("span");
  if (span) span.textContent = text;
}

function setModeBtnText(text: string): void {
  const span = modeBtn?.querySelector("span");
  if (span) span.textContent = text;
}

function runTranslate(): void {
  if (translated) return;
  translated = true;
  translations().forEach((el, i) => {
    setTimeout(() => el.classList.remove("hidden"), 220 * i + 120);
  });
  setTranslateBtnText(labels.translated);
}

function resetTranslate(): void {
  translated = false;
  translations().forEach((el) => el.classList.add("hidden"));
  setTranslateBtnText(labels.translate);
}

translateBtn?.addEventListener("click", () => {
  if (translated) resetTranslate();
  else runTranslate();
});

modeBtn?.addEventListener("click", () => {
  const cur = modeBtn.getAttribute("data-mode");
  const next = cur === "integrated" ? "highlight" : "integrated";
  modeBtn.setAttribute("data-mode", next);
  demoStage?.classList.toggle("mode-highlight", next === "highlight");
  setModeBtnText(next === "integrated" ? labels.integrated : labels.highlight);
});

// Auto-trigger on scroll into view
if (demoStage && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !translated) {
          setTimeout(runTranslate, 350);
        }
      });
    },
    { threshold: 0.45 },
  );
  io.observe(demoStage);
}

// =========================================
// Follow panel (no email — toggle GitHub/RSS card pair from CTA)
// =========================================
const followPanel = document.getElementById("follow-panel");
const openWaitlistBtn = document.getElementById("openWaitlistBtn");

openWaitlistBtn?.addEventListener("click", () => {
  if (!followPanel) return;
  followPanel.classList.toggle("hidden");
  if (!followPanel.classList.contains("hidden")) {
    followPanel.querySelector<HTMLAnchorElement>("a")?.focus();
  }
});

// =========================================
// Live Chrome Web Store version (shields.io JSON endpoint)
// =========================================
const cwsVer = document.getElementById("cwsVer");
const cwsVerNum = document.getElementById("cwsVerNum");
const CWS_EXTENSION_ID = "clgdnabgpfiffmfdboefecbhggbepjde";

if (cwsVer && cwsVerNum) {
  fetch(`https://img.shields.io/chrome-web-store/v/${CWS_EXTENSION_ID}.json`)
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((data: { message?: string; value?: string }) => {
      const version = data.message ?? data.value;
      // shields prefixes a leading "v"; only show when it looks like a version.
      if (version && /\d/.test(version)) {
        cwsVerNum.textContent = version;
        cwsVer.classList.remove("hidden");
      }
    })
    .catch(() => {
      // Store unreachable / rate-limited — stay hidden rather than show a stub.
    });
}

// =========================================
// Marquee — duplicate track for seamless scroll
// =========================================
const marquee = document.getElementById("marquee");
if (marquee) marquee.innerHTML = marquee.innerHTML + marquee.innerHTML;

// =========================================
// Pricing calculator
// =========================================
const calcPages = document.getElementById("calcPages") as HTMLInputElement | null;
const calcWords = document.getElementById("calcWords") as HTMLInputElement | null;
const calcPagesV = document.getElementById("calcPagesV");
const calcWordsV = document.getElementById("calcWordsV");
const calcModelV = document.getElementById("calcModelV");
const calcDay = document.getElementById("calcDay");
const calcMonth = document.getElementById("calcMonth");
const calcModelPick = document.getElementById("calcModelPick");
let calcRate = 0.15;

function recalc(): void {
  if (!calcPages || !calcWords || !calcPagesV || !calcWordsV || !calcDay || !calcMonth) return;
  const pages = parseInt(calcPages.value, 10);
  const words = parseInt(calcWords.value, 10);
  calcPagesV.textContent = String(pages);
  calcWordsV.textContent = words.toLocaleString();
  // Token estimate: ~1.5 tokens/word, then $/1M tokens at picked rate.
  const tokensPerDay = pages * words * 1.5;
  const day = (tokensPerDay / 1e6) * calcRate;
  calcDay.textContent = day < 0.01 ? "<0.01" : day.toFixed(2);
  calcMonth.textContent = (day * 30).toFixed(2);
}

calcPages?.addEventListener("input", recalc);
calcWords?.addEventListener("input", recalc);
calcModelPick?.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const button = target.closest("button");
  if (!button) return;
  calcModelPick
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((x) => x.classList.remove("on"));
  button.classList.add("on");
  calcRate = parseFloat(button.getAttribute("data-rate") ?? "0.15");
  if (calcModelV) calcModelV.textContent = button.textContent ?? "";
  recalc();
});
recalc();
