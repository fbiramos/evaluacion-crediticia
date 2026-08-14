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
                <div class="p-4 rounded-xl border ${ev.resultColor} bg-white flex justify-between items-center shadow-sm mb-3">
                    <div class="flex-1 text-gray-800">
                        <p class="font-bold text-gray-900">${ev.name}</p>
                        <p class="text-[10px] opacity-60 uppercase">${dateStr}</p>
                        <p class="text-xs opacity-80 mt-1">Score: ${ev.score}/${ev.threshold} • ${ev.maritalStatus || 'N/A'} • ${ev.creditType || 'N/A'} • <span class="font-semibold">Bs. ${ev.income || 0}</span></p>
                    </div>
                    <span class="font-black text-sm mr-4">${ev.resultStatus}</span>
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

        // 4. Si pasa la validación, mostrar mensaje de éxito
        // Aquí iría la lógica futura de cálculo de puntaje y guardado.
        // Por ahora, solo mostramos que es elegible.
        display.innerHTML = `
            <div class="p-4 rounded-xl border-2 bg-green-100 text-green-800 border-green-300 text-center animate-in fade-in zoom-in duration-300">
                <p class="text-sm uppercase tracking-widest font-bold">Validación Exitosa</p>
                <h3 class="text-3xl font-black">✅ ELEGIBLE PARA ANÁLISIS</h3>
                <p class="text-xs mt-2">El cliente cumple con los requisitos mínimos.</p>
            </div>
        `;
        display.classList.remove('hidden');

        // NOTA: El guardado en Firestore está desactivado por ahora.
        // Se puede reactivar aquí cuando se defina el siguiente paso del flujo.

        // Limpiar formulario después de un momento
        setTimeout(() => {
            document.querySelectorAll('#view-home input, #view-home select').forEach(el => el.value = '');
        }, 2000);
    });

    // Pulido: Limpiar el resultado visual cuando el usuario empiece a escribir un nuevo nombre
    document.getElementById('view-home').addEventListener('input', () => {
        const display = document.getElementById('result-display');
        if (!display.classList.contains('hidden')) {
            display.classList.add('hidden');
        }
    });
});
