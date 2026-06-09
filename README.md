
---

# PopcornPicks

PopcornPicks is a dynamic movie discovery and review platform that allows users to search, filter, and review their favorite films.

## Features

* **Criteria-Based Search:** Filter movies by title and genre.
* **User Authentication:** Secure registration and login.
* **Personalized Watchlist:** Save and manage movies to your own personal list.
* **Review System:** Share your thoughts on movies with other users.
* **Profile Management:** Update your profile details and security settings.

---

## 🚀 Setup Guide

To run this project locally and connect to our shared database, follow these steps:

### 1. Prerequisites

* [Node.js](https://nodejs.org/) installed on your machine.
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (if you are the admin) or shared credentials.

### 2. Installation

1. **Clone the repository:**
```bash
git clone https://github.com/dwnsky/popcornpicks
cd popcornpicks

```


2. **Install dependencies:**
```bash
npm install
npm install express mongoose cors dotenv bcrypt 

```



### 3. Environment Configuration

Create a `.env` file in the root directory by copying the example provided:

```bash
cp .env.example .env

```

Open the `.env` file and update it with your connection string (MONGODB_URI):

```text
MONGO_URI="YOUR_MONGODB_CONNECTION_STRING_HERE"
PORT=3000

```

*[Note: Ask the project lead for the shared team password. Do NOT commit your actual `.env` file to GitHub.]*

### 4. Running the Application

Start the backend server:

```bash
node server.js

```

The application will be accessible at `http://localhost:3000`.

---

## 🛠 Project Architecture

This project uses a RESTful API architecture to facilitate communication between the frontend and our MongoDB cloud database.

### CRUD Operations Summary

We map our functionality directly to CRUD standards:

* **Create (C):** User registration, saving reviews, adding to watchlist.
* **Read (R):** User login, fetching movie reviews, retrieving watchlist data.
* **Update (U):** Profile updates, password changes, watchlist management.
* **Delete (D):** Removing watchlist items, deleting user accounts.

---

