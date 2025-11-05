'use strict';

let currentContract = null;
let currentUser = null;
let contractId = null;

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
        alert('⚠️ Debes iniciar sesión para acceder');
        window.location.href = '/';
        return null;
    }

    return JSON.parse(user);
}

function loadUserData() {
    const user = checkAuth();

    if (!user) {
        return;
    }

    currentUser = user;

    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = user.name + ' ' + user.lastName;
    }

    const userInitials = document.getElementById('userInitials');
    if (userInitials) {
        const initials = user.name.charAt(0) + user.lastName.charAt(0);
        userInitials.textContent = initials.toUpperCase();
    }

    const userRole = document.getElementById('userRole');
    if (userRole) {
        userRole.textContent = user.userType === 'freelancer' ? 'Freelancer' : 'Empresa';
    }
    const dashboardLink = document.getElementById('dashboardLink');
    if (dashboardLink) {
        dashboardLink.href = user.userType === 'freelancer' ? 'freelancer.html' : 'empresa.html';
    }

    console.log('✅ Usuario cargado:', user);
}

function getContractIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

async function loadContract() {
    const token = localStorage.getItem('token');
    contractId = getContractIdFromURL();

    if (!contractId) {
        showToast('ID de contrato no válido', 'error');
        setTimeout(() => {
            window.location.href = 'contracts.html';
        }, 2000);
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/contracts/${contractId}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await response.json();

        if (data.success) {
            currentContract = data.contract;
            displayContract(data.contract);
            console.log('✅ Contrato cargado:', data.contract);
        } else {
            showToast(data.message, 'error');
            setTimeout(() => {
                window.location.href = 'contracts.html';
            }, 2000);
        }

    } catch (error) {
        console.error('❌ Error al cargar contrato:', error);
        showToast('Error al cargar el contrato', 'error');
        setTimeout(() => {
            window.location.href = 'contracts.html';
        }, 2000);
    } finally {
        document.getElementById('loadingMessage').classList.add('hidden');
        document.getElementById('contractDetail').classList.remove('hidden');
    }
}

function displayContract(contract) {
    document.getElementById('contractTitle').textContent = contract.title;
    document.getElementById('contractBadge').innerHTML = getBadgeHTML(contract.status);

    // Monto
    document.getElementById('contractAmount').textContent = `$${contract.amount.toLocaleString()}`;
    document.getElementById('contractCurrency').textContent = contract.currency || 'USD';

    document.getElementById('contractDescription').textContent = contract.description;

    const startDate = new Date(contract.startDate).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const endDate = new Date(contract.endDate).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('contractStartDate').textContent = startDate;
    document.getElementById('contractEndDate').textContent = endDate;

    document.getElementById('freelancerName').textContent = contract.freelancerName + ' ' + contract.freelancerLastName;
    document.getElementById('freelancerEmail').textContent = contract.freelancerEmail;
    const freelancerInitials = contract.freelancerName.charAt(0) + contract.freelancerLastName.charAt(0);
    document.getElementById('freelancerInitials').textContent = freelancerInitials.toUpperCase();

    const freelancerSig = document.getElementById('freelancerSignature');
    if (contract.signedByFreelancer) {
        freelancerSig.className = 'party-signature signed';
        freelancerSig.innerHTML = '<span class="signature-icon">✅</span><span>Firmado</span>';
    } else {
        freelancerSig.className = 'party-signature unsigned';
        freelancerSig.innerHTML = '<span class="signature-icon">⏳</span><span>Pendiente de firma</span>';
    }

    document.getElementById('companyName').textContent = contract.companyName + ' ' + contract.companyLastName;
    document.getElementById('companyEmail').textContent = contract.companyEmail;
    const companyInitials = contract.companyName.charAt(0) + contract.companyLastName.charAt(0);
    document.getElementById('companyInitials').textContent = companyInitials.toUpperCase();

    const companySig = document.getElementById('companySignature');
    if (contract.signedByCompany) {
        companySig.className = 'party-signature signed';
        companySig.innerHTML = '<span class="signature-icon">✅</span><span>Firmado</span>';
    } else {
        companySig.className = 'party-signature unsigned';
        companySig.innerHTML = '<span class="signature-icon">⏳</span><span>Pendiente de firma</span>';
    }

    document.getElementById('contractId').textContent = contract.id;

    const createdDate = new Date(contract.createdAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('contractCreatedAt').textContent = createdDate;

    if (contract.updatedAt) {
        const updatedDate = new Date(contract.updatedAt).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('contractUpdatedAt').textContent = updatedDate;
    } else {
        document.getElementById('contractUpdatedAt').textContent = 'Sin actualizaciones';
    }

    displayActions(contract);

    if (contract.status === 'activo') {
        document.getElementById('statusChangeSection').classList.remove('hidden');
    } else {
        document.getElementById('statusChangeSection').classList.add('hidden');
    }
}

function displayActions(contract) {
    const actionsDiv = document.getElementById('contractActions');
    actionsDiv.innerHTML = '';

    const isFreelancer = currentUser.userType === 'freelancer';
    const isCompany = currentUser.userType === 'empresa';

    if (isFreelancer && !contract.signedByFreelancer && contract.status === 'pendiente') {
        const signBtn = document.createElement('button');
        signBtn.className = 'btn-primary';
        signBtn.textContent = '✍️ Firmar Contrato';
        signBtn.onclick = openSignModal;
        actionsDiv.appendChild(signBtn);
    }

    if (isCompany && !contract.signedByCompany && contract.status === 'pendiente') {
        const signBtn = document.createElement('button');
        signBtn.className = 'btn-primary';
        signBtn.textContent = '✍️ Firmar Contrato';
        signBtn.onclick = openSignModal;
        actionsDiv.appendChild(signBtn);
    }
}

function getBadgeHTML(status) {
    const badges = {
        pendiente: '<span class="badge badge-warning">Pendiente</span>',
        activo: '<span class="badge badge-active">Activo</span>',
        completado: '<span class="badge badge-completed">Completado</span>',
        cancelado: '<span class="badge badge-danger">Cancelado</span>'
    };

    return badges[status] || '';
}

function openSignModal() {
    const modal = document.getElementById('signModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeSignModal() {
    const modal = document.getElementById('signModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

async function confirmSign() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`http://localhost:3000/api/contracts/${contractId}/sign`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Contrato firmado exitosamente', 'success');
            closeSignModal();

            setTimeout(() => {
                loadContract();
            }, 1000);
        } else {
            showToast(data.message, 'error');
            closeSignModal();
        }

    } catch (error) {
        console.error('❌ Error al firmar contrato:', error);
        showToast('Error al firmar el contrato', 'error');
        closeSignModal();
    }
}

async function changeContractStatus() {
    const token = localStorage.getItem('token');
    const newStatus = document.getElementById('newStatus').value;

    if (!newStatus) {
        showToast('Selecciona un estado', 'error');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/contracts/${contractId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Estado actualizado exitosamente', 'success');

            setTimeout(() => {
                loadContract();
            }, 1000);
        } else {
            showToast(data.message, 'error');
        }

    } catch (error) {
        console.error('❌ Error al cambiar estado:', error);
        showToast('Error al actualizar el estado', 'error');
    }
}

function goBack() {
    window.location.href = 'contracts.html';
}

function showToast(mensaje, tipo) {
    var toast = document.createElement('div');
    toast.className = 'toast ' + tipo;
    toast.textContent = mensaje;

    var container = document.body.querySelector('#toast-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.insertBefore(container, document.body.firstChild);
    }

    container.appendChild(toast);

    setTimeout(function () {
        toast.remove();
    }, 3000);
}

function logout() {
    openLogoutModal();
}

function openLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function confirmLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('👋 Sesión cerrada');
    window.location.href = '/';
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeLogoutModal();
        closeSignModal();
    }
});

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Detalle de contrato cargado');

    const user = checkAuth();

    if (user) {
        loadUserData();
        loadDynamicSidebar();
        loadContract();

        console.log('✅ Página de detalle inicializada');
    }
});

function loadDynamicSidebar() {
    const user = JSON.parse(localStorage.getItem('user'));
    const sidebarNav = document.getElementById('sidebarNav');

    if (!sidebarNav) return;
    if (!user) return;

    const currentPath = window.location.pathname.split('/').pop();

    const isActive = (href) => href === currentPath ? ' active' : '';

    let sidebarHTML = '';

    if (user.userType === 'freelancer') {
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