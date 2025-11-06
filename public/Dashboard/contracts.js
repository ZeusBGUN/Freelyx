'use strict';

let allContracts = []
let currentFilter = 'all';

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
        alert('Debes iniciar sesion para acceder');
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
    
    const btnCreate = document.getElementById('btnCreateContract');
    if(btnCreate){
        if(user.userType === 'empresa'){
            btnCreate.classList.remove('hidden');
        } else {
            btnCreate.classList.add('hidden');
        }
    }
    
    const emptyText = document.getElementById('emptyText');
    if(emptyText){
        if(user.userType === 'empresa'){
            emptyText.textContent = 'Crea tu primer contrato para comenzar';
        } else {
            emptyText.textContent = 'Los contratos que te asignen aparecerán aquí';
        }
    }
    
    console.log('✅ Usuario cargado:', user);
}

async function loadContracts() {
    const token = localStorage.getItem('token');

    console.log('🔄 Cargando contratos...');

    try {
        const response = await fetch('${API_URL}/contracts', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        console.log('📡 Respuesta:', response.status);

        const contentType = response.headers.get("content-type");
        let data = {};
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            throw new Error("Respuesta del servidor no es JSON.");
        }

        console.log('📦 Datos recibidos:', data);

        if (data.success) {
            allContracts = data.contracts;
            console.log('✅ Contratos cargados:', allContracts.length);
            
            allContracts.forEach((contract, index) => {
                console.log(`Contrato ${index}:`, {
                    id: contract.id,
                    title: contract.title,
                    status: contract.status
                });
            });
            
            displayContracts(allContracts);
        } else {
            showToast(data.message, 'error');
            showEmptyState();
        }
    } catch (error) {
        console.error('❌ Error al cargar contratos:', error);
        showToast('Error al cargar los contratos', 'error');
        showEmptyState();
    } finally {
        document.getElementById('loadingMessage').classList.add('hidden');
    }
}

function displayContracts(contracts) {
    const contractsList = document.getElementById('contractsList');
    const emptyMessage = document.getElementById('emptyMessage')

    if (!contracts || contracts.length === 0) {
        showEmptyState();
        return;
    }

    emptyMessage.classList.add('hidden');
    contractsList.classList.remove('hidden');
    contractsList.innerHTML = '';

    const user = JSON.parse(localStorage.getItem('user'));

    contracts.forEach(contract => {
        const contractCard = createContractCard(contract, user);
        contractsList.appendChild(contractCard);
    });
}

function createContractCard(contract, user) {
    if (!contract.id && contract.id !== 0) {
        console.error('❌ CONTRATO SIN ID DETECTADO:', contract);
        return document.createElement('div');
    }

    const card = document.createElement('div');
    card.className = 'contract-item status-' + contract.status;
    
    card.setAttribute('data-contract-id', contract.id);

    const cardContent = document.createElement('div');
    cardContent.className = 'contract-content-clickable';
    cardContent.onclick = () => goToContractDetail(contract.id);

    const clientName = user.userType === 'freelancer'
        ? contract.companyName + ' ' + contract.companyLastName
        : contract.freelancerName + ' ' + contract.freelancerLastName;

    const clientLabel = user.userType === 'freelancer' ? 'Cliente' : 'Freelancer';

    const startDate = new Date(contract.startDate).toLocaleDateString('es-ES');
    const endDate = new Date(contract.endDate).toLocaleDateString('es-ES');

    cardContent.innerHTML = `
        <div class="contract-item-header">
            <div>
                <h3 class="contract-item-title">${contract.title}</h3>
                <p class="contract-item-client">${clientLabel}: ${clientName}</p>
            </div>
            ${getBadgeHTML(contract.status)}
        </div>
        
        <p class="contract-item-description">${contract.description}</p>
        
        <div class="contract-item-meta">
            <div class="contract-item-dates">
                <span>📅 Inicio: ${startDate}</span>
                <span>🏁 Fin: ${endDate}</span>
            </div>
            
            <div class="contract-signatures">
                <div class="signature-status ${contract.signedByFreelancer ? 'signed' : 'unsigned'}">
                    ${contract.signedByFreelancer ? '✅' : '⏳'} Freelancer
                </div>
                <div class="signature-status ${contract.signedByCompany ? 'signed' : 'unsigned'}">
                    ${contract.signedByCompany ? '✅' : '⏳'} Empresa
                </div>
            </div>
        </div>
        
        <div class="contract-item-footer">
            <span class="contract-item-amount">$${contract.amount.toLocaleString()}</span>
            <span class="contract-item-date">${getStatusText(contract.status)}</span>
        </div>
    `;

    card.appendChild(cardContent);
    
    if (user.userType === 'empresa' && contract.status === 'pendiente') {
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-icon btn-danger delete-contract-button';
        deleteButton.title = 'Eliminar Contrato';
        deleteButton.innerHTML = '🗑️'; 
        
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            console.log('🗑️ Botón eliminar clickeado. ID del contrato:', contract.id);
            eliminarContrato(contract.id);
        };

        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'contract-actions';
        actionsContainer.appendChild(deleteButton);
        
        card.appendChild(actionsContainer);
    }

    return card;
}

function getBadgeHTML(status){
    const badges = {
        pendiente: '<span class="badge badge-warning">Pendiente</span>',
        activo: '<span class="badge badge-active">Activo</span>',
        completado: '<span class="badge badge-completed">Completado</span>',
        cancelado: '<span class="badge badge-danger">Cancelado</span>'
    };

    return badges[status] || '';
}

function getStatusText(status){
    const texts = {
        pendiente: 'Esperando firma',
        activo: 'En progreso',
        completado: 'Finalizado',
        cancelado: 'Cancelado'
    };

    return texts[status] || status;
}

function showEmptyState(){
    document.getElementById('contractsList').classList.add('hidden');
    document.getElementById('emptyMessage').classList.remove('hidden');
}

function filterContracts(){
    const filterValue = document.getElementById('filterStatus').value;
    currentFilter = filterValue;

    if(filterValue === 'all'){
        displayContracts(allContracts);
    } else {
        const filtered = allContracts.filter(c => c.status === filterValue);
        displayContracts(filtered);
    }
}

function goToContractDetail(contractId){
    window.location.href = 'contract-detail.html?id=' + contractId;
}

function goToCreateContract(){
    window.location.href = 'create-contract.html';
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
    console.log('Sesion Cerrada');
    window.location.href = '/';
}



function eliminarContrato(contractId) {
    if (contractId === null || contractId === undefined || contractId === '') {
        console.error('Error: ID de contrato inválido:', contractId);
        showToast('Error: El contrato no tiene un ID válido.', 'error');
        return;
    }
    
    console.log('Iniciando eliminación del contrato ID:', contractId);
    openDeleteContractModal(contractId);
}

function openDeleteContractModal(contractId){
    const modal = document.getElementById('deleteContractModal');
    if(modal){
        modal.setAttribute('data-contract-id', contractId);
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        console.log('ID guardado para eliminar:', contractId);
    }
}

function closeDeleteContractModal(){
    const modal = document.getElementById('deleteContractModal');
    if(modal){
        modal.classList.add('hidden');
        modal.removeAttribute('data-contract-id');
        document.body.style.overflow = '';
    }
}

async function confirmDeleteContract(){
    const modal = document.getElementById('deleteContractModal');
    const contractId = modal.getAttribute('data-contract-id');

    console.log('Confirmando eliminación del contrato ID:', contractId);
    
    if (!contractId || contractId === 'null' || contractId === '') {
        console.error('Error: contractId es nulo o inválido');
        showToast('Error interno: No se pudo obtener el ID del contrato.', 'error');
        closeDeleteContractModal();
        return;
    }

    closeDeleteContractModal();
    await _executeDeleteContract(parseInt(contractId, 10));
}

async function _executeDeleteContract(contractId) {
    const token = localStorage.getItem('token');
    
    console.log(`Ejecutando DELETE para contrato ID: ${contractId}`);
    console.log(`URL: ${API_URL}/contracts/${contractId}`);

    try {
        const response = await fetch(`${API_URL}/contracts/${contractId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        console.log('Respuesta del servidor:', response.status, response.statusText);

        const contentType = response.headers.get("content-type");
        let data = {};

        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
            console.log('Datos de respuesta:', data);
        } else if (!response.ok) {
            console.error(`Error HTTP ${response.status}. Respuesta no JSON.`);
            showToast(`Error ${response.status}: No se pudo procesar la respuesta del servidor.`, 'error');
            return;
        }

        if (response.ok) {
            console.log('Contrato eliminado exitosamente');
            
            const contractCard = document.querySelector(`.contract-item[data-contract-id="${contractId}"]`);
            
            if (contractCard) {
                console.log('Eliminando tarjeta del DOM');
                contractCard.remove();
            } else {
                console.warn('No se encontró la tarjeta en el DOM');
            }
            
            allContracts = allContracts.filter(c => c.id !== contractId);
            console.log('Contratos restantes:', allContracts.length);
            
            filterContracts();
            
            showToast('Contrato eliminado con éxito', 'success');
        } else {
            console.error('Error al eliminar:', data);
            showToast(data.message || 'Error al eliminar el contrato.', 'error');
        }
    } catch (error) {
        console.error('Error de red al eliminar el contrato:', error);
        showToast('Error de red. Verifica que el servidor esté activo.', 'error');
    }
}
document.addEventListener('DOMContentLoaded', function(){
    console.log('🚀 Página de contratos cargando...');

    const user = checkAuth();

    if(user){
        loadUserData();
        loadDynamicSidebar();
        loadContracts();

        console.log('✅ Página de contratos inicializada');
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