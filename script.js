document.addEventListener("DOMContentLoaded", function() {
  // Slider and tic mark initialization
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

  // Text manipulation initialization
  let phrases = [
    { text: "Willie Shaw", elementId: "who" },
    { text: "Graphic Design", elementId: "what" },
    { text: "Research, narrative, user experience, systems.", elementId: "how" },
    { text: "CONTACT", elementId: "contact" }
  ];

  let allLetterData = [];

  phrases.forEach(phraseObj => {
    let textArea = document.getElementById(phraseObj.elementId);
    let letterIDs = [];
    let randomMultipliers = [];
    let randomXY = [];

    generateIDs(phraseObj.text, phraseObj.elementId, letterIDs);
    generateLetters(phraseObj.text, textArea, letterIDs);
    defineIDs(letterIDs);
    generateRandomMultipliers(letterIDs.length, randomMultipliers);
    generateRandomXY(letterIDs.length, randomXY);
    setInitialCoordinates(letterIDs, randomMultipliers, randomXY);

    allLetterData.push({ letterIDs, randomMultipliers, randomXY });
  });

  function updatePositions() {
    const trackWidth = slider.offsetWidth;
    const ticPosition = (ticValue / maxValue) * trackWidth;
    const rangeValue = (handleValue / maxValue) * 100;

    slider.style.setProperty('--range-value', `${rangeValue}%`);
    ticMark.style.left = `${ticPosition}px`;
  }

  function updateTicColor() {
    if (handleValue >= ticValue) {
      ticMark.style.backgroundColor = '#CEE2FF';
    } else {
      ticMark.style.backgroundColor = '#636363';
    }
  }

  function generateIDs(phrase, elementId, letterIDs) {
    for (let i = 0; i < phrase.length; i++) {
      letterIDs.push(elementId + "-letter" + i);
    }
  }

  function generateLetters(phrase, textArea, letterIDs) {
    for (let i = 0; i < phrase.length; i++) {
      textArea.innerHTML += "<span id='" + letterIDs[i] + "'>" + phrase[i] + "</span>";
    }
  }

  function defineIDs(letterIDs) {
    for (let i = 0; i < letterIDs.length; i++) {
      let element = document.getElementById(letterIDs[i]);
      element.style.position = "relative";
    }
  }

  function generateRandomMultipliers(length, randomMultipliers) {
    for (let i = 0; i < length; i++) {
      randomMultipliers.push(Math.random() * 2.5 - 1.25);
      randomMultipliers.push(Math.random() * 2 - 1);
    }
  }

  function generateRandomXY(length, randomXY) {
    for (let i = 0; i < length; i++) {
      randomXY.push(Math.random() * 2);
    }
  }

  function setInitialCoordinates(letterIDs, randomMultipliers, randomXY) {
    for (let i = 0; i < letterIDs.length; i++) {
      let element = document.getElementById(letterIDs[i]);
      setCoordinates(element, randomMultipliers[i * 2], randomMultipliers[i * 2 + 1], handleValue, ticValue, randomXY[i]);
    }
  }

  function setCoordinates(element, random1, random2, handleValue, ticValue, randomXYValue) {
    let x = handleValue - ticValue;  // Removed Math.abs()
    if (randomXYValue > 1) {
      element.style.top = x * random1 + 'px';
      element.style.left = x * random2 + 'px';
    } else {
      element.style.top = x * random2 + 'px';
      element.style.left = x * random1 + 'px';
    }
  }

  updatePositions();
  updateTicColor();

  slider.addEventListener("input", function() {
    handleValue = this.value;
    updatePositions();
    updateTicColor();

    allLetterData.forEach(({ letterIDs, randomMultipliers, randomXY }) => {
      for (let i = 0; i < letterIDs.length; i++) {
        let element = document.getElementById(letterIDs[i]);
        setCoordinates(element, randomMultipliers[i * 2], randomMultipliers[i * 2 + 1], handleValue, ticValue, randomXY[i]);
      }
    });
  });

  window.addEventListener("resize", updatePositions);

  if ('ontouchstart' in window) {
    document.documentElement.classList.add('touch');
  }
});
