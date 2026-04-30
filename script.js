const API_KEY = 'c143b7e9';

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
                    <strong>${movie.Title}</strong> (${movie.Year})
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
                <strong>${movie.Title}</strong> (${movie.Year})
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