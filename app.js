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

// 1. Motor de Cálculo (Lógica de Negocio)
const RiskMotor = {
    evaluate: (score, threshold) => {
        const approved = score >= threshold;
        return {
            status: approved ? 'APROBADO' : 'RECHAZADO',
            color: approved ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300',
            icon: approved ? '✅' : '❌'
        };
    }
};

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
                        <p class="font-bold text-gray-900">${ev.name} <span class="text-[11px] font-normal opacity-70">(${ev.age || 'N/A'} años)</span></p>
                        <p class="text-[10px] opacity-60 uppercase">${dateStr}</p>
                        <p class="text-xs opacity-80 mt-1">Score: ${ev.score} / Min: ${ev.threshold}</p>
                    </div>
                    <span class="font-black text-sm mr-4">${ev.resultStatus}</span>
                    <button onclick="deleteEvaluation('${doc.id}')" class="text-gray-500 hover:text-red-400 p-2 transition-colors">🗑️</button>
                </div>
            `;
        }).join('');
    });
}

// 3. Controlador de Eventos
document.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
    initRealtimeUpdates();
    
    const btnEvaluate = document.getElementById('btn-evaluate');
    btnEvaluate.addEventListener('click', async () => {
        const rawName = document.getElementById('client-name').value;
        const age = parseInt(document.getElementById('client-age').value);
        const score = parseInt(document.getElementById('client-score').value);
        const threshold = parseInt(document.getElementById('threshold').value);

        const name = rawName.trim().toUpperCase();

        // Validación básica
        if (!name) {
            alert("Por favor, ingresa un nombre válido.");
            return;
        }

        if (!age || age < 18) {
            alert("Por favor, ingresa una edad válida (mínimo 18 años).");
            return;
        }

        if (score < 1 || score > 10 || threshold < 1 || threshold > 10) {
            alert("Los valores deben estar entre 1 y 10.");
            return;
        }

        // Bloquear botón para evitar doble click
        btnEvaluate.disabled = true;
        btnEvaluate.innerText = "PROCESANDO...";

        const result = RiskMotor.evaluate(score, threshold);

        // Mostrar resultado en la UI (en lugar de alert)
        const display = document.getElementById('result-display');
        display.innerHTML = `
            <div class="p-4 rounded-xl border-2 ${result.color} text-center animate-in fade-in zoom-in duration-300">
                <p class="text-sm uppercase tracking-widest font-bold">Resultado</p>
                <h3 class="text-3xl font-black">${result.icon} ${result.status}</h3>
            </div>
        `;
        display.classList.remove('hidden');

        // GUARDAR EN FIRESTORE
        try {
            await evaluationsRef.add({
                name,
                age,
                score,
                threshold,
                resultStatus: result.status,
                resultColor: result.color,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error de conexión con la base de datos.");
        } finally {
            // Desbloquear botón
            btnEvaluate.disabled = false;
            btnEvaluate.innerText = "EJECUTAR EVALUACIÓN";
        }

        // Limpiar input nombre
        setTimeout(() => {
            document.getElementById('client-name').value = '';
            document.getElementById('client-age').value = '';
        }, 2000);
    });

    // Pulido: Limpiar el resultado visual cuando el usuario empiece a escribir un nuevo nombre
    document.getElementById('client-name').addEventListener('input', () => {
        const display = document.getElementById('result-display');
        if (!display.classList.contains('hidden')) {
            display.classList.add('hidden');
        }
    });
});
