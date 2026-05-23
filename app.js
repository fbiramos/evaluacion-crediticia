import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Configuración de Firebase (Reemplaza con tus credenciales)
const firebaseConfig = {
    apiKey: "AIzaSyDYykts_TuUqUJ9EgdMYkZwyzG9NYucTOs",
    authDomain: "verificacion-crediticia.firebaseapp.com",
    projectId: "verificacion-crediticia",
    storageBucket: "verificacion-crediticia.firebasestorage.app",
    messagingSenderId: "898700604866",
    appId: "1:898700604866:web:ff9fc34243084203e4d25b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 2. Persistencia Offline
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') console.log("Múltiples pestañas abiertas");
    else if (err.code == 'unimplemented') console.log("Navegador no soporta persistencia");
});

// 3. Estado de la Aplicación
const state = {
    currentUser: JSON.parse(localStorage.getItem('user_profile')) || null,
    evaluations: []
};

// 4. Router SPA con History API
window.router = {
    navigate: (path, addToHistory = true) => {
        if (addToHistory) history.pushState({ path }, "", path);
        render(path);
    }
};

window.onpopstate = (event) => {
    const path = event.state ? event.state.path : '/';
    render(path);
};

// 5. Lógica de Perfiles y PIN
const checkAccess = (profile, pin) => {
    // Simulación de validación simple
    if (pin === profile.pin) {
        state.currentUser = profile;
        localStorage.setItem('user_profile', JSON.stringify(profile));
        window.router.navigate('/dashboard');
    } else {
        alert("PIN Incorrecto");
    }
};

// 6. Renderizado de Vistas
const render = (path) => {
    const container = document.getElementById('view-container');
    const fab = document.getElementById('fab');
    
    // Protección de rutas
    if (!state.currentUser && path !== '/login') {
        path = '/login';
    }

    switch (path) {
        case '/login':
            fab.classList.add('hidden');
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full space-y-8">
                    <h1 class="text-3xl font-bold text-blue-500">Verificación Crediticia</h1>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full px-4">
                        ${[{name: 'Admin', pin: '12'}, {name: 'Almacén', pin: '34'}].map(p => `
                            <button onclick="handleLogin('${p.name}', '${p.pin}')" 
                                class="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-xl font-bold active:scale-95 transition-transform">
                                ${p.name}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            break;

        case '/dashboard':
        case '/':
            fab.classList.remove('hidden');
            container.innerHTML = `
                <header class="mb-6">
                    <p class="text-slate-400 text-sm">Bienvenido, ${state.currentUser?.name}</p>
                    <h2 class="text-2xl font-bold">Evaluaciones Recientes</h2>
                </header>
                <div id="evaluations-list" class="space-y-3">
                    <p class="text-slate-500 italic text-center py-10">Sincronizando...</p>
                </div>
            `;
            initEvaluationsListener();
            break;

        case '/nuevo':
            fab.classList.add('hidden');
            container.innerHTML = `
                <header class="mb-6 flex items-center">
                    <button onclick="window.router.navigate('/dashboard')" class="mr-4 text-blue-500">← Volver</button>
                    <h2 class="text-2xl font-bold">Nueva Evaluación</h2>
                </header>
                <form id="eval-form" class="space-y-4">
                    <input type="text" id="cliente" placeholder="Nombre del Cliente" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500" required>
                    <input type="number" id="dni" placeholder="DNI / Identificación" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500" required>
                    <input type="number" id="puntaje" placeholder="Puntaje Crediticio (0-1000)" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500" required>
                    <select id="estado" class="w-full bg-slate-900 border border-slate-800 p-4 rounded-xl outline-none focus:border-blue-500">
                        <option value="Pendiente">Pendiente</option>
                        <option value="Aprobado">Aprobado</option>
                        <option value="Rechazado">Rechazado</option>
                    </select>
                    <button type="submit" class="w-full bg-blue-600 p-4 rounded-xl font-bold text-lg active:scale-95 transition-transform">Guardar Evaluación</button>
                </form>
            `;
            document.getElementById('eval-form').onsubmit = handleSaveEvaluation;
            break;
    }
};

// 7. Sincronización Real-time
let unsubscribeEvaluations = null;
const initEvaluationsListener = () => {
    if (unsubscribeEvaluations) unsubscribeEvaluations();
    const q = query(collection(db, "evaluaciones"), orderBy("timestamp", "desc"));
    unsubscribeEvaluations = onSnapshot(q, (snapshot) => {
        const listContainer = document.getElementById('evaluations-list');
        if (!listContainer) return;
        
        let html = '';
        snapshot.forEach((doc) => {
            const item = doc.data();
            html += `
                <div class="bg-slate-900 p-4 rounded-xl flex justify-between items-center border-l-4 border-blue-500">
                    <div class="flex-1">
                        <h3 class="font-bold">${item.cliente || 'Sin nombre'}</h3>
                        <p class="text-xs text-slate-400">DNI: ${item.dni || 'N/A'}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xl font-mono font-bold ${item.estado === 'Aprobado' ? 'text-green-500' : 'text-red-500'}">${item.puntaje || 0}</span>
                        <p class="text-[10px] uppercase text-slate-500">Puntaje</p>
                    </div>
                </div>
            `;
        });
        listContainer.innerHTML = html || '<p class="text-center text-slate-600 py-10">No hay evaluaciones registradas</p>';
    });
};

// 8. Gestión de Conectividad
window.addEventListener('online', () => {
    document.getElementById('offline-toast').classList.add('hidden');
    console.log("Conexión restablecida");
});

window.addEventListener('offline', () => {
    document.getElementById('offline-toast').classList.remove('hidden');
});

// 8. Guardado de Datos
const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    const data = {
        cliente: document.getElementById('cliente').value,
        dni: document.getElementById('dni').value,
        puntaje: parseInt(document.getElementById('puntaje').value),
        estado: document.getElementById('estado').value,
        timestamp: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "evaluaciones"), data);
        window.router.navigate('/dashboard');
    } catch (e) { console.error("Error guardando: ", e); }
};

// Global handlers para botones (necesario por el scope de módulos JS)
window.handleLogin = (name, correctPin) => {
    const userPin = prompt(`Ingrese PIN para ${name} (2 dígitos):`);
    checkAccess({name, pin: correctPin}, userPin);
};

// Registro de Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

// Inicio de la App
render(window.location.pathname);
