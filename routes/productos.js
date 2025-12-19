// routes/productos.js
const express = require("express");
const db = require("../utils/database");
const { validarProducto } = require("../utils/validation");
const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// GET /productos - Listar productos con filtros
router.get("/", async (req, res) => {
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
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.activo, p.imagen_url,
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

// POST /productos - Crear producto (soporta subida de imagen)
router.post("/", verifyToken, upload.single("imagen"), async (req, res) => {
  try {
    const errores = validarProducto(req.body);
    if (errores.length > 0) {
      return res.status(400).json({
        error: "Datos inválidos",
        detalles: errores,
      });
    }

    const { nombre, precio, descripcion, stock, categoria_id } = req.body;
    let imagen_url = null;

    if (req.file) {
      imagen_url = `/uploads/${req.file.filename}`;
    }

    const resultado = await db.execute(
      "INSERT INTO productos (nombre, descripcion, precio, stock, categoria_id, imagen_url, activo, fecha_creacion) VALUES (?, ?, ?, ?, ?, ?, true, NOW())",
      [
        nombre,
        descripcion || null,
        precio,
        stock || 0,
        categoria_id || null,
        imagen_url,
      ]
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
        imagen_url,
      },
    });
  } catch (error) {
    console.error("Error creando producto:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
