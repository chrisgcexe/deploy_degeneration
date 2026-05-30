class ZoneManager {
   // Define zonas como rectángulos con nombre y color
    constructor(totalMemes = 181) {
        let margin = 50;
        
        // La piscina (POOL) ahora tiene un tamaño fijo relativo a la pantalla.
        // Como son microorganismos, no importa que se superpongan un poco al principio.
        let poolWidth = windowWidth - 2 * margin;
        let poolHeight = Math.max(400, windowHeight * 0.65); 
        
        this.zones = [
            { name: 'POOL', x: margin, y: margin, w: poolWidth, h: poolHeight, color: color(200, 200, 200, 50) },
            { name: 'WORKTABLE', x: margin, y: margin + poolHeight + 120, w: poolWidth, h: 2000, color: color(252, 252, 250) } // Color hoja de papel
        ];
    }

// Método para dibujar las zonas
    draw(cam) {
        push();
        noStroke();
        for (let z of this.zones) {
            if (z.name === 'WORKTABLE') {
                // Sombra de la hoja
                push();
                drawingContext.shadowOffsetX = 0;
                drawingContext.shadowOffsetY = -15; // Sombra hacia arriba
                drawingContext.shadowBlur = 30;
                drawingContext.shadowColor = 'rgba(0,0,0,0.15)';
                
                // Fondo color papel
                fill(z.color);
                rect(z.x, z.y, z.w, z.h);
                pop();
                
                // Renglones azules espaciados exactamente cada 70px (para que las palabras se apoyen perfecto)
                stroke(150, 200, 230, 180);
                strokeWeight(1);
                for (let ly = z.y + 50; ly < z.y + z.h; ly += 70) {
                    line(z.x, ly, z.x + z.w, ly);
                }
                
                // Línea roja corrida a la izquierda (100px desde el borde)
                stroke(255, 120, 120, 200);
                strokeWeight(2);
                line(z.x + 100, z.y, z.x + 100, z.y + z.h);
                
                noStroke();
            } else {
                fill(z.color);
                rect(z.x, z.y, z.w, z.h);
            }
            
            fill(0);
            textSize(20 / cam.zoom);
            text(z.name, z.x + 10, z.y + 20);
        }
        pop();
    }

    // Devuelve en qué zona está un elemento
    getZoneFor(element, cam) {
        let cx = element.x + element.w / 2;
        let cy = element.y + element.h / 2;
        
        for (let z of this.zones) {
            if (cx >= z.x && cx <= z.x + z.w &&
                cy >= z.y && cy <= z.y + z.h) {
                return z.name;
            }
        }
        return 'OUTSIDE';
    }
}