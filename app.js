const express = require("express");
const db = require("./utils/database");
const authRoutes = require("./routes/auth");
const usuariosRoutes = require("./routes/usuarios");
const productosRoutes = require("./routes/productos");
const estadisticasRoutes = require("./routes/estadisticas");

const app = express();
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rutas
app.use("/auth", authRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/productos", productosRoutes);
app.use("/estadisticas", estadisticasRoutes);

// Middleware 404
app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    metodo: req.method,
    ruta: req.url,
  });
});

// Middleware de error global
app.use((error, req, res, next) => {
  console.error("Error no manejado:", error);
  res.status(500).json({
    error: "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API REST con MySQL ejecutándose en http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Cerrando conexiones a base de datos...");
  await db.close();
  console.log("✅ Servidor cerrado correctamente");
  process.exit(0);
});
