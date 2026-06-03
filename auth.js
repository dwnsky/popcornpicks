



async function handleRegister() {
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

    const userData = { name, email, password };
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        if (response.ok) {
            alert('Registration successful! You can now log in.');
            window.location.href = 'login.html';
        } else {
            errorMsg.classList.remove('d-none');
            errorMsg.textContent = result.message;
        }
    } catch (err) {
        console.error('Fetch error:', err);
        errorMsg.classList.remove('d-none');
        errorMsg.textContent = 'Could not connect to the server.';
    }
}


async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('error-msg');

    if (!email || !password) {
        errorMsg.classList.remove('d-none');
        errorMsg.textContent = 'Please fill in all fields.';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('currentUser', JSON.stringify(result.user));
            window.location.href = 'index.html';
        } else {
            errorMsg.classList.remove('d-none');
            errorMsg.textContent = result.message;
        }
    } catch (err) {
        console.error(err);
        errorMsg.classList.remove('d-none');
        errorMsg.textContent = 'Server is unreachable.';
    }
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