



function handleRegister() {
    const name = document.getElementById('fullName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const errorMsg = document.getElementById('error-msg');

if (!name || !email || !password || !confirmPassword) {
    errorMsg.classList.remove('d-none');
    errorMsg.textContent = 'Please fill in all fields.';
    return;
}

if (password !== confirmPassword) {
    errorMsg.classList.remove('d-none');
    errorMsg.textContent = 'Passwords do not match.';
    return;
}

if (password.length < 6) {
    errorMsg.classList.remove('d-none');
    errorMsg.textContent = 'Password must be at least 6 characters.';
    return;
}

if (!email.includes('@')) {
    errorMsg.classList.remove('d-none');
    errorMsg.textContent = 'Please enter a valid email address.';
    return;
}

const existingUser = localStorage.getItem(email);
if (existingUser) {
    errorMsg.classList.remove('d-none');
    errorMsg.textContent = 'Email is already registered.';
    return;
}

const user = {name, email, password};
localStorage.setItem(email, JSON.stringify(user));
alert('Registration successful! You can now log in.');
window.location.href = 'login.html';
}






function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('error-msg');

if (!email || !password) {
    errorMsg.classList.remove('d-none');
    errorMsg.textContent = 'Please fill in all fields.';
    return;
}

const stored = localStorage.getItem(email);
if (!stored) {
    errorMsg.classList.remove('d-none');
    errorMsg.textContent = 'Email not found. Please register first.';
    return;
}

const user = JSON.parse(stored);
if (user.password !== password) {
    errorMsg.classList.remove('d-none');
    errorMsg.textContent = 'Incorrect password. Please try again.';
    return;
}
    localStorage.setItem('currentUser', JSON.stringify(user));
    window.location.href = 'index.html';

}


function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function checkSession (){
const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'index.html';
    }
    return JSON.parse(currentUser);

}