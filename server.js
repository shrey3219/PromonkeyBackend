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
app.use("/api/permissions", require("./src/routes/permissionRoutes"));
app.use("/api/roles", require("./src/routes/roleRoutes"));
app.use("/api/employees", require("./src/routes/employeeRoutes"));
app.use("/api/clients", require("./src/routes/clientRoutes"));
app.use("/api/projects", require("./src/routes/projectRoutes"));
app.use("/api/phases", require("./src/routes/phaseRoutes"));
app.use("/api/tasks", require("./src/routes/taskRoutes"));
app.use("/api/time-entries", require("./src/routes/timeEntryRoutes"));
app.use("/api/stats", require("./src/routes/statsRoutes"));
 
const PORT = process.env.PORT || 6969;
 
app.listen(PORT, () => {

  console.log(`Server running on ${PORT}`);

});
 