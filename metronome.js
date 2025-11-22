// Constants and Variables
let metronomeInterval = null;
const bpmInput = document.getElementById("bpmInput");
const startBtn = document.getElementById("startMet");
const stopBtn = document.getElementById("stopMet");
const indicator = document.getElementById("metIndicator");
const beatsPerBarInput = document.getElementById("beatsPerBar");

// Pendulum Canvas
const pendulumCanvas = document.getElementById("pendulumCanvas");
const pendulumCtx = pendulumCanvas ? pendulumCanvas.getContext("2d") : null;
let pendulumAnimId = null;
let pendulumStartTime = null;
let pendulumBpm = 120;
let pendulumBeatsPerBar = 4;
let pendulumIsRunning = false;
let pendulumLastBeatTime = null;
let pendulumDirection = 1; // 1 for left->right, -1 for right->left

// Default beats per bar
let beatsPerBar = parseInt(beatsPerBarInput.value, 10) || 4;

// Beats per bar from user input
beatsPerBarInput.addEventListener("change", () => {
    beatsPerBar = parseInt(beatsPerBarInput.value, 10) || 4;
    if (!metronomeInterval) {
        renderIndicator(1);
    }
});

// Click sound from local storage
if (!localStorage.getItem("metClickSound")) {
    localStorage.setItem("metClickSound", "tick");
}
let clickSound = localStorage.getItem("metClickSound") || "tick";

// audio files mapping
const audioFiles = {
    tick: "sounds/tick.mp3",
    clap: "sounds/clap.wav",
    snap: "sounds/snap.wav"
};

// Play the click sound
function playClick(isDownBeat = false) {
    // Get the click sound from local storage
    clickSound = localStorage.getItem('metClickSound') || "tick";
    const audio = new Audio(audioFiles[clickSound] || audioFiles['tick']);
    audio.currentTime = 0;
    // Louder sound for downbeat
    audio.volume = isDownBeat ? 1.0 : 0.6;
    audio.play();
}

// Render the visual indicator for the current beat
function renderIndicator(currentBeat) {
    // Clear dots
    let dots = '';
    // For each beat
    for (let i = 1; i < beatsPerBar + 1; i++) {
        if (i === currentBeat) {
            // if current beat, highlight it
            dots += `<span style="color:#2b9cff;font-size:3.2em;">●</span> `;
        } else {
            // otherwise default
            dots += `<span style="color:var(--muted);font-size:2.6em;">●</span> `;
        }
    }
    indicator.innerHTML = dots.trim();
}

// Draw pendulum at a given phase (0 to 1)
function drawPendulum(phase, direction = 1) {
    if (!pendulumCtx) return;
    const ctx = pendulumCtx;
    ctx.clearRect(0, 0, pendulumCanvas.width, pendulumCanvas.height);
    // Needle (pivot) at bottom center
    const cx = pendulumCanvas.width / 2;
    const cy = pendulumCanvas.height - 36; // more bottom margin for bigger needle
    const length = 170;
    const needleWidth = 12;
    const tipLength = 32;
    const counterWeightRadius = 18;
    // Swing angle: -max to +max (radians)
    const maxAngle = Math.PI / 4; // 45 degrees
    // For each beat, phase 0: start, 1: end; direction alternates
    // angle = -maxAngle + (phase * 2 * maxAngle) * direction
    let angle;
    if (direction === 1) {
        // left to right
        angle = -maxAngle + (phase * 2 * maxAngle);
    } else {
        // right to left
        angle = maxAngle - (phase * 2 * maxAngle);
    }
    // Needle tip (top)
    const px = cx + length * Math.sin(angle);
    const py = cy - length * Math.cos(angle);
    // Draw needle (thin, long, with pointed tip)
    ctx.save();
    ctx.strokeStyle = '#2b9cff';
    ctx.lineWidth = needleWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.restore();

    // Draw needle tip (triangle)
    ctx.save();
    ctx.fillStyle = '#2b9cff';
    ctx.beginPath();
    // Tip direction
    const tipAngle = angle;
    const tipBaseX1 = px + tipLength * Math.sin(tipAngle + Math.PI * 0.5) * 0.3;
    const tipBaseY1 = py - tipLength * Math.cos(tipAngle + Math.PI * 0.5) * 0.3;
    const tipBaseX2 = px + tipLength * Math.sin(tipAngle - Math.PI * 0.5) * 0.3;
    const tipBaseY2 = py - tipLength * Math.cos(tipAngle - Math.PI * 0.5) * 0.3;
    const tipX = px + tipLength * Math.sin(tipAngle);
    const tipY = py - tipLength * Math.cos(tipAngle);
    ctx.moveTo(tipBaseX1, tipBaseY1);
    ctx.lineTo(tipBaseX2, tipBaseY2);
    ctx.lineTo(tipX, tipY);
    ctx.closePath();
    ctx.shadowColor = '#2b9cff';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Draw counterweight (small circle near bottom of needle)
    const cwDist = length * 0.7;
    const cwX = cx + cwDist * Math.sin(angle);
    const cwY = cy - cwDist * Math.cos(angle);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cwX, cwY, counterWeightRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#2563eb';
    ctx.shadowColor = '#2563eb';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Draw fixed pivot at bottom
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#888';
    ctx.shadowColor = '#888';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
}

function animatePendulum() {
    if (!pendulumIsRunning) return;
    const now = performance.now();
    const beatDuration = 60 / pendulumBpm;
    let elapsedSinceLastBeat = (now - pendulumLastBeatTime) / 1000;
    if (elapsedSinceLastBeat >= beatDuration) {
        pendulumDirection *= -1; // alternate direction
        pendulumLastBeatTime += beatDuration * 1000;
        elapsedSinceLastBeat = (now - pendulumLastBeatTime) / 1000;
    }
    // Phase: 0 to 1 for current half-swing
    const phase = Math.min(elapsedSinceLastBeat / beatDuration, 1);
    drawPendulum(phase, pendulumDirection);
    pendulumAnimId = requestAnimationFrame(animatePendulum);
}

function startPendulum(bpm, beatsPerBar) {
    pendulumBpm = bpm;
    pendulumBeatsPerBar = beatsPerBar;
    pendulumIsRunning = true;
    pendulumStartTime = performance.now();
    pendulumLastBeatTime = pendulumStartTime;
    pendulumDirection = 1;
    animatePendulum();
}

function stopPendulum() {
    pendulumIsRunning = false;
    if (pendulumAnimId) {
        cancelAnimationFrame(pendulumAnimId);
        pendulumAnimId = null;
    }
    if (pendulumCtx) pendulumCtx.clearRect(0, 0, pendulumCanvas.width, pendulumCanvas.height);
}

// Start the metronome
function startMetronome() {
    // get the click sound from local storage
    clickSound = localStorage.getItem('metClickSound') || "tick";
    // get the bpm
    let bpm = parseInt(bpmInput.value, 10);
    // if bug values set to limits
    if (isNaN(bpm) || bpm < 30) bpm = 30;
    if (bpm > 300) bpm = 300;
    bpmInput.value = bpm;
    // get beats per bar
    beatsPerBar = parseInt(beatsPerBarInput.value, 10) || 4;

    // Initialize the current beat
    let beat = 1;

    // Disable controls while metronome is running, enable stop button
    startBtn.disabled = true;
    stopBtn.disabled = false;
    bpmInput.disabled = true;
    beatsPerBarInput.disabled = true;

    // Start pendulum animation
    startPendulum(bpm, beatsPerBar);

    // set the interval for the metronome
    metronomeInterval = setInterval(() => {
        const isDownBeat = (beat === 1);
        renderIndicator(beat);
        playClick(isDownBeat);
        beat = (beat % beatsPerBar) + 1;
    }, 60000 / bpm);

    renderIndicator(beat);
}

// Stop the metronome
function stopMetronome() {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
    indicator.textContent = '';
    // Stop pendulum animation
    stopPendulum();
    // Enable controls when metronome is stopped, disable stop button
    startBtn.disabled = false;
    stopBtn.disabled = true;
    bpmInput.disabled = false;
    beatsPerBarInput.disabled = false;
}

startBtn.addEventListener("click", startMetronome);
stopBtn.addEventListener("click", stopMetronome);