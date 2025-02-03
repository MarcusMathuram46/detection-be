const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../model/userModel");
const jwt = require("jsonwebtoken");

const { JWT_SECRET } = require("../config/config");

const login = async (req, res)=>{
    try{
        const {email, password} =req.body;
        const user = await User.findOne({email});
        if(user){
            const passCheck = await bcrypt.compare(password, user.passwordHash);
            if(!passCheck){
                return res.status(400).json({message: "Invalid password"})
            }
            let token = await jwt.sign(
                {
                    email,
                    id: user._id,
                },
                JWT_SECRET
            );
            res.status(200).send({ message: "Signin successful",token, user})
        }else{
            res.status(400).json({message: "User not found"})
        }
    }catch(e){
        console.error("Error in login: ", e);
        res.status(500).json({message: "Internal server error"})
    }
}

module.exports = login;