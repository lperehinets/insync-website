gsap.registerPlugin(ScrollTrigger);

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const figure = document.getElementById("figure");
const armBack = document.getElementById("arm-back");
const armFront = document.getElementById("arm-front");
const forearmBack = document.getElementById("forearm-back");
const forearmFront = document.getElementById("forearm-front");
const legBack = document.getElementById("leg-back");
const legFront = document.getElementById("leg-front");
const shinBack = document.getElementById("shin-back");
const shinFront = document.getElementById("shin-front");
const runnerWrap = document.getElementById("runner-wrap");
const track = document.getElementById("track");
const km = document.getElementById("km");
const progressBar = document.querySelector(".progress span");

const SHOULDER = { x: 38, y: 28 };
const HIP = { x: 39, y: 56 };

function setGroup(el, x, y, rot, extra = "") {
  el.setAttribute("transform", `translate(${x} ${y}) rotate(${rot}) ${extra}`);
}

function pose(phase) {
  const tau = Math.PI * 2;
  const s = Math.sin(phase * tau);
  const c = Math.cos(phase * tau);
  const flight = 1 - Math.abs(s);
  const bob = -3 - flight * 7;

  const thighL = s * 54;
  const thighR = -s * 54;
  const shinL = 22 + (s * 0.5 + 0.5) * 55;
  const shinR = 22 + (-s * 0.5 + 0.5) * 55;
  const armL = -s * 50;
  const armR = s * 50;
  const elbowL = 86 + c * 10;
  const elbowR = 86 - c * 10;
  const lean = 20;

  figure.setAttribute("transform", `translate(0 ${bob}) rotate(${lean} 40 70)`);

  setGroup(armBack, SHOULDER.x, SHOULDER.y, armL);
  setGroup(forearmBack, 0, 20, elbowL);
  setGroup(armFront, SHOULDER.x + 2, SHOULDER.y, armR);
  setGroup(forearmFront, 0, 20, elbowR);

  setGroup(legBack, HIP.x, HIP.y, thighL);
  setGroup(shinBack, 0, 26, shinL);
  setGroup(legFront, HIP.x + 1, HIP.y, thighR);
  setGroup(shinFront, 0, 26, shinR);
}

function placeRunner(progress) {
  const lane = document.querySelector(".track-lane");
  if (!lane || !runnerWrap) return;
  const max = Math.max(0, lane.clientWidth - runnerWrap.offsetWidth);
  const x = progress * max;
  runnerWrap.style.transform = `translate3d(${x}px, 0, 0)`;
  pose((progress * 22) % 1);
  km.textContent = (progress * 5).toFixed(1);
}

function intro() {
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
  tl.from(".hero-mark", { y: 24, scale: 0.92, opacity: 0, duration: 1 }, 0)
    .from(".running span", { yPercent: 110, duration: 1.05 }, 0.12)
    .from(".club span", { yPercent: 110, duration: 1.05 }, 0.2)
    .from(".side span", { yPercent: 120, duration: 0.8 }, 0.32)
    .from(".tagline span", { yPercent: 120, duration: 0.8 }, 0.42)
    .from(".scroll-cue", { opacity: 0, y: 10, duration: 0.7 }, 0.7);
}

function setupScroll() {
  gsap.to(".progress span", {
    width: "100%",
    ease: "none",
    scrollTrigger: { scrub: 0.2 },
  });

  gsap.to(".scroll-cue", {
    opacity: 0,
    y: -12,
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "60% top",
      scrub: true,
    },
  });

  document.querySelectorAll(".beat").forEach((beat) => {
    const inner = beat.querySelector(".beat-inner");
    gsap
      .timeline({
        scrollTrigger: {
          trigger: beat,
          start: "top 70%",
          end: "bottom 40%",
          scrub: 0.4,
        },
      })
      .fromTo(inner, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: "none" })
      .to({}, { duration: 1.35 })
      .to(inner, { opacity: 0, duration: 0.55, ease: "none" });
  });

  gsap.from(".event h2, .event-kicker, .event-meta, .event .btn", {
    y: 40,
    opacity: 0,
    stagger: 0.08,
    duration: 0.9,
    ease: "power3.out",
    scrollTrigger: { trigger: ".event", start: "top 70%" },
  });

  const trackShow = gsap.timeline({
    scrollTrigger: {
      trigger: ".story",
      start: "top 75%",
      end: "bottom 60%",
      scrub: 0.35,
      onUpdate: (self) => placeRunner(self.progress),
    },
  });

  trackShow.fromTo(
    track,
    { opacity: 0, y: 28 },
    { opacity: 1, y: 0, duration: 0.15, ease: "none" },
    0
  );
  trackShow.to(track, { opacity: 0, y: 20, duration: 0.12, ease: "none" }, 0.88);

  window.addEventListener("resize", () => {
    const st = ScrollTrigger.getAll().find((t) => t.trigger === document.querySelector(".story"));
    if (st) placeRunner(st.progress);
  });

  ScrollTrigger.create({
    trigger: ".event",
    start: "top 70px",
    end: "bottom 70px",
    toggleClass: { targets: ".nav", className: "nav-dark" },
  });
}

function boot() {
  pose(0.12);
  placeRunner(0);

  if (reduced) {
    track.style.opacity = "1";
    track.style.transform = "none";
    document.querySelectorAll(".clip > span").forEach((el) => {
      el.style.transform = "none";
    });
    intro();
    return;
  }

  const lenis = new Lenis({
    duration: 1.15,
    smoothWheel: true,
    touchMultiplier: 1.1,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  intro();
  setupScroll();

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      e.preventDefault();
      lenis.scrollTo(id, { offset: 0 });
    });
  });
}

boot();
