'use strict';

function checkAuth(){
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if(!token || !user){
        alert('Debes iniciar sesión para acceder');
        window.location.href = '/';
        return null;
    }

    const userData = JSON.parse(user);

    if(userData.userType !== 'empresa'){
        alert('Solo las empresas pueden crear contratos');
        window.location.href = '/dashboard/freelancer.html';
        return null;
    }

    return userData;
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

    console.log('Usuario cargado:', user);
}

async function loadFreelancers(){
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/users/freelancers`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const data = await response.json();
        
        if(data.success){
            console.log('✅ Freelancers cargados:', data.freelancers);
            populateFreelancersSelect(data.freelancers);
        } else {
            console.error('❌ Error:', data.message);
            showNoFreelancersMessage();
        }
        
    } catch(error){
        console.error('❌ Error al cargar freelancers:', error);
        showNoFreelancersMessage();
    }
}

function populateFreelancersSelect(freelancers){
    const select = document.getElementById('contractFreelancer');
    
    if(!freelancers || freelancers.length === 0){
        select.innerHTML = '<option value="">No hay freelancers disponibles</option>';
        return;
    }
    
    select.innerHTML = '<option value="">Selecciona un freelancer</option>';
    
    freelancers.forEach(freelancer => {
        const option = document.createElement('option');
        option.value = freelancer.id;
        option.textContent = `${freelancer.name} ${freelancer.lastName} (${freelancer.email})`;
        select.appendChild(option);
    });
    
    console.log(`✅ ${freelancers.length} freelancers agregados al selector`);
}

function showNoFreelancersMessage(){
    const select = document.getElementById('contractFreelancer');
    select.innerHTML = '<option value="">No hay freelancers registrados todavía</option>';
}

async function handleCreateContract(event){
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    
    const title = document.getElementById('contractTitle').value.trim();
    const description = document.getElementById('contractDescription').value.trim();
    const amount = parseFloat(document.getElementById('contractAmount').value);
    const currency = document.getElementById('contractCurrency').value;
    const freelancerId = document.getElementById('contractFreelancer').value;
    const startDate = document.getElementById('contractStartDate').value;
    const endDate = document.getElementById('contractEndDate').value;
    
    if(!title || !description || !amount || !freelancerId || !startDate || !endDate){
        showToast('Por favor completa todos los campos', 'error');
        return;
    }
    
    if(!freelancerId || freelancerId === ''){
        showToast('Debes seleccionar un freelancer', 'error');
        return;
    }
    
    if(amount <= 0){
        showToast('El monto debe ser mayor a 0', 'error');
        return;
    }
    
    if(new Date(endDate) <= new Date(startDate)){
        showToast('La fecha de fin debe ser posterior a la fecha de inicio', 'error');
        return;
    }
    
    const contractData = {
        title,
        description,
        amount,
        currency,
        freelancerId: parseInt(freelancerId),
        startDate,
        endDate
    };
    
    console.log('📤 Enviando contrato:', contractData);
    
    try {
        const response = await fetch(`${API_URL}/contracts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(contractData)
        });
        
        const data = await response.json();
        
        if(data.success){
            showToast('Contrato creado exitosamente', 'success');
            
            setTimeout(() => {
                window.location.href = 'contracts.html';
            }, 1500);
        } else {
            showToast(data.message, 'error');
        }
        
    } catch(error){
        console.error('❌ Error al crear contrato:', error);
        showToast('Error al crear el contrato', 'error');
    }
}

function goBack(){
    window.location.href = 'contracts.html';
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
    console.log('Sesion cerrada');
    window.location.href = '/';
}

document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
        closeLogoutModal();
    }
});

document.addEventListener('DOMContentLoaded', function(){
    console.log('Crear contrato cargado');

    const user = checkAuth();

    if(user){
        loadUserData();
        loadDynamicSidebar();
        loadFreelancers();

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('contractStartDate').setAttribute('min', today);
        document.getElementById('contractEndDate').setAttribute('min', today);

        console.log('Pagina de crear contrato inicializada');
    }
});

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
            <a href="Freelancer.html" class="nav-item${isActive('freelancer.html')}">
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