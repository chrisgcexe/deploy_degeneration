class GeneradorPoesia {
    constructor() {
        // Semilla de caos inicial para el poema entero (0.0 a 0.3)
        // Algunos poemas nacen más rotos que otros
        this.baseAbsurdo = Math.random() * 0.3; 
        this.estrofaActual = 0;
    }

    // --- EVALUACIÓN GLOBAL (Para la Pool) ---
    evaluarAfinidadGlobal(meme1, meme2, mapaGramatical, diccionarioEmocional) {
        if (!mapaGramatical || !diccionarioEmocional) return 0;
        
        let words1 = Object.keys(mapaGramatical[meme1.dna?.archivo]?.recortes_globales || {});
        let words2 = Object.keys(mapaGramatical[meme2.dna?.archivo]?.recortes_globales || {});
        
        if (words1.length === 0 || words2.length === 0) return 0;
        
        let p1 = words1[Math.floor(words1.length / 2)]; 
        let p2 = words2[Math.floor(words2.length / 2)];
        
        let info1 = diccionarioEmocional[p1] || this._defaultInfo();
        let info2 = diccionarioEmocional[p2] || this._defaultInfo();
        
        let score = 0;
        
        if (info1.sentimiento !== 'neutral' && info1.sentimiento === info2.sentimiento) score += 0.5;
        
        if ((info1.tipo === 'sustantivo' && info2.tipo === 'verbo') || 
            (info1.tipo === 'verbo' && info2.tipo === 'sustantivo') || 
            (info1.tipo === 'adjetivo' && info2.tipo === 'sustantivo')) {
            score += 0.5;
        }

        let intersectTags = (info1.tags || []).filter(t => (info2.tags || []).includes(t));
        if (intersectTags.length > 0) score += 1.0;
        
        return score; 
    }

    // --- MOTOR PRINCIPAL DE SCORING ---
    calcularScore(opcion, hijosPoemaVersoActual, diccionarioEmocional) {
        let ctx = this._analizarContexto(hijosPoemaVersoActual);
        let palabraOpcion = opcion.nombre.toLowerCase();
        
        let infoOpcion = diccionarioEmocional[palabraOpcion] || this._defaultInfo();
        let infoAnterior = diccionarioEmocional[ctx.palabraAnterior] || this._defaultInfo();
        let infoTrasAnterior = diccionarioEmocional[ctx.palabraTrasAnterior] || this._defaultInfo();

        let score = 1.0;

        if (!ctx.ultimoHijo) {
            return this._evaluarArranqueDePoema(infoOpcion);
        }

        score += this._evaluarConcienciaEspacial(infoOpcion, ctx);
        score += this._evaluarSintaxis(infoOpcion, infoAnterior, infoTrasAnterior);
        score += this._evaluarFoneticaYMetrica(palabraOpcion, ctx.palabraAnterior);
        score += this._evaluarSemantica(infoOpcion.tags || [], infoAnterior.tags || []);
        
        // El absurdo ahora es impulsado por la endogamia en tiempo real
        score = this._evaluarAbsurdo(score, infoOpcion, infoAnterior, ctx, opcion);
        score += this._evaluarEndogamiaVisual(opcion, ctx.ultimoHijo);

        return Math.max(0.1, score);
    }

    // =========================================================================
    // MODULOS DE EVALUACIÓN (PRIVADOS)
    // =========================================================================

    _evaluarArranqueDePoema(infoOpcion) {
        let score = 1.0;
        if (infoOpcion.tipo === 'verbo' || infoOpcion.tipo === 'sustantivo') score += 2.5;
        if (infoOpcion.sentimiento !== 'neutral') score += 2.0;
        return score;
    }

    _evaluarConcienciaEspacial(infoOpcion, ctx) {
        let delta = 0;
        if (ctx.palabrasEnVersoActual >= 3) {
            if (infoOpcion.tipo === 'otro') delta -= 5.0; 
            if (infoOpcion.tipo === 'sustantivo' || infoOpcion.tipo === 'adjetivo') delta += 4.0; 
        }
        if (ctx.esInicioDeVerso) {
            if (infoOpcion.tipo === 'verbo') delta += 4.5; 
            if (infoOpcion.tipo === 'sustantivo') delta += 3.0;
            if (infoOpcion.tipo === 'otro') delta -= 2.0; 
            if (infoOpcion.sentimiento !== 'neutral') delta += 2.0;
        }
        return delta;
    }

    _evaluarSintaxis(infoOpcion, infoAnterior, infoTrasAnterior) {
        let delta = 0;
        if (infoTrasAnterior.tipo === 'sustantivo' && infoAnterior.tipo === 'otro') {
            if (infoOpcion.tipo === 'sustantivo') delta += 6.0; 
            if (infoOpcion.tipo === 'adjetivo') delta += 4.0;
        }
        
        if (infoAnterior.tipo === 'sustantivo') {
            if (infoOpcion.tipo === 'adjetivo') delta += 4.5;
            if (infoOpcion.tipo === 'verbo') delta += 3.5;
            if (infoOpcion.tipo === 'otro') delta += 2.0; 
        } else if (infoAnterior.tipo === 'verbo') {
            if (infoOpcion.tipo === 'otro') delta += 3.0;
            if (infoOpcion.tipo === 'sustantivo') delta += 2.5;
        } else if (infoAnterior.tipo === 'adjetivo') {
            if (infoOpcion.tipo === 'sustantivo') delta += 4.0;
            if (infoOpcion.tipo === 'otro') delta += 1.5;
        } else if (infoAnterior.tipo === 'adverbio') {
            if (infoOpcion.tipo === 'verbo') delta += 4.0;
            if (infoOpcion.tipo === 'adjetivo') delta += 3.0;
        } else if (infoAnterior.tipo === 'otro') {
            if (infoOpcion.tipo === 'sustantivo') delta += 5.0;
            if (infoOpcion.tipo === 'verbo') delta += 4.0;
        }
        return delta;
    }

    _evaluarFoneticaYMetrica(palabraOpcion, palabraAnterior) {
        let delta = 0;
        if (this.riman(palabraAnterior, palabraOpcion)) delta += 3.5;
        if (this.aliteran(palabraAnterior, palabraOpcion)) delta += 2.0;

        if (palabraAnterior.length > 7 && palabraOpcion.length < 5) delta += 2.0;
        if (palabraAnterior.length < 5 && palabraOpcion.length > 7) delta += 2.0;
        if (palabraAnterior.length > 7 && palabraOpcion.length > 7) delta -= 2.0; 
        
        return delta;
    }

    _evaluarSemantica(tagsOpcion, tagsAnterior) {
        let intersectTags = tagsAnterior.filter(t => tagsOpcion.includes(t));
        return (intersectTags.length > 0) ? (3.0 * intersectTags.length) : 0;
    }

    _evaluarAbsurdo(scoreActual, infoOpcion, infoAnterior, ctx, opcion) {
        // MODEL COLLAPSE: Si esta palabra viene del mismo padre que la anterior,
        // la endogamia se dispara y el algoritmo pierde cordura temporalmente.
        let endogamiaFutura = ctx.nivelEndogamia;
        if (opcion.carpeta && ctx.padreUltimo && opcion.carpeta === ctx.padreUltimo) {
            endogamiaFutura = Math.min(1.0, ctx.nivelEndogamia + 0.35); // +0.35 por cada palabra incestuosa
        }

        let absurdoEfectivo = Math.min(1.0, this.baseAbsurdo + endogamiaFutura);
        let nuevoScore = scoreActual;

        if (absurdoEfectivo < 0.5) {
            // Zona segura: mantiene coherencia emocional
            if (infoAnterior.sentimiento !== 'neutral' && infoOpcion.sentimiento === infoAnterior.sentimiento) {
                nuevoScore += 3.0;
            }
        } else {
            // Colapso Genético: Gramática plana, oxímorones forzados
            nuevoScore = 1.0 + ((scoreActual - 1.0) * (1.0 - absurdoEfectivo));
            
            if (infoAnterior.sentimiento !== 'neutral' && infoOpcion.sentimiento !== 'neutral') {
                if (infoAnterior.sentimiento !== infoOpcion.sentimiento) {
                    nuevoScore += 6.0 * absurdoEfectivo; 
                }
            }
            if (infoAnterior.tipo === 'sustantivo' && infoOpcion.tipo === 'sustantivo') {
                nuevoScore += 5.0 * absurdoEfectivo;
            }
        }
        return nuevoScore;
    }

    _evaluarEndogamiaVisual(opcion, ultimoHijo) {
        if (ultimoHijo && ultimoHijo.ruta && ultimoHijo.ruta.startsWith('recorte:')) {
            let carpetaUltimo = ultimoHijo.ruta.split(':')[1];
            if (opcion.carpeta !== carpetaUltimo) {
                return 3.0; // Recompensa fuerte por salir a buscar sangre nueva a otro meme
            }
        }
        return 0;
    }

    // =========================================================================
    // HELPERS Y UTILERÍA
    // =========================================================================

    _analizarContexto(hijosPoema) {
        let historial = Array.isArray(hijosPoema) ? hijosPoema : (hijosPoema ? [hijosPoema] : []);
        let len = historial.length;
        let ultimo = len > 0 ? historial[len - 1] : null;
        let penultimo = len > 1 ? historial[len - 2] : null;

        // Scanner de Endogamia: Mira hacia atrás cuántas veces repitió la misma fuente
        let rachaEndogamia = 0;
        let padreUltimo = this._extraerPadre(ultimo);
        
        if (padreUltimo) {
            for (let i = len - 2; i >= 0; i--) {
                if (this._extraerPadre(historial[i]) === padreUltimo) {
                    rachaEndogamia++;
                } else {
                    break;
                }
            }
        }
        
        let nivelEndogamia = Math.min(1.0, rachaEndogamia * 0.35);

        let palabrasEnVerso = 0;
        let esInicioDeVerso = !ultimo;

        if (ultimo && ultimo.targetY !== undefined) {
            palabrasEnVerso = historial.filter(e => Math.abs(e.targetY - ultimo.targetY) < 10).length;
            if (penultimo && Math.abs(ultimo.targetY - penultimo.targetY) > 10) {
                esInicioDeVerso = true;
            }
        }

        return {
            ultimoHijo: ultimo,
            penultimoHijo: penultimo,
            palabrasEnVersoActual: palabrasEnVerso,
            esInicioDeVerso: esInicioDeVerso,
            palabraAnterior: this.extraerPalabraString(ultimo) || "",
            palabraTrasAnterior: this.extraerPalabraString(penultimo) || "",
            padreUltimo: padreUltimo,
            nivelEndogamia: nivelEndogamia
        };
    }

    _extraerPadre(hijo) {
        if (hijo && hijo.ruta && hijo.ruta.startsWith('recorte:')) {
            return hijo.ruta.split(':')[1];
        }
        return null;
    }

    _defaultInfo() {
        return { tipo: 'otro', sentimiento: 'neutral', tags: [] };
    }

    extraerPalabraString(hijo) {
        if (!hijo || !hijo.ruta) return null;
        if (hijo.ruta.startsWith('recorte:')) return hijo.ruta.split(':')[2].toLowerCase();
        
        let partes = hijo.ruta.split('/');
        let archivo = partes[partes.length - 1];
        return (archivo.split('_')[1]?.split('.')[0] || archivo).toLowerCase();
    }

    riman(palabra1, palabra2) {
        if (!palabra1 || !palabra2 || palabra1.length < 3 || palabra2.length < 3) return false;
        return palabra1.slice(-2) === palabra2.slice(-2);
    }

    aliteran(palabra1, palabra2) {
        if (!palabra1 || !palabra2) return false;
        return palabra1.charAt(0) === palabra2.charAt(0);
    }

    seleccionarPonderado(opcionesConScore) {
        if (opcionesConScore.length === 0) return null;
        
        let totalScore = opcionesConScore.reduce((sum, opt) => sum + opt.score, 0);
        let r = Math.random() * totalScore;
        let acumulado = 0;
        
        for (let opt of opcionesConScore) {
            acumulado += opt.score;
            if (r <= acumulado) return opt;
        }
        return opcionesConScore[opcionesConScore.length - 1]; 
    }

    calcularPosicion(todosHijosPoema, zona) {
        let targetPoemaX = zona.x + 120; // Iniciar después de la línea roja (que está en x + 100)
        let targetPoemaY = zona.y + 200; // Sangría superior aumentada drásticamente
        
        if (todosHijosPoema.length > 0) {
            let ultimo = todosHijosPoema[todosHijosPoema.length - 1];
            let ultimoW = ultimo.w || 60; // Base width adaptado a tamaño menor
            let gapAleatorio = 5 + Math.random() * 20; // Espaciado natural e irregular
            targetPoemaX = ultimo.targetX + ultimoW + gapAleatorio;
            targetPoemaY = ultimo.targetY;
            
            let probSalto = 0.0; 
            if (targetPoemaX + 120 > zona.x + zona.w) probSalto = 1.0;
            
            if (probSalto === 1.0) {
                targetPoemaX = zona.x + 120; // Reiniciar salto de línea respetando el margen rojo
                targetPoemaY += 70; // Altura de hijoPoema (60) + 10
            }
        }
        
        return { x: targetPoemaX, y: targetPoemaY };
    }
}