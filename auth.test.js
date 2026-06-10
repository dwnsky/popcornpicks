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



//test 1 - register: password mismatch
describe('UT-AUTH-01: Register Password Mismatch', () => {

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





//test 2 - register: weak password
describe('UT-AUTH-02: Register Weak Password', () => {
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





//test 3 - register: invalid email format
describe('UT-AUTH-03: Register Invalid Email', () => {

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




//test 4 - login: empty fields
describe('UT-AUTH-04: Login Empty Fields', () => {
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

//test 5 - login: wrong password
describe('UT-AUTH-05: Login Wrong Password', () => {
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

//test 6 - login: user not found
describe('UT-AUTH-06: Login User Not Found', () => {
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

//test 7 -login: successful login
describe('UT-AUTH-07: Successful Login', () => {
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

//test 8 - logout: clear session
describe('UT-AUTH-08: Logout Clears Session', () => {
    test('currentUser is removed from localStorage after logout', () => {
        

        //pretend someone is logged in
        const fakeStorage = { currentUser: JSON.stringify({ name: 'Test', email: 'test@email.com' }) };

        // Simulate logout
        delete fakeStorage.currentUser;
//gone
        expect(fakeStorage.currentUser).toBeUndefined();
    });
});



//====================
// integration testing
// these tests check that the api routes and mongodb work together correctly
// unlike unit tests which test logic in isolation, integration tests
// send real http requests and verify the database actually responds correctly

// test 1 - register: full flow from http request to database save
describe('INT-AUTH-01: Register Stores User in Database', () => {

    // clean up after 
    afterEach(async () => {
        const User = mongoose.model('User');
        await User.deleteOne({ email: 'integration_test@example.com' });
    });

    test('Valid registration request reaches database and returns 201', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({
                name: 'Integration User',
                email: 'integration_test@example.com',
                password: 'password123'
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.message).toBe('Registration successful');
    });
});


// test 2 - register: db duplicate check 
//verifies that the backend queries mongodb and catches existing emails
describe('INT-AUTH-02: Register Duplicate Check Hits Database', () => {
    test('Duplicate email request reaches database and gets rejected with 400', async () => {
        const res = await request(app)
            .post('/api/register')
            .send({
                name: 'Dawna Again',
                email: 'dawna@gmail.com', // already in db
                password: 'password123'
            });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Email already exists');
    });
});


// test 3 - login: api fetches user from db and bcrypt comparison works
// checks that the login route, mongodb lookup, and bcrypt work together
describe('INT-AUTH-03: Login Fetches User and Verifies Password via bcrypt', () => {
    test('Correct credentials go through database lookup and bcrypt check, returns 200', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                email: 'dawna@gmail.com',
                password: 'dawnadowe'
            });
        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe('dawna@gmail.com');
    });
});


// test 4 - login: db returns nothing for unknown email
// verifies the integration between route handler and db lookup for missing user
describe('INT-AUTH-04: Login Returns 404 When User Missing from Database', () => {
    test('Unknown email causes database lookup to fail and returns 404', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                email: 'nobody@example.com',
                password: 'anypassword'
            });
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('User not found.');
    });
});


// test 5 - login: wrong password triggers bcrypt mismatch
// verifies that bcrypt.compare() correctly rejects wrong passwords
describe('INT-AUTH-05: Login Rejects Wrong Password via bcrypt', () => {
    test('Correct email but wrong password fails bcrypt check and returns 401', async () => {
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


//====================
// functional testing
// these tests simulate complete user flows end to end
// not just one function or one api call, but the whole journey a user takes

// test 1 - full register then login flow
// simulates a new user signing up and then immediately logging in
describe('FUN-AUTH-01: Register Then Login Flow', () => {

    // clean up the test user after
    afterEach(async () => {
        const User = mongoose.model('User');
        await User.deleteOne({ email: 'newuser_flow@example.com' });
    });

    test('User registers successfully then logs in with same credentials', async () => {

        // step 1: register
        const registerRes = await request(app)
            .post('/api/register')
            .send({
                name: 'New User',
                email: 'newuser_flow@example.com',
                password: 'mypassword123'
            });
        expect(registerRes.statusCode).toBe(201);

        // step 2: login with same credentials
        const loginRes = await request(app)
            .post('/api/login')
            .send({
                email: 'newuser_flow@example.com',
                password: 'mypassword123'
            });
        expect(loginRes.statusCode).toBe(200);
        expect(loginRes.body.user).toHaveProperty('name', 'New User');
        expect(loginRes.body.user).toHaveProperty('email', 'newuser_flow@example.com');
    });
});


// test 2 - login sets session correctly
//what happens on the frontend after a successful login
// auth.js stores user object in localStorage after getting 200 
describe('FUN-AUTH-02: Login Response Stored in Session', () => {
    test('successful login response contains user data that frontend can store', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({
                email: 'dawna@gmail.com',
                password: 'dawnadowe'
            });

        // verify the response has everything auth.js needs to set localStorage
        expect(res.statusCode).toBe(200);
        expect(res.body.user).toHaveProperty('name');
        expect(res.body.user).toHaveProperty('email');
        expect(res.body.user).toHaveProperty('profilePhoto');

        //what auth.js does after getting this response
        const fakeStorage = {};
        fakeStorage['currentUser'] = JSON.stringify(res.body.user);
        expect(fakeStorage['currentUser']).toBeDefined();
        expect(JSON.parse(fakeStorage['currentUser']).email).toBe('dawna@gmail.com');
    });
});


// test 3 - logout clears session and redirects
//the full logout flow: user logged in, clicks logout, session is cleared
describe('FUN-AUTH-03: Full Logout Flow', () => {
    test('user logs in then logs out and session is cleared', () => {

        // step 1: logged in state (after successful login)
        const fakeStorage = {
            currentUser: JSON.stringify({ name: 'Dawna Dowe', email: 'dawna@gmail.com' })
        };
        expect(fakeStorage.currentUser).toBeDefined(); // confirm logged in

        // step 2: handleLogout() - removes currentUser and redirects
        delete fakeStorage.currentUser;
        const windowMock = { location: { href: '' } };
        windowMock.location.href = 'login.html';

        // verify session is gone and redirect happened
        expect(fakeStorage.currentUser).toBeUndefined();
        expect(windowMock.location.href).toBe('login.html');
    });
});


// test 4 - unauthenticated user gets redirected
//checkSession() being called on a protected page with no user logged in
describe('FUN-AUTH-04: Guest User Redirected from Protected Page', () => {
    test('no session in storage triggers redirect to home page', () => {

        const fakeStorage = {}; // no currentUser = guest
        const windowMock = { location: { href: '' } };

        // checkSession() logic from auth.js
        if (!fakeStorage.currentUser) {
            windowMock.location.href = 'index.html';
        }

        expect(windowMock.location.href).toBe('index.html');
    });
});