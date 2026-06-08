const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('./server');


// wait for mongodb to connect before all tests
beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
});

// close db after all tests
afterAll(async () => {
    await mongoose.connection.close();
});



//test 1 - register: check empty fields
describe('UT-AUTH-01: Register Empty Fields', () => {
    test('Shows error when all fields are empty', () => {
        const name = '';
        const email = '';
        const password = '';
        const confirmPassword = '';

        const isEmpty = !name || !email || !password || !confirmPassword;
        expect(isEmpty).toBe(true);
    });
});




//test 2 - register: password mismatch
describe('UT-AUTH-02: Register Password Mismatch', () => {

    //logic from handleRegister() in auth.js
    function passwordsMatch(password, confirmPassword) {
        return password === confirmPassword;
    }

    test('Returns false when passwords differ', () => {
        expect(passwordsMatch('abc123', 'abc456')).toBe(false);
    });

    test('Returns true when passwords match', () => {
        expect(passwordsMatch('abc123', 'abc123')).toBe(true);
    });
});





//test 3 - register: weak password
describe('UT-AUTH-03: Register Weak Password', () => {
    function isPasswordStrong(password) {
        return password.length >= 6;
    }

    test('Password "123" is too short', () => {
        expect(isPasswordStrong('123')).toBe(false);
    });

    test('Password "12345" is too short (boundary)', () => {
        expect(isPasswordStrong('12345')).toBe(false);
    });

    test('Password "123456" is exactly 6 (boundary+pass)', () => {
        expect(isPasswordStrong('123456')).toBe(true);
    });

    test('Password "securepass" is strong', () => {
        expect(isPasswordStrong('securepass')).toBe(true);
    });
});





//test 4 - register: invalid email format
describe('UT-AUTH-04: Register Invalid Email', () => {

    //same logic from auth.js
    function isEmailValid(email) {
        return email.includes('@');
    }

    test('"userexample.com" is invalid (no @)', () => {
        expect(isEmailValid('userexample.com')).toBe(false);
    });

    test('"user@" is technically valid by this check', () => {
        expect(isEmailValid('user@')).toBe(true);
    });

    test('"user@email.com" is valid', () => {
        expect(isEmailValid('user@email.com')).toBe(true);
    });
});




//test 5 - register: successful registration (new user)
describe('UT-AUTH-05: Successful Registration', () => {


//delete after test to avoid duplicate
    afterEach(async () => {
        const User = mongoose.model('User');
        await User.deleteOne({ email: 'testuser_unique@example.com' });
    });
    //  this runs after the test and cleans up

    test('Returns 201 for valid new user', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({
                name: 'Test User',
                email: 'testuser_unique@example.com',
                password: 'secure123'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Registration successful');
    });
});

//test 6 - register: duplicate email
describe('UT-AUTH-06: Duplicate Email Registration', () => {
    test('Returns 400 for already registered email', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({
                name: 'Another User',
                email: 'dawna@gmail.com', //already in db
                password: 'password123'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Email already exists');
    });
});

//test 7 - login: empty fields
describe('UT-AUTH-07: Login Empty Fields', () => {
    function hasLoginInputs(email, password) {
        return !(!email || !password);
    }

    test('Both fields empty -> blocked', () => {
        expect(hasLoginInputs('', '')).toBe(false);
    });

    test('Only email filled -> blocked', () => {
        expect(hasLoginInputs('user@email.com', '')).toBe(false);
    });

    test('Only password filled -> blocked', () => {
        expect(hasLoginInputs('', 'password123')).toBe(false);
    });

    test('Both filled -> allowed', () => {
        expect(hasLoginInputs('user@email.com', 'password123')).toBe(true);
    });
});

//test 8 - login: wrong password
describe('UT-AUTH-08: Login Wrong Password', () => {
    test('Returns 401 for wrong password', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                email: 'dawna@gmail.com',
                password: 'wrongpassword'
            });
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Incorrect password.');
    });
});

//test 9 - login: user not found
describe('UT-AUTH-09: Login User Not Found', () => {
    test('Returns 404 for non-existent user', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                email: 'ghost@nobody.com',
                password: 'password123'
            });
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('User not found.');
    });
});

//test 10 -login: successful login
describe('UT-AUTH-10: Successful Login', () => {
    test('Returns 200 with user object', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                email: 'dawna@gmail.com',
                password: 'dawnadowe' //from db
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toHaveProperty('name');
        expect(res.body.user).toHaveProperty('email');
        expect(res.body.user).toHaveProperty('profilePhoto');
    });
});

//test 11 - logout: clear session
describe('UT-AUTH-11: Logout Clears Session', () => {
    test('currentUser is removed from localStorage after logout', () => {
        

        //pretend someone is logged in
        const fakeStorage = { currentUser: JSON.stringify({ name: 'Test', email: 'test@email.com' }) };

        // Simulate logout
        delete fakeStorage.currentUser;
//gone
        expect(fakeStorage.currentUser).toBeUndefined();
    });
});

//test 12 - session check: guest user
describe('UT-AUTH-12: Session Check Guest', () => {

    //cehckSession() from auth.js
    function checkSession(storage) {
        const currentUser = storage.currentUser;
        if (!currentUser) return null;
        return JSON.parse(currentUser);
    }

    test('Returns null when no user in storage', () => {
        const emptyStorage = {};
        expect(checkSession(emptyStorage)).toBeNull();
    });

    test('Returns user object when logged in', () => {
        const filledStorage = {
            currentUser: JSON.stringify({ name: 'Khalisya', email: 'khalisya@email.com' })
        };
        const result = checkSession(filledStorage);
        expect(result).toHaveProperty('name', 'Khalisya');
        expect(result).toHaveProperty('email', 'khalisya@email.com');
    });
});



//====================
//integration testing

//test 1 - integration: check register flow with backend and db interaction
describe('INT-AUTH-01: Register Frontend-Backend Verification', () => {

    // clean up the integration account entry afterwards
    afterEach(async () => {
        const User = mongoose.model('User');
        await User.deleteOne({ email: 'integration_user@example.com' });
    });

    test('Successfully posts valid payload and updates database', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({
                name: 'Integration User',
                email: 'integration_user@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Registration successful');
    });
});


//test 2 - integration: verify duplicate register check hits backend validation logic
describe('INT-AUTH-02: Register Backend Duplicate Prevention', () => {
    test('Returns 400 when trying to reuse an existing email record', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({
                name: 'Duplicate Dawna',
                email: 'dawna@gmail.com', // already exists in the export file
                password: 'password123'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Email already exists');
    });
});


//test 3 - integration: valid login route endpoint validation
describe('INT-AUTH-03: Login Verified Entry Route Access', () => {
    test('Grants 200 status code when matching database collection details', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                email: 'dawna@gmail.com',
                password: 'dawnadowe' // authentic match
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe('dawna@gmail.com');
    });
});


//test 4 - integration: invalid login route rejection
describe('INT-AUTH-04: Login Unregistered Entry Route Access', () => {
    test('Returns 404 cleanly when email target is missing completely from records', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                email: 'not_in_the_system@email.com',
                password: 'anyPassword'
            });
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('User not found.');
    });
});



//====================
//fucntional testing


//test 1 - functional: frontend UI validation alert rendering simulation
describe('FUN-AUTH-01: UI Register Error Message Handler', () => {
    test('Sets error message text and pops visual alert class container when password mismatched', () => {
        // mock container logic for UI text injection alert
        const errorMsgContainer = { textContent: '', classList: { remove: jest.fn() } };
        
        const password = 'myPassword123';
        const confirmPassword = 'wrongPassword123';

        // simulated functional logic snippet block from handleRegister()
        if (password !== confirmPassword) {
            errorMsgContainer.classList.remove('d-none'); // unhide element
            errorMsgContainer.textContent = 'Passwords do not match.';
        }

        expect(errorMsgContainer.textContent).toBe('Passwords do not match.');
        expect(errorMsgContainer.classList.remove).toHaveBeenCalledWith('d-none');
    });
});


//test 2 - functional: local caching storage tracking behavior simulation
describe('FUN-AUTH-02: UI Session LocalStorage Cache Initialization', () => {
    test('Safely registers the stringified user data token on frontend state storage match', () => {
        const mockLocalStorage = {};
        const dummyUserResult = { name: 'Dawna Dowe', email: 'dawna@gmail.com' };

        // mock client browser state actions following valid login fetch
        mockLocalStorage['currentUser'] = JSON.stringify(dummyUserResult);

        expect(mockLocalStorage['currentUser']).toBeDefined();
        expect(JSON.parse(mockLocalStorage['currentUser']).name).toBe('Dawna Dowe');
    });
});


//test 3 - functional: verification of interface route security intercept logic
describe('FUN-AUTH-03: UI Session Security Guard Redirection', () => {
    test('Forcibly updates window location pointer when guest profile entry is restricted', () => {
        const emptyStorageMock = {};
        const windowLocationMock = { location: { href: '' } };

        // checkSession functional interaction simulation block
        const activeUserToken = emptyStorageMock.currentUser;
        if (!activeUserToken) {
            windowLocationMock.location.href = 'index.html'; // bounce home
        }

        expect(windowLocationMock.location.href).toBe('index.html');
    });
});


//test 4 - functional: verification of terminal session validation routine
describe('FUN-AUTH-04: UI Logout Session Terminate Flow', () => {
    test('Purges cached session payload and switches interface path context directly back to login screen', () => {
        const activeStorageMock = { currentUser: JSON.stringify({ name: 'Dawna Dowe' }) };
        const windowLocationMock = { location: { href: '' } };

        // execution path from handleLogout() method trigger
        delete activeStorageMock.currentUser; // remove details
        windowLocationMock.location.href = 'login.html'; // send out

        expect(activeStorageMock.currentUser).toBeUndefined(); // gone!
        expect(windowLocationMock.location.href).toBe('login.html');
    });
});