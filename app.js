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
function getAgeScore(age) {
    if (age < 18 || age > 68) return 1;
    if (age >= 18 && age <= 25) return 7;
    if (age >= 26 && age <= 35) return 10;
    if (age >= 36 && age <= 45) return 9;
    if (age >= 46 && age <= 55) return 8;
    return 7;
}

function getScoreValue(category, value) {
    const scoreMap = {
        'marital-status': {
            'Casado': 10,
            'Conviviente': 10,
            'Soltero': 7,
            'Divorciado': 7,
            'Viudo': 7
        },
        'housing-type': {
            'Propietario': 10,
            'Vivienda familiar': 7,
            'Alquilado': 5
        },
        'dependents': {
            '0-2 dependientes': 10,
            '3-4 dependientes': 7,
            '5+ dependientes': 4
        },
        'patrimony': {
            'Inmueble/Vehículo propio': 10,
            'Vehículo propio': 7,
            'Sin bienes registrados': 4
        },
        'guarantor': {
            'Garante con ingresos estables': 10,
            'Garante con ingresos variables': 7,
            'Sin garante': 4
        },
        'credit-history': {
            'Impecable / Sin mora': 10,
            'Mora ocasional < 30 días': 5,
            'Mora severa': 1
        },
        'active-credits': {
            'Sin créditos activos o 1 al día': 10,
            '2 créditos al día': 7,
            'Créditos en mora': 1
        },
        'indirect-debt': {
            'No es garante activo': 10,
            'Garante de crédito al día': 7,
            'Garante de crédito en mora': 1
        },
        'business-antiquity': {
            'Más de 3 años continuos': 10,
            'Aproximadamente 3 años': 7,
            '1-3 años': 5,
            'Menos de 1 año': 2
        }
    };

    if (category === 'age') {
        return getAgeScore(Number(value));
    }

    return scoreMap[category]?.[value] ?? 0;
}

function createDonutChart(value, color) {
    const safeValue = Math.min(Math.max(value, 0), 10);
    const pct = (safeValue / 10) * 100;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const dash = (pct / 100) * circumference;

    return `
    <svg width="120" height="120" viewBox="0 0 120 120" class="block">
        <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(148, 163, 184, 0.25)" stroke-width="10"></circle>
        <circle cx="60" cy="60" r="40" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" transform="rotate(-90 60 60)" stroke-dasharray="${dash} ${circumference}" style="transition: stroke-dasharray 0.3s ease"></circle>
    </svg>
    `;
}

function runCreditEngine(data) {
    const scoreFields = {
        age: data.age,
        'marital-status': data.maritalStatus,
        'housing-type': data.housingType,
        'dependents': data.dependents,
        'patrimony': data.patrimony,
        'guarantor': data.guarantor,
        'credit-history': data.creditHistory,
        'active-credits': data.activeCredits,
        'indirect-debt': data.indirectDebt,
        'business-antiquity': data.businessAntiquity
    };

    const breakdown = {};
    let totalScore = 0;

    Object.entries(scoreFields).forEach(([key, value]) => {
        const point = getScoreValue(key, value);
        breakdown[key] = point;
        totalScore += point;
    });

    const veto = Object.values(breakdown).some(score => score === 1);
    const globalIndex = totalScore / 10;

    let status = 'ROJO';
    let color = 'bg-red-100 text-red-800 border-red-400';
    let chartColor = '#f87171';
    let recommendation = 'Solicitud rechazada por riesgo de crédito.';

    if (veto) {
        status = 'ROJO';
        color = 'bg-red-100 text-red-800 border-red-400';
        chartColor = '#f87171';
        recommendation = 'Se aplica veto por mora severa, créditos en mora o deuda indirecta en mora.';
    } else if (globalIndex >= 7) {
        status = 'VERDE';
        color = 'bg-green-100 text-green-800 border-green-400';
        chartColor = '#4ade80';
        recommendation = 'Preaprobado. El cliente cumple con los parámetros mínimos de estabilidad, respaldo y capacidad crediticia.';
    } else if (globalIndex >= 5) {
        status = 'AMARILLO';
        color = 'bg-yellow-100 text-yellow-800 border-yellow-400';
        chartColor = '#facc15';
        recommendation = 'Observado. Requiere revisión manual y análisis complementario antes de aprobar.';
    } else {
        status = 'ROJO';
        color = 'bg-red-100 text-red-800 border-red-400';
        chartColor = '#f87171';
        recommendation = 'Rechazado. El índice global está por debajo del nivel mínimo de aprobación.';
    }

    return {
        status,
        color,
        chartColor,
        recommendation,
        totalScore,
        globalIndex,
        veto,
        breakdown
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

window.signOut = async () => {
    const signOutButton = document.getElementById('btn-sign-out');
    if (signOutButton) {
        signOutButton.disabled = true;
        signOutButton.textContent = 'Signing out...';
    }

    try {
        if (typeof firebase !== 'undefined' && firebase.apps.length && firebase.auth) {
            const auth = firebase.auth();
            if (auth && auth.currentUser) {
                await auth.signOut();
            }
        }

        localStorage.removeItem('cloudCodeSession');
        localStorage.removeItem('creditEvalSession');
        alert('Sign out successful.');
        window.router.navigate('home');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        alert('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    } finally {
        if (signOutButton) {
            signOutButton.disabled = false;
            signOutButton.textContent = 'Sign Out';
        }
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

    const signOutButton = document.getElementById('btn-sign-out');
    if (signOutButton) {
        signOutButton.addEventListener('click', window.signOut);
    }
    
    const btnEvaluate = document.getElementById('btn-evaluate');
    btnEvaluate.addEventListener('click', async () => {
        const formData = {
            age: Number(document.getElementById('client-age').value),
            maritalStatus: document.getElementById('marital-status').value,
            housingType: document.getElementById('housing-type').value,
            dependents: document.getElementById('dependents').value,
            patrimony: document.getElementById('patrimony').value,
            guarantor: document.getElementById('guarantor').value,
            creditHistory: document.getElementById('credit-history').value,
            activeCredits: document.getElementById('active-credits').value,
            indirectDebt: document.getElementById('indirect-debt').value,
            businessAntiquity: document.getElementById('business-antiquity').value,
        };

        for (const [key, value] of Object.entries(formData)) {
            if (key === 'age' && (!Number.isFinite(value) || value <= 0)) {
                alert('Por favor ingresa una edad válida entre 18 y 68 años.');
                return;
            }

            if (key !== 'age' && (!value || value.trim() === '')) {
                alert('Completa todas las variables del modelo de preevaluación antes de evaluar.');
                return;
            }
        }

        const scoringResult = runCreditEngine(formData);
        const display = document.getElementById('result-display');

        display.innerHTML = `
            <div class="p-4 rounded-xl border-2 ${scoringResult.color} text-center animate-in fade-in zoom-in duration-300">
                <p class="text-sm uppercase tracking-widest font-bold mb-2">Resultado de Evaluación</p>
                <div class="flex items-center justify-center space-x-4">
                    <div class="relative flex items-center justify-center">
                        ${createDonutChart(scoringResult.globalIndex, scoringResult.chartColor)}
                        <div class="absolute inset-0 flex flex-col items-center justify-center">
                            <span class="font-black text-2xl">${scoringResult.globalIndex.toFixed(2)}</span>
                            <span class="text-[10px] uppercase -mt-1">Ig</span>
                        </div>
                    </div>
                    <div class="text-left">
                        <h3 class="text-4xl font-black">${scoringResult.status}</h3>
                        <p class="text-xs uppercase tracking-widest">Suma: ${scoringResult.totalScore} / 100</p>
                    </div>
                </div>
                <p class="text-xs mt-4 font-medium">${scoringResult.recommendation}</p>

                <div class="mt-4 pt-3 border-t border-black border-opacity-10 text-left text-xs space-y-1">
                    ${Object.entries(scoringResult.breakdown).map(([key, point]) => `<div class="flex justify-between"><span>${key}</span><span class="font-bold">${point} pts</span></div>`).join('')}
                </div>

                <button id="btn-save" class="w-full btn-primary-custom font-bold py-3 rounded-lg shadow-lg transition-all active:scale-95 mt-4">
                    GUARDAR EVALUACIÓN
                </button>
            </div>
        `;
        display.classList.remove('hidden');

        document.getElementById('btn-save').addEventListener('click', async () => {
            const saveButton = document.getElementById('btn-save');
            saveButton.disabled = true;
            saveButton.innerText = 'GUARDANDO...';

            try {
                await evaluationsRef.add({
                    ...formData,
                    resultStatus: scoringResult.status,
                    resultColor: scoringResult.color,
                    recommendation: scoringResult.recommendation,
                    totalScore: scoringResult.totalScore,
                    globalIndex: scoringResult.globalIndex,
                    veto: scoringResult.veto,
                    breakdown: scoringResult.breakdown,
                    date: firebase.firestore.FieldValue.serverTimestamp()
                });

                document.querySelectorAll('#view-home input, #view-home select').forEach(el => el.value = '');
                display.classList.add('hidden');

            } catch (error) {
                console.error('Error al guardar en Firestore:', error);
                alert('Error de conexión al guardar en la base de datos. Inténtalo de nuevo.');
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
