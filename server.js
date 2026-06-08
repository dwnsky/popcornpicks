const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const path = require('path');
app.use(express.static(path.join(__dirname)));

// 1. Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    family: 4,
    dbName: 'popcornpicks'
})
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// 2. Define Mongoose Models (What your data looks like)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePhoto: { type: String, default: "" },
    watchlist: [{ title: String, year: String, poster: String, imdbID: String }],
    reviews: [{ movieId: String, rating: Number, text: String, name: String, time: { type: Date, default: Date.now } }]
});

const User = mongoose.model('User', userSchema);

// 3. API Endpoints
const bcrypt = require('bcrypt');
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({name, email, password: hashedPassword});
        
        await newUser.save();
        res.status(201).json({ message: "Registration successful" });
    } catch (err) {
        res.status(500).json({ message: "Error registering user" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Incorrect password." });

        res.json({ user: { name: user.name, email: user.email, profilePhoto: user.profilePhoto } });
    } catch (err) {
        res.status(500).json({ message: "Server error." });
    }
});

app.get('/api/watchlist/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user.watchlist);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

app.post('/api/watchlist/add', async (req, res) => {
    try {
        const { email, movie } = req.body;

        const alreadyExists = await User.findOne({ 
            email: email, 
            "watchlist.imdbID": movie.imdbID 
        });

        if (alreadyExists) {
            return res.status(400).json({ message: "Movie already in watchlist!" });
        }

        await User.findOneAndUpdate(
            { email: email },
            { $push: { watchlist: movie } },
            { returnDocument: 'after' }
        );

        res.json({ message: "Movie added to watchlist!" });
    } catch (err) {
        res.status(500).json({ message: "Error updating watchlist" });
    }
});

app.post('/api/watchlist/remove', async (req, res) => {
    try {
        const { email, imdbID } = req.body;
        const user = await User.findOneAndUpdate(
            { email: email },
            { $pull: { watchlist: { imdbID: imdbID } } },
            { returnDocument: 'after' }
        );
        res.json({ message: "Removed!", watchlist: user.watchlist });
    } catch (err) {
        res.status(500).json({ message: "Error removing movie" });
    }
});

app.post('/api/profile/update', async (req, res) => {
    try {
        const { email, name, photo } = req.body;
        const update = { name: name };
        if (photo) update.profilePhoto = photo; 

        const user = await User.findOneAndUpdate(
            { email: email },
            update,
            { returnDocument: 'after' }
        );

        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ name: user.name, profilePhoto: user.profilePhoto });
    } catch (err) {
        res.status(500).json({ message: "Error updating profile" });
    }
});

app.post('/api/password/update', async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ message: "User not found." });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: "Current password is incorrect." });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Password updated successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Server error." });
    }
});

app.post('/api/review/add', async (req, res) => {
    const { email, reviewData } = req.body;
    await User.findOneAndUpdate(
        { email },
        { $push: { reviews: reviewData } },
        { returnDocument: 'after' }
    );
    res.json({ message: "Review saved" });
});

app.get('/api/reviews/:movieId', async (req, res) => {
    const users = await User.find({ "reviews.movieId": req.params.movieId });
    
    let allReviews = [];
    users.forEach(user => {
        user.reviews.forEach(r => {
            if (r.movieId === req.params.movieId) allReviews.push(r);
        });
    });
    res.json(allReviews);
});

app.post('/api/account/delete', async (req, res) => {
    try {
        const { email } = req.body;
        const result = await User.findOneAndDelete({ email });

        if (!result) return res.status(404).json({ message: "User not found." });

        res.json({ message: "Account deleted successfully." });
    } catch (err) {
        res.status(500).json({ message: "Server error during deletion." });
    }
});

// Start Server
app.listen(3000, () => console.log("Server running on port 3000"));


module.exports = { app };