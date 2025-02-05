const express = require("express");
const createUser = require("../controller/registerCtrl");
const login = require("../controller/loginCtrl");

const router = express.Router();

router.post("/register", createUser);
router.post("/login", login);

module.exports = router;
