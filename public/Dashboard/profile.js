'use strict';

let originalProfileData = {};
let isEditMode = false;


function checkAuth(){
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if(!token || !user){
        alert('⚠️ Debes iniciar sesión para acceder');
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
    if(userName){
        userName.textContent = user.name + ' ' + user.lastName;
    }
    
    const userInitials = document.getElementById('userInitials');
    if(userInitials){
        const initials = user.name.charAt(0) + user.lastName.charAt(0);
        userInitials.textContent = initials.toUpperCase();
    }
    
    const userRole = document.getElementById('userRole');
    if(userRole){
        userRole.textContent = user.userType === 'freelancer' ? 'Freelancer' : 'Empresa';
    }
    
    console.log('✅ Usuario cargado:', user);
}

async function loadProfile(){
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('${API_URL}/users/profile', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if(data.success){
            const user = data.user;
            
            document.getElementById('profileName').value = user.name;
            document.getElementById('profileLastName').value = user.lastName;
            document.getElementById('profileEmail').value = user.email;
            document.getElementById('profileUserType').value = user.userType === 'freelancer' ? 'Freelancer' : 'Empresa';
            
            const createdDate = new Date(user.createdAt);
            document.getElementById('profileCreatedAt').value = createdDate.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            originalProfileData = {
                name: user.name,
                lastName: user.lastName,
                email: user.email
            };
            
            console.log('✅ Perfil cargado:', user);
        } else {
            showToast(data.message, 'error');
        }
        
    } catch(error){
        console.error('❌ Error al cargar perfil:', error);
        showToast('Error al cargar el perfil', 'error');
    }
}

function toggleEditMode(){
    isEditMode = !isEditMode;
    
    const nameInput = document.getElementById('profileName');
    const lastNameInput = document.getElementById('profileLastName');
    const emailInput = document.getElementById('profileEmail');
    const btnEdit = document.getElementById('btnEditProfile');
    const formActions = document.getElementById('profileFormActions');
    
    if(isEditMode){
        nameInput.disabled = false;
        lastNameInput.disabled = false;
        emailInput.disabled = false;
        btnEdit.textContent = '❌ Cancelar';
        btnEdit.onclick = cancelEdit;
        formActions.classList.remove('hidden');
    } else {
        nameInput.disabled = true;
        lastNameInput.disabled = true;
        emailInput.disabled = true;
        btnEdit.textContent = '✏️ Editar';
        btnEdit.onclick = toggleEditMode;
        formActions.classList.add('hidden');
        
        nameInput.value = originalProfileData.name || '';
        lastNameInput.value = originalProfileData.lastName || '';
        emailInput.value = originalProfileData.email || '';
    }
}

function cancelEdit(){
    isEditMode = true;
    toggleEditMode();
}

document.getElementById('profileForm').addEventListener('submit', async function(event){
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    const name = document.getElementById('profileName').value.trim();
    const lastName = document.getElementById('profileLastName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    
    try {
        const response = await fetch('${API_URL}/users/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ name, lastName, email })
        });
        
        if (!response.ok) {
            const errorText = await response.text(); 
            console.error('❌ Error HTTP:', response.status, response.statusText, errorText.substring(0, 50) + '...');
            throw new Error(`Error ${response.status}: No se pudo actualizar el perfil. Ruta del servidor no encontrada o error interno.`);
        }
        
        const data = await response.json();
        
        if(data.success){
            showToast('Perfil actualizado exitosamente', 'success');
            
            const user = JSON.parse(localStorage.getItem('user'));
            user.name = name;
            user.lastName = lastName;
            user.email = email;
            localStorage.setItem('user', JSON.stringify(user));
            
            originalProfileData = { 
                name: name, 
                lastName: lastName, 
                email: email 
            };
            
            loadUserData();
            
            isEditMode = true;
            toggleEditMode();
            
        } else {
            showToast(data.message, 'error');
        }
        
    } catch(error){
        console.error('❌ Error al actualizar perfil:', error);
        showToast('Error al actualizar el perfil', 'error');
    }
});

async function handlePasswordChange(event){
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if(newPassword !== confirmNewPassword){
        showToast('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if(newPassword.length < 6){
        showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        const response = await fetch('${API_URL}/users/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if(data.success){
            showToast('Contraseña cambiada exitosamente', 'success');
            document.getElementById('passwordForm').reset();
        } else {
            showToast(data.message, 'error');
        }
        
    } catch(error){
        console.error('❌ Error al cambiar contraseña:', error);
        showToast('Error al cambiar la contraseña', 'error');
    }
}

function showToast(mensaje, tipo){
    var toast = document.createElement('div');
    toast.className = 'toast ' + tipo;
    toast.textContent = mensaje;
    
    var container = document.body.querySelector('#toast-container');
    
    if(!container){
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.insertBefore(container, document.body.firstChild);
    }
    
    container.appendChild(toast);
    
    setTimeout(function(){
        toast.remove();
    }, 3000);
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
    console.log('🚀 Perfil cargado');
    
    const user = checkAuth();
    
    if(user){
        loadUserData();
        loadDynamicSidebar();
        loadProfile();
        loadStats();
        
        console.log('✅ Perfil inicializado correctamente');
    }
});

async function loadStats(){
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('${API_URL}/users/stats', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if(data.success){
            displayProfileStats(data.stats);
        }
        
    } catch(error){
        console.error('❌ Error al cargar estadísticas:', error);
    }
}

function displayProfileStats(stats){
    const statsElements = document.querySelectorAll('.profile-stat-value');
    
    if(statsElements[0]) statsElements[0].textContent = stats.completedProjects;
    if(statsElements[1]) statsElements[1].textContent = stats.rating;
    if(statsElements[2]) statsElements[2].textContent = '$' + (stats.totalIncome || 0).toLocaleString();
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