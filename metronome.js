let metronomeInterval = null;
const bpmInput = document.getElementById("bpmInput");
const startBtn = document.getElementById("startMet");
const stopBtn = document.getElementById("stopMet");
const indicator = document.getElementById("metIndicator");
const beatsPerBarInput = document.getElementById("beatsPerBar");

let beatsPerBar = parseInt(beatsPerBarInput.value, 10) || 4;

beatsPerBarInput.addEventListener("change", () => {
    beatsPerBar = parseInt(beatsPerBarInput.value, 10) || 4;
    if (!metronomeInterval) {
        renderIndicator(1);
    }
});


function playClick(isDownBeat = false) {
    // web audio apip
    const ctx = new (window.AudioContext || window.webkitAudioContext) ();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = isDownBeat ? 1600 : 1000;
    gain.gain.value = 0.2;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.07);
    osc.onended = () => ctx.close();
}

function renderIndicator(currentBeat) {
    let dots = '';
    for (let i = 1; i < beatsPerBar + 1; i++) {
        if (i === currentBeat) {
            dots += `<span style="color:#2b9cff;font-size:1.2em;">●</span> `;
        } else {
            dots += `<span style="color:var(--muted);">●</span> `;
        }
    }
    indicator.innerHTML = dots.trim();
}

function startMetronome() {
    let bpm = parseInt(bpmInput.value, 10);
    if (isNaN(bpm) || bpm < 30) bpm = 30;
    if (bpm > 300) bpm = 300;
    bpmInput.value = bpm;
    beatsPerBar = parseInt(beatsPerBarInput.value, 10) || 4;
    let beat = 1;
    renderIndicator(beat);
    playClick(true);
    metronomeInterval = setInterval(() => {
        const isDownBeat = (beat %  beatsPerBar === 0);
        beat = ((beat) % beatsPerBar) + 1;
        renderIndicator(beat);
        playClick(isDownBeat); 
    }, 60000 / bpm);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    bpmInput.disabled = true;
    beatsPerBarInput.disabled = true;
}

function stopMetronome() {
    clearInterval(metronomeInterval);
    metronomeInterval = null;
    indicator.textContent = '';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    bpmInput.disabled = false;
    beatsPerBarInput.disabled = false;
}

startBtn.addEventListener("click", startMetronome);
stopBtn.addEventListener("click", stopMetronome);