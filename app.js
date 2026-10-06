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
    if (age >= 26 && age <= 55) return 10;
    if ((age >= 18 && age <= 25) || (age >= 56 && age <= 68)) return 7;
    return 1;
}

function getScoreValue(category, value) {
    const scoreMap = {
        'marital-status': {
            'Casado(a)': 10,
            'Concubino(a)': 10,
            'Casado': 10,
            'Conviviente': 10,
            'Separado(a)': 7,
            'Divorciado(a)': 7,
            'Separado': 7,
            'Divorciado': 7,
            'Soltero(a)': 5,
            'Viudo(a)': 5,
            'Soltero': 5,
            'Viudo': 5
        },
        'housing-type': {
            'Vivienda propia': 10,
            'Propietario': 10,
            'Vivienda de familia': 7,
            'Vivienda familiar': 7,
            'Anticrético vigente': 7,
            'Alquiler': 3,
            'Alquilado': 3,
            'Anticrético no vigente': 3
        },
        'dependents': {
            '0': 3,
            'Sin hijos': 3,
            '1-2': 10,
            '3-4': 7,
            '5 o más': 3,
            'Más de 4': 3
        },
        'patrimony': {
            'Inmueble propio con documentación': 10,
            'Inmueble propio': 10,
            'Inmueble/Vehículo propio': 10,
            'Vehículo propio': 7,
            'Maquinaria y equipo de producción': 7,
            'Sin bienes declarados de respaldo': 1,
            'Sin bienes registrados': 1
        },
        'guarantor': {
            'Garante propietario con inmueble registrado': 10,
            'Garante propietario con inmueble debidamente registrado': 10,
            'Garante personal con ingresos estables verificables': 7,
            'Garante personal con ingresos estables': 7,
            'Respaldo en bienes muebles': 7,
            'Sin garante disponible': 3,
            'Sin garante': 3
        },
        'credit-history': {
            'Historial impecable reportado verbalmente': 10,
            'Impecable / Sin mora': 10,
            'Historial con retrasos menores regularizados': 8,
            'Retrasos menores esporádicos pero regularizados': 8,
            'Sin historial crediticio previo': 7,
            'Primer crédito': 7,
            'Declaración verbal de mora activa': 1,
            'Ejecuciones judiciales': 1,
            'Calificación deficiente': 1,
            'Mora ocasional < 30 días': 1,
            'Mora severa': 1
        },
        'active-credits': {
            '0 a 1 crédito vigente': 10,
            'Sin créditos activos o 1 al día': 10,
            '2 créditos vigentes al día': 7,
            '2 créditos al día': 7,
            '3 créditos vigentes en distintas entidades': 3,
            '3 créditos vigentes': 3,
            '4 créditos vigentes o más': 1,
            '4 créditos vigentes': 1,
            'Créditos en mora': 1
        },
        'indirect-debt': {
            'No es garante activo de ninguna deuda de terceros': 10,
            'No es garante activo': 10,
            'Garante de 1 crédito vigente de un tercero al día': 7,
            'Garante de crédito al día': 7,
            'Garante activo en más de 2 créditos de terceros con problemas de pago': 1,
            'Garante activo en más de 2 créditos de terceros con morosidad declarada': 1,
            'Garante de crédito en mora': 1
        },
        'business-antiquity': {
            '2 años o más de operación continua': 10,
            '24 meses o más': 10,
            'De 1 a casi 2 años de operación continua': 7,
            '12 a 23 meses': 7,
            'Menos de 12 meses de antigüedad': 1,
            'Menos de 1 año': 1
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

function renderHistoryList(items) {
    const list = document.getElementById('history-list');
    const searchInput = document.getElementById('history-search');

    if (!items || items.length === 0) {
        list.innerHTML = `<p class="text-gray-500 text-center italic">No hay registros aún...</p>`;
        return;
    }

    list.innerHTML = items.map(doc => {
        const ev = doc.data();
        const dateStr = ev.date ? ev.date.toDate().toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Procesando...';
        const fullName = ev.fullName || 'Sin nombre';
        const identityCard = ev.identityCard || 'Sin CI';
        const status = ev.resultStatus || 'SIN ESTADO';
        const score = ev.totalScore ?? ev.globalIndex ?? 0;
        const searchText = `${fullName} ${identityCard}`.toLowerCase();
        const activeFilter = (searchInput?.value || '').trim().toLowerCase();

        if (activeFilter && !searchText.includes(activeFilter)) {
            return null;
        }

        return `
            <div class="custom-card p-3 rounded-xl border ${ev.resultColor || 'border-gray-300'} shadow-sm mb-3 cursor-pointer hover:opacity-95" data-id="${doc.id}">
                <div class="flex justify-between items-start gap-3">
                    <div class="flex-1 text-xs overflow-hidden">
                        <p class="font-bold text-sm truncate">${fullName}</p>
                        <p class="text-[10px] text-muted uppercase">CI: ${identityCard}</p>
                        <p class="text-[10px] text-muted uppercase mt-1">${dateStr}</p>
                        <p class="opacity-80 mt-1 truncate">Edad: ${ev.age || 'N/A'} | Estado: ${ev.maritalStatus || 'N/A'} | Puntaje: <span class="font-bold">${score}</span></p>
                    </div>
                    <div class="text-right">
                        <span class="font-black text-lg block">${status}</span>
                        <button onclick="event.stopPropagation(); deleteEvaluation('${doc.id}')" class="text-gray-500 hover:text-red-400 p-2 transition-colors mt-1">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).filter(Boolean).join('');

    list.querySelectorAll('[data-id]').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            const ev = items.find(doc => doc.id === id)?.data();
            if (!ev) return;

            const detail = document.getElementById('history-detail');
            const content = document.getElementById('history-detail-content');

            content.innerHTML = `
                <div class="grid grid-cols-2 gap-3">
                    <div><strong>Nombre:</strong><br>${ev.fullName || 'N/A'}</div>
                    <div><strong>CI:</strong><br>${ev.identityCard || 'N/A'}</div>
                    <div><strong>Edad:</strong><br>${ev.age || 'N/A'}</div>
                    <div><strong>Estado civil:</strong><br>${ev.maritalStatus || 'N/A'}</div>
                    <div><strong>Estabilidad:</strong><br>${ev.housingType || 'N/A'}</div>
                    <div><strong>Carga familiar:</strong><br>${ev.dependents || 'N/A'}</div>
                    <div><strong>Patrimonio:</strong><br>${ev.patrimony || 'N/A'}</div>
                    <div><strong>Garante:</strong><br>${ev.guarantor || 'N/A'}</div>
                    <div><strong>Historial:</strong><br>${ev.creditHistory || 'N/A'}</div>
                    <div><strong>Créditos vigentes:</strong><br>${ev.activeCredits || 'N/A'}</div>
                    <div><strong>Deuda indirecta:</strong><br>${ev.indirectDebt || 'N/A'}</div>
                    <div><strong>Negocio:</strong><br>${ev.businessAntiquity || 'N/A'}</div>
                </div>
                <div class="mt-4 pt-3 border-t border-gray-200">
                    <p><strong>Resultado:</strong> ${ev.resultStatus || 'N/A'}</p>
                    <p><strong>Índice global:</strong> ${(ev.globalIndex ?? 0).toFixed(2)}</p>
                    <p><strong>Puntaje total:</strong> ${ev.totalScore ?? 0}</p>
                    <p><strong>Recomendación:</strong> ${ev.recommendation || 'N/A'}</p>
                    <p><strong>Fecha:</strong> ${ev.date ? ev.date.toDate().toLocaleString('es-BO') : 'N/A'}</p>
                </div>
            `;

            detail.classList.remove('hidden');
        });
    });
}

function initRealtimeUpdates() {
    const searchInput = document.getElementById('history-search');
    let allRecords = [];

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            renderHistoryList(allRecords);
        });
    }

    evaluationsRef.orderBy('date', 'desc').onSnapshot(snapshot => {
        allRecords = snapshot.docs;
        renderHistoryList(allRecords);
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

    const formSteps = Array.from(document.querySelectorAll('.form-step'));
    const stepItems = Array.from(document.querySelectorAll('.step-item'));
    const stepIndicator = document.getElementById('step-indicator');
    const prevStepButton = document.getElementById('btn-prev-step');
    const nextStepButton = document.getElementById('btn-next-step');
    const btnEvaluate = document.getElementById('btn-evaluate');

    let currentStep = 1;
    const totalSteps = formSteps.length;

    function validateCurrentStep() {
        const currentStepElement = formSteps[currentStep - 1];
        const inputs = currentStepElement.querySelectorAll('input, select');

        for (const field of inputs) {
            const value = field.value ? field.value.trim() : '';
            if (!value) {
                alert('Completa todos los campos del bloque antes de continuar.');
                field.focus();
                return false;
            }
        }

        if (currentStep === 1) {
            const fullName = document.getElementById('full-name').value.trim();
            const identityCard = document.getElementById('identity-card').value.trim();
            if (!fullName || !identityCard) {
                alert('Ingresa el nombre completo y el carnet de identidad antes de continuar.');
                return false;
            }
        }

        if (currentStep === 2) {
            const age = Number(document.getElementById('client-age').value);
            if (!Number.isFinite(age) || age <= 0 || age < 18 || age > 68) {
                alert('Por favor ingresa una edad válida entre 18 y 68 años.');
                document.getElementById('client-age').focus();
                return false;
            }
        }

        return true;
    }

    function updateStepUI() {
        formSteps.forEach((step, index) => {
            const isActive = index === currentStep - 1;
            step.classList.toggle('hidden', !isActive);
        });

        stepItems.forEach((item, index) => {
            const isCurrent = index + 1 === currentStep;
            const isComplete = index + 1 < currentStep;
            item.classList.toggle('is-active', isCurrent);
            item.classList.toggle('is-complete', isComplete);
        });

        stepIndicator.textContent = `${currentStep} / ${totalSteps}`;
        prevStepButton.classList.toggle('hidden', currentStep === 1);
        nextStepButton.classList.toggle('hidden', currentStep === totalSteps);
        btnEvaluate.classList.toggle('hidden', currentStep !== totalSteps);
    }

    prevStepButton.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep -= 1;
            updateStepUI();
        }
    });

    nextStepButton.addEventListener('click', () => {
        if (!validateCurrentStep()) return;
        if (currentStep < totalSteps) {
            currentStep += 1;
            updateStepUI();
        }
    });

    btnEvaluate.addEventListener('click', async () => {
        if (!validateCurrentStep()) return;

        const fullName = document.getElementById('full-name').value.trim();
        const identityCard = document.getElementById('identity-card').value.trim();

        if (!fullName || !identityCard) {
            alert('Ingresa el nombre completo y el carnet de identidad antes de continuar.');
            return;
        }

        const formData = {
            fullName,
            identityCard,
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

            if (key !== 'age' && key !== 'fullName' && key !== 'identityCard' && (!value || value.trim() === '')) {
                alert('Completa todas las variables del modelo de preevaluación antes de evaluar.');
                return;
            }
        }

        const scoringResult = runCreditEngine(formData);
        const display = document.getElementById('result-display');

        const summaryFields = [
            ['Nombre completo', formData.fullName],
            ['Carnet de identidad', formData.identityCard],
            ['Edad', formData.age],
            ['Estado civil', formData.maritalStatus],
            ['Estabilidad domiciliaria', formData.housingType],
            ['Carga familiar', formData.dependents],
            ['Respaldo patrimonial', formData.patrimony],
            ['Disponibilidad de garante', formData.guarantor],
            ['Historial crediticio', formData.creditHistory],
            ['Créditos vigentes', formData.activeCredits],
            ['Deuda indirecta / garante', formData.indirectDebt],
            ['Antigüedad en la actividad', formData.businessAntiquity]
        ];

        display.innerHTML = `
            <div class="space-y-4">
                <div class="p-4 rounded-xl border-2 ${scoringResult.color} text-center animate-in fade-in zoom-in duration-300">
                    <p class="text-sm uppercase tracking-widest font-bold mb-2">Confirmación de Evaluación</p>
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
                    <p class="text-xs mt-4 font-medium">¿Deseas guardar esta evaluación?</p>

                    <div class="mt-4 flex gap-3">
                        <button id="btn-edit-eval" class="flex-1 bg-gray-200 text-gray-800 font-bold py-3 rounded-lg shadow-lg transition-all active:scale-95">
                            EDITAR
                        </button>
                        <button id="btn-save" class="flex-1 btn-primary-custom font-bold py-3 rounded-lg shadow-lg transition-all active:scale-95">
                            GUARDAR
                        </button>
                    </div>
                </div>

                <div class="p-4 rounded-xl border border-gray-200 bg-white shadow-sm text-left">
                    <p class="text-sm uppercase tracking-widest font-bold mb-3 text-gray-700">Resumen Final</p>
                    <div class="text-xs space-y-2">
                        ${summaryFields.map(([label, value]) => `<div class="flex justify-between gap-3"><span class="text-muted">${label}:</span><span class="font-semibold text-right">${value}</span></div>`).join('')}
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-200 text-xs space-y-1">
                        <p class="font-bold uppercase tracking-widest text-[10px]">Puntaje por variable</p>
                        ${Object.entries(scoringResult.breakdown).map(([key, point]) => `<div class="flex justify-between"><span>${key}</span><span class="font-bold">${point} pts</span></div>`).join('')}
                    </div>
                    <p class="text-xs mt-4 font-medium">${scoringResult.recommendation}</p>
                </div>
            </div>
        `;

        document.getElementById('btn-edit-eval').addEventListener('click', () => {
            const lastFilledStep = Math.min(Math.max(currentStep, 1), totalSteps);
            currentStep = lastFilledStep;
            updateStepUI();
            display.classList.add('hidden');
        });
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
                currentStep = 1;
                updateStepUI();

            } catch (error) {
                console.error('Error al guardar en Firestore:', error);
                alert('Error de conexión al guardar en la base de datos. Inténtalo de nuevo.');
                saveButton.disabled = false;
                saveButton.innerText = 'GUARDAR EVALUACIÓN';
            }
        });
    });

    updateStepUI();

    document.getElementById('view-home').addEventListener('input', () => {
        const display = document.getElementById('result-display');
        if (!display.classList.contains('hidden')) {
            display.classList.add('hidden');
        }
    });
});
