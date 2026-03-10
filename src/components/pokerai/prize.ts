interface PrizeElements {
  prizeBox: HTMLElement | null;
  slotMachine: HTMLElement | null;
  slotDisplay: HTMLElement | null;
  lever: HTMLElement | null;
  prizeValue: HTMLElement | null;
}

const moneySymbols = ["💵", "💰", "💸", "$"];
const symbols = ["🎰", "💎", "7️⃣", "🎲", "🍀", "⭐"];

const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

function createMoneyParticle (x: number, y: number) {
  const particle = document.createElement("div");
  particle.className = "money-particle";
  particle.textContent = moneySymbols[Math.floor(Math.random() * moneySymbols.length)];

  const angle = Math.random() * Math.PI * 2;
  const distance = 100 + Math.random() * 100;
  const xMove = Math.cos(angle) * distance;
  const yMove = Math.sin(angle) * distance;
  const rotation = Math.random() * 360;

  particle.style.setProperty("--x-move", `${xMove}px`);
  particle.style.setProperty("--y-move", `${yMove}px`);
  particle.style.setProperty("--rotation", `${rotation}deg`);

  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;

  document.body.appendChild(particle);
  setTimeout(() => particle.remove(), 1000);
}

const AUDIO = {
  SPIN: new Audio('https://poker-splash-2025.netlify.app/sounds/slot-spin.mp3'),
  WIN: new Audio('https://poker-splash-2025.netlify.app/sounds/slot-win.mp3'),
  LEVER: new Audio('https://poker-splash-2025.netlify.app/sounds/lever-pull.flac'),
};

// Initialize audio settings
Object.values(AUDIO).forEach(audio => {
  audio.preload = 'auto';
  audio.volume = 0.5;
});

function animatePrizeIncrease (element: HTMLElement, startValue: number, increment: number, duration: number) {
  const steps = 60;
  const stepValue = increment / steps;
  const stepDuration = duration / steps;
  let currentStep = 0;

  const updateValue = () => {
    currentStep++;
    const currentValue = startValue + (stepValue * currentStep);
    element.textContent = formatNumber(Math.floor(currentValue));

    if (currentStep < steps) {
      requestAnimationFrame(() => setTimeout(updateValue, stepDuration));
    }
  };

  updateValue();
}

// Add tracking function
function trackEvent (eventName: string) {
  if (typeof umami !== 'undefined') {
    umami.track(eventName);
  }
}

export function initializePrize () {
  const elements: PrizeElements = {
    prizeBox: document.getElementById("prize-box"),
    slotMachine: document.getElementById("slot-machine"),
    slotDisplay: document.querySelector(".slot-display"),
    lever: document.querySelector('.lever'),
    prizeValue: document.getElementById("prize-value")
  };

  let clickCount = 0;
  let currentPrize = 6000;
  let isSpinning = false;

  // Update initial display with formatting
  if (elements.prizeValue) {
    elements.prizeValue.textContent = formatNumber(currentPrize);
  }

  function spinSlots () {
    if (isSpinning || currentPrize < 1) return;

    // Play lever and spin sounds
    AUDIO.LEVER.play();
    AUDIO.SPIN.play();
    AUDIO.SPIN.loop = true;

    currentPrize -= 1;
    if (elements.prizeValue) {
      elements.prizeValue.textContent = formatNumber(currentPrize);
    }

    isSpinning = true;

    let spins = 0;
    const maxSpins = 20;
    const interval = setInterval(() => {
      const randomSymbols = Array(3).fill(0).map(() =>
        symbols[Math.floor(Math.random() * symbols.length)]
      );
      if (elements.slotDisplay) {
        elements.slotDisplay.textContent = randomSymbols.join(" ");
      }

      spins++;
      if (spins >= maxSpins) {
        clearInterval(interval);
        isSpinning = false;

        AUDIO.SPIN.loop = false;
        AUDIO.SPIN.pause();
        AUDIO.SPIN.currentTime = 0;

        if (elements.slotDisplay && elements.prizeValue && elements.lever) {
          const finalSymbols = elements.slotDisplay.textContent?.split(" ") || [];
          if (new Set(finalSymbols).size === 1) {
            // Play win sound for matching symbols
            AUDIO.WIN.play();
            setTimeout(() => {
              AUDIO.WIN.pause();
              AUDIO.WIN.currentTime = 0;
            }, 3000);

            elements.slotDisplay!.classList.add("winner");
            setTimeout(() => elements.slotDisplay!.classList.remove("winner"), 1000);

            const winSoundDuration = 3000;

            animatePrizeIncrease(
              elements.prizeValue,
              currentPrize,
              6000,
              winSoundDuration
            );

            currentPrize += 6000;
            elements.prizeValue.classList.add("prize-increase");
            setTimeout(() => elements.prizeValue!.classList.remove("prize-increase"), winSoundDuration);
          }

          if (currentPrize < 1) {
            elements.lever.classList.add('disabled');
            elements.slotDisplay.textContent = "💸 💸 💸";
          }
        }
      }
    }, 100);
  }

  // Event Listeners
  elements.prizeBox?.addEventListener("click", (e) => {
    clickCount++;
    const rect = elements.prizeBox!.getBoundingClientRect();
    elements.prizeBox!.classList.add("pop");

    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        createMoneyParticle(x, y);
      }, i * 50);
    }

    setTimeout(() => {
      elements.prizeBox?.classList.remove("pop");
    }, 300);

    if (clickCount === 10 && elements.slotMachine && elements.prizeBox) {
      elements.slotMachine.style.display = "block";
      elements.prizeBox.style.marginBottom = "2rem";
      // Track when users discover the slot machine
      trackEvent('slot_machine_discovered');
    }
  });

  elements.lever?.addEventListener('mousedown', () => {
    if (isSpinning || currentPrize < 1) return;
    elements.lever?.classList.add('pulled');
    // Track when users play the slot machine
    trackEvent('slot_machine_played');
    spinSlots();

    setTimeout(() => {
      elements.lever?.classList.remove('pulled');
    }, 1000);
  });

  elements.lever?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isSpinning || currentPrize < 1) return;
    elements.lever?.classList.add('pulled');
    // Track when users play the slot machine (mobile)
    trackEvent('slot_machine_played');
    spinSlots();

    setTimeout(() => {
      elements.lever?.classList.remove('pulled');
    }, 1000);
  });
}