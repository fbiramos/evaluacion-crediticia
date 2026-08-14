// CONFIGURACIÓN DE FIREBASE (Reemplaza con tus credenciales)
const firebaseConfig = {
   apiKey: "AIzaSyDWKdGjpvjQ013Lvn9eicuBeDKJFLf5JLc",
  authDomain: "evaluacion-crediticia-bbdb4.firebaseapp.com",
  projectId: "evaluacion-crediticia-bbdb4",
  storageBucket: "evaluacion-crediticia-bbdb4.firebasestorage.app",
  messagingSenderId: "512560821833",
  appId: "1:512560821833:web:9a41a7b75e50bdda307198"

};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const evaluationsRef = db.collection('evaluations');

// 1. Lógica de Negocio

// Mecanismo Anti-Error (Poka-Yoke) para rechazo automático
function pokaYokeValidation(data) {
    const { asfiRating, businessAntiquity, netIncome, estimatedPayment } = data;

    // Regla 1: Calificación ASFI no elegible
    if (['C', 'D', 'E', 'F'].includes(asfiRating)) {
        return { isValid: false, reason: `Calificación de riesgo no favorable (${asfiRating}).` };
    }

    // Regla 2: Antigüedad del negocio insuficiente
    if (businessAntiquity < 12) {
        return { isValid: false, reason: `La antigüedad del negocio (${businessAntiquity} meses) es menor al mínimo de 12 meses.` };
    }

    // Regla 3: Cobertura de cuota por debajo del 100%
    const coverage = netIncome / estimatedPayment;
    if (coverage < 1.0) {
        return {
            isValid: false,
            reason: `La cobertura de la cuota es insuficiente (${coverage.toFixed(2)}). El ingreso debe cubrir al menos 1.0 vez la cuota.`
        };
    }

    return { isValid: true };
}

// Motor de Pre-Scoring (Semáforo)
function calculatePreScoring(data) {
    const { asfiRating, businessAntiquity, housingType, netIncome, estimatedPayment } = data;
    const coverage = netIncome / estimatedPayment;

    // Reglas para VERDE (Cliente Ideal)
    const isGreen = 
        asfiRating === 'A' &&
        businessAntiquity > 24 &&
        coverage > 1.3 &&
        ['Propia', 'Familiar'].includes(housingType);

    if (isGreen) {
        return {
            status: 'VERDE',
            color: 'bg-green-100 text-green-800 border-green-400',
            recommendation: 'Cliente de bajo riesgo. Proceder con oferta preferencial.'
        };
    }

    // Reglas para AMARILLO (Cliente con Cautela)
    const isYellow =
        asfiRating === 'B' ||
        (businessAntiquity >= 12 && businessAntiquity <= 24) ||
        (coverage >= 1.0 && coverage <= 1.2) ||
        ['Alquilada', 'Anticrético'].includes(housingType);

    if (isYellow) {
        return {
            status: 'AMARILLO',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-400',
            recommendation: 'Riesgo moderado. Requiere análisis documental adicional.'
        };
    }

    // Si no es Verde ni Amarillo, se considera ROJO por defecto (aunque haya pasado el Poka-Yoke)
    return {
        status: 'ROJO',
        color: 'bg-red-100 text-red-800 border-red-400',
        recommendation: 'Riesgo elevado. No cumple políticas de riesgo para continuar.'
    };
}

// 2. Navegador SPA (Para cambiar entre "Nueva Evaluación" e "Historial")
window.router = {
    navigate: (viewName) => {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(`view-${viewName}`).classList.remove('hidden');
    }
};

// Función para borrar una evaluación
window.deleteEvaluation = async (id) => {
    if (confirm("¿Estás seguro de eliminar esta evaluación?")) {
        try {
            await evaluationsRef.doc(id).delete();
            console.log("Documento eliminado");
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    }
};

// Manejador de Temas (Claro/Oscuro)
window.themeManager = {
    init: () => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') document.body.classList.add('dark-theme');
    },
    toggle: () => {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }
};

// 3. Escucha en tiempo real de Firestore
function initRealtimeUpdates() {
    evaluationsRef.orderBy('date', 'desc').limit(20).onSnapshot(snapshot => {
        const list = document.getElementById('history-list');
        if (snapshot.empty) {
            list.innerHTML = `<p class="text-gray-500 text-center italic">No hay registros aún...</p>`;
            return;
        }

        list.innerHTML = snapshot.docs.map(doc => {
            const ev = doc.data();
            // Formatear la fecha de Firestore a algo legible
            const dateStr = ev.date ? ev.date.toDate().toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Procesando...';
            
            return `
                <div class="p-3 rounded-xl border ${ev.resultColor || 'border-gray-300'} bg-white flex justify-between items-center shadow-sm mb-3">
                    <div class="flex-1 text-gray-800 text-xs">
                        <p class="font-bold text-sm text-gray-900">Edad: ${ev.age} | Ant: ${ev.businessAntiquity}m | Viv: ${ev.housingType}</p>
                        <p class="text-[10px] opacity-60 uppercase">${dateStr}</p>
                        <p class="opacity-80 mt-1">Utilidad: ${ev.netIncome} Bs | Cuota: ${ev.estimatedPayment} Bs | ASFI: <span class="font-bold">${ev.asfiRating}</span></p>
                    </div>
                    <span class="font-black text-lg mr-4">${ev.resultStatus}</span>
                    <button onclick="deleteEvaluation('${doc.id}')" class="text-gray-500 hover:text-red-400 p-2 transition-colors">🗑️</button>
                </div>
            `;
        }).join('');
    }, error => {
        console.error("Error en tiempo real:", error);
        document.getElementById('history-list').innerHTML = `<p class="text-red-500 text-center uppercase font-bold">Error de sincronización</p>`;
    });
}

// 3. Controlador de Eventos
document.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
    initRealtimeUpdates();
    
    const btnEvaluate = document.getElementById('btn-evaluate');
    btnEvaluate.addEventListener('click', async () => {
        // 1. Recopilar datos del nuevo formulario
        const formData = {
            age: parseInt(document.getElementById('client-age').value),
            businessAntiquity: parseInt(document.getElementById('business-antiquity').value),
            asfiRating: document.getElementById('asfi-rating').value,
            housingType: document.getElementById('housing-type').value,
            netIncome: parseFloat(document.getElementById('net-income').value),
            estimatedPayment: parseFloat(document.getElementById('estimated-payment').value)
        };

        // 2. Validación de entradas básicas
        for (const key in formData) {
            const value = formData[key];
            if (!value || (typeof value === 'number' && (isNaN(value) || value <= 0))) {
                alert(`Por favor, completa el campo '${key}' con un valor válido.`);
                return;
            }
        }

        // 3. Ejecutar la validación Poka-Yoke
        const validationResult = pokaYokeValidation(formData);
        const display = document.getElementById('result-display');

        if (!validationResult.isValid) {
            // Mostrar alerta de rechazo y detener el flujo
            alert(`RECHAZO AUTOMÁTICO:\n${validationResult.reason}`);
            
            // Opcional: Mostrar visualmente el rechazo en la UI
            display.innerHTML = `
                <div class="p-4 rounded-xl border-2 bg-red-100 text-red-800 border-red-300 text-center animate-in fade-in zoom-in duration-300">
                    <p class="text-sm uppercase tracking-widest font-bold">Rechazo Automático</p>
                    <h3 class="text-2xl font-black">❌ NO ELEGIBLE</h3>
                    <p class="text-xs mt-2">${validationResult.reason}</p>
                </div>
            `;
            display.classList.remove('hidden');
            return;
        }

        // 4. Ejecutar el motor de Pre-Scoring (Semáforo)
        const scoringResult = calculatePreScoring(formData);

        // 5. Mostrar el resultado final en la UI
        display.innerHTML = `
            <div class="p-4 rounded-xl border-2 ${scoringResult.color} text-center animate-in fade-in zoom-in duration-300">
                <p class="text-sm uppercase tracking-widest font-bold">Resultado Pre-Scoring</p>
                <h3 class="text-4xl font-black my-2">${scoringResult.status}</h3>
                <p class="text-xs mt-2 font-medium">${scoringResult.recommendation}</p>
                <button id="btn-save" class="w-full btn-primary-custom font-bold py-3 rounded-lg shadow-lg transition-all active:scale-95 mt-4">
                    GUARDAR EVALUACIÓN
                </button>
            </div>
        `;
        display.classList.remove('hidden');

        // 6. Añadir evento al nuevo botón de guardar
        document.getElementById('btn-save').addEventListener('click', async () => {
            const saveButton = document.getElementById('btn-save');
            saveButton.disabled = true;
            saveButton.innerText = 'GUARDANDO...';

            try {
                // El método .add() genera un ID único automáticamente
                await evaluationsRef.add({
                    ...formData, // Guarda todos los datos del formulario
                    resultStatus: scoringResult.status,
                    resultColor: scoringResult.color,
                    recommendation: scoringResult.recommendation,
                    date: firebase.firestore.FieldValue.serverTimestamp() // Fecha/hora del servidor
                });
                
                // Limpiar formulario y ocultar resultado para la siguiente evaluación
                document.querySelectorAll('#view-home input, #view-home select').forEach(el => el.value = '');
                display.classList.add('hidden');

            } catch (error) {
                console.error("Error al guardar en Firestore:", error);
                alert("Error de conexión al guardar en la base de datos. Inténtalo de nuevo.");
                saveButton.disabled = false;
                saveButton.innerText = 'GUARDAR EVALUACIÓN';
            }
        });
    });

    // Pulido: Limpiar el resultado visual si el usuario modifica algún dato
    document.getElementById('view-home').addEventListener('input', () => {
        const display = document.getElementById('result-display');
        if (!display.classList.contains('hidden')) {
            display.classList.add('hidden');
        }
    });
});
