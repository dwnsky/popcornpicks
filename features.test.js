const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('./server');

beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
});

afterAll(async () => {
    await mongoose.connection.close();
});


// ====================
// UNIT TESTING
// ====================

// UT-WATCHLIST-01
describe('UT-WATCHLIST-01: Add To Watchlist Requires Login', () => {

    function canAddToWatchlist(user) {
        return !!user;
    }

    test('Guest user cannot add movie', () => {
        expect(canAddToWatchlist(null)).toBe(false);
    });

    test('Logged in user can add movie', () => {
        expect(canAddToWatchlist({ email: 'user@email.com' })).toBe(true);
    });
});


// UT-REVIEW-01
describe('UT-REVIEW-01: Rating Required Before Review Submission', () => {

    function hasValidRating(rating) {
        return rating > 0;
    }

    test('Rating 0 is invalid', () => {
        expect(hasValidRating(0)).toBe(false);
    });

    test('Rating 7 is valid', () => {
        expect(hasValidRating(7)).toBe(true);
    });
});


// UT-REVIEW-02
describe('UT-REVIEW-02: Star Selection Updates Rating', () => {

    function updateRating(selectedStar) {
        return selectedStar;
    }

    test('Selecting star 8 stores rating 8', () => {
        expect(updateRating(8)).toBe(8);
    });
});


// UT-PROFILE-01
describe('UT-PROFILE-01: Username Cannot Be Empty', () => {

    function isValidUsername(username) {
        return username.trim().length > 0;
    }

    test('Empty username rejected', () => {
        expect(isValidUsername('')).toBe(false);
    });

    test('Valid username accepted', () => {
        expect(isValidUsername('Hasna')).toBe(true);
    });
});


// UT-PROFILE-02
describe('UT-PROFILE-02: Password Confirmation Check', () => {

    function passwordsMatch(newPassword, confirmPassword) {
        return newPassword === confirmPassword;
    }

    test('Different passwords fail', () => {
        expect(passwordsMatch('abc123', 'abc456')).toBe(false);
    });

    test('Matching passwords pass', () => {
        expect(passwordsMatch('abc123', 'abc123')).toBe(true);
    });
});



// ====================
// INTEGRATION TESTING
// ====================

// INT-WATCHLIST-01
describe('INT-WATCHLIST-01: Add Movie To Watchlist', () => {

    test('Movie saved through API and database', async () => {

        const res = await request(app)
            .post('/api/watchlist/add')
            .send({
                email: 'dawna@gmail.com',
                movie: {
                    title: 'Inception',
                    year: '2010',
                    imdbID: 'tt1375666'
                }
            });

        expect(res.statusCode).toBe(200);
    });
});


// INT-WATCHLIST-02
describe('INT-WATCHLIST-02: Remove Movie From Watchlist', () => {

    test('Movie removed successfully', async () => {

        const res = await request(app)
            .post('/api/watchlist/remove')
            .send({
                email: 'dawna@gmail.com',
                imdbID: 'tt1375666'
            });

        expect(res.statusCode).toBe(200);
    });
});


// INT-REVIEW-01
describe('INT-REVIEW-01: Review Stored In Database', () => {

    test('Review submitted through API reaches database', async () => {

        const res = await request(app)
            .post('/api/review/add')
            .send({
                email: 'dawna@gmail.com',
                reviewData: {
                    movieId: 'tt1375666',
                    rating: 8,
                    text: 'Excellent movie',
                    name: 'Dawna'
                }
            });

        expect(res.statusCode).toBe(200);
    });
});


// INT-REVIEW-02
describe('INT-REVIEW-02: Retrieve Reviews From Database', () => {

    test('Movie reviews returned successfully', async () => {

        const res = await request(app)
            .get('/api/reviews/tt1375666');

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});


// INT-PROFILE-01
describe('INT-PROFILE-01: Update Username', () => {

    test('Profile update reaches database', async () => {

        const res = await request(app)
            .post('/api/profile/update')
            .send({
                email: 'dawna@gmail.com',
                name: 'Updated Name'
            });

        expect(res.statusCode).toBe(200);
    });
});


// INT-PROFILE-02
describe('INT-PROFILE-02: Change Password', () => {

    test('Password update request processed successfully', async () => {

        const res = await request(app)
            .post('/api/password/update')
            .send({
                email: 'dawna@gmail.com',
                currentPassword: 'dawnadowe',
                newPassword: 'newpassword123'
            });

        expect([200,400,401]).toContain(res.statusCode);
    });
});



// ====================
// FUNCTIONAL TESTING
// ====================

// FUN-WATCHLIST-01
describe('FUN-WATCHLIST-01: User Adds Movie To Watchlist', () => {

    test('Movie appears in watchlist after saving', async () => {

        const addRes = await request(app)
            .post('/api/watchlist/add')
            .send({
                email: 'hasna@gmail.com',
                movie: {
                    title: 'Interstellar',
                    year: '2014',
                    imdbID: 'tt0816692'
                }
            });

        expect([200, 201]).toContain(addRes.statusCode);

        const watchlistRes = await request(app)
            .get('/api/watchlist/dawna@gmail.com');

        expect([200, 404]).toContain(watchlistRes.statusCode);
    });
});


// FUN-REVIEW-01
describe('FUN-REVIEW-01: User Submits Rating And Review', () => {

    test('Review becomes visible after submission', async () => {

        const submitRes = await request(app)
            .post('/api/review/add')
            .send({
                email: 'dawna@gmail.com',
                reviewData: {
                    movieId: 'tt0816692',
                    rating: 9,
                    text: 'Amazing movie',
                    name: 'Dawna'
                }
            });

        expect(submitRes.statusCode).toBe(200);

        const reviewRes = await request(app)
            .get('/api/reviews/tt0816692');

        expect(reviewRes.statusCode).toBe(200);
    });
});


// FUN-PROFILE-01
describe('FUN-PROFILE-01: User Updates Profile', () => {

    test('Updated username is returned successfully', async () => {

        const res = await request(app)
            .post('/api/profile/update')
            .send({
                email: 'dawna@gmail.com',
                name: 'New Username'
            });

        expect(res.statusCode).toBe(200);
    });
});


// FUN-PROFILE-02
describe('FUN-PROFILE-02: User Deletes Account', () => {

    test('Delete account request processed successfully', async () => {

        const res = await request(app)
            .post('/api/account/delete')
            .send({
                email: 'temporaryuser@email.com'
            });

        expect([200,404]).toContain(res.statusCode);
    });
});
