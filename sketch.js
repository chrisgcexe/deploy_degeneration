let cam, zones, elementos = [];
let adnEstructurado = null;
let mapaRecortes = null;
let mapaGramatical = null;
let diccionarioEmocional = null;
let atlasImg = null;
let atlasMap = null;
let recortesAtlasMap = null;
let imagenes = {}; 
let criador;
let engine;
let inputManager;
let explosionImg = null;
let toonSounds = [];
let fondoLibretaImg = null;

function preload() {
    let v = "?v=" + Date.now();
    adnEstructurado = loadJSON('source_assets/json/ADN_Estructurado_Final.json' + v);
  
    
    mapaGramatical = loadJSON('source_assets/json/atlas_palabras_global.json' + v);
    diccionarioEmocional = loadJSON('source_assets/json/diccionario_emocional.json' + v);
    atlasMap = loadJSON('source_assets/json/atlas_memes_map.json' + v);
    atlasImg = loadImage('source_assets/atlas_memes.jpg' + v);
    
    // Cargar la imagen de la libreta (el usuario debe guardarla con este nombre)
    fondoLibretaImg = loadImage('source_assets/fondo_libreta.jpg');
}

function setup() {
    let cnv = createCanvas(windowWidth, windowHeight);
    
    if (!adnEstructurado || !mapaGramatical) {
        console.error("Error: Los archivos JSON no se cargaron correctamente.");
        return;
    }

    cam = new Camera();
    zones = new ZoneManager();
    criador = new Crianza();
    inputManager = new InputManager();
    engine = new GameEngine(criador, zones);
    
    // Obtenemos la zona POOL para saber dónde posicionar
    let pool = zones.zones.find(z => z.name === 'POOL');
    
    let keys = Object.keys(adnEstructurado);
    
    for (let k of keys) {
        let datosMeme = adnEstructurado[k];
        // En lugar de pasar una ruta para cargar después, pasamos el filename para buscar en el atlas
        let filename = datosMeme.archivo; 
        
        // Posición aleatoria dentro del POOL
        // Restamos más margen (250) para que los memes anchos no se salgan del borde derecho
        let randomX = random(pool.x + 50, pool.x + pool.w - 250);
        let randomY = random(pool.y + 50, pool.y + pool.h - 100);
        
        let el = new MemeElement(randomX, randomY, datosMeme, filename);
        engine.addElement(el);
    }
}

function draw() {
    clear();
    push();
    // Aplicar cámara ANTES de update y draw
    cam.applyTransform();
    
    // Engine handles updating and drawing
    engine.run(cam, width, height);    pop();
}


function mousePressed() {
    if (!inputManager) return;
    inputManager.mousePressed(mouseX, mouseY, cam, engine.elementos);
}

function mouseReleased() { 
    if (!inputManager) return;
    inputManager.mouseReleased(engine.elementos);
}

function mouseDragged() { 
    if (!inputManager) return;
    inputManager.mouseDragged(mouseX, pmouseX, mouseY, pmouseY, cam, engine.elementos);
}

function mouseWheel(e) { 
    inputManager.mouseWheel(e, cam);
    return false; 
}

function keyPressed() {
    inputManager.keyPressed(keyCode, cam, engine.elementos);
}