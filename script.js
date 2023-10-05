document.addEventListener("DOMContentLoaded", function() {
  // Common Initialization
  let targetX, targetY;
  const target = document.createElement("div");
  target.id = "target";
  document.body.appendChild(target);

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
    { text: "Research, narrative, user experience, visual systems.", elementId: "how" },
    { text: "Contact", elementId: "contact" }
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
    let x = handleValue - ticValue;
    if (randomXYValue > 1) {
      element.style.top = x * random1 + 'px';
      element.style.left = x * random2 + 'px';
    } else {
      element.style.top = x * random2 + 'px';
      element.style.left = x * random1 + 'px';
    }
  }

  function setMouseCoordinates(element, random1, random2, x, y, randomXYValue) {
    let targetRadius = 10;  // Assuming the target has a radius of 10 pixels
    let adjustedX = x - targetRadius;
    let adjustedY = y - targetRadius;
  
    if (randomXYValue > 1) {
      element.style.top = adjustedX * random1 + 'px';
      element.style.left = adjustedY * random2 + 'px';
    } else {
      element.style.top = adjustedY * random1 + 'px';
      element.style.left = adjustedX * random2 + 'px';
    }
  }
  

  if ('ontouchstart' in window) {
    // Initialize touch-based interaction
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
  } else {
    // Initialize mouse-based interaction
    const target = document.getElementById("target");

    target.addEventListener("load", function() {
      const svgDoc = target.contentDocument;
      const svgRoot = svgDoc.documentElement;
      const bbox = svgRoot.getBBox();
      
      targetX = Math.floor(Math.random() * window.innerWidth);
      targetY = Math.floor(Math.random() * window.innerHeight);
      target.style.position = "absolute";
      target.style.left = `${targetX - bbox.width / 2}px`;  // Center the SVG
      target.style.top = `${targetY - bbox.height / 2}px`;  // Center the SVG

      const clickableCircle = document.getElementById("clickable-circle");
      clickableCircle.style.left = `${targetX - 8}px`;  // Center the circle
      clickableCircle.style.top = `${targetY - 8}px`;  // Center the circle

      clickableCircle.addEventListener("click", function() {
        navigator.clipboard.writeText("hello@willieshaw.com").then(function() {
          // Show and then hide the message
          copyMessage.classList.add("show");
          setTimeout(function() {
            copyMessage.classList.remove("show");
          }, 2000);  // Message will fade out after 2 seconds
        }).catch(function(err) {
          console.error("Could not copy text", err);
        });
      });
    });

    let isSnapped = false;  // Variable to track whether the cursor has snapped to the target

    window.addEventListener("mousemove", function(e) {
      const x = e.clientX;
      const y = e.clientY;

      // Calculate the distance from the cursor to the center of the target
      const dx = x - targetX;  // Center of the SVG
      const dy = y - targetY;  // Center of the SVG

      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if the cursor is inside the 5x5 target at the center of the larger target
      if (distance < 10 && !isSnapped) {  // 5 pixels for the inner target radius
        isSnapped = true;
        allLetterData.forEach(({ letterIDs }) => {
          for (let i = 0; i < letterIDs.length; i++) {
            let element = document.getElementById(letterIDs[i]);
            element.style.top = '0px';
            element.style.left = '0px';
          }
        });
      } else if (distance >= 5 && isSnapped) {
        isSnapped = false;
      } else if (!isSnapped) {
        allLetterData.forEach(({ letterIDs, randomMultipliers, randomXY }) => {
          for (let i = 0; i < letterIDs.length; i++) {
            let element = document.getElementById(letterIDs[i]);
            setMouseCoordinates(element, randomMultipliers[i * 2], randomMultipliers[i * 2 + 1], x - targetX, y - targetY, randomXY[i]);
          }
        });
      }
    });


    slider.style.display = "none";
    ticMark.style.display = "none";
    contact.style.display = "none";

    
  }


  const contactLink = document.getElementById("contact-link");
  // const targetSVG = document.getElementById("target");
  const copyMessage = document.getElementById("copy-message");

  // targetSVG.addEventListener("click", function(event) {
  //   event.preventDefault();
  //   navigator.clipboard.writeText("hello@willieshaw.com").then(function() {
  //     // Show and then hide the message
  //     copyMessage.classList.add("show");
  //     setTimeout(function() {
  //       copyMessage.classList.remove("show");
  //     }, 2000);  // Message will fade out after 2 seconds
  //   }).catch(function(err) {
  //     console.error("Could not copy text", err);
  //   });
  // });

  contactLink.addEventListener("click", function(event) {
    event.preventDefault();
    navigator.clipboard.writeText("hello@willieshaw.com").then(function() {
      // Show and then hide the message
      copyMessage.classList.add("show");
      setTimeout(function() {
        copyMessage.classList.remove("show");
      }, 2000);  // Message will fade out after 2 seconds
    }).catch(function(err) {
      console.error("Could not copy text", err);
    });
  });
});
