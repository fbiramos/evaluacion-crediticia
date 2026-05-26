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

// 3. Memoria Local (Temporal antes de Firebase)
let evaluations = [];

function renderHistory() {
    const list = document.getElementById('history-list');
    if (evaluations.length === 0) return;

    list.innerHTML = evaluations.map(ev => `
        <div class="p-4 rounded-xl border ${ev.result.color} flex justify-between items-center shadow-sm">
            <div>
                <p class="font-bold text-white">${ev.name}</p>
                <p class="text-xs opacity-80">Score: ${ev.score} (Umbral: ${ev.threshold})</p>
            </div>
            <span class="font-black">${ev.result.status}</span>
        </div>
    `).join('');
}

// 3. Controlador de Eventos
document.addEventListener('DOMContentLoaded', () => {
    const btnEvaluate = document.getElementById('btn-evaluate');
    btnEvaluate.addEventListener('click', () => {
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

        // Guardar en el historial local
        evaluations.unshift({ name, score, threshold, result, date: new Date() });
        renderHistory();

        // Limpiar input nombre
        setTimeout(() => {
            document.getElementById('client-name').value = '';
        }, 2000);
    });
});
