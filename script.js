let video;
let previousPixels = [];
let audioIniciado = false;

// Variables de análisis
let movimientoGlobal = 0;
let luzGlobal = 0;
let texturaGlobal = 0;

// Motores de Tone.js
let reverb, filtro, dronCalido, dronFrio, arpegiador;
let notasArpegio = ["C4", "Eb4", "G4", "Bb4", "C5", "D5"];
let indiceArpegio = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  // Iniciar la cámara
  video = createCapture(VIDEO);
  video.size(64, 48); // Resolución baja para no saturar el iPhone
  video.hide(); 

  let btn = document.getElementById('start-btn');
  btn.addEventListener('click', async () => {
    await Tone.start();
    iniciarSintetizadores();
    audioIniciado = true;
    btn.style.display = 'none';
    document.getElementById('status').innerText = "SISTEMA ACTIVO";
  });
}

function iniciarSintetizadores() {
  reverb = new Tone.Reverb({ decay: 8, wet: 0.8 }).toDestination();
  filtro = new Tone.Filter({ type: "lowpass", frequency: 400, Q: 2 }).connect(reverb);
  
  dronFrio = new Tone.Oscillator({ frequency: "C3", type: "sine", volume: -15 }).connect(filtro).start();
  dronCalido = new Tone.Oscillator({ frequency: "G2", type: "sawtooth", volume: -20 }).connect(filtro).start();

  arpegiador = new Tone.Synth({ 
    oscillator: { type: "triangle" }, 
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.1, release: 1 } 
  }).connect(reverb);
  arpegiador.volume.value = -12;

  Tone.Transport.scheduleRepeat(tocarArpegio, "8n");
  Tone.Transport.bpm.value = 90;
  Tone.Transport.start();
}

function draw() {
  background(0, 20); 

  if (!audioIniciado || video.pixels.length === 0) {
    video.loadPixels();
    return;
  }

  video.loadPixels();
  analizarEntorno();

  // Mapeo Sonoro
  let freqDestino = map(luzGlobal, 0, 255, 100, 4000);
  filtro.frequency.rampTo(freqDestino, 0.1);

  let volumenBase = -15;
  let temblor = map(texturaGlobal, 0, 50, 0, 5); 
  dronFrio.volume.value = volumenBase + sin(frameCount * 0.1) * temblor;

  // Interfaz visual abstracta
  noFill();
  stroke(0, 255, 204, map(movimientoGlobal, 0, 100, 50, 255));
  strokeWeight(2);
  let radioVisual = map(luzGlobal, 0, 255, 50, windowWidth);
  ellipse(windowWidth/2, windowHeight/2, radioVisual + random(-texturaGlobal, texturaGlobal));
}

function analizarEntorno() {
  let movTemp = 0;
  let luzTemp = 0;

  for (let i = 0; i < video.pixels.length; i += 4) {
    let r = video.pixels[i];
    let g = video.pixels[i+1];
    let b = video.pixels[i+2];
    
    let brillo = (r + g + b) / 3;
    luzTemp += brillo;

    if (previousPixels.length > 0) {
      movTemp += abs(r - previousPixels[i]); 
    }
  }

  luzGlobal = luzTemp / (video.pixels.length / 4);
  movimientoGlobal = movTemp / (video.pixels.length / 4);
  texturaGlobal = abs(luzGlobal - (previousPixels.length > 0 ? previousPixels[0] : 0));

  previousPixels = [...video.pixels];
}

function tocarArpegio(time) {
  if (movimientoGlobal > 15) {
    let nota = notasArpegio[indiceArpegio];
    let velocidad = map(movimientoGlobal, 15, 100, 0.3, 1); 
    arpegiador.triggerAttackRelease(nota, "16n", time, constrain(velocidad, 0, 1));
    
    indiceArpegio++;
    if (indiceArpegio >= notasArpegio.length) indiceArpegio = 0;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
