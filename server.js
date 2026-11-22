const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Product Schema
const productSchema = new mongoose.Schema({
    id: Number,
    name: String,
    price: Number
});

const Product = mongoose.model("Product", productSchema, "products");

// Default Products
const defaultProducts = [
    { id: 1, name: "Headphones", price: 999 },
    { id: 2, name: "Smart Watch", price: 1499 },
    { id: 3, name: "Shoes", price: 1999 },
    { id: 4, name: "Backpack", price: 799 },
    { id: 5, name: "Camera", price: 4999 },
    { id: 6, name: "Phone", price: 8999 }
];

// Home route
app.get("/", (req, res) => {
    res.send("ShopEase Backend is Running!");
});

// Get products from MongoDB
app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch products"
        });
    }
});

// Connect MongoDB and insert products if collection is empty
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("MongoDB Connected Successfully!");

        const count = await Product.countDocuments();

        if (count === 0) {
            await Product.insertMany(defaultProducts);
            console.log("Default products added to database!");
        }
    })
    .catch((error) => {
        console.log("MongoDB Connection Error:", error.message);
    });

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
