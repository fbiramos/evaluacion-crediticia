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

/**
 * Motor de Evaluación Preliminar de Primer Contacto (Semáforo)
 * @param {object} data - Objeto con los datos del formulario.
 * @returns {object} - Objeto con el dictamen (status, color, recommendation, etc.).
 */
function runCreditEngine(data) {
    const { age, judicialDefaultDeclaration, totalIncome, operatingCosts, familyExpenses, estimatedPayment } = data;

    // 1. Cálculo de Ingreso Neto Disponible
    const netIncome = totalIncome - operatingCosts - familyExpenses;

    // 2. Cálculo del Porcentaje de Capacidad de Pago (CP)
    // Evitar división por cero si la cuota es 0 o no se ha ingresado
    const paymentCapacityPct = (estimatedPayment > 0) ? (netIncome / estimatedPayment) * 100 : 0;

    // --- 3. Evaluación de Reglas de Negocio y Semáforo ---

    // Filtros Excluyentes Inmediatos (Dictamen ROJO)
    if (judicialDefaultDeclaration) {
        return {
            status: 'ROJO',
            color: 'bg-red-100 text-red-800 border-red-400',
            recommendation: 'Declaración verbal de mora o proceso judicial vigente.',
            paymentCapacityPct: paymentCapacityPct,
            netIncome: netIncome
        };
    }
    if (age < 18 || age > 68) {
        return {
            status: 'ROJO',
            color: 'bg-red-100 text-red-800 border-red-400',
            recommendation: `Edad (${age} años) fuera del rango de política crediticia (18-68).`,
            paymentCapacityPct: paymentCapacityPct,
            netIncome: netIncome
        };
    }
    if (paymentCapacityPct < 100) {
        // 4. Recálculo Sugerido: Cuota máxima para alcanzar 100% de CP
        const maxSuggestedPayment = netIncome;
        return {
            status: 'ROJO',
            color: 'bg-red-100 text-red-800 border-red-400',
            recommendation: 'Capacidad de pago insuficiente para cubrir la cuota proyectada.',
            paymentCapacityPct: paymentCapacityPct,
            netIncome: netIncome,
            maxSuggestedPayment: maxSuggestedPayment
        };
    }

    // Evaluación de Viabilidad Condicionada (Dictamen AMARILLO)
    if (paymentCapacityPct >= 100 && paymentCapacityPct < 120) {
        // 4. Recálculo Sugerido: Cuota máxima para alcanzar 120% de CP
        const maxSuggestedPayment = netIncome / 1.2;
        return {
            status: 'AMARILLO',
            color: 'bg-yellow-100 text-yellow-800 border-yellow-400',
            recommendation: 'Capacidad de pago ajustada. Se sugiere evaluar ampliación de plazo, ajuste de monto o requerimiento de garante.',
            paymentCapacityPct: paymentCapacityPct,
            netIncome: netIncome,
            maxSuggestedPayment: maxSuggestedPayment
        };
    }

    // Evaluación de Alta Viabilidad (Dictamen VERDE)
    // Esta es la condición por defecto si no se cumplen las anteriores (CP >= 120)
    return {
        status: 'VERDE',
        color: 'bg-green-100 text-green-800 border-green-400',
        recommendation: 'Evaluación preliminar favorable. Capacidad de pago holgada. Continuar con la recopilación de carpetas y visita de campo.',
        paymentCapacityPct: paymentCapacityPct,
        netIncome: netIncome
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
                <div class="custom-card p-3 rounded-xl border ${ev.resultColor || 'border-gray-300'} flex justify-between items-center shadow-sm mb-3">
                    <div class="flex-1 text-xs overflow-hidden">
                        <p class="font-bold text-sm truncate">Edad: ${ev.age} | Ant: ${ev.businessAntiquity}a | Ing. Neto: ${ev.netIncome.toFixed(0)} Bs</p>
                        <p class="text-[10px] text-muted uppercase">${dateStr}</p>
                        <p class="opacity-80 mt-1 truncate">Cuota: ${ev.estimatedPayment} Bs | CP: <span class="font-bold">${ev.paymentCapacityPct.toFixed(0)}%</span></p>
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
            maritalStatus: document.getElementById('marital-status').value,
            businessAntiquity: parseInt(document.getElementById('business-antiquity').value),
            judicialDefaultDeclaration: document.getElementById('judicial-default-declaration').checked,
            totalIncome: parseFloat(document.getElementById('total-income').value),
            operatingCosts: parseFloat(document.getElementById('operating-costs').value),
            familyExpenses: parseFloat(document.getElementById('family-expenses').value),
            estimatedPayment: parseFloat(document.getElementById('estimated-payment').value),
        };

        // 2. Validación de entradas básicas
        for (const key in formData) {
            const value = formData[key];
            if (!value || (typeof value === 'number' && (isNaN(value) || value <= 0))) {
                alert(`Por favor, completa el campo '${key}' con un valor válido.`);
                return;
            }
        }

        // 3. Ejecutar el nuevo motor de evaluación crediticia
        const scoringResult = runCreditEngine(formData);

        // 4. Mostrar el resultado final en la UI
        const display = document.getElementById('result-display');
        display.innerHTML = `
            <div class="p-4 rounded-xl border-2 ${scoringResult.color} text-center animate-in fade-in zoom-in duration-300">
                <p class="text-sm uppercase tracking-widest font-bold">Dictamen Preliminar</p>
                <h3 class="text-4xl font-black my-2">${scoringResult.status}</h3>
                <div class="my-3 p-2 rounded-lg bg-black bg-opacity-5">
                    <p class="text-xs uppercase">Capacidad de Pago</p>
                    <p class="font-bold text-xl">${scoringResult.paymentCapacityPct.toFixed(1)}%</p>
                </div>
                <p class="text-xs mt-2 font-medium">${scoringResult.recommendation}</p>
                
                ${scoringResult.maxSuggestedPayment ? `
                <div class="mt-4 pt-3 border-t border-black border-opacity-10">
                    <p class="text-xs">Se sugiere una cuota máxima de <b class="text-base">Bs. ${scoringResult.maxSuggestedPayment.toFixed(2)}</b> para mejorar la viabilidad.</p>
                </div>
                ` : ''}

                <button id="btn-save" class="w-full btn-primary-custom font-bold py-3 rounded-lg shadow-lg transition-all active:scale-95 mt-4">
                    GUARDAR EVALUACIÓN
                </button>
            </div>
        `;
        display.classList.remove('hidden');

        // 5. Añadir evento al nuevo botón de guardar
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
                    paymentCapacityPct: scoringResult.paymentCapacityPct,
                    netIncome: scoringResult.netIncome,
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
