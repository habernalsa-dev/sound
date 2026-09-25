let video;
let detector;
let detecciones = [];
let playing = false;

// --- 1. MOTORES DE SÍNTESIS AMBIENT (Tone.js) ---

// Pad Humano: Cálido, lento, evolutivo
const humanPad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "sine" },
    envelope: { attack: 2, decay: 1, sustain: 1, release: 3 }
}).toDestination();
humanPad.volume.value = -60; // Inicia silenciado

// Sintetizador de Textura (FM para metálico/rugoso)
const textureSynth = new Tone.FMSynth({
    harmonicity: 1, modulationIndex: 1,
    oscillator: { type: "triangle" },
    envelope: { attack: 0.5, decay: 0.5, sustain: 0.8, release: 2 }
});

// Ruido de Textura (Para superficies rugosas)
const textureNoise = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: { attack: 1, decay: 1, sustain: 0.5, release: 2 }
});

// --- 2. EFECTOS ESPACIALES (Cercanía, Lejanía, Repetición) ---

// Filtro Low-Pass (Controla la lejanía: más lejos = más ahogado)
const depthFilter = new Tone.Filter({ frequency: 400, type: "lowpass" });

// Delay (Controla la repetición: más objetos = más ecos cruzados)
const repetitionDelay = new Tone.FeedbackDelay({ delayTime: "4n", feedback: 0.1 });

// Reverberación global (Espacio inmersivo)
const spaceReverb = new Tone.Reverb({ decay: 6, preDelay: 0.2 }).toDestination();

// Conexiones de la ruta de audio
textureSynth.chain(depthFilter, repetitionDelay, spaceReverb);
textureNoise.chain(depthFilter, repetitionDelay, spaceReverb);
humanPad.connect(spaceReverb);

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.position(0, 0);
    
    video = createCapture(VIDEO, () => {
        // Cargar el modelo de IA de visión por computadora
        document.getElementById('status').innerText = "Cargando modelo espacial...";
        detector = ml5.objectDetector('cocossd', video, modelReady);
    });
    video.size(width, height);
    video.hide();
    
    document.getElementById('start-btn').addEventListener('click', async () => {
        await Tone.start();
        Tone.Transport.start();
        playing = true;
        document.getElementById('ui-layer').style.display = 'none';
        
        // Iniciar un dron base muy sutil
        humanPad.triggerAttack(["C3", "G3", "C4"]);
    });
}

function modelReady() {
    document.getElementById('status').innerText = "Sistema listo.";
    detectarObjetos();
}

function detectarObjetos() {
    if (detector && playing) {
        detector.detect(video, (err, results) => {
            if (err) console.error(err);
            detecciones = results || [];
            actualizarPaisajeSonoro();
            detectarObjetos(); // Bucle de detección continuo
        });
    }
}

function draw() {
    if (playing) {
        background(0, 40); // Estela visual
        tint(255, 100);
        image(video, 0, 0, width, height);
        
        // Dibujar el escaneo de los objetos
        noFill();
        strokeWeight(1);
        for (let i = 0; i < detecciones.length; i++) {
            let obj = detecciones[i];
            
            // Si es humano, trazo verde cálido; si es objeto, trazo blanco/metálico
            if (obj.label === 'person') {
                stroke(0, 255, 150, 150);
            } else {
                stroke(255, 150);
            }
            rect(obj.x, obj.y, obj.width, obj.height);
        }
    }
}

function actualizarPaisajeSonoro() {
    let hayHumano = false;
    let areaPromedio = 0;
    
    // 1. REPETICIÓN (Cantidad de objetos)
    let repeticion = detecciones.length;
    if (repeticion > 0) {
        // A más objetos detectados, el Delay tiene más retroalimentación (caos ambiental)
        repetitionDelay.feedback.rampTo(map(repeticion, 1, 10, 0.1, 0.8), 0.5);
    } else {
        repetitionDelay.feedback.rampTo(0, 1);
    }

    detecciones.forEach(obj => {
        if (obj.label === 'person') hayHumano = true;
        areaPromedio += (obj.width * obj.height);
        
        // 3. TEXTURA Y MATERIALIDAD (Estimación basada en el tipo de objeto)
        // Como procesar píxeles es pesado, mapeamos categorías a texturas sonoras
        let texturasMetalicas = ['car', 'bicycle', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'chair', 'couch', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator'];
        
        if (texturasMetalicas.includes(obj.label)) {
            // Activar sintetizador FM metálico e inarmónico
            textureSynth.harmonicity.value = 3.14; // Ratio complejo para sonido de campana/metal
            textureSynth.modulationIndex.value = random(5, 15);
            if (random() > 0.95) textureSynth.triggerAttackRelease("E4", "8n", "+0.1", 0.3);
        } else if (obj.label !== 'person') {
            // Textura rugosa o natural (ruido filtrado)
            if (random() > 0.95) textureNoise.triggerAttackRelease("4n", "+0.1", 0.1);
        }
    });

    // 2. CERCANÍA / LEJANÍA (Profundidad)
    if (repeticion > 0) {
        areaPromedio = areaPromedio / repeticion;
        let resolucionPantalla = width * height;
        
        // Si el objeto es grande, está cerca (Filtro abierto). Si es pequeño, está lejos (Filtro cerrado).
        let cutoffFrecuencia = map(areaPromedio, 0, resolucionPantalla / 2, 400, 5000);
        depthFilter.frequency.rampTo(constrain(cutoffFrecuencia, 400, 5000), 0.5);
    }

    // 4. PRESENCIA HUMANA
    if (hayHumano) {
        // El pad sube de volumen suavemente si hay una persona
        humanPad.volume.rampTo(-10, 2); 
    } else {
        // Se desvanece en la lejanía si no hay nadie
        humanPad.volume.rampTo(-40, 4); 
    }
}
