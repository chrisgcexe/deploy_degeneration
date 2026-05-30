class MemeElement {
    constructor(x, y, dnaData, source) {
        this.x = x;
        this.y = y;
        this.aspectRatio = 1.0;
        this.w = 100;
        this.h = 100;
        this.dna = dnaData;
        
        this.noiseOffsetX = random(10000);
        this.noiseOffsetY = random(10000);
        
        this._parseSource(source);
        
        this.loading = false;
        this.isDragging = false;
        this.isColliding = false;
        this.yaTuvoHijo = false;
        this.isBusy = false; // Lock temporal para evitar múltiples estados a la vez
        
        this.targetX = x;
        this.targetY = y;
        this.rotation = 0;
        this.baseRotation = random(-0.06, 0.06); // Ligera rotación orgánica base
        this.isFlying = false;
        
        this.tipo = dnaData ? (dnaData.tipo || 'neutral') : 'neutral';
        this.sentimiento = this._calcDominantEmotion();
        
        this.id = Math.random().toString(36).substr(2, 9);
        this.padres_ids = []; 
    }

    // =========================================================================
    // DIBUJADO Y RENDER
    // =========================================================================

    draw(cam, zones) {
        push();
        if (this.drawOffsetX || this.drawOffsetY) {
            translate(this.drawOffsetX, this.drawOffsetY);
        }

        if (this.rotation !== 0 || this.baseRotation !== 0) {
            translate(this.x + this.w / 2, this.y + this.h / 2);
            rotate(this.rotation + this.baseRotation);
            translate(-(this.x + this.w / 2), -(this.y + this.h / 2));
        }
        
        if (!this.buffer && this.img && this.img.width > 0) {
            this.createCache();
        }
        
        this.dibujar_meme();
        // if (!this.esHijoPoema && !this.esHijo) {
        //     this._drawSketchyCircle();
        // }
        this.dibujar_adn(cam, zones);
        this._drawHover(cam);
        pop();
    }

    createCache() {
        if (this.buffer) return;

        let sourceImg = null;
        let sx, sy, sw, sh;
        
        if (this.atlasType === 'meme' && atlasImg) {
            let data = atlasMap[this.atlasFilename];
            if (data) {
                sourceImg = atlasImg;
                sx = data.x; sy = data.y; sw = data.w; sh = data.h;
            }
        } else if (this.atlasType === 'recorte') {
            if (atlasImg && mapaGramatical && mapaGramatical[this.memePadre] && mapaGramatical[this.memePadre].recortes_globales && mapaGramatical[this.memePadre].recortes_globales[this.palabra]) {
                let data = mapaGramatical[this.memePadre].recortes_globales[this.palabra];
                sourceImg = atlasImg;
                sx = data.x; sy = data.y; sw = data.w; sh = data.h;
            } else {
                this._createFallbackTextCache();
                return; 
            }
        } else if (this.img && this.img.width > 0) {
            sourceImg = this.img;
            sx = 0; sy = 0; sw = this.img.width; sh = this.img.height;
        }

        if (sourceImg) {
            this.aspectRatio = sw / sh;
            this.aspectRatio = constrain(this.aspectRatio, 0.4, 4.0);

            let cacheH = 100;
            let cacheW = cacheH * this.aspectRatio;

            if (this.w === 100 && this.h === 100) {
                if (this.esHijoPoema || this.esHijo) {
                    this.w = cacheW * 0.6;
                    this.h = cacheH * 0.6;
                } else {
                    this.w = cacheW;
                    this.h = cacheH;
                }
            }

            // Crear el buffer con margen para la sombra
            let pad = 10;
            this.buffer = createGraphics(cacheW + pad * 2, cacheH + pad * 2);
            this.buffer.clear();
            
            let p = [];
            // Esquinas asimétricas (corte chueco general)
            let jx = min(cacheW * 0.08, 15); 
            let jy = min(cacheH * 0.1, 15); 
            let tl = { x: random(0, jx), y: random(0, jy) };
            let tr = { x: cacheW - random(0, jx), y: random(0, jy) };
            let br = { x: cacheW - random(0, jx), y: cacheH - random(0, jy) };
            let bl = { x: random(0, jx), y: cacheH - random(0, jy) };

            let segs = 6; // Más segmentos para añadir imperfecciones orgánicas notorias
            let micro = 4.0; // Jitter más grande para bordes desprolijos
            
            // Borde superior
            for(let i=0; i<=segs; i++) p.push({ x: lerp(tl.x, tr.x, i/segs), y: lerp(tl.y, tr.y, i/segs) + (i>0 && i<segs ? random(-micro, micro) : 0) });
            // Borde derecho
            for(let i=1; i<=segs; i++) p.push({ x: lerp(tr.x, br.x, i/segs) + (i<segs ? random(-micro, micro) : 0), y: lerp(tr.y, br.y, i/segs) });
            // Borde inferior
            for(let i=1; i<=segs; i++) p.push({ x: lerp(br.x, bl.x, i/segs), y: lerp(br.y, bl.y, i/segs) + (i<segs ? random(-micro, micro) : 0) });
            // Borde izquierdo
            for(let i=1; i<segs; i++) p.push({ x: lerp(bl.x, tl.x, i/segs) + random(-micro, micro), y: lerp(bl.y, tl.y, i/segs) });

            // 1. Dibujar el polígono con sombra para 'bakearla' y no afectar el rendimiento
            this.buffer.drawingContext.shadowOffsetX = 2;
            this.buffer.drawingContext.shadowOffsetY = 3;
            this.buffer.drawingContext.shadowBlur = 6;
            this.buffer.drawingContext.shadowColor = 'rgba(0, 0, 0, 0.35)';
            
            this.buffer.fill(255);
            this.buffer.noStroke();
            this.buffer.beginShape();
            for(let pt of p) this.buffer.vertex(pt.x + pad, pt.y + pad);
            this.buffer.endShape(CLOSE);
            
            this.buffer.drawingContext.shadowColor = 'transparent'; // Reset

            // 2. Recortar la imagen exactamente sobre el polígono
            this.buffer.drawingContext.save();
            this.buffer.beginShape();
            for(let pt of p) this.buffer.vertex(pt.x + pad, pt.y + pad);
            this.buffer.endShape(CLOSE);
            this.buffer.drawingContext.clip();

            this.buffer.image(sourceImg, pad, pad, cacheW, cacheH, sx, sy, sw, sh);
            this.buffer.drawingContext.restore();
            
            // Eliminamos el remarcado negro a pedido del usuario
        }
    }

    dibujar_meme() {
        if (!this.buffer) {
            if (this.atlasType === 'none' && !this.img && this.imgPath && !this.loading) {
                this.loading = true;
                this.img = loadImage(this.imgPath);
            }
            this.createCache();
        }

        if (this.buffer) {
            if (this.isColliding) {
                push();
                noFill();
                stroke('red');
                strokeWeight(2);
                rect(this.x, this.y, this.w, this.h);
                pop();
            }
            
            // Calculamos la escala para ajustar el margen (pad) del buffer al dibujar
            let scaleX = this.w / (this.buffer.width - 20); // 20 es pad*2
            let scaleY = this.h / (this.buffer.height - 20);

            if (this.alpha !== undefined) {
                push();
                tint(255, this.alpha);
                image(this.buffer, this.x - 10 * scaleX, this.y - 10 * scaleY, this.buffer.width * scaleX, this.buffer.height * scaleY);
                pop();
            } else {
                image(this.buffer, this.x - 10 * scaleX, this.y - 10 * scaleY, this.buffer.width * scaleX, this.buffer.height * scaleY);
            }
        } else {
            if (this.alpha !== undefined) {
                fill(255, this.alpha);
            } else {
                fill(255);
            }
            let strokeColor = color(this.isColliding ? 'red' : 'black');
            if (this.alpha !== undefined) {
                strokeColor.setAlpha(this.alpha);
            }
            stroke(strokeColor);
            strokeWeight(2);
            rect(this.x, this.y, this.w, this.h);
        }
    }

    _drawSketchyCircle() {
        push();
        noFill();
        stroke(20, 20, 20, 200);
        
        let cx = this.x + this.w / 2;
        let cy = this.y + this.h / 2;
        // El círculo debe ser un poco más grande que el meme para envolverlo
        let r = Math.max(this.w, this.h) / 2 + 15; 
        
        for(let k = 0; k < 2; k++) {
            strokeWeight(k === 0 ? 3 : 1.5);
            beginShape();
            for(let a = 0; a < TWO_PI + 0.1; a += 0.2) {
                // Usamos los offsets precalculados del meme como semilla de ruido
                let nX = noise(a * 2, k, this.noiseOffsetX) * 8 - 4;
                let nY = noise(a * 2 + 100, k, this.noiseOffsetY) * 8 - 4;
                vertex(cx + Math.cos(a) * r + nX, cy + Math.sin(a) * r + nY);
            }
            endShape(CLOSE);
        }
        pop();
    }

    dibujar_adn(cam, zones) {
        if (cam.zoom < 0.6) return; 
        if (this.esHijoPoema) return; // No dibujar ADN en el texto del poema

        if (!this.esHijo && !this.isDragging && !this.isFlying) {
            let currentZone = zones ? zones.getZoneFor(this, cam) : 'OUTSIDE';
            if (currentZone === 'POOL') return; // Ocultar ADN solo si está navegando en la piscina
        }

        let c = color((this.dna && this.dna.familiaColor) ? this.dna.familiaColor : '#000000');
        if (this.alpha !== undefined) c.setAlpha(this.alpha);
        fill(c);
        noStroke();
        textSize(8 / cam.zoom);
        
        if (this.dna && this.dna.sequence) {
            let seqStr = this.dna.sequence;
            
            if (!this.esHijo) {
                // Padres/raíces: ADN completo arriba del elemento
                if (seqStr.length > 25) seqStr = seqStr.substring(0, 22) + "...";
                text(seqStr, this.x, this.y - 8);
            } else {
                // Hijos del árbol: solo la parte que mutó/cambió respecto al padre principal
                let difStr = seqStr;
                if (this.padres && this.padres.length >= 1) {
                    let p1Seq = this.padres[0].dna ? this.padres[0].dna.sequence : "";
                    let idx = 0;
                    while (idx < seqStr.length && idx < p1Seq.length && seqStr[idx] === p1Seq[idx]) {
                        idx++;
                    }
                    if (idx < seqStr.length) {
                        difStr = "+" + seqStr.substring(idx);
                    } else {
                        difStr = ""; // Idéntico, no mostrar nada
                    }
                }
                if (difStr.length > 25) difStr = difStr.substring(0, 22) + "...";
                if (difStr.length > 0) {
                    text(difStr, this.x, this.y + this.h + 12);
                }
            }
        }
    }

    // =========================================================================
    // UPDATE Y MÁQUINA DE ESTADOS
    // =========================================================================

    update(cam, zones, elementos, poeta) {
        this._handleLoading();

        if (this.isFlying) return this._updateFlying();
        if (this.isMating) return this._updateMating(cam);
        if (this.isDragging) return this._updateDragging(cam);

        this.drawOffsetX = 0;
        this.drawOffsetY = 0;
        
        if (zones && !this.esHijo && !this.yaTuvoHijo) {
            this._updatePoolPhysics(cam, zones, elementos, poeta);
        } 
    }

    // =========================================================================
    // LÓGICA PRIVADA Y COMPORTAMIENTOS
    // =========================================================================

    _parseSource(source) {
        if (typeof source === 'string') {
            if (atlasMap && atlasMap[source]) {
                this.atlasType = 'meme';
                this.atlasFilename = source;
                this.imgPath = null;
            } else if (source.startsWith('recorte:')) {
                this.atlasType = 'recorte';
                let parts = source.substring(8).split(':');
                this.memePadre = parts[0];
                this.palabra = parts[1];
                this.atlasFilename = source;
                this.imgPath = null;
            } else {
                this.atlasType = 'none';
                this.imgPath = source.includes('/') ? source : 'source_assets/memes/' + source;
            }
            this.img = null;
        } else {
            this.atlasType = 'none';
            this.imgPath = null;
            this.img = source; 
        }
    }

    _calcDominantEmotion() {
        if (!this.dna || !this.dna.texto || typeof diccionarioEmocional === 'undefined' || !diccionarioEmocional) {
            return 'neutral';
        }
        let palabras = this.dna.texto.toLowerCase().match(/[a-záéíóúñ0-9]+/g) || [];
        let conteo = {};
        for (let p of palabras) {
            let info = diccionarioEmocional[p];
            if (info && info.sentimiento !== 'neutral') {
                conteo[info.sentimiento] = (conteo[info.sentimiento] || 0) + 1;
            }
        }
        let max = 0, dominante = 'neutral';
        for (let s in conteo) {
            if (conteo[s] > max) { 
                max = conteo[s]; 
                dominante = s; 
            }
        }
        return dominante;
    }

    _createFallbackTextCache() {
        let len = this.palabra ? this.palabra.length : 5;
        this.aspectRatio = constrain(len * 0.25, 1.0, 4.0);

        let cacheH = 100;
        let cacheW = cacheH * this.aspectRatio;

        if (this.w === 100 && this.h === 100) {
            if (this.esHijoPoema || this.esHijo) {
                this.w = cacheW * 0.6;
                this.h = cacheH * 0.6;
            } else {
                this.w = cacheW;
                this.h = cacheH;
            }
        }

        this.buffer = createGraphics(cacheW, cacheH);
        this.buffer.fill(255);
        this.buffer.stroke('black');
        this.buffer.strokeWeight(2);
        this.buffer.rect(1, 1, cacheW - 2, cacheH - 2);
        this.buffer.fill(0);
        this.buffer.noStroke();
        this.buffer.textAlign(CENTER, CENTER);
        this.buffer.textSize(16);
        this.buffer.textWrap(WORD);
        this.buffer.text(this.palabra, 5, 5, cacheW - 10, cacheH - 10);
    }

    _drawHover(cam) {
        if (!this.esHijoPoema && !this.isDragging && this.isMouseOver(mouseX, mouseY, cam)) {
            push();
            fill(255, 0, 0, 30); 
            noStroke();
            rect(this.x, this.y, this.w, this.h);
            pop();
        }
    }

    _handleLoading() {
        if (!this.buffer && !this.loading) {
            this.loading = true;
            if (this.atlasType !== 'none') {
                this.createCache();
                this.loading = false;
            } else if (this.imgPath) {
                loadImage(this.imgPath, (loadedImg) => {
                    this.img = loadedImg;
                    this.createCache();
                    this.loading = false;
                });
            } else if (this.img) {
                this.createCache();
                this.loading = false;
            } else {
                this.loading = false;
            }
        }
    }

    _updateFlying() {
        this.x = lerp(this.x, this.targetX, 0.08);
        this.y = lerp(this.y, this.targetY, 0.08);
        this.rotation += 0.4; 
        
        if (dist(this.x, this.y, this.targetX, this.targetY) < 3) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.rotation = 0;
            this.isFlying = false;
        }
    }

    _updateMating(cam) {
        // Un temblor fuerte y notorio propio de la reproducción
        this.drawOffsetX = random(-4, 4) / cam.zoom;
        this.drawOffsetY = random(-4, 4) / cam.zoom;
    }

    _updateDragging(cam) {
        this.x += (mouseX - pmouseX) / cam.zoom;
        this.y += (mouseY - pmouseY) / cam.zoom;
        
        let poolBottom = Math.max(400, window.innerHeight * 0.65) + 50;
        if (this.y >= poolBottom && !this.esHijo && !this.esHijoPoema) {
            // Un temblor muy sutil solo para indicar que está interactivo
            this.drawOffsetX = random(-1, 1) / cam.zoom;
            this.drawOffsetY = random(-1, 1) / cam.zoom;
        } else {
            this.drawOffsetX = 0;
            this.drawOffsetY = 0;
        }
    }

    _updatePoolPhysics(cam, zones, elementos, poeta) {
        let currentZone = zones.getZoneFor(this, cam);
        let pool = zones.zones.find(z => z.name === 'POOL');
        
        // Memes más chicos para que no desborden
        let targetSizeH = (currentZone === 'POOL') ? 45 : 80;
        let targetSizeW = targetSizeH * this.aspectRatio;
        this.w = lerp(this.w, targetSizeW, 0.1);
        this.h = lerp(this.h, targetSizeH, 0.1);

        if (currentZone === 'POOL' && pool) {
            if (typeof this.vx === 'undefined') {
                this.vx = 0;
                this.vy = 0;
            }

            this._applyOrganicSwimming();
            this._applyEcosystemForces(elementos, poeta);
            this._applyMouseRepulsion(cam);
            this._applyPhysicsAndLimits(pool);
        }
    }

    _applyOrganicSwimming() {
        this.noiseOffsetX += 0.005;
        this.noiseOffsetY += 0.005;
        this.vx += (noise(this.noiseOffsetX) - 0.5) * 0.4;
        this.vy += (noise(this.noiseOffsetY) - 0.5) * 0.4;
    }

    _applyEcosystemForces(elementos, poeta) {
        let repX = 0; let repY = 0;
        let atrX = 0; let atrY = 0;
        
        let vecinosIntimos = 0;
        let umbralIntimo = this.w * 0.8; 
        let radioVision = 250;

        for (let otro of elementos) {
            if (otro === this || otro.esHijo || otro.isDragging) continue;

            let dx = (otro.x + otro.w/2) - (this.x + this.w/2);
            let dy = (otro.y + otro.h/2) - (this.y + this.h/2);
            let distMemes = Math.sqrt(dx*dx + dy*dy);

            if (distMemes < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; distMemes = 1; }

            // 1. Anti-colisión dura
            if (distMemes < umbralIntimo) {
                vecinosIntimos++;
                let force = map(distMemes, 0, umbralIntimo, 0.1, 0); // Repulsión más sutil
                repX -= (dx / distMemes) * force;
                repY -= (dy / distMemes) * force;
            }

            // 2. Máquina de estados (Asimetría y Comportamiento)
            if (distMemes < radioVision && frameCount % 15 === 0) {
                let afinidad = poeta ? poeta.evaluarAfinidadGlobal(this, otro, mapaGramatical, diccionarioEmocional) : 0;
                let factor = this._calcEmotionalForce(otro, afinidad, vecinosIntimos);

                if (factor > 0) {
                    let pull = factor * 0.02; // Atracción mucho más sutil
                    atrX += (dx / distMemes) * pull;
                    atrY += (dy / distMemes) * pull;
                } else if (factor < 0) {
                    let push = Math.abs(factor) * 0.02; // Repulsión mucho más sutil
                    repX -= (dx / distMemes) * push;
                    repY -= (dy / distMemes) * push;
                }
            }
        }
        
        this.vx += repX + atrX;
        this.vy += repY + atrY;
    }

    _calcEmotionalForce(otro, afinidad, vecinosIntimos) {
        let factor = 0;
        
        if (this.sentimiento === 'ira' && otro.sentimiento === 'miedo') factor = 0.8; 
        else if (this.sentimiento === 'miedo') factor = -0.7; 
        else if (this.sentimiento === 'tristeza') factor = -0.3; 
        else if (this.sentimiento === 'alegria' && otro.sentimiento === 'tristeza') factor = 0.6; 
        else if (afinidad > 1.0) factor = 0.4; 
        else if (afinidad === 0) factor = -0.15; 

        // Claustrofobia
        if (vecinosIntimos > 2) factor -= 1.0; 

        return factor;
    }

    _applyMouseRepulsion(cam) {
        let worldMouseX = (mouseX - cam.pan.x) / cam.zoom;
        let worldMouseY = (mouseY - cam.pan.y) / cam.zoom;
        let cx = this.x + this.w / 2;
        let cy = this.y + this.h / 2;
        let distToMouse = dist(worldMouseX, worldMouseY, cx, cy);
        
        if (distToMouse < 60) {
            let force = map(distToMouse, 0, 60, 0.05, 0); // Repulsión de mouse casi imperceptible 
            let angle = Math.atan2(cy - worldMouseY, cx - worldMouseX);
            this.vx += Math.cos(angle) * force;
            this.vy += Math.sin(angle) * force;
        }
    }

    _applyPhysicsAndLimits(pool) {
        this.vx *= 0.90; 
        this.vy *= 0.90;

        let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        let maxSpeed = 2.5; 
        if (speed > maxSpeed) {
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Rebotes rectangulares básicos
        if (this.x <= pool.x) { this.x = pool.x; this.vx = Math.abs(this.vx) + 0.5; } 
        else if (this.x + this.w >= pool.x + pool.w) { this.x = pool.x + pool.w - this.w; this.vx = -Math.abs(this.vx) - 0.5; }

        if (this.y <= pool.y) { this.y = pool.y; this.vy = Math.abs(this.vy) + 0.5; } 
        else if (this.y + this.h >= pool.y + pool.h) { this.y = pool.y + pool.h - this.h; this.vy = -Math.abs(this.vy) - 0.5; }
    }

    isMouseOver(mx, my, cam) {
        let worldMouseX = (mx - cam.pan.x) / cam.zoom;
        let worldMouseY = (my - cam.pan.y) / cam.zoom;
        return (worldMouseX >= this.x && worldMouseX <= this.x + this.w &&
                worldMouseY >= this.y && worldMouseY <= this.y + this.h);
    }

    collidesWith(other) {
        return this.x < other.x + this.w && this.x + this.w > other.x &&
               this.y < other.y + this.h && this.y + this.h > other.y;
    }
}