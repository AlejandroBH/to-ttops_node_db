// routes/usuarios.js
const express = require("express");
const bcrypt = require('bcryptjs');
const db = require("../utils/database");
const { validarUsuario } = require("../utils/validation");

const router = express.Router();

// GET /usuarios - Listar usuarios
router.get("/", async (req, res) => {
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
router.get("/:id", async (req, res) => {
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
router.post("/", async (req, res) => {
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
router.put("/:id", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
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

module.exports = router;
