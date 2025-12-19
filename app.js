// app.js - API completa con base de datos
const express = require("express");
const bcrypt = require('bcryptjs');
const db = require("./utils/database");
const { validarUsuario, validarProducto } = require("./utils/validation");
const authRoutes = require("./routes/auth");
const verifyToken = require("./middleware/authMiddleware");

const app = express();
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rutas de autenticación
app.use("/auth", authRoutes);

// RUTAS DE USUARIOS

// GET /usuarios - Listar usuarios
app.get("/usuarios", async (req, res) => {
  try {
    const { pagina = 1, limite = 10, activo } = req.query;

    let sql =
      "SELECT id, nombre, email, activo, fecha_registro FROM usuarios WHERE 1=1";
    const params = [];

    if (activo !== undefined) {
      sql += " AND activo = ?";
      params.push(activo === "true");
    }

    sql += " ORDER BY fecha_registro DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limite), (parseInt(pagina) - 1) * parseInt(limite));

    const usuarios = await db.query(sql, params);

    res.json({
      usuarios,
      pagina: parseInt(pagina),
      limite: parseInt(limite),
    });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /usuarios/:id - Obtener usuario específico
app.get("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const usuarios = await db.query(
      "SELECT id, nombre, email, activo, fecha_registro FROM usuarios WHERE id = ?",
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(usuarios[0]);
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /usuarios - Crear usuario
app.post("/usuarios", async (req, res) => {
  try {
    const errores = validarUsuario(req.body);
    if (errores.length > 0) {
      return res.status(400).json({
        error: "Datos inválidos",
        detalles: errores,
      });
    }

    const { nombre, email, password, edad } = req.body;

    // Hash del password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(hashedPassword);


    const resultado = await db.execute(
      "INSERT INTO usuarios (nombre, email, password, edad, activo, fecha_registro) VALUES (?,?,?,?,true, NOW())",
      [nombre, email, hashedPassword, edad || null]
    );

    res.status(201).json({
      mensaje: "Usuario creado exitosamente",
      usuario: {
        id: resultado.insertId,
        nombre,
        email,
        edad,
        activo: true,
      },
    });
  } catch (error) {
    console.error("Error creando usuario:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "El email ya está registrado" });
    }

    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// PUT /usuarios/:id - Actualizar usuario
app.put("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const errores = validarUsuario(req.body);

    if (errores.length > 0) {
      return res.status(400).json({
        error: "Datos inválidos",
        detalles: errores,
      });
    }

    const { nombre, email, edad } = req.body;

    const resultado = await db.execute(
      "UPDATE usuarios SET nombre = ?, email = ?, edad = ? WHERE id = ?",
      [nombre, email, edad || null, id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      mensaje: "Usuario actualizado exitosamente",
      usuario: { id: parseInt(id), nombre, email, edad },
    });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// DELETE /usuarios/:id - Eliminar usuario
app.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await db.execute("DELETE FROM usuarios WHERE id = ?", [
      id,
    ]);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ mensaje: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// RUTAS DE PRODUCTOS

// GET /productos - Listar productos con filtros
app.get("/productos", async (req, res) => {
  try {
    const {
      categoria,
      precio_min,
      precio_max,
      stock_min,
      pagina = 1,
      limite = 10,
    } = req.query;

    let sql = `
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.activo,
             c.nombre AS categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = true
    `;
    const params = [];

    if (categoria) {
      sql += " AND c.nombre = ?";
      params.push(categoria);
    }

    if (precio_min) {
      sql += " AND p.precio >= ?";
      params.push(parseFloat(precio_min));
    }

    if (precio_max) {
      sql += " AND p.precio <= ?";
      params.push(parseFloat(precio_max));
    }

    if (stock_min) {
      sql += " AND p.stock >= ?";
      params.push(parseInt(stock_min));
    }

    sql += " ORDER BY p.nombre LIMIT ? OFFSET ?";
    params.push(parseInt(limite), (parseInt(pagina) - 1) * parseInt(limite));

    const productos = await db.query(sql, params);

    res.json({
      productos,
      pagina: parseInt(pagina),
      limite: parseInt(limite),
    });
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// POST /productos - Crear producto
app.post("/productos", verifyToken, async (req, res) => {
  try {
    const errores = validarProducto(req.body);
    if (errores.length > 0) {
      return res.status(400).json({
        error: "Datos inválidos",
        detalles: errores,
      });
    }

    const { nombre, precio, descripcion, stock, categoria_id } = req.body;

    const resultado = await db.execute(
      "INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, activo, fecha_creacion) VALUES (?, ?, ?, ?, ?, true, NOW())",
      [nombre, descripcion || null, precio, stock || 0, categoria_id || null]
    );

    res.status(201).json({
      mensaje: "Producto creado exitosamente",
      producto: {
        id: resultado.insertId,
        nombre,
        descripcion,
        precio,
        stock: stock || 0,
        categoria_id,
      },
    });
  } catch (error) {
    console.error("Error creando producto:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// RUTA DE ESTADÍSTICAS
app.get("/estadisticas", verifyToken, async (req, res) => {
  try {
    // Estadísticas usando transacción para consistencia
    const resultado = await db.transaction(async (connection) => {
      const [totalUsuarios] = await connection.query(
        "SELECT COUNT(*) AS total FROM usuarios"
      );
      const [totalProductos] = await connection.query(
        "SELECT COUNT(*) AS total FROM productos WHERE activo = true"
      );
      const [productosStock] = await connection.query(
        "SELECT SUM(stock) AS total_stock, AVG(precio) AS precio_promedio FROM productos WHERE activo = true"
      );
      const [ventasMes] = await connection.query(`
        SELECT COUNT(*) AS pedidos_mes, SUM(total) AS ingresos_mes
        FROM pedidos
        WHERE fecha_pedido >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
      `);

      return {
        usuarios: {
          total: totalUsuarios[0].total,
        },
        productos: {
          total: totalProductos[0].total,
          stock_total: productosStock[0].total_stock || 0,
          precio_promedio: productosStock[0].precio_promedio || 0,
        },
        ventas: {
          pedidos_mes: ventasMes[0].pedidos_mes || 0,
          ingresos_mes: ventasMes[0].ingresos_mes || 0,
        },
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

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
