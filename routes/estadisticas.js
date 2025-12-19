// routes/estadisticas.js
const express = require("express");
const db = require("../utils/database");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
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

module.exports = router;
