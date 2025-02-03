const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");

// Create a new User

const createUser = async (req, res)=>{
    const {name, email, password} = req.body;
    try{
        const user = await User.findOne({email});
        if(!user){
            const passwordHash = await bcrypt.hash(password, 10);
            const newUser = new User({
                name,
                email,
                passwordHash,
            })
            await newUser.save();
            res.status(201).json({message: "User created successfully"});
        }else{
            res.status(400).json({message: "User already exists"});
        }
    }catch(e){
        res.status(500).json({message: "Error creating user", error: e.message});
    }
}

module.exports = createUser;