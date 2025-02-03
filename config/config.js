require("dotenv").config();

const MONGODB_URL=process.env.MONGODB_URL;
const PORT=process.env.PORT;
const JWT_SECRET=process.env.JWT_SECRET;

module.exports={
    MONGODB_URL,
    PORT,
    JWT_SECRET,
};