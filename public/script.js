const loginForm = document.getElementById('loginForm');
const loginTab = document.getElementById('loginTab');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const signupForm = document.getElementById('signupForm');
const signupTab = document.getElementById('signupTab');
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupPasswordConfirm = document.getElementById('signupPasswordConfirm');
const signupLastName = document.getElementById('signupLastName')

const CONFIG = {
    MIN_PASSWORD_LENGTH: 6,
};

const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

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

const MESSAGES = {
    ERROR: {
        EMPTY_FIELDS: 'Completa todos los campos',
        PASSWORDS_DONT_MATCH: 'Las contraseñas no coinciden',
        PASSWORD_TOO_SHORT: 'Contraseña de al menos 6 caracteres',
        INVALID_EMAIL: 'Email invalido'
    },
    SUCCESS: {
        LOGIN: 'Iniciando sesión',
        REGISTER: 'Cuenta creada exitosamente',
    },
    INFO: {
        NEXT_STEP: '🧑‍🔧 Proximo paso: conectar con el backend',
        NEXT_STEP_DB: '🧑‍🔧 Proximo paso: guardar en base de datos',
    }

};

function showLogin(){

    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');

    loginTab.classList.add('tab-active');
    signupTab.classList.remove('tab-active');

}
function showSignup(){
  
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');

    signupTab.classList.add('tab-active');
    loginTab.classList.remove('tab-active');
}

async function handleLogin(event){
    event.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
        if(!email || !password){
        showToast('Por favor completa todos los campos', 'error');
        return;
    }

    try {
        console.log('🔐 Enviando credenciales al servidor...');

        const response = await fetch('${API_URL}/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if(data.success){
            console.log('✅ Login exitoso:', data);
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showToast('Bienvenido ' + data.user.name, 'success');
            
            setTimeout(function(){
                redirectToDashboard(data.user.userType);
            }, 1000);
        } 
        else {
            showToast(data.message, 'error');
        }

    } catch(error){
        console.error('❌ Error:', error);
        showToast('Error de conexión con el servidor', 'error');
    }
}

async function handleSignup(event){
    event.preventDefault();

    const name = signupName.value.trim();
    const lastName = signupLastName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    const passwordConfirm = signupPasswordConfirm.value;
    const userType = document.querySelector('input[name="userType"]:checked').value;

    if(!name || !lastName || !email || !password || !passwordConfirm){
        showToast('Por favor completa todos los campos', 'error');
        return;
    }

    if(password !== passwordConfirm){
        showToast('Las contraseñas no coinciden', 'error');
        return;
    }

    if(password.length < CONFIG.MIN_PASSWORD_LENGTH){
        showToast('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    if(!REGEX.EMAIL.test(email)){
        showToast('Email inválido', 'error');
        return;
    }

    try {
        console.log('📝 Registrando usuario...');

        const response = await fetch('${API_URL}/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                lastName,
                email,
                password,
                userType
            })
        });

        const data = await response.json();

        if(data.success){
            console.log('✅ Registro exitoso:', data);

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showToast('Cuenta creada para ' + data.user.name, 'success');
            
            setTimeout(function(){
                redirectToDashboard(data.user.userType);
            }, 1000);
        } 
        else {
            showToast(data.message, 'error');
        }

    } catch(error){
        console.error('❌ Error:', error);
        showToast('Error de conexión con el servidor', 'error');
    }
}

function checkAuth(){
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if(!token || !user){
        return null;
    }
    
    return JSON.parse(user);
}

function redirectToDashboard(userType){
    console.log('🔄 Redirigiendo a dashboard:', userType);
    
    if(userType === 'freelancer'){
        window.location.href = '/Dashboard/Freelancer.html';
    } else if(userType === 'empresa'){
        window.location.href = '/Dashboard/empresa.html';
    }
}

function logout(){
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', function(){
    console.log('👍 Pagina cargada correctamente');
    console.log('CSS Puro (sin frameworks)');
    
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if(token && user){
        const userData = JSON.parse(user);
        console.log('✅ Sesión activa detectada, redirigiendo...');
        
        if(userData.userType === 'freelancer'){
            window.location.href = '/dashboard/freelancer.html';
        } else if(userData.userType === 'empresa'){
            window.location.href = '/dashboard/empresa.html';
        }
    }
});