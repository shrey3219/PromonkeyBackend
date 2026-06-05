const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./src/config/db");

dotenv.config({ path: path.resolve(__dirname, ".env") });

connectDB();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});


app.set("io", io);

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// ─── Routes 
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
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use("/api/upload", require("./src/routes/uploadRoutes"));
app.use("/api/comments", require("./src/routes/commentRoutes"));

// ─── Socket.io 
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join_task", (taskId) => {
    socket.join(`task:${taskId}`);
  });
  socket.on("leave_task", (taskId) => {
    socket.leave(`task:${taskId}`);
  });

  socket.on("join_phase", (phaseId) => {
    socket.join(`phase:${phaseId}`);
  });
  socket.on("leave_phase", (phaseId) => {
    socket.leave(`phase:${phaseId}`);
  });

  socket.on("join_project", (projectId) => {
    socket.join(`project:${projectId}`);
  });
  socket.on("leave_project", (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 6969;

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
