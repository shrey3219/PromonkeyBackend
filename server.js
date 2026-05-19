const express = require("express");

const dotenv = require("dotenv");
const path = require("path");

const cors = require("cors");

const cookieParser = require("cookie-parser");
 
const connectDB = require("./src/config/db");
 
dotenv.config({ path: path.resolve(__dirname, ".env") });
 
connectDB();
 
const app = express();
 
app.use(cors());
app.use(express.json());

app.use(cookieParser());
 
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/roles", require("./src/routes/roleRoutes"));
app.use("/api/employees", require("./src/routes/employeeRoutes"));
 
const PORT = process.env.PORT || 6969;
 
app.listen(PORT, () => {

  console.log(`Server running on ${PORT}`);

});
 