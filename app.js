// CONFIGURACIÓN DE FIREBASE (Reemplaza con tus credenciales)
const firebaseConfig = {
    apiKey: "Aiz...tu_api_key_real",
    authDomain: "evaluacion-crediticia-bbdb4.firebaseapp.com",
    projectId: "evaluacion-crediticia-bbdb4",
    storageBucket: "evaluacion-crediticia-bbdb4.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abc123def456"
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
            color: approved ? 'bg-green-900/30 text-green-400 border-green-500' : 'bg-red-900/30 text-red-400 border-red-500',
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
            return `
                <div class="p-4 rounded-xl border ${ev.resultColor} flex justify-between items-center shadow-sm mb-3">
                    <div>
                        <p class="font-bold text-white">${ev.name}</p>
                        <p class="text-xs opacity-80">Score: ${ev.score} (Umbral: ${ev.threshold})</p>
                    </div>
                    <span class="font-black">${ev.resultStatus}</span>
                </div>
            `;
        }).join('');
    });
}

// 3. Controlador de Eventos
document.addEventListener('DOMContentLoaded', () => {
    initRealtimeUpdates();
    
    const btnEvaluate = document.getElementById('btn-evaluate');
    btnEvaluate.addEventListener('click', async () => {
        const name = document.getElementById('client-name').value;
        const score = parseInt(document.getElementById('client-score').value);
        const threshold = parseInt(document.getElementById('threshold').value);

        if (!name) {
            alert("Por favor, ingresa el nombre del cliente.");
            return;
        }

        const result = RiskMotor.evaluate(score, threshold);

        // Mostrar resultado en la UI (en lugar de alert)
        const display = document.getElementById('result-display');
        display.innerHTML = `
            <div class="p-4 rounded-xl border-2 ${result.color} text-center animate-bounce">
                <p class="text-sm uppercase tracking-widest font-bold">Resultado</p>
                <h3 class="text-3xl font-black">${result.icon} ${result.status}</h3>
            </div>
        `;
        display.classList.remove('hidden');

        // GUARDAR EN FIRESTORE
        try {
            await evaluationsRef.add({
                name,
                score,
                threshold,
                resultStatus: result.status,
                resultColor: result.color,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Error al guardar:", error);
        }

        // Limpiar input nombre
        setTimeout(() => {
            document.getElementById('client-name').value = '';
        }, 2000);
    });
});
