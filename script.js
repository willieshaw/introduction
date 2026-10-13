const isTouch = 'ontouchstart' in window;
document.documentElement.classList.add(isTouch ? 'touch' : 'no-touch');

document.addEventListener("DOMContentLoaded", function() {
  const phrases = [
    { text: "Willie Shaw", elementId: "who" },
    { text: "Graphic Design", elementId: "what" },
    { text: "Research, narrative, user experience, visual systems.", elementId: "how" },
    { text: "Contact ⎘", elementId: "contact" },
    { text: "Work:", elementId: "work" },
    { text: "Vespucci Group", elementId: "vespucci" },
    { text: "Frisenda Architects", elementId: "frisenda" },
    { text: "Somewhere", elementId: "somewhere" }
  ];

  // Each letter is its own span with random multipliers that decide how far and
  // which way it drifts from its typeset spot.
  const letters = [];
  phrases.forEach(({ text, elementId }) => {
    const container = document.getElementById(elementId);
    for (const char of text) {
      const element = document.createElement("span");
      element.textContent = char;
      element.style.position = "relative";
      container.appendChild(element);
      letters.push({
        element,
        random1: Math.random() * 2.5 - 1.25,
        random2: Math.random() * 2 - 1,
        swapAxes: Math.random() * 2 <= 1,
        x: 0, y: 0, tx: 0, ty: 0  // current and target offsets in px
      });
    }
  });

  // Letters ease toward their targets in one animation loop, a step every frame.
  // CSS transitions restarted on every mouse or slider event never got to run, so
  // letters froze or jumped while the input was moving.
  const EASE_SECONDS = 0.11;
  let frameRequested = false;
  let lastFrame = null;

  function moveTo(letter, top, left) {
    letter.ty = top;
    letter.tx = left;
    if (!frameRequested) {
      frameRequested = true;
      lastFrame = null;
      requestAnimationFrame(step);
    }
  }

  function render(letter) {
    letter.element.style.left = letter.x + 'px';
    letter.element.style.top = letter.y + 'px';
  }

  function step(now) {
    const dt = lastFrame === null ? 1000 / 60 : now - lastFrame;
    const k = 1 - Math.exp(-dt / 1000 / EASE_SECONDS);
    lastFrame = now;
    let moving = false;
    letters.forEach(letter => {
      letter.x += (letter.tx - letter.x) * k;
      letter.y += (letter.ty - letter.y) * k;
      if (Math.abs(letter.tx - letter.x) < 0.05 && Math.abs(letter.ty - letter.y) < 0.05) {
        letter.x = letter.tx;
        letter.y = letter.ty;
      } else {
        moving = true;
      }
      render(letter);
    });
    if (moving) requestAnimationFrame(step);
    else frameRequested = false;
  }

  function jumpToTargets() {
    letters.forEach(letter => {
      letter.x = letter.tx;
      letter.y = letter.ty;
      render(letter);
    });
  }

  // Slider: the letters line up when the handle sits on the tic mark.
  const slider = document.getElementById("slider");
  const ticMark = document.getElementById("tic-mark");
  const maxValue = 1000;
  const minInitValue = Math.floor(0.1 * maxValue);
  const maxInitValue = Math.floor(0.9 * maxValue);
  const minDistance = Math.floor(0.1 * maxValue);
  let ticValue, handleValue;

  do {
    ticValue = Math.floor(Math.random() * (maxInitValue - minInitValue) + minInitValue);
    handleValue = Math.floor(Math.random() * (maxInitValue - minInitValue) + minInitValue);
  } while (handleValue >= ticValue || Math.abs(ticValue - handleValue) < minDistance);

  slider.max = maxValue;
  slider.value = handleValue;

  function scatterBySlider() {
    const x = handleValue - ticValue;
    letters.forEach(letter => {
      if (letter.swapAxes) moveTo(letter, x * letter.random2, x * letter.random1);
      else moveTo(letter, x * letter.random1, x * letter.random2);
    });
  }

  scatterBySlider();
  jumpToTargets();

  if (isTouch) {
    function updateSlider() {
      const padding = 10;  // Track padding on each side
      const effectiveTrackWidth = slider.offsetWidth - padding * 2;
      ticMark.style.left = `${(ticValue / maxValue) * effectiveTrackWidth + padding}px`;
      slider.style.setProperty('--range-value', `${(handleValue / maxValue) * 100}%`);
      ticMark.style.backgroundColor = handleValue >= ticValue ? 'white' : '#636363';
      scatterBySlider();
    }

    updateSlider();

    slider.addEventListener("change", function() {
      const snapDistance = 26;
      if (Math.abs(this.value - ticValue) < snapDistance) {
        this.value = ticValue;
        document.body.style.color = 'white';
      } else {
        document.body.style.color = '#d0d0d0';
      }
      handleValue = Number(this.value);
      updateSlider();
    });

    slider.addEventListener("input", function() {
      handleValue = Number(this.value);
      updateSlider();
    });
  } else {
    // Mouse: the letters line up when the cursor reaches the target, a small SVG
    // placed at random in the middle of the window. Clicking it pauses the letters.
    const target = document.getElementById("target");
    const clickableCircle = document.getElementById("clickable-circle");
    let targetX, targetY;
    let isAnimationPaused = false;

    slider.style.display = "none";
    ticMark.style.display = "none";

    function changeSvgColor(color) {
      target.contentDocument.documentElement.querySelectorAll('*').forEach(el => {
        if (el.getAttribute('fill')) el.style.fill = color;
      });
    }

    // Safari can fire load more than once, which used to register the click
    // handler twice so a click paused and immediately unpaused.
    target.addEventListener("load", function() {
      const svgRoot = target.contentDocument.documentElement;
      const bbox = svgRoot.getBBox();

      // Random position within the middle 80% of the window
      const horizontalMargin = window.innerWidth * 0.1;
      const verticalMargin = window.innerHeight * 0.1;
      targetX = Math.floor(Math.random() * (window.innerWidth - 2 * horizontalMargin - bbox.width)) + horizontalMargin;
      targetY = Math.floor(Math.random() * (window.innerHeight - 2 * verticalMargin - bbox.height)) + verticalMargin;

      target.style.position = "absolute";
      target.style.left = `${targetX - bbox.width / 2}px`;
      target.style.top = `${targetY - bbox.height / 2}px`;
      clickableCircle.style.left = `${targetX - 8}px`;
      clickableCircle.style.top = `${targetY - 8}px`;

      clickableCircle.addEventListener("click", function() {
        isAnimationPaused = !isAnimationPaused;
        const color = isAnimationPaused ? 'white' : '#d0d0d0';
        changeSvgColor(color);
        document.body.style.color = color;
        document.querySelectorAll('a').forEach(link => { link.style.color = color; });
      });
    }, { once: true });

    window.addEventListener("mousemove", function(e) {
      if (isAnimationPaused || targetX === undefined) {
        return;  // Paused, or the target hasn't been placed yet
      }

      const dx = e.clientX - targetX;
      const dy = e.clientY - targetY;

      if (Math.hypot(dx, dy) < 10) {
        letters.forEach(letter => moveTo(letter, 0, 0));
        return;
      }

      // Offsets are measured from the target's edge, 10px from its center
      const adjustedX = dx - 10;
      const adjustedY = dy - 10;
      letters.forEach(letter => {
        if (letter.swapAxes) {
          moveTo(letter, adjustedX * letter.random2, adjustedY * letter.random1);
        } else {
          moveTo(letter,
            adjustedY * letter.random1 + adjustedX * letter.random2,
            adjustedX * letter.random1 + adjustedY * letter.random2);
        }
      });
    });
  }

  // Contact copies the email address instead of opening a mail app
  const copyMessage = document.getElementById("copy-message");
  document.getElementById("contact-link").addEventListener("click", function(event) {
    event.preventDefault();
    navigator.clipboard.writeText("hello@willieshaw.com").then(function() {
      copyMessage.classList.add("show");
      setTimeout(function() {
        copyMessage.classList.remove("show");
      }, 2000);
    }).catch(function(err) {
      console.error("Could not copy text", err);
    });
  });
});
