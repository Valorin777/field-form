import "@fontsource-variable/manrope";
import "@fontsource/anton/latin-400.css";
import "./style.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createSculpture } from "./sculpture.js";

gsap.registerPlugin(ScrollTrigger);
const $ = (s) => document.querySelector(s);
const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
let manualStill = false;
try {
  manualStill = localStorage.getItem("ff-motion") === "off";
} catch {}
let still = motionQuery.matches || manualStill;
const sculpture = createSculpture($("#sculpture"), still);
const stage = $(".stage");
let motionContext;
const phaseLabels = ["001 / SOLID", "002 / SEPARATE", "003 / TRANSFORM"];
const phaseCopy = [
  "One form. Infinite possibilities.",
  "Pull something apart. Find something new.",
  "A change of perspective changes everything.",
];
function syncMotion() {
  still = motionQuery.matches || manualStill;
  document.body.classList.toggle("motion-off", still);
  $("#motion-toggle").setAttribute("aria-pressed", String(still));
  $(".motion-status").textContent = still ? "off" : "on";
  $("#motion-toggle").setAttribute(
    "aria-label",
    motionQuery.matches
      ? "Reduced motion follows your system preference"
      : still
        ? "Enable motion"
        : "Pause motion",
  );
  sculpture.setStill(still);
  motionContext?.revert();
  stage.dataset.phase = "0";
  $("#phase-number").textContent = phaseLabels[0];
  $("#phase-copy").textContent = phaseCopy[0];
  const desktop = matchMedia("(min-width: 701px)").matches;
  if (still) {
    sculpture.update(0);
    return;
  }
  motionContext = gsap.context(() => {
    const state = { p: 0 };
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".journey",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.65,
      },
      onUpdate() {
        const p = state.p;
        sculpture.update(p);
        const phase = p < 0.29 ? 0 : p < 0.68 ? 1 : 2;
        stage.dataset.phase = String(phase);
        $("#phase-number").textContent = phaseLabels[phase];
        $("#phase-copy").textContent = phaseCopy[phase];
        $(".chapter-active").textContent = String(phase + 1).padStart(2, "0");
      },
    });
    tl.to(state, { p: 1, duration: 1, ease: "none" }, 0)
      .to(
        ".hero-field",
        { xPercent: -50, opacity: 0, duration: 0.22, ease: "power2.in" },
        0.08,
      )
      .to(
        ".hero-form",
        { xPercent: 60, opacity: 0, duration: 0.22, ease: "power2.in" },
        0.08,
      )
      .to(
        ".ink-aperture",
        {
          clipPath: "circle(85% at 50% 50%)",
          duration: 0.24,
          ease: "power2.inOut",
        },
        0.14,
      )
      .fromTo(
        ".phase-type",
        { opacity: 0, y: 70 },
        { opacity: 1, y: 0, duration: 0.15, ease: "power2.out" },
        0.29,
      )
      .to(".phase-type", { y: -130, opacity: 0, duration: 0.15 }, 0.55)
      .to(
        ".orange-curtain",
        {
          clipPath: "polygon(0 0%,100% 0%,100% 100%,0 100%)",
          duration: 0.22,
          ease: "power3.inOut",
        },
        0.59,
      )
      .fromTo(
        ".heat-type",
        { opacity: 0, y: 100 },
        { opacity: 1, y: 0, duration: 0.16, ease: "power2.out" },
        0.73,
      )
      .to(".orbit-label", { opacity: 0, duration: 0.1 }, 0.13)
      .to(".chapter-track i", { width: "100%", duration: 1, ease: "none" }, 0);
    gsap.utils.toArray(".study-art").forEach((art) => {
      gsap.fromTo(
        art,
        { clipPath: "inset(12% 0 12% 0)" },
        {
          clipPath: "inset(0% 0 0% 0)",
          ease: "none",
          scrollTrigger: {
            trigger: art,
            start: "top 95%",
            end: "top 35%",
            scrub: true,
          },
        },
      );
    });
    gsap.to(".about-mark", {
      rotation: 90,
      ease: "none",
      scrollTrigger: {
        trigger: ".about",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  });
}
syncMotion();
$("#motion-toggle").addEventListener("click", () => {
  if (motionQuery.matches) {
    $("#motion-toggle").setAttribute(
      "aria-label",
      "Motion remains off because your system requests reduced motion",
    );
    return;
  }
  manualStill = !manualStill;
  try {
    localStorage.setItem("ff-motion", manualStill ? "off" : "on");
  } catch {}
  syncMotion();
  ScrollTrigger.refresh();
});
motionQuery.addEventListener("change", () => {
  syncMotion();
  ScrollTrigger.refresh();
});
let wide = innerWidth > 700;
window.addEventListener(
  "resize",
  () => {
    const next = innerWidth > 700;
    if (next !== wide) {
      wide = next;
      syncMotion();
      ScrollTrigger.refresh();
    }
  },
  { passive: true },
);

const actions = {
  orbit: { art: ".orbit-art", off: "Set in motion", on: "Pause the orbit" },
  glow: { art: ".glow-art", off: "Shift the light", on: "Return to amber" },
  signal: {
    art: ".signal-art",
    off: "Change frequency",
    on: "Reset frequency",
  },
};
function activate(name) {
  const conf = actions[name],
    art = $(conf.art),
    button = art.querySelector(".art-action");
  const active = art.classList.toggle("is-active");
  button.setAttribute("aria-pressed", String(active));
  button.innerHTML = `${active ? conf.on : conf.off} <span aria-hidden="true">↗</span>`;
}
document
  .querySelectorAll("[data-action]")
  .forEach((button) =>
    button.addEventListener("click", () => activate(button.dataset.action)),
  );
const studyData = {
  orbit: {
    kicker: "FF—01 / FORM & BALANCE",
    title: "Almost in orbit.",
    description:
      "Three intersecting paths share a single centre. This study treats negative space as a material: the object is as much about what is missing as what is present.",
    material: "Copper / imagined",
    method: "Original vector geometry",
    interaction: "Set the three paths in a continuous orbit.",
  },
  glow: {
    kicker: "FF—02 / LIGHT & PERCEPTION",
    title: "Nothing but light.",
    description:
      "Three translucent surfaces catch a field of colour. The geometry stays the same while warm amber becomes electric blue — a small experiment in how light changes our reading of a surface.",
    material: "Refracted light",
    method: "Layered gradients & perspective",
    interaction: "Switch between amber and blue.",
  },
  signal: {
    kicker: "FF—03 / RHYTHM & RESPONSE",
    title: "Find your frequency.",
    description:
      "Concentric rings meet a field of imperfect lines. Change the frequency to contract the centre and disturb the rhythm. A graphic composition built from a few simple rules.",
    material: "Ink / imagined",
    method: "Original vector & line system",
    interaction: "Change the spacing and orientation of the field.",
  },
};
const dialog = $("#study-dialog");
let selected = "orbit",
  opener,
  skipRestore = false;
document.querySelectorAll("[data-study]").forEach((button) =>
  button.addEventListener("click", () => {
    opener = button;
    selected = button.dataset.study;
    const d = studyData[selected];
    $("#dialog-kicker").textContent = d.kicker;
    $("#dialog-title").textContent = d.title;
    $("#dialog-description").textContent = d.description;
    $("#dialog-details").replaceChildren();
    for (const [label, value] of [
      ["Material", d.material],
      ["Method", d.method],
      ["Interaction", d.interaction],
    ]) {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      $("#dialog-details").append(dt, dd);
    }
    dialog.showModal();
  }),
);
$(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
dialog.addEventListener("close", () => {
  if (!skipRestore) opener?.focus({ preventScroll: true });
  skipRestore = false;
});
$(".dialog-try").addEventListener("click", () => {
  skipRestore = true;
  dialog.close();
  const art = $(actions[selected].art);
  art.scrollIntoView({
    behavior: still ? "instant" : "smooth",
    block: "center",
  });
  activate(selected);
  art.querySelector("button").focus({ preventScroll: true });
});
// Same-page links transfer focus as well as moving the viewport.
document.querySelectorAll('a[href^="#"]').forEach((link) =>
  link.addEventListener("click", (e) => {
    const target = $(link.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({
      behavior: still ? "instant" : "smooth",
      block: "start",
    });
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    history.replaceState(null, "", link.getAttribute("href"));
  }),
);
if (!still) {
  gsap.from(".header", {
    opacity: 0,
    y: -10,
    duration: 0.8,
    ease: "power2.out",
  });
  gsap.from("#sculpture", {
    opacity: 0,
    scale: 0.9,
    rotation: -7,
    duration: 1.2,
    ease: "power3.out",
  });
}
window.__FIELD_FORM__ = {
  metrics: () => sculpture.metrics(),
  capture: () => sculpture.capture(),
  getMotion: () => ({ still, systemReduced: motionQuery.matches }),
  version: "1.0.0",
};
window.addEventListener("pagehide", (e) => {
  if (!e.persisted) sculpture.dispose();
});
