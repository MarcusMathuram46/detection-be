const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");

// Create a new User
const createUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } }); // Sequelize query
        
        if (!user) {
            const passwordHash = await bcrypt.hash(password, 10);
            const newUser = await User.create({
                name,
                email,
                passwordHash,
            });

            res.status(201).json({ message: "User created successfully", user: newUser });
        } else {
            res.status(400).json({ message: "User already exists" });
        }
    } catch (e) {
        res.status(500).json({ message: "Error creating user", error: e.message });
    }
};

module.exports = createUser;
