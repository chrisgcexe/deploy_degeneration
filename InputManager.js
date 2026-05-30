class InputManager {
    constructor() {
        this.dragTarget = null;
    }

    mousePressed(mouseX, mouseY, cam, elementos) {
        for (let el of elementos) {
            if (el.isMouseOver(mouseX, mouseY, cam)) { 
                if (el.esHijoPoema || el.isBusy) continue; // Inmovilizar fragmentos del poema y memes bloqueados
                el.isDragging = true; 
                this.dragTarget = el;
                break; 
            }
        }
    }

    mouseReleased(elementos) {
        if (this.dragTarget) {
            this.dragTarget.isDragging = false;
            this.dragTarget = null;
        }
        elementos.forEach(el => el.isDragging = false); 
    }

    mouseDragged(mouseX, pmouseX, mouseY, pmouseY, cam, elementos) {
        if (!elementos.some(e => e.isDragging)) {
            cam.updatePan(mouseX - pmouseX, mouseY - pmouseY); 
        }
    }

    mouseWheel(e, cam) {
        cam.applyZoom(e.deltaY); 
        return false;
    }

    keyPressed(code, cam, elementos) {
        // Funcionalidad de borrado desactivada por ahora
    }
}
