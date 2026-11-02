import "./style.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createWorld } from "./world.js";

gsap.registerPlugin(ScrollTrigger);
const $ = (selector) => document.querySelector(selector);
const clamp = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const windowOpacity = (start, end, p) =>
  smooth(start, start + 0.075, p) * (1 - smooth(end - 0.075, end, p));
const media = matchMedia("(prefers-reduced-motion: reduce)");
const state = { p: 0 };
let world,
  timeline,
  held = false,
  failed = false,
  generation = 0;
const el = {
  landscape: $(".landscape"),
  sky: $(".sky-colour"),
  moon: $(".moon"),
  shadow: $(".moon-shadow"),
  glow: $(".horizon-glow"),
  hero: $(".hero-title"),
  storm: $(".storm-title"),
  end: $(".end-title"),
  opening: $(".opening"),
  field: $(".field-chapter"),
  stormCopy: $(".storm-chapter"),
  endCopy: $(".end-chapter"),
  blade: $(".blade-light"),
  iris: $(".iris"),
  bar: $(".progress-track i"),
  frame: $(".frame-label"),
};
let frame = -1;
function compose(p) {
  const mobile = innerWidth < 701;
  const approach = smooth(0.03, 0.4, p),
    heat = smooth(0.38, 0.59, p) * (1 - smooth(0.76, 0.94, p)),
    leave = smooth(0.72, 0.99, p);
  world?.update(p);
  el.landscape.style.transform = `translate3d(${approach * (mobile ? -1.5 : -2.2) + leave * 2}%,${approach * 3 - leave * 2}%,0) scale(${1.04 + approach * 0.15 - leave * 0.12})`;
  el.landscape.style.filter = `brightness(${0.74 - heat * 0.13 + leave * 0.1}) sepia(${heat * 0.9}) saturate(${0.65 + heat * 1.65}) hue-rotate(${-heat * 18}deg)`;
  el.sky.style.background = `linear-gradient(${155 + p * 100}deg,rgba(${Math.round(25 + heat * 145)},${Math.round(57 - heat * 35)},${Math.round(71 - heat * 61)},${0.28 + heat * 0.4}),transparent 58%,rgba(83,24,12,${0.15 + heat * 0.35}))`;
  el.glow.style.background = `radial-gradient(ellipse at ${57 - leave * 7}% 52%,rgba(${Math.round(128 + heat * 100)},${Math.round(161 - heat * 80)},${Math.round(167 - heat * 125)},${0.14 + heat * 0.22}),transparent 55%)`;
  el.moon.style.transform = `translate3d(${-50 - approach * 30 + leave * 30}%,${approach * 18 + leave * 10}%,0) scale(${1 + approach * 0.35 - leave * 0.2})`;
  el.moon.style.filter = `sepia(${heat}) saturate(${1 + heat * 3.5}) hue-rotate(${-heat * 27}deg)`;
  el.moon.style.opacity = String(0.75 - approach * 0.1 + leave * 0.2);
  el.shadow.style.opacity = String(
    smooth(0.22, 0.36, p) * (1 - smooth(0.78, 0.95, p)),
  );
  el.shadow.style.transform = `translate(${65 - approach * 45 - leave * 55}%,${-18 + approach * 8 + leave * 50}%)`;
  const heroFade = 1 - smooth(0.035, 0.17, p);
  el.hero.style.opacity = String(heroFade);
  el.hero.style.transform = `translate3d(${-approach * 6}%,${-approach * 25}%,0) scale(${1 + approach * 0.2})`;
  el.opening.style.opacity = String(1 - smooth(0.025, 0.13, p));
  const fieldOpacity = windowOpacity(0.13, 0.47, p);
  el.field.style.opacity = String(fieldOpacity);
  el.field.style.transform = `translate3d(${(1 - smooth(0.13, 0.24, p)) * -5}%,${(1 - smooth(0.13, 0.24, p)) * 5}%,0)`;
  const stormOpacity = windowOpacity(0.47, 0.79, p);
  el.storm.style.opacity = String(stormOpacity * 0.15);
  el.storm.style.transform = `translate3d(${8 - smooth(0.45, 0.78, p) * 18}%,0,0) scale(${1 + heat * 0.12})`;
  el.stormCopy.style.opacity = String(stormOpacity);
  el.stormCopy.style.transform = `translate3d(0,${(1 - smooth(0.47, 0.57, p)) * 7}%,0)`;
  el.end.style.opacity = String(smooth(0.84, 0.98, p) * 0.12);
  el.end.style.transform = `translate3d(${(1 - leave) * 10}%,0,0)`;
  el.endCopy.style.opacity = String(smooth(0.8, 0.93, p));
  el.endCopy.style.transform = `translate3d(0,${(1 - leave) * 14}%,0)`;
  const blade = Math.sin(clamp((p - 0.43) / 0.13) * Math.PI);
  el.blade.style.opacity = String(Math.pow(blade, 3) * 0.9);
  el.blade.style.transform = `translateY(${(p - 0.49) * -300}vh) rotate(-25deg) scaleX(${smooth(0.43, 0.48, p)})`;
  const iris = smooth(0.725, 0.78, p) * (1 - smooth(0.79, 0.86, p));
  el.iris.style.opacity = String(iris * 0.94);
  el.iris.style.clipPath = `circle(${iris * 78}% at ${50 + heat * 9}% 45%)`;
  el.bar.style.transform = `scaleX(${p})`;
  const current = p < 0.16 ? 0 : p < 0.48 ? 1 : p < 0.81 ? 2 : 3;
  if (current !== frame) {
    frame = current;
    el.frame.innerHTML = `0${frame + 1} <span>/</span> 04`;
    document.body.dataset.chapter = String(frame + 1);
  }
  document.body.style.setProperty("--p", p.toFixed(4));
}
function stop() {
  timeline?.scrollTrigger?.kill();
  timeline?.kill();
  timeline = null;
  world?.dispose();
  world = null;
  document.body.classList.remove("world-ready");
}
async function start() {
  const id = ++generation;
  stop();
  const flat = media.matches || failed;
  document.body.classList.toggle("flat-mode", flat);
  document.body.dataset.motion = flat ? "still" : "full";
  if (flat) {
    document.body.dataset.ready = "true";
    return;
  }
  try {
    const next = await createWorld($("#world-canvas"));
    if (id !== generation) {
      next.dispose();
      return;
    }
    world = next;
    world.pause(held);
    document.body.classList.add("world-ready");
    state.p = 0;
    timeline = gsap.to(state, {
      p: 1,
      ease: "none",
      onUpdate: () => compose(state.p),
      scrollTrigger: {
        trigger: ".film",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.7,
        invalidateOnRefresh: true,
      },
    });
    ScrollTrigger.refresh();
    compose(timeline.scrollTrigger.progress);
    document.body.dataset.ready = "true";
  } catch (error) {
    failed = true;
    document.body.classList.add("flat-mode");
    document.body.dataset.motion = "fallback";
    document.body.dataset.ready = "true";
    console.info(
      "LAST WIND: still artwork is active because WebGL is unavailable.",
    );
  }
}
const touchInput = matchMedia("(hover: none)").matches;
const inputHint = touchInput ? "TAP" : "SPACE";
$(".motion-hint").innerHTML = `${inputHint} <span>TO HOLD THE WIND</span>`;
function hold(value) {
  held = value;
  world?.pause(held);
  document.body.classList.toggle("ambient-paused", held);
  $(".motion-hint").innerHTML =
    `${inputHint} <span>TO ${held ? "RELEASE" : "HOLD"} THE WIND</span>`;
  $("#motion-announcement").textContent = held
    ? "Ambient movement paused. Scrolling still moves through the film."
    : "Ambient movement resumed.";
}
document.addEventListener("keydown", (event) => {
  if (
    event.code === "Space" &&
    !event.repeat &&
    !media.matches &&
    !failed &&
    !event.target.closest("a,button,input,textarea,select,[contenteditable]")
  ) {
    event.preventDefault();
    hold(!held);
  }
});
let touchStart;
$(".viewport").addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch")
    touchStart = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
});
$(".viewport").addEventListener("pointerup", (event) => {
  if (
    event.pointerType === "touch" &&
    touchStart &&
    Math.hypot(event.clientX - touchStart.x, event.clientY - touchStart.y) <
      8 &&
    performance.now() - touchStart.time < 350 &&
    !media.matches &&
    !failed
  )
    hold(!held);
  touchStart = null;
});
$(".viewport").addEventListener("pointercancel", () => {
  touchStart = null;
});
media.addEventListener("change", start);
addEventListener("filmcontextlost", () => {
  failed = true;
  start();
  document.body.dataset.motion = "fallback";
});
addEventListener("resize", () => compose(state.p), { passive: true });
addEventListener("pagehide", () => {
  world?.pause(true);
});
addEventListener("pageshow", (event) => {
  if (event.persisted) world?.pause(held);
});
window.__LAST_WIND__ = {
  metrics: () => ({
    title: "LAST WIND",
    mode: document.body.dataset.motion,
    ready: document.body.dataset.ready === "true",
    held,
    chapter: frame + 1,
    ...world?.metrics(),
  }),
  pause: hold,
};
start();
