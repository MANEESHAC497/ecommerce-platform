const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());
// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access denied. Token required."
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                message: "Invalid token"
            });
        }

        req.user = user;
        next();
    });
}

// MongoDB Product Schema
const productSchema = new mongoose.Schema({
    id: Number,
    name: String,
    price: Number
});

const Product = mongoose.model("Product", productSchema, "products");

// MongoDB Cart Schema
const cartSchema = new mongoose.Schema({
    cartId: String,
    items: [{
        productId: Number,
        name: String,
        price: Number,
        quantity: Number
    }]
});

const Cart = mongoose.model("Cart", cartSchema, "carts");
// MongoDB Order Schema
const orderSchema = new mongoose.Schema({
    cartId: String,
    items: [{
        productId: Number,
        name: String,
        price: Number,
        quantity: Number
    }],
    total: Number,
    orderDate: {
        type: Date,
        default: Date.now
    }
});

const Order = mongoose.model("Order", orderSchema, "orders");

// MongoDB User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: {
        type: String,
        unique: true
    },
    password: String
});

const User = mongoose.model("User", userSchema, "users");

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
// Add product to cart
app.post("/api/cart/add", async (req, res) => {
    try {
        const { cartId, productId, quantity } = req.body;
        
if (!cartId || !Number.isInteger(Number(productId)) ||
    (quantity !== undefined && (!Number.isInteger(Number(quantity)) || Number(quantity) < 1))) {
    return res.status(400).json({
        message: "Invalid cart details"
    });
}

        const product = await Product.findOne({ id: productId });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        let cart = await Cart.findOne({ cartId });

        if (!cart) {
            cart = new Cart({
                cartId,
                items: []
            });
        }

        const existingItem = cart.items.find(
            item => item.productId === productId
        );

        if (existingItem) {
            existingItem.quantity += quantity || 1;
        } else {
            cart.items.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity || 1
            });
        }

        await cart.save();

        res.json({
            message: "Product added to cart",
            cart
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to add product"
        });
    }
});

// Get cart items
app.get("/api/cart/:cartId", async (req, res) => {
    try {
        const cart = await Cart.findOne({
            cartId: req.params.cartId
        });

        if (!cart) {
            return res.json({
                message: "Cart is empty",
                items: []
            });
        }

        res.json(cart);

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch cart"
        });
    }
});

// Remove product from cart
app.delete("/api/cart/:cartId/:productId", async (req, res) => {
    try {
        const cart = await Cart.findOne({
            cartId: req.params.cartId
        });

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found"
            });
        }

        cart.items = cart.items.filter(
            item => item.productId !== Number(req.params.productId)
        );

        await cart.save();

        res.json({
            message: "Product removed from cart",
            cart
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to remove product"
        });
    }
});
// Place Order API
app.post("/api/orders", async (req, res) => {
    try {
        const { cartId } = req.body;

        if (!cartId) {
            return res.status(400).json({
                message: "Cart ID is required"
            });
        }

        const cart = await Cart.findOne({ cartId });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                message: "Cart is empty"
            });
        }

        const total = cart.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        const order = new Order({
            cartId,
            items: cart.items,
            total
        });

        await order.save();

        cart.items = [];
        await cart.save();

        res.json({
            message: "Order placed successfully",
            order
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to place order"
        });
    }
});

// Get Order History API
app.get("/api/orders/:cartId", async (req, res) => {
    try {
        const orders = await Order.find({
            cartId: req.params.cartId
        }).sort({ orderDate: -1 });

        res.json(orders);

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch orders"
        });
    }
});

// User Registration API
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password || password.length < 8) {
            return res.status(400).json({
                message: "Enter valid details. Password must be at least 8 characters."
            });
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already registered"
            });
        }

        const salt = crypto.randomBytes(16).toString("hex");

        const hashedPassword = crypto.scryptSync(
            password,
            salt,
            64
        ).toString("hex");

        const user = new User({
            name,
            email: email.toLowerCase().trim(),
            password: salt + ":" + hashedPassword
        });

        await user.save();

        res.status(201).json({
            message: "Registration successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Registration failed"
        });
    }
});


// User Login API
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const [salt, storedHash] = user.password.split(":");

        const loginHash = crypto.scryptSync(
            password,
            salt,
            64
        );

        const savedHash = Buffer.from(storedHash, "hex");

        if (
            savedHash.length !== loginHash.length ||
            !crypto.timingSafeEqual(savedHash, loginHash)
        ) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
);

res.json({
    message: "Login successful",
    token,
    user: {
        id: user._id,
        name: user.name,
        email: user.email
    }
});

    } catch (error) {
        res.status(500).json({
            message: "Login failed"
        });
    }
});

// User Profile API
app.get("/api/profile", authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(user);

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch profile"
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
