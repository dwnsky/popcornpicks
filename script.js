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

// 2. SEARCH FUNCTION (The missing piece!)
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
            
            data.Search.forEach(movie => {
                const li = document.createElement('li');
                li.style.listStyle = "none";
                li.style.marginBottom = "15px";
                
                // We escape the title so movies with apostrophes (like "Grey's Anatomy") don't break the button
                const escapedTitle = movie.Title.replace(/'/g, "\\'");
                
                li.innerHTML = `
                    <img src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/50'}" width="50" style="vertical-align: middle; margin-right: 10px;">
                    <strong> <a href="moviedesc.html?id=${movie.imdbID}" style="color:white; text-decoration:none;">${movie.Title}</a> </strong>
                    <button class="btn btn-outline-secondary rounded-pill" onclick="addToWatchlist('${escapedTitle}', '${movie.Year}', '${movie.Poster}')"><i class="bi bi-plus"></i></button>
                `;
                container.appendChild(li);
            });
        } else {
            container.innerHTML = `<li>No results found for "${query}".</li>`;
        }
    } catch (error) {
        container.innerHTML = `<li>Error connecting to API.</li>`;
        console.error(error);
    }
}

// 3. The Logic to "Add" a movie
function addToWatchlist(title, year, poster) {
    let watchlist = JSON.parse(localStorage.getItem('myWatchlist')) || [];
    
    if (watchlist.some(movie => movie.title === title)) {
        alert("This movie is already in your watchlist!");
        return;
    }

    watchlist.push({ title, year, poster });
    localStorage.setItem('myWatchlist', JSON.stringify(watchlist));
    alert(`${title} added to watchlist!`);
}

// 4. Function for Trending (Index)
async function fetchTrendingMovies() {
    const container = document.getElementById('movie-container');
    const response = await fetch(`https://www.omdbapi.com/?s=movie&type=movie&apikey=${API_KEY}`);
    const data = await response.json();

    if (data.Response === "True") {
        container.innerHTML = '';
        data.Search.slice(0, 10).forEach(movie => {
            const li = document.createElement('li');
            const escapedTitle = movie.Title.replace(/'/g, "\\'");
            li.innerHTML = `
                <img src="${movie.Poster}" width="50">
                <strong>
  <a href="moviedesc.html?id=${movie.imdbID}" style="color:white; text-decoration:none;"> ${movie.Title} </a> </strong>
                <button class="btn btn-outline-secondary rounded-pill" onclick="addToWatchlist('${escapedTitle}', '${movie.Year}', '${movie.Poster}')"><i class="bi bi-plus"></i></button>
            `;
            container.appendChild(li);
        });
    }
}

// 5. Function for Watchlist.html
function displayWatchlist() {
    const container = document.getElementById('watchlist-container');
    const watchlist = JSON.parse(localStorage.getItem('myWatchlist')) || [];

    if (watchlist.length === 0) {
        container.innerHTML = '<p>Your watchlist is empty!</p>';
        return;
    }

    container.innerHTML = watchlist.map((movie, index) => `
        <li style="list-style:none; margin-bottom: 10px;">
            <img src="${movie.poster}" width="50" style="vertical-align: middle; margin-right: 10px;">
            <strong>${movie.title}</strong> (${movie.year})
            <button class="btn btn-outline-secondary rounded-pill" onclick="removeFromWatchlist(${index})"><i class="bi bi-trash"></i></button>
        </li>
    `).join('');
}

function removeFromWatchlist(index) {
    let watchlist = JSON.parse(localStorage.getItem('myWatchlist'));
    watchlist.splice(index, 1);
    localStorage.setItem('myWatchlist', JSON.stringify(watchlist));
    displayWatchlist();
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
        addToWatchlist(movie.Title, movie.Year, movie.Poster);
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
function saveReview() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const reviewText = document.getElementById("reviewInput").value;

    if (currentRating === 0) {
        alert("Please select a star rating!");
        return;
    }

    const user = getCurrentUser();
    const username = user ? user.name : "Guest";
    let reviews = JSON.parse(localStorage.getItem("reviews")) || [];

    reviews.push({
        id: id,
        rating: currentRating,
        review: reviewText,
        user: username,
    });

    localStorage.setItem("reviews", JSON.stringify(reviews));

    // Reset logic
    document.getElementById("reviewInput").value = "";
    currentRating = 0; // Reset the variable
    updateStarsUI();   // Reset the visual stars
    loadUserReview(id); // Refresh the list
}

function loadUserReview(id) {
    const container = document.getElementById("userReview");

    let reviews = JSON.parse(localStorage.getItem("reviews")) || [];
    let movieReviews = reviews.filter(r => r.id === id);

    if (movieReviews.length === 0) {
        container.innerHTML = "<p>No reviews yet.</p>";
        return;
    }

    container.innerHTML = movieReviews.map(r => `
        <div class="p-3 bg-secondary bg-opacity-25 rounded mb-2">
            <strong>${r.user}</strong>
            <small class="text-muted ms-2">${r.time || ""}</small>
            <p class="text-warning">⭐ ${r.rating}/10</p>
            <p>${r.review}</p>
        </div>
    `).join('');
}
