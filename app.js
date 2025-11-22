// notes
const noteStrings = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
// inputs
let audioContext, analyser, mediaStreamSource, rafId;
// samples
let bufferLength = 2048;
let dataArray;
// A4 frequency
let refA = 440;
let stream;
let lastFreq = null;
let silenceFrames = 0;

// constants
const statusEl = document.getElementById('status');
const noteEl = document.getElementById('note');
const leftLabel = document.getElementById('leftLabel');
const rightLabel = document.getElementById('rightLabel');
const gCanvas = document.getElementById('gauge');
const vCanvas = document.getElementById('visual');

// constants for silence detection
const silence_frames_threshold = 8;
const min_rms = 0.01;
const min_confidence_ratio = 0.1;

const gCtx = gCanvas.getContext('2d');
const vCtx = vCanvas.getContext('2d');

// update the UI with note
function updateUI(frequency){
  // if there's no frequency make the notes blank
  if(!frequency || frequency <= 0){
    noteEl.textContent = '—';
    leftLabel.textContent = '-';
    rightLabel.textContent = '-';
    drawGauge(null);
    drawWaveform(new Float32Array(bufferLength)); // clear
    return;
  }
    
  // constants for finding notes
  const noteNum = 12 * (Math.log(frequency / refA) / Math.log(2)) + 69;
  const rounded = Math.round(noteNum);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const noteName = noteStrings[((rounded % 12) + 12) % 12];
  const octave = Math.floor((rounded / 12) - 1);
  const noteLabel = noteName + octave
  const cents = Math.round((noteNum - rounded) * 100);
  noteEl.textContent = noteLabel;

  // Calculate left and right notes
  const leftIndex = (noteIndex + 11) % 12;
  const rightIndex = (noteIndex + 1) % 12;
  const leftOctave = leftIndex === 11 ? octave - 1 : octave;
  const rightOctave = rightIndex === 0 ? octave + 1 : octave;
  leftLabel.textContent = noteStrings[leftIndex] + leftOctave;
  rightLabel.textContent = noteStrings[rightIndex] + rightOctave;

  drawGauge(cents);
}

// draw the tuning gauge
function drawGauge(cents){
  const DPR = window.devicePixelRatio || 1;
  const w = gCanvas.clientWidth * DPR;
  const h = gCanvas.clientHeight * DPR;
  // validate size
  if (gCanvas.width !== w || gCanvas.height !== h){
    gCanvas.width = w; gCanvas.height = h;
  }
  // clear canvas
  gCtx.clearRect(0,0,w,h);
  gCtx.save();
  gCtx.translate(w/2, h*0.9);
  const radius = Math.min(w/2 - 20, h*0.85);
  // arc
  gCtx.lineWidth = 6*DPR;
  gCtx.beginPath();
  gCtx.arc(0,0, radius, Math.PI, 0, false);
  gCtx.strokeStyle = '#000';
  gCtx.stroke();

  // ticks: -50..50 cents range
  for(let i=-50;i<=50;i+=5){
    const angle = Math.PI - (i+50)/100*Math.PI;
    const rOut = radius;
    const rIn = rOut - (i%10==0?28*DPR:18*DPR);
    const x1 = Math.cos(angle)*rIn, y1 = -Math.sin(angle)*rIn;
    const x2 = Math.cos(angle)*rOut, y2 = -Math.sin(angle)*rOut;
    // color center ticks green, small ticks red, mid ticks green if near center
    const abs = Math.abs(i);
    if(abs <= 10) gCtx.strokeStyle = '#24b47a';
    else gCtx.strokeStyle = '#e24b4b';
    gCtx.lineWidth = (i%10==0?3*DPR:1.6*DPR);
    gCtx.beginPath(); gCtx.moveTo(x1,y1); gCtx.lineTo(x2,y2); gCtx.stroke();
  }

  // center baseline (small curved strip)
  gCtx.beginPath(); gCtx.lineWidth = 4*DPR; gCtx.strokeStyle = '#000'; gCtx.arc(0,0,radius-36*DPR, Math.PI, 0, false); gCtx.stroke();

  // needle
  if(cents !== null && cents !== undefined){
    const value = Math.max(-50, Math.min(50, cents));
    const angle = Math.PI - (value+50)/100*Math.PI;
    const nx = Math.cos(angle)*(radius-46*DPR), ny = -Math.sin(angle)*(radius-46*DPR);
    gCtx.beginPath(); gCtx.moveTo(0,0); gCtx.lineTo(nx,ny);
    gCtx.strokeStyle = '#2563eb'; gCtx.lineWidth = 4*DPR; gCtx.stroke();
    gCtx.beginPath(); gCtx.arc(0,0,6*DPR,0,Math.PI*2); gCtx.fillStyle = '#2563eb'; gCtx.fill();
  }
  gCtx.restore();
}

// algorithm to detect pitch
function autoCorrelate(buf, sampleRate) {
  let SIZE = buf.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    let val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  // too quiet
  if (rms < min_rms) return -1; 

  // trim noise
  let r1 = 0;
  let threshold = 0.1;
  while (r1 < SIZE && Math.abs(buf[r1]) < threshold) r1++;
  if (r1 === SIZE) return -1;

  let r2 = SIZE - 1;
  while (r2 > 0 && Math.abs(buf[r2]) < threshold) r2--;

  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  let c = new Array(SIZE).fill(0);

  // autocorrelation
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] += buf[j] * buf[j + i];
    }
  }

  // find the first positive slope
  let d = 0;
  while (d < SIZE - 1 && c[d] > c[d + 1]) d++;

  // find max after that
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }

  if (maxpos <= 0) return -1;

  if (c[0] <= 0 || maxval < min_confidence_ratio * c[0]) return -1;

  // parabolic interpolation for accuracy
  let x1 = c[maxpos - 1], x2 = c[maxpos], x3 = c[maxpos + 1];
  let a = (x1 + x3 - 2 * x2) / 2;
  let b = (x3 - x1) / 2;
  if (a) maxpos = maxpos - b / (2 * a);

  return sampleRate / maxpos;
}

// smooth frequency changes
function smoothFrequency(prev, current, s=6){
  if(!prev) return current;
  const alpha = Math.max(0.05, Math.min(1, s/10));
  return prev * (1 - alpha) + current * alpha;
}

// start the audio processing
async function start(){
  // try get an input streamt
  try{
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      statusEl.textContent = 'getUserMedia not supported in this browser.'; return;
    }
    statusEl.textContent = 'Requesting microphone...';
    stream = await navigator.mediaDevices.getUserMedia({audio:true});
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    bufferLength = analyser.fftSize;
    dataArray = new Float32Array(bufferLength);
    mediaStreamSource.connect(analyser);
    statusEl.textContent = 'Listening...';
    
    tick();
  
  // errors for microphone access
  }catch(err){
    console.error(err); statusEl.textContent = 'Microphone access denied or error.';
  }
}

// function for tick
function tick(){
  analyser.getFloatTimeDomainData(dataArray);
  drawWaveform(dataArray);
  // get the frequency
  const freq = autoCorrelate(dataArray, audioContext.sampleRate);
  if(freq && freq !== -1 && freq < 5000){
    lastFreq = smoothFrequency(lastFreq, freq, 6);
    silenceFrames = 0;
    updateUI(lastFreq);
  } else {
    silenceFrames ++;
    if (silenceFrames > silence_frames_threshold){
        lastFreq = null;
    } else {
        lastFreq = lastFreq ? lastFreq * 0.985 : null;
    }
    //update the UI
    updateUI(lastFreq);
  }
  rafId = requestAnimationFrame(tick);
}

// draw the waveform
function drawWaveform(buf){
  const DPR = window.devicePixelRatio || 1;
  const w = vCanvas.clientWidth * DPR, h = vCanvas.clientHeight * DPR;
  if (vCanvas.width !== w || vCanvas.height !== h){
    vCanvas.width = w; vCanvas.height = h;
  }
  vCtx.clearRect(0,0,w,h);
  // background area
  vCtx.fillStyle = '#e8eef2';
  vCtx.fillRect(0,0,w,h);
  vCtx.beginPath();
  vCtx.lineWidth = 2*DPR;
  vCtx.strokeStyle = '#000';
  
  const step = Math.ceil(buf.length / w);
  let x = 0;
  for(let i=0;i<w;i++){
    const v = buf[i*step] ?? 0;
    const y = (1+v)/2 * h;
    if(i===0) vCtx.moveTo(x,y); else vCtx.lineTo(x,y);
    x+=1;
  }
  vCtx.stroke();
}

// start on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

// initialize visuals 
drawGauge(null);
drawWaveform(new Float32Array(2048));

