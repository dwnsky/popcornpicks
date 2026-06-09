const OMDB_API_KEY = 'c143b7e9';
const TMDB_API_KEY = 'a76d1fa9ebde534a910bffed83a13596'; 

function getCurrentUser() {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
} 

if (document.getElementById('movie-container')) {
    fetchTrendingMovies();
}

if (document.getElementById('search-button')) {
    document.getElementById('search-button').addEventListener('click', performSearch);
    
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

if (document.getElementById('watchlist-container')) {
    displayWatchlist();
}

if (document.getElementById('profile-preview')) {
    loadProfilePage();
}

updateHeaderAvatar();

async function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    const container = document.getElementById('explore-container');
    
    if (!query) {
        alert("Please enter a movie title!");
        return;
    }

    container.innerHTML = '<li>Searching...</li>';

    try {
        const response = await fetch(`https://www.omdbapi.com/?s=${query}&apikey=${OMDB_API_KEY}`);
        const data = await response.json();

        if (data.Response === "True") {
            container.innerHTML = data.Search.map(movie => createMovieCard(movie)).join('');
        } else {
            container.innerHTML = `<li>No results found for "${query}".</li>`;
        }
    } catch (error) {
        container.innerHTML = `<li>Error connecting to API.</li>`;
        console.error(error);
    }
}

if (document.querySelector('.genre-btn')) {
    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const genreInput = btn.dataset.genre.toLowerCase();
            const container = document.getElementById('explore-container');
            container.innerHTML = '<p style="text-align:center;">Loading...</p>';

            const genreMap = {
                'action': 28, 'adventure': 12, 'animation': 16, 'comedy': 35, 
                'crime': 80, 'documentary': 99, 'drama': 18, 'family': 10751, 
                'fantasy': 14, 'history': 36, 'horror': 27, 'music': 10402, 
                'mystery': 9648, 'romance': 10749, 'sci-fi': 878, 'science fiction': 878, 
                'thriller': 53, 'war': 10752, 'western': 37
            };

            const genreId = genreMap[genreInput];

            if (!genreId) {
                container.innerHTML = `<p style="text-align:center;">Genre "${btn.dataset.genre}" not recognized. Please check your HTML data-genre attribute!</p>`;
                return; 
            }

            try {
                const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    container.innerHTML = data.results.map(movie => createMovieCard(movie)).join('');
                } else {
                    container.innerHTML = `<p style="text-align:center;">No results found for this genre selection.</p>`;
                }
            } catch (err) {
                console.error("Genre parsing error:", err);
                container.innerHTML = '<p style="text-align:center;">Error connecting to TMDB API.</p>';
            }
        });
    });
}

async function addToWatchlist(title, year, poster, imdbID) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert("Please log in to save movies.");
        return;
    }

    const movie = { title, year, poster, imdbID };
    try {
        const response = await fetch('http://localhost:3000/api/watchlist/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, movie })
        });

        const result = await response.json();
        if (response.ok) {
            alert(`${title} added to your watchlist!`);
        } else {
            alert(result.message || "Could not add to watchlist.");
        }
    } catch (err) {
        console.error("Connection error:", err);
        alert("Failed to connect to the server.");
    }
}

async function fetchTrendingMovies() {
    const container = document.getElementById('movie-container');
    if (!container) return;

    try {
        const response = await fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            container.className = 'movie-grid';
            container.innerHTML = data.results.slice(0, 10).map(movie => createMovieCard(movie)).join('');
        } else {
            container.innerHTML = '<p>No trending movies found today.</p>';
        }
    } catch (error) {
        console.error("Error fetching TMDB trending payload:", error);
        container.innerHTML = '<p>Error loading real-time trends.</p>';
    }
}

async function displayWatchlist() {
    const container = document.getElementById('watchlist-container');
    const user = JSON.parse(localStorage.getItem('currentUser'));

    if (!user) return;
    try {
        const response = await fetch(`http://localhost:3000/api/watchlist/${user.email}`);
        const watchlist = await response.json();

        if (watchlist.length === 0) {
            container.innerHTML = '<p>Your watchlist is empty!</p>';
            return;
        }

        container.innerHTML = watchlist.map(movie => createMovieCard(movie, 'remove')).join('');
    } catch (err) {
        console.error("Error loading watchlist:", err);
        container.innerHTML = '<p>Error loading your watchlist.</p>';
    }
}

// To delete watchlist
async function removeFromWatchlist(imdbID) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;

    try {
        const response = await fetch('http://localhost:3000/api/watchlist/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, imdbID: imdbID })
        });

        if (response.ok) {
            displayWatchlist();
        }
    } catch (err) {
        console.error("Network error:", err);
    }
}

let globalVerifiedMovieId = ""; 

document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("moviedesc.html")) {
        loadMoviePage();
    }
});

async function loadMoviePage() {
    const params = new URLSearchParams(window.location.search);
    let id = params.get("id");

    console.log("1. URL raw ID detected:", id);

    if (!id) {
        console.error("No movie ID found in URL scope.");
        return;
    }

    const isNumericId = /^\d+$/.test(id);

    if (isNumericId) {
        console.log("2. Detected numeric TMDB ID. Requesting conversion mapping...");
        try {
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`);
            const tmdbMovie = await tmdbRes.json();
            
            if (tmdbMovie && tmdbMovie.imdb_id) {
                id = tmdbMovie.imdb_id;
                console.log("3. Mapping conversion success! New structural ID:", id);
            } else {
                console.warn("3. TMDB did not return an underlying IMDb mapping string.");
            }
        } catch (err) {
            console.error("Error linking external TMDB asset to target:", err);
        }
    } else {
        console.log("2. Detected alphanumeric IMDb ID. Skipping conversion loop.");
    }

    globalVerifiedMovieId = id;

    try {
        console.log("4. Requesting movie package from OMDb using ID:", id);
        const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=${OMDB_API_KEY}`);
        const movie = await res.json();

        if (movie.Response === "False") {
            document.getElementById("title").innerText = "Movie Not Found";
            document.getElementById("desc").innerText = "We couldn't retrieve details for this resource item.";
            return;
        }

        document.getElementById("title").innerText = movie.Title;
        document.getElementById("desc").innerText = movie.Plot;
        document.getElementById("poster").src = movie.Poster;
        document.getElementById("ratingIMDB").innerText = movie.imdbRating;

        document.getElementById("trailerLink").href = `https://www.youtube.com/results?search_query=${movie.Title} trailer`;
        
        const oldBtn = document.getElementById("watchlistBtn");
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);

        newBtn.addEventListener("click", () => {
            addToWatchlist(movie.Title, movie.Year, movie.Poster, movie.imdbID);
        });

        console.log("5. Triggering star and review list loads for:", id);
        await renderStars(id);
        await loadUserReview(id);
        
    } catch (error) {
        console.error("Error painting user interface details layer:", error);
    }
}

let currentRating = 0; 

async function renderStars(id) {
    const container = document.getElementById("stars");
    if (!container) return;
    container.innerHTML = "";

    const user = getCurrentUser();
    const username = user ? user.name : "Guest";

    try {
        const response = await fetch(`http://localhost:3000/api/reviews/${id}`);
        const reviews = await response.json();
        console.log(`6. Reviews downloaded for ${id}:`, reviews);

        let existing = reviews.filter(r => r.name === username).slice(-1)[0];
        currentRating = existing ? existing.rating : 0;
    } catch (err) {
        console.error("Error matching existing star ratings from server:", err);
        currentRating = 0;
    }

    for (let i = 1; i <= 10; i++) {
        const star = document.createElement("i");
        star.className = i <= currentRating ? "bi bi-star-fill text-warning fs-3" : "bi bi-star fs-3 text-light";
        star.style.cursor = "pointer";

        star.addEventListener("click", () => {
            currentRating = (currentRating === i) ? 0 : i;
            updateStarsUI(); 
        });

        container.appendChild(star);
    }
}

function updateStarsUI() {
    const stars = document.querySelectorAll("#stars i");
    stars.forEach((star, index) => {
        star.className = index < currentRating ? "bi bi-star-fill text-warning fs-3" : "bi bi-star fs-3 text-light";
    });
}

async function saveReview() {
    const reviewText = document.getElementById("reviewInput").value.trim();

    if (currentRating === 0) {
        alert("Please select a star rating!");
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        alert("Please log in to leave a review.");
        return;
    }

    console.log("Submitting review to backend using verified ID target:", globalVerifiedMovieId);

    const reviewData = { 
        movieId: globalVerifiedMovieId, 
        rating: currentRating, 
        text: reviewText, 
        name: user.name 
    };

    try {
        const response = await fetch('http://localhost:3000/api/review/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, reviewData })
        });

        if (response.ok) {
            alert("Review saved successfully!");
            document.getElementById("reviewInput").value = "";
            loadUserReview(globalVerifiedMovieId);
        } else {
            const errData = await response.json();
            alert(errData.message || "Failed to save review.");
        }
    } catch (err) {
        console.error("Database error saving review:", err);
        alert("Error saving review to database.");
    }
}

async function loadUserReview(id) {
    const container = document.getElementById("userReview");
    if (!container) return;
    
    try {
        const response = await fetch(`http://localhost:3000/api/reviews/${id}`);
        const reviews = await response.json();

        if (!reviews || reviews.length === 0) {
            container.innerHTML = "<p>No reviews yet.</p>";
            return;
        }

        container.innerHTML = reviews.map(r => `
            <div class="p-3 bg-secondary bg-opacity-25 rounded mb-2">
                <strong>${r.name || "Anonymous"}</strong>
                <p class="text-warning mb-1">⭐ ${r.rating}/10</p>
                <p class="mb-0">${r.text}</p>
            </div>
        `).join('');
    } catch (err) {
        console.error("Database reading error:", err);
        container.innerHTML = "<p>Error loading reviews.</p>";
    }
}

function loadProfilePage() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('username-display').textContent = user.name;
    document.getElementById('email-display').textContent = user.email;

    const savedPhoto = localStorage.getItem('profilePhoto');
    const preview = document.getElementById('profile-preview');

    if (savedPhoto) {
        preview.src = savedPhoto;
        preview.style.display = 'block';
        document.getElementById('profile-default-icon').style.display = 'none';
    } else {
        preview.style.display = 'none';
        document.getElementById('profile-default-icon').style.display = 'flex';
    }

    document.getElementById('profile-upload').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert("Photo too large! Please upload under 10MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('profile-default-icon').style.display = 'none';
            window._pendingPhoto = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function toggleEdit() {
    const fields = document.getElementById('edit-fields');
    const user = getCurrentUser();
    document.getElementById('edit-username').value = user.name;
    const isHidden = fields.style.display === '' || fields.style.display === 'none';
    fields.style.display = isHidden ? 'block' : 'none';
}

function cancelEdit() {
    document.getElementById('edit-fields').style.display = 'none';
    window._pendingPhoto = null;
    const savedPhoto = localStorage.getItem('profilePhoto');
    const preview = document.getElementById('profile-preview');
    if (savedPhoto) {
        preview.src = savedPhoto;
        preview.style.display = 'block';
        document.getElementById('profile-default-icon').style.display = 'none';
    } else {
        preview.style.display = 'none';
        document.getElementById('profile-default-icon').style.display = 'flex';
    }
}

async function saveEdits() {
    const newName = document.getElementById('edit-username').value.trim();
    if (!newName) {
        alert("Username cannot be empty!");
        return;
    }
    const currentUser = getCurrentUser();
    const photo = window._pendingPhoto || null;

    try {
        const response = await fetch('http://localhost:3000/api/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, name: newName, photo: photo })
        });

        const result = await response.json();
        if (response.ok) {
            currentUser.name = result.name;
            currentUser.profilePhoto = result.profilePhoto;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            if (result.profilePhoto) {
                localStorage.setItem('profilePhoto', result.profilePhoto);
            }

            document.getElementById('username-display').textContent = result.name;
            document.getElementById('edit-fields').style.display = 'none';
            window._pendingPhoto = null;
            updateHeaderAvatar();
            alert("Profile updated successfully!");
        }
    } catch (err) {
        console.error("Error saving profile:", err);
        alert("Could not update profile.");
    }
}

function updateHeaderAvatar() {
    const user = getCurrentUser();
    const profileBtn = document.getElementById('profile-btn');

    if (!profileBtn) return;

    const photo = user ? user.profilePhoto : null;

    if (photo) {
        profileBtn.innerHTML = `<img src="${photo}" alt="avatar" class="header-avatar">`;
    } else {
        profileBtn.innerHTML = `<button class="btn btn-outline-secondary rounded-pill"><i class="bi bi-person"></i></button>`;
    }
}

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const msg = document.getElementById('password-msg');

    function showMsg(text, type) {
        msg.classList.remove('d-none', 'alert-danger', 'alert-success');
        msg.classList.add(type);
        msg.textContent = text;
    }

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showMsg('Please fill in all fields.', 'alert-danger');
        return;
    }

    if (newPassword.length < 6) {
        showMsg('New password must be at least 6 characters.', 'alert-danger');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        showMsg('New passwords do not match.', 'alert-danger');
        return;
    }

    if (newPassword === currentPassword) {
        showMsg('New password must be different from current password.', 'alert-danger');
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser'));
    try {
        const response = await fetch('http://localhost:3000/api/password/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, currentPassword, newPassword })
        });

        const result = await response.json();
        if (response.ok) {
            showMsg('Password updated successfully!', 'alert-success');
            document.querySelectorAll('#currentPassword, #newPassword, #confirmNewPassword').forEach(input => input.value = '');
        } else {
            showMsg(result.message, 'alert-danger');
        }
    } catch (err) {
        showMsg('Server connection error.', 'alert-danger');
    }
}

async function deleteAccount() {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    try {
        const response = await fetch('http://localhost:3000/api/account/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email })
        });

        if (response.ok) {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        } else {
            alert("Failed to delete account. Please try again.");
        }
    } catch (err) {
        console.error("Error:", err);
        alert("Connection error.");
    }
}

function createMovieCard(movie, mode = 'add') {
    const title = movie.title || movie.Title;
    let year = movie.release_date || movie.year || movie.Year;
    if (year && year.includes('-')) year = year.split('-')[0];

    const id = movie.imdbID || movie.id || ''; 
    const escapedTitle = title.replace(/'/g, "\\'");
    
    let poster = movie.poster || movie.Poster || movie.poster_path;
    let posterSrc = '';

    if (poster && poster !== 'N/A') {
        if (poster.startsWith('/') || (!poster.startsWith('http') && poster.includes('.jpg'))) {
            const cleanPath = poster.startsWith('/') ? poster : `/${poster}`;
            posterSrc = `https://image.tmdb.org/t/p/w500${cleanPath}`;
        } else {
            posterSrc = poster.replace(/^http:\/\//i, 'https://');
        }
    }
    
    const fallback = 'https://placehold.co/300x450/1a1a2e/white?text=No+Poster';
    if (!posterSrc) posterSrc = fallback;

    const escapedPoster = encodeURIComponent(posterSrc);

    const button = mode === 'remove'
        ? `<button class="btn btn-sm btn-outline-danger rounded-pill" onclick="removeFromWatchlist('${id}')"><i class="bi bi-dash"></i></button>`
        : `<button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="addToWatchlist('${escapedTitle}', '${year}', decodeURIComponent('${escapedPoster}'), '${id}')"><i class="bi bi-plus"></i></button>`;

    return `
        <div class="movie-card text-start">
            <div class="poster-wrapper">
                <a href="moviedesc.html?id=${id}">
                    <img src="${posterSrc}" alt="${title}" class="img-fluid rounded" loading="lazy">
                </a>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-2">
                <div>
                    <h5 class="mb-0 text-truncate" style="max-width: 150px;">${title}</h5>
                    <small class="text-secondary">${year}</small>
                </div>
                ${button}
            </div>
        </div>
    `;
}