const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("ShopEase Backend is Running!");
});

app.get("/api/products", (req, res) => {
    res.json([
        { id: 1, name: "Headphones", price: 999 },
        { id: 2, name: "Smart Watch", price: 1499 },
        { id: 3, name: "Shoes", price: 1999 },
        { id: 4, name: "Backpack", price: 799 },
        { id: 5, name: "Camera", price: 4999 },
        { id: 6, name: "Phone", price: 8999 }
    ]);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
