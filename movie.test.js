const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('./server');
 

beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
});
 

afterAll(async () => {
    await mongoose.connection.close();
});
 

// UT-MOVIE-01: empty search query is rejected
describe('UT-MOVIE-01: Search Empty Query', () => {
    function isQueryValid(query) {
        return query.trim() !== '';
    }
 
    test('Empty string is invalid', () => {
        expect(isQueryValid('')).toBe(false);
    });
 
    test('Whitespace only is invalid', () => {
        expect(isQueryValid('   ')).toBe(false);
    });
 
    test('Valid query is accepted', () => {
        expect(isQueryValid('Inception')).toBe(true);
    });
});
 
 
// UT-MOVIE-02: genre map returns correct ID
describe('UT-MOVIE-02: Genre Map Lookup', () => {
    const genreMap = {
        'action': 28, 'adventure': 12, 'animation': 16, 'comedy': 35,
        'crime': 80, 'documentary': 99, 'drama': 18, 'family': 10751,
        'fantasy': 14, 'history': 36, 'horror': 27, 'music': 10402,
        'mystery': 9648, 'romance': 10749, 'sci-fi': 878,
        'thriller': 53, 'war': 10752, 'western': 37
    };
 
    function getGenreId(genre) {
        return genreMap[genre.toLowerCase()] || null;
    }
 
    test('Action returns genre ID 28', () => {
        expect(getGenreId('Action')).toBe(28);
    });
 
    test('Horror returns genre ID 27', () => {
        expect(getGenreId('Horror')).toBe(27);
    });
 
    test('Unknown genre returns null', () => {
        expect(getGenreId('Bollywood')).toBeNull();
    });
 
    test('Genre lookup is case-insensitive', () => {
        expect(getGenreId('COMEDY')).toBe(35);
    });
});
 
 
// UT-MOVIE-03: poster URL 
describe('UT-MOVIE-03: Poster URL Construction', () => {
    function buildPosterUrl(poster) {
        if (!poster || poster === 'N/A') return 'https://placehold.co/300x450/1a1a2e/white?text=No+Poster';
        if (poster.startsWith('/') || (!poster.startsWith('http') && poster.includes('.jpg'))) {
            const cleanPath = poster.startsWith('/') ? poster : `/${poster}`;
            return `https://image.tmdb.org/t/p/w500${cleanPath}`;
        }
        return poster.replace(/^http:\/\//i, 'https://');
    }
 
    test('TMDB path starting with / gets full URL', () => {
        expect(buildPosterUrl('/abc123.jpg')).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
    });
 
    test('Null poster returns fallback placeholder', () => {
        expect(buildPosterUrl(null)).toBe('https://placehold.co/300x450/1a1a2e/white?text=No+Poster');
    });
 
    test('"N/A" returns fallback placeholder', () => {
        expect(buildPosterUrl('N/A')).toBe('https://placehold.co/300x450/1a1a2e/white?text=No+Poster');
    });
 
    test('http URL gets converted to https', () => {
        expect(buildPosterUrl('http://example.com/poster.jpg')).toBe('https://example.com/poster.jpg');
    });
});
 
 
// UT-MOVIE-04: movie card extracts correct fields from TMDB and OMDB formats
describe('UT-MOVIE-04: Movie Card Field Extraction', () => {
    function extractMovieFields(movie) {
        const title = movie.title || movie.Title;
        let year = movie.release_date || movie.year || movie.Year;
        if (year && year.includes('-')) year = year.split('-')[0];
        const id = movie.imdbID || movie.id || '';
        return { title, year, id };
    }
 
    test('TMDB format: title and release_date extracted correctly', () => {
        const movie = { title: 'Inception', release_date: '2010-07-16', id: 27205 };
        const result = extractMovieFields(movie);
        expect(result.title).toBe('Inception');
        expect(result.year).toBe('2010');
    });
 
    test('OMDB format: Title and Year extracted correctly', () => {
        const movie = { Title: 'The Dark Knight', Year: '2008', imdbID: 'tt0468569' };
        const result = extractMovieFields(movie);
        expect(result.title).toBe('The Dark Knight');
        expect(result.year).toBe('2008');
        expect(result.id).toBe('tt0468569');
    });
 
    test('Missing id field returns empty string', () => {
        const movie = { title: 'Unknown', release_date: '2020-01-01' };
        expect(extractMovieFields(movie).id).toBe('');
    });
});
 
 
// UT-MOVIE-05: movie card renders correct button based on mode
describe('UT-MOVIE-05: Movie Card Mode Rendering', () => {
    function getButtonIcon(mode) {
        return mode === 'remove' ? 'bi-dash' : 'bi-plus';
    }
 
    test('Default mode renders add (bi-plus) button', () => {
        expect(getButtonIcon('add')).toBe('bi-plus');
    });
 
    test('Remove mode renders remove (bi-dash) button', () => {
        expect(getButtonIcon('remove')).toBe('bi-dash');
    });
});

 
// INT-MOVIE-01: watchlist endpoint returns data from MongoDB
describe('INT-MOVIE-01: Watchlist Fetched from Database', () => {
    test('GET /api/watchlist/:email returns array for existing user', async () => {
        const res = await request(app)
            .get('/api/watchlist/dawna@gmail.com');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
 
 
// INT-MOVIE-02: watchlist returns 404 for unknown user
describe('INT-MOVIE-02: Watchlist Returns 404 for Unknown User', () => {
    test('GET /api/watchlist/:email returns 404 for non-existent user', async () => {
        const res = await request(app)
            .get('/api/watchlist/nobody@unknown.com');
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('User not found');
    });
});
 
 
// INT-MOVIE-03: add movie to watchlist saves to MongoDB
describe('INT-MOVIE-03: Add Movie Saves to Database', () => {
    const testMovie = {
        title: 'Test Movie',
        year: '2024',
        poster: 'https://example.com/poster.jpg',
        imdbID: 'tt_test_integration'
    };
 
    afterEach(async () => {
        await request(app)
            .post('/api/watchlist/remove')
            .send({ email: 'dawna@gmail.com', imdbID: 'tt_test_integration' });
    });
 
    test('POST /api/watchlist/add saves movie and returns success message', async () => {
        const res = await request(app)
            .post('/api/watchlist/add')
            .send({ email: 'dawna@gmail.com', movie: testMovie });
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Movie added to watchlist!');
    });
});
 
 
// INT-MOVIE-04: duplicate movie is rejected by database
describe('INT-MOVIE-04: Duplicate Movie Rejected by Database', () => {
    const dupeMovie = {
        title: 'Dupe Movie',
        year: '2024',
        poster: 'https://example.com/poster.jpg',
        imdbID: 'tt_dupe_test'
    };
 
    beforeEach(async () => {
        await request(app)
            .post('/api/watchlist/add')
            .send({ email: 'dawna@gmail.com', movie: dupeMovie });
    });
 
    afterEach(async () => {
        await request(app)
            .post('/api/watchlist/remove')
            .send({ email: 'dawna@gmail.com', imdbID: 'tt_dupe_test' });
    });
 
    test('Adding same movie twice returns 400', async () => {
        const res = await request(app)
            .post('/api/watchlist/add')
            .send({ email: 'dawna@gmail.com', movie: dupeMovie });
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Movie already in watchlist!');
    });
});
 
 
// INT-MOVIE-05: remove movie updates database
describe('INT-MOVIE-05: Remove Movie Updates Database', () => {
    const removeMovie = {
        title: 'Remove Me',
        year: '2024',
        poster: 'https://example.com/poster.jpg',
        imdbID: 'tt_remove_test'
    };
 
    beforeEach(async () => {
        await request(app)
            .post('/api/watchlist/add')
            .send({ email: 'dawna@gmail.com', movie: removeMovie });
    });
 
    test('POST /api/watchlist/remove successfully removes movie', async () => {
        const res = await request(app)
            .post('/api/watchlist/remove')
            .send({ email: 'dawna@gmail.com', imdbID: 'tt_remove_test' });
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Removed!');
    });
});
 
 
// FUN-MOVIE-01: full add to watchlist flow
describe('FUN-MOVIE-01: Add Movie to Watchlist Flow', () => {
    const flowMovie = {
        title: 'Flow Movie',
        year: '2024',
        poster: 'https://example.com/poster.jpg',
        imdbID: 'tt_flow_test'
    };
 
    afterEach(async () => {
        await request(app)
            .post('/api/watchlist/remove')
            .send({ email: 'dawna@gmail.com', imdbID: 'tt_flow_test' });
    });
 
    test('User adds movie then it appears in their watchlist', async () => {
        // step 1: add movie
        const addRes = await request(app)
            .post('/api/watchlist/add')
            .send({ email: 'dawna@gmail.com', movie: flowMovie });
        expect(addRes.statusCode).toBe(200);
 
        // step 2: fetch watchlist and confirm movie is there
        const listRes = await request(app)
            .get('/api/watchlist/dawna@gmail.com');
        expect(listRes.statusCode).toBe(200);
        const found = listRes.body.some(m => m.imdbID === 'tt_flow_test');
        expect(found).toBe(true);
    });
});
 
 
// FUN-MOVIE-02: full remove from watchlist flow
describe('FUN-MOVIE-02: Remove Movie from Watchlist Flow', () => {
    const removeFlowMovie = {
        title: 'Remove Flow Movie',
        year: '2024',
        poster: 'https://example.com/poster.jpg',
        imdbID: 'tt_remove_flow'
    };
 
    beforeEach(async () => {
        await request(app)
            .post('/api/watchlist/add')
            .send({ email: 'dawna@gmail.com', movie: removeFlowMovie });
    });
 
    test('User removes movie then it no longer appears in watchlist', async () => {
        // step 1: remove movie
        const removeRes = await request(app)
            .post('/api/watchlist/remove')
            .send({ email: 'dawna@gmail.com', imdbID: 'tt_remove_flow' });
        expect(removeRes.statusCode).toBe(200);
 
        // step 2: fetch watchlist and confirm movie is gone
        const listRes = await request(app)
            .get('/api/watchlist/dawna@gmail.com');
        expect(listRes.statusCode).toBe(200);
        const found = listRes.body.some(m => m.imdbID === 'tt_remove_flow');
        expect(found).toBe(false);
    });
});
 
 
// FUN-MOVIE-03: guest user cannot add to watchlist
describe('FUN-MOVIE-03: Guest Cannot Add to Watchlist', () => {
    function canAddToWatchlist(currentUser) {
        return currentUser !== null;
    }
 
    test('Guest user (no session) is blocked from adding', () => {
        expect(canAddToWatchlist(null)).toBe(false);
    });
 
    test('Logged in user is allowed to add', () => {
        const fakeUser = { name: 'Dawna', email: 'dawna@gmail.com' };
        expect(canAddToWatchlist(fakeUser)).toBe(true);
    });
});