const API_KEY = 'c143b7e9';

function getCurrentUser() {
    const user = localStorage.getItem("currentUser");
    return user ? JSON.parse(user) : null;
} 

// 1. Initialize pages based on which ID exists
if (document.getElementById('movie-container')) {
    fetchTrendingMovies();
}

if (document.getElementById('search-button')) {
    document.getElementById('search-button').addEventListener('click', performSearch);
    
    // Optional: Allow pressing "Enter" key to search
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}

if (document.getElementById('watchlist-container')) {
    displayWatchlist();
}

// ✅ NEW: profile page init
if (document.getElementById('profile-preview')) {
    loadProfilePage();
}

updateHeaderAvatar();

// 2. SEARCH FUNCTION 
async function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    const container = document.getElementById('explore-container');
    
    if (!query) {
        alert("Please enter a movie title!");
        return;
    }

    container.innerHTML = '<li>Searching...</li>';

    try {
        const response = await fetch(`https://www.omdbapi.com/?s=${query}&apikey=${API_KEY}`);
        const data = await response.json();

        if (data.Response === "True") {
            container.innerHTML = ''; // Clear the "Searching..." message
            
            container.innerHTML = data.Search.map(movie => createMovieCard(movie)).join('');

        } else {
            container.innerHTML = `<li>No results found for "${query}".</li>`;
        }
    } catch (error) {
        container.innerHTML = `<li>Error connecting to API.</li>`;
        console.error(error);
    }
}

// Genre filter buttons
    if (document.querySelector('.genre-btn')) {
        document.querySelectorAll('.genre-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                // Toggle active state
                document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const genre = btn.dataset.genre;
                const container = document.getElementById('explore-container');
                container.innerHTML = '<p style="text-align:center;">Loading...</p>';

                try {
                    const response = await fetch(`https://www.omdbapi.com/?s=${genre}&type=movie&apikey=${API_KEY}`);
                    const data = await response.json();

                    if (data.Response === 'True') {
                        container.innerHTML = data.Search.map(movie => createMovieCard(movie)).join('');
                    } else {
                        container.innerHTML = `<p style="text-align:center;">No results found for "${genre}".</p>`;
                    }
                } catch (err) {
                    container.innerHTML = '<p style="text-align:center;">Error connecting to API.</p>';
                }
            });
        });
    }

// 3. The Logic to "Add" a movie
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

// 4. Function for Trending (Index)
async function fetchTrendingMovies() {
    const container = document.getElementById('movie-container');
    const response = await fetch(`https://www.omdbapi.com/?s=movie&type=movie&apikey=${API_KEY}`);
    const data = await response.json();

    if (data.Response === "True") {
        container.innerHTML = '';
        container.className = 'movie-grid';
        data.Search.slice(0, 10).forEach(movie => {
            container.innerHTML += createMovieCard(movie);
        });
    }
}

// 5. Function for Watchlist.html
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
            console.log("Successfully removed");
            displayWatchlist();
        } else {
            console.error("Server returned an error");
        }
    } catch (err) {
        console.error("Network error:", err);
    }
}

//6. Movie Desc
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("moviedesc.html")) {
        loadMoviePage();
    }
});

async function loadMoviePage() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    const res = await fetch(`https://www.omdbapi.com/?i=${id}&apikey=${API_KEY}`);
    const movie = await res.json();

    document.getElementById("title").innerText = movie.Title;
    document.getElementById("desc").innerText = movie.Plot;
    document.getElementById("poster").src = movie.Poster;
    document.getElementById("ratingIMDB").innerText = movie.imdbRating;

    document.getElementById("trailerLink").href =
        `https://www.youtube.com/results?search_query=${movie.Title} trailer`;
    
    document.getElementById("watchlistBtn").addEventListener("click", () => {
        addToWatchlist(movie.Title, movie.Year, movie.Poster, movie.imdbID);
    });

    renderStars(id);
    loadUserReview(id);
}

//7.Rating
let currentRating = 0; 

function renderStars(id) {
    const container = document.getElementById("stars");
    container.innerHTML = "";

    let reviews = JSON.parse(localStorage.getItem("reviews")) || [];
    const user = getCurrentUser();
    const username = user ? user.name : "Guest";

    // Find the latest review by this user for this movie
    let existing = reviews
        .filter(r => r.id === id && r.user === username)
        .slice(-1)[0];

    // Reset currentRating to the existing rating, or 0 if none exists
    currentRating = existing ? existing.rating : 0;

    for (let i = 1; i <= 10; i++) {
        const star = document.createElement("i");
        
        // Initial UI state
        star.className = i <= currentRating 
            ? "bi bi-star-fill text-warning fs-3" 
            : "bi bi-star fs-3 text-light";

        star.style.cursor = "pointer";

        star.addEventListener("click", () => {
            // Logic: If they click the same star that is already the current rating, reset to 0
            if (currentRating === i) {
                currentRating = 0;
            } else {
                currentRating = i;
            }
            updateStarsUI(); 
        });

        container.appendChild(star);
    }
}

function updateStarsUI() {
    const stars = document.querySelectorAll("#stars i");

    stars.forEach((star, index) => {
        if (index < currentRating) {
            star.className = "bi bi-star-fill text-warning fs-3";
        } else {
            star.className = "bi bi-star fs-3 text-light";
        }
    });
}

//8. Review
async function saveReview() {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get("id"); 
    const reviewText = document.getElementById("reviewInput").value;

    if (currentRating === 0) {
        alert("Please select a star rating!");
        return;
    }

    const user = getCurrentUser();
    if (!user) {
        alert("Please log in to leave a review.");
        return;
    }

    const reviewData = { 
        movieId, 
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
            document.getElementById("reviewInput").value = "";
            currentRating = 0;
            updateStarsUI();
            loadUserReview(movieId);
        }
    } catch (err) {
        alert("Error saving review to database.");
    }
}

async function loadUserReview(id) {
    const container = document.getElementById("userReview");
    
    try {
        const response = await fetch(`http://localhost:3000/api/reviews/${id}`);
        const reviews = await response.json();

        if (reviews.length === 0) {
            container.innerHTML = "<p>No reviews yet.</p>";
            return;
        }

        container.innerHTML = reviews.map(r => `
            <div class="p-3 bg-secondary bg-opacity-25 rounded mb-2">
                <strong>${r.name || "Anonymous"}</strong>
                <p class="text-warning">⭐ ${r.rating}/10</p>
                <p>${r.text}</p>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = "<p>Error loading reviews.</p>";
    }
}

// 9. Profile Page
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
        if (file.size > 2 * 1024 * 1024) {
            alert("Photo too large! Please upload under 2MB.");
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
    fields.style.display = fields.style.display === 'none' ? 'block' : 'none';
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
            body: JSON.stringify({ 
                email: currentUser.email, 
                name: newName, 
                photo: photo 
            })
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
            body: JSON.stringify({ 
                email: user.email, 
                currentPassword, 
                newPassword 
            })
        });

        const result = await response.json();
        if (response.ok) {
            showMsg('Password updated successfully!', 'alert-success');
            document.querySelectorAll('#currentPassword, #newPassword, #confirmNewPassword')
                    .forEach(input => input.value = '');
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
    const poster = movie.poster || movie.Poster;
    const title = movie.title || movie.Title;
    const year = movie.year || movie.Year;
    const imdbID = movie.imdbID || '';
    const escapedTitle = title.replace(/'/g, "\\'");
    
    let posterSrc = poster && poster !== 'N/A' ? poster : '';
    posterSrc = posterSrc.replace(/^http:\/\//i, 'https://');
    const fallback = 'https://placehold.co/300x450/1a1a2e/white?text=No+Poster';
    if (!posterSrc) posterSrc = fallback;

    const escapedPoster = encodeURIComponent(posterSrc);

    const button = mode === 'remove'
        ? `<button class="btn btn-sm btn-outline-danger rounded-pill" 
                onclick="removeFromWatchlist('${imdbID}')">
                <i class="bi bi-dash"></i>
           </button>`
        : `<button class="btn btn-sm btn-outline-secondary rounded-pill" 
                onclick="addToWatchlist('${escapedTitle}', '${year}', decodeURIComponent('${escapedPoster}'), '${imdbID}')">
                <i class="bi bi-plus"></i>
           </button>`;

    return `
        <div class="movie-card text-start">
            <div class="poster-wrapper">
                <a href="moviedesc.html?id=${imdbID}">
                    <img src="${posterSrc}" alt="${title}" class="img-fluid rounded">
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