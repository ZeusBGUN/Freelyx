'use strict';

function checkAuth(){
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if(!token || !user){
        alert('Debes iniciar sesión para acceder');
        window.location.href = '/';
        return null;
    }

    return JSON.parse(user);
}

function loadUserData(){
    const user = checkAuth();

    if(!user){
        return;
    }

    // Cargar nombre de usuario
    const userName = document.getElementById('userName');
    if(userName){
        userName.textContent = user.name + ' ' + user.lastName;
    }

    // Cargar iniciales
    const userInitials = document.getElementById('userInitials');
    if(userInitials){
        const initials = user.name.charAt(0) + user.lastName.charAt(0);
        userInitials.textContent = initials.toUpperCase();
    }

    console.log('✅ Usuario cargado:', user);
}

function logout(){
    openLogoutModal();
}

function openLogoutModal(){
    const modal = document.getElementById('logoutModal');
    if(modal){
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeLogoutModal(){
    const modal = document.getElementById('logoutModal');
    if(modal){
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function confirmLogout(){
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('👋 Sesión cerrada');
    window.location.href = '/';
}

document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
        closeLogoutModal();
    }
});

document.addEventListener('DOMContentLoaded', function(){
    console.log('🚀 Dashboard inicializado');
    
    const user = checkAuth();

    if(user){
        loadUserData();
        loadDynamicSidebar();
        loadStats();

        console.log('✅ Dashboard corriendo correctamente');
    }
});

async function loadStats(){
    const token = localStorage.getItem('token');
    
    console.log('📊 Cargando estadísticas...');
    
    try {
        const response = await fetch(`${API_URL}/contracts/stats`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        console.log('📡 Respuesta status:', response.status);
        
        const data = await response.json();
        
        console.log('📦 Datos recibidos:', data);
        
        if(data.success){
            console.log('✅ Estadísticas cargadas:', data.stats);
            displayStats(data.stats);
            displayRecentContracts(data.stats.recentContracts);
        } else {
            console.error('❌ Error al cargar estadísticas:', data.message);
        }
        
    } catch(error){
        console.error('❌ Error al cargar estadísticas:', error);
    }
}

function displayStats(stats){
    const user = JSON.parse(localStorage.getItem('user'));
    const statsElements = document.querySelectorAll('.stat-value');
    
    console.log('📊 Mostrando estadísticas para:', user.userType);
    console.log('📊 Stats recibidos:', stats);
    
    if(user.userType === 'freelancer'){
        // Estadísticas para Freelancer
        if(statsElements[0]) {
            statsElements[0].textContent = stats.activeContracts || 0;
            console.log('Contratos activos:', stats.activeContracts);
        }
        
        if(statsElements[1]) {
            // Calcular ingresos del mes actual
            const monthlyIncome = calculateMonthlyIncome(stats);
            statsElements[1].textContent = '$' + monthlyIncome.toLocaleString();
            console.log('Ingresos del mes:', monthlyIncome);
        }
        
        if(statsElements[2]) {
            statsElements[2].textContent = stats.completedContracts || 0;
            console.log('Completados:', stats.completedContracts);
        }
        
        if(statsElements[3]) {
            // Calificación fija por ahora
            statsElements[3].textContent = '5.0';
        }
        
    } else {
        // Estadísticas para Empresa
        if(statsElements[0]) {
            statsElements[0].textContent = stats.activeContracts || 0;
            console.log('Contratos activos:', stats.activeContracts);
        }
        
        if(statsElements[1]) {
            statsElements[1].textContent = stats.activeContracts || 0;
        }
        
        if(statsElements[2]) {
            // Gastos del mes
            const monthlyExpenses = calculateMonthlyExpenses(stats);
            statsElements[2].textContent = '$' + monthlyExpenses.toLocaleString();
            console.log('Gastos del mes:', monthlyExpenses);
        }
        
        if(statsElements[3]) {
            statsElements[3].textContent = stats.completedContracts || 0;
        }
    }
    
    console.log('✅ Estadísticas mostradas en el DOM');
}

function calculateMonthlyIncome(stats){
    if(!stats.recentContracts || stats.recentContracts.length === 0) {
        return 0;
    }
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let monthlyTotal = 0;
    
    stats.recentContracts.forEach(contract => {
        if(contract.status === 'completado'){
            const endDate = new Date(contract.endDate);
            if(endDate.getMonth() === currentMonth && endDate.getFullYear() === currentYear){
                monthlyTotal += parseFloat(contract.amount) || 0;
            }
        }
    });
    
    return monthlyTotal;
}

function calculateMonthlyExpenses(stats){
    if(!stats.recentContracts || stats.recentContracts.length === 0) {
        return 0;
    }
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let monthlyTotal = 0;
    
    stats.recentContracts.forEach(contract => {
        const createdDate = new Date(contract.createdAt);
        if(createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear){
            monthlyTotal += parseFloat(contract.amount) || 0;
        }
    });
    
    return monthlyTotal;
}

function displayRecentContracts(contracts){
    const contractsList = document.querySelector('.contracts-list');
    
    if(!contractsList) {
        console.log('⚠️ No se encontró .contracts-list en el DOM');
        return;
    }
    
    if(!contracts || contracts.length === 0){
        contractsList.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 40px; color: #999;">
                <p>📋 No tienes contratos recientes</p>
            </div>
        `;
        console.log('📋 No hay contratos para mostrar');
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Mostrar solo los primeros 3
    const displayContracts = contracts.slice(0, 3);
    
    contractsList.innerHTML = displayContracts.map(contract => {
        const statusBadge = getStatusBadge(contract.status);
        
        const clientName = user.userType === 'freelancer' 
            ? (contract.companyName + ' ' + contract.companyLastName)
            : (contract.freelancerName + ' ' + contract.freelancerLastName);
        
        const dateLabel = contract.status === 'completado' ? 'Completado' : 'Vence';
        const dateValue = formatDate(contract.endDate);
        
        return `
            <div class="contract-card" onclick="goToContract(${contract.id})" style="cursor: pointer;">
                <div class="contract-header">
                    <h3 class="contract-title">${contract.title}</h3>
                    ${statusBadge}
                </div>
                <p class="contract-client">Cliente: ${clientName}</p>
                <div class="contract-footer">
                    <span class="contract-amount">$${parseFloat(contract.amount).toLocaleString()}</span>
                    <span class="contract-date">${dateLabel}: ${dateValue}</span>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('✅ Contratos recientes mostrados:', displayContracts.length);
}

function getStatusBadge(status){
    const badges = {
        'pendiente': '<span class="badge badge-pending">Pendiente</span>',
        'activo': '<span class="badge badge-active">Activo</span>',
        'completado': '<span class="badge badge-completed">Completado</span>',
        'cancelado': '<span class="badge badge-danger">Cancelado</span>'
    };
    return badges[status] || '';
}

function formatDate(dateString){
    if(!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function goToContract(contractId){
    window.location.href = `contract-detail.html?id=${contractId}`;
}

function loadDynamicSidebar(){
    const user = JSON.parse(localStorage.getItem('user'));
    const sidebarNav = document.getElementById('sidebarNav');
    
    if(!sidebarNav) return;
    if(!user) return;

    const currentPath = window.location.pathname.split('/').pop(); 
    
    const isActive = (href) => href === currentPath ? ' active' : '';

    let sidebarHTML = '';
    
    if(user.userType === 'freelancer'){
        sidebarHTML = `
            <a href="freelancer.html" class="nav-item${isActive('freelancer.html')}">
                <span class="icon">📊</span>
                <span>Dashboard</span>
            </a>
            <a href="contracts.html" class="nav-item${isActive('contracts.html')}">
                <span class="icon">📝</span>
                <span>Contratos</span>
            </a>
            <a href="profile.html" class="nav-item${isActive('profile.html')}">
                <span class="icon">👤</span>
                <span>Perfil</span>
            </a>
            <a href="#" class="nav-item${isActive('pagos.html')}">
                <span class="icon">💰</span>
                <span>Pagos</span>
            </a>
            <a href="#" class="nav-item${isActive('configuracion.html')}">
                <span class="icon">⚙️</span>
                <span>Configuración</span>
            </a>
        `;
    } else {
        sidebarHTML = `
            <a href="empresa.html" class="nav-item${isActive('empresa.html')}">
                <span class="icon">📊</span>
                <span>Dashboard</span>
            </a>
            <a href="#" class="nav-item${isActive('buscar.html')}">
                <span class="icon">🔍</span>
                <span>Buscar Freelancers</span>
            </a>
            <a href="#" class="nav-item${isActive('proyectos.html')}">
                <span class="icon">📂</span>
                <span>Mis Proyectos</span>
            </a>
            <a href="contracts.html" class="nav-item${isActive('contracts.html')}">
                <span class="icon">📋</span>
                <span>Contratos</span>
            </a>
            <a href="#" class="nav-item${isActive('pagos.html')}">
                <span class="icon">💰</span>
                <span>Pagos</span>
            </a>
            <a href="profile.html" class="nav-item${isActive('profile.html')}">
                <span class="icon">🏢</span>
                <span>Perfil Empresa</span>
            </a>
            <a href="#" class="nav-item${isActive('configuracion.html')}">
                <span class="icon">⚙️</span>
                <span>Configuración</span>
            </a>
        `;
    }
    
    sidebarNav.innerHTML = sidebarHTML;
}