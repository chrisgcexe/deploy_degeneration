class ComportamientoReproduccion {
    constructor(poeta, crianzaContext) {
        this.poeta = poeta;
        this.crianza = crianzaContext;
    }

    ejecutar(el1, el2, elementos, zones) {
        // Desanclar del cursor al iniciar el apareamiento
        el1.isDragging = false; 
        el2.isDragging = false;

        el1.yaTuvoHijo = true; el2.yaTuvoHijo = true;
        el1.isBusy = true; el2.isBusy = true;
        el1.isMating = true; el2.isMating = true;
        
        let centroX = (el1.x + el1.w/2 + el2.x + el2.w/2) / 2;
        let centroY = Math.max(el1.y, el2.y);

        // Efecto visual: se superponen suavemente hacia el centro mientras vibran
        let frames = 20;
        let overlapInterval = setInterval(() => {
            el1.x = lerp(el1.x, centroX - el1.w/2, 0.2);
            el1.y = lerp(el1.y, centroY - el1.h/2, 0.2);
            el2.x = lerp(el2.x, centroX - el2.w/2, 0.2);
            el2.y = lerp(el2.y, centroY - el2.h/2, 0.2);
            frames--;
            if (frames <= 0) clearInterval(overlapInterval);
        }, 30);

        let endogamia = this.crianza._calcularEndogamia(el1, el2);
        let colorFam = this.crianza._determinarColorFamilia(el1, el2);
        let hijosExistentes = elementos.filter(e => e.esHijo);
        let datosHijos = this.cruzar(el1, el2, hijosExistentes);

        setTimeout(() => {
            this._nacerHijos(el1, el2, datosHijos, colorFam, centroX, centroY, elementos, zones);
        }, 600); // Reducido a la mitad para mayor agilidad
    }

    cruzar(padre1, padre2, hijosPoema = []) {
        let recortesP1Obj = mapaGramatical[padre1.dna.archivo]?.recortes_globales || {};
        let recortesP2Obj = mapaGramatical[padre2.dna.archivo]?.recortes_globales || {};
        
        let recortesP1 = Object.keys(recortesP1Obj).map(k => ({ nombre: k, carpeta: padre1.dna.archivo.replace(/\.(png|jpg|jpeg)$/i, '') }));
        let recortesP2 = Object.keys(recortesP2Obj).map(k => ({ nombre: k, carpeta: padre2.dna.archivo.replace(/\.(png|jpg|jpeg)$/i, '') }));
        
        let ultimoHijo = hijosPoema.length > 0 ? hijosPoema[hijosPoema.length - 1] : null;
        let ultimasPalabras = this.crianza._obtenerPalabrasRecientes(ultimoHijo, hijosPoema);
        
        let totalPalabras = recortesP1.length + recortesP2.length;
        let probabilidadGemelos = Math.min(0.40, 0.05 + (totalPalabras * 0.02));
        let cantidadHijos = (random() < probabilidadGemelos) ? 2 : 1;
        
        let opciones = [...recortesP1, ...recortesP2].filter(opt => !ultimasPalabras.includes(opt.nombre));
        if (opciones.length === 0) opciones = [...recortesP1, ...recortesP2]; 

        return this._procesarSeleccionGenetica(opciones, cantidadHijos, ultimoHijo, padre1.dna.sequence, padre2.dna.sequence);
    }

    _procesarSeleccionGenetica(opciones, cantidad, hijoReferencia, seq1, seq2) {
        let hijosNuevos = [];
        
        for (let i = 0; i < cantidad; i++) {
            if (opciones.length === 0) break;

            let opcionesConScore = opciones.map(opt => ({
                ...opt,
                score: this.poeta.calcularScore(opt, hijoReferencia, diccionarioEmocional)
            }));
            
            let elegido = this.poeta.seleccionarPonderado(opcionesConScore);
            let infoElegido = (diccionarioEmocional && diccionarioEmocional[elegido.nombre]) ? diccionarioEmocional[elegido.nombre] : { tipo: 'sustantivo', sentimiento: 'neutral' };
            let ruta = `recorte:${elegido.carpeta}.jpg:${elegido.nombre}`;

            let nuevoHijo = {
                ruta: ruta,
                tipo: infoElegido.tipo,
                sentimiento: infoElegido.sentimiento,
                dna: { 
                    sequence: this.crianza.mezclarSecuencia(seq1, seq2),
                    archivo: elegido.carpeta + '.jpg',
                    tipo: infoElegido.tipo,
                    sentimiento: infoElegido.sentimiento
                }
            };
            
            hijosNuevos.push(nuevoHijo);
            hijoReferencia = nuevoHijo; 
            
            let palabraElegida = elegido.nombre.split('_')[1]?.split('.')[0] || elegido.nombre;
            opciones = opciones.filter(opt => {
                let palabraOpt = opt.nombre.split('_')[1]?.split('.')[0] || opt.nombre;
                return palabraOpt !== palabraElegida;
            });
        }
        return hijosNuevos;
    }

    _nacerHijos(el1, el2, datosHijos, colorFam, centroX, centroY, elementos, zones) {
        el1.isBusy = false; el2.isBusy = false;
        el1.isMating = false; el2.isMating = false;
        if (el1.dna) el1.dna.familiaColor = colorFam;
        if (el2.dna) el2.dna.familiaColor = colorFam;
            
        let targetCentroX = centroX;
        let targetCentroY = centroY;

        if (centroX < windowWidth) {
            targetCentroX = windowWidth + 200 + this.crianza.treeMarginOffset;
            targetCentroY = 200; 
            // El desplazamiento de la próxima familia se calculará abajo de forma dinámica
        }
        
        // Mover a los padres de forma centrada
        let parentTotalW = el1.w + el2.w + 20;
        let parentStartX = targetCentroX - parentTotalW / 2;
        el1.targetX = parentStartX;
        el1.targetY = targetCentroY;
        el1.isFlying = true;
        
        el2.targetX = parentStartX + el1.w + 20;
        el2.targetY = targetCentroY;
        el2.isFlying = true;
        
        // Preadaptamos el ancho de los hijos para evitar solapamientos
        let anchosHijos = [];
        for (let dataHijo of datosHijos) {
            let estimadoW = 60;
            if (dataHijo.ruta && dataHijo.ruta.startsWith('recorte:')) {
                let parts = dataHijo.ruta.substring(8).split(':');
                let memePadre = parts[0];
                let palabra = parts[1];
                if (typeof mapaGramatical !== 'undefined' && mapaGramatical[memePadre] && mapaGramatical[memePadre].recortes_globales && mapaGramatical[memePadre].recortes_globales[palabra]) {
                    let data = mapaGramatical[memePadre].recortes_globales[palabra];
                    let ratio = constrain(data.w / data.h, 0.4, 4.0);
                    estimadoW = 60 * ratio;
                } else {
                    estimadoW = 60 * constrain(palabra.length * 0.25, 1.0, 4.0);
                }
            }
            anchosHijos.push(estimadoW);
        }

        let totalWidthHijos = anchosHijos.reduce((sum, w) => sum + w, 0) + (anchosHijos.length - 1) * 30;
        let currentX = targetCentroX - totalWidthHijos / 2;

        for (let index = 0; index < datosHijos.length; index++) {
            let dataHijo = datosHijos[index];
            dataHijo.dna.familiaColor = colorFam;
            
            let targetArbolX = currentX;
            let targetArbolY = targetCentroY + 150; 
            
            let hijoArbol = new MemeElement(centroX, centroY, dataHijo.dna, dataHijo.ruta);
            hijoArbol.targetX = targetArbolX;
            hijoArbol.targetY = targetArbolY;
            hijoArbol.isFlying = true;
            hijoArbol.esHijo = true; 
            hijoArbol.w = anchosHijos[index]; 
            hijoArbol.h = 60;
            hijoArbol.padres = [el1, el2];
            hijoArbol.padres_ids = [...new Set([el1.id, el2.id, ...(el1.padres_ids || []), ...(el2.padres_ids || [])])];
            elementos.push(hijoArbol);

            currentX += anchosHijos[index] + 30; // 30px separacion entre hermanos

            let todosHijosPoema = elementos.filter(e => e.esHijoPoema);
            let zona = zones.zones.find(z => z.name === 'WORKTABLE');
            let pPoema = this.poeta.calcularPosicion(todosHijosPoema, zona);
            
            let hijoPoema = new MemeElement(centroX, centroY, dataHijo.dna, dataHijo.ruta);
            hijoPoema.targetX = pPoema.x;
            hijoPoema.targetY = pPoema.y;
            hijoPoema.isFlying = true;
            hijoPoema.esHijo = true;
            hijoPoema.esHijoPoema = true;
            hijoPoema.yaTuvoHijo = true;
            hijoPoema.w = anchosHijos[index];
            hijoPoema.h = 60;
            hijoPoema.padres = [el1, el2];
            hijoPoema.padres_ids = [...new Set([el1.id, el2.id, ...(el1.padres_ids || []), ...(el2.padres_ids || [])])];
            elementos.push(hijoPoema);
        }
        
        if (centroX < windowWidth) {
            let maxFamilyWidth = Math.max(parentTotalW, totalWidthHijos);
            this.crianza.treeMarginOffset += Math.max(400, maxFamilyWidth + 100); 
        }
        
        elementos.push(new ExplosionElement(centroX, centroY));
        if (typeof toonSounds !== 'undefined' && toonSounds.length > 0) {
            let snd = random(toonSounds);
            if (snd && snd.isLoaded()) snd.play();
        }
    }
}
