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

    const userName = document.getElementById('userName');
    if(userInitials){
        const initials = user.name.charAt(0) + user.lastName.charAt(0);
        userInitials.textContent = initials.toUpperCase();
    }

    console.log('Usuario cargado:', user);
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

    const user = checkAuth();

    if(user){
        loadUserData();
        loadDynamicSidebar();
        loadStats();

        console.log('Dashboard corriendo correctamente');
    }
})

async function loadStats(){
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('http://localhost:3000/api/users/stats', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if(data.success){
            console.log('📊 Estadísticas cargadas:', data.stats);
            displayStats(data.stats);
        } else {
            console.error('Error al cargar estadísticas:', data.message);
        }
        
    } catch(error){
        console.error('❌ Error al cargar estadísticas:', error);
    }
}

function displayStats(stats){
    const user = JSON.parse(localStorage.getItem('user'));
    
    if(user.userType === 'freelancer'){
        const statsElements = document.querySelectorAll('.stat-value');
        
        if(statsElements[0]) statsElements[0].textContent = stats.activeContracts;
        if(statsElements[1]) statsElements[1].textContent = '$' + (stats.monthlyIncome || 0).toLocaleString();
        if(statsElements[2]) statsElements[2].textContent = stats.completedProjects;
        if(statsElements[3]) statsElements[3].textContent = stats.rating;
        
    } else {
        const statsElements = document.querySelectorAll('.stat-value');
        
        if(statsElements[0]) statsElements[0].textContent = stats.activeFreelancers;
        if(statsElements[1]) statsElements[1].textContent = stats.activeProjects;
        if(statsElements[2]) statsElements[2].textContent = '$' + (stats.monthlyInvestment || 0).toLocaleString();
        if(statsElements[3]) statsElements[3].textContent = stats.completedProjects;
    }
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

