// ═══════════════════════════════════════════════════════════════
// api/instagram/adminRoutes.js
// Endpoints del panel para consultar publicaciones reales de Instagram
// y administrar (CRUD) las dinámicas de comentarios -> DM.
// ═══════════════════════════════════════════════════════════════
const express = require('express');
const { auth, registrarCambio } = require('../admin/auth');
const { listarPublicacionesInstagram } = require('./posts');
const { almacenDinamicas, validarDinamica } = require('../../db/dinamicas');

const router = express.Router();

// GET /api/admin/instagram/posts — Publicaciones reales de la cuenta
router.get('/posts', auth(), async (req, res) => {
  const resultado = await listarPublicacionesInstagram({
    limit: req.query.limit,
    after: req.query.after || '',
    refresh: req.query.refresh === '1' || req.query.refresh === 'true',
  });
  if (!resultado.ok) {
    const status = resultado.codigo === 'FALTA_TOKEN' ? 503 : 502;
    return res.status(status).json({
      success: false,
      codigo: resultado.codigo,
      error: resultado.error,
      detalleMeta: resultado.detalleMeta || null,
    });
  }
  res.json({ success: true, ...resultado });
});

// GET /api/admin/instagram/dinamicas — Listar todas las dinámicas
router.get('/dinamicas', auth(), async (req, res) => {
  try {
    const alm = almacenDinamicas();
    const dinamicas = await alm.dinamicas.listar();
    res.json({ success: true, almacen: alm.tipo, dinamicas });
  } catch (err) {
    console.error('[IG DINAMICAS] listar:', err.message);
    res.status(500).json({ success: false, error: 'No se pudieron cargar las dinámicas.' });
  }
});

// POST /api/admin/instagram/dinamicas — Crear dinámica nueva
router.post('/dinamicas', auth(), async (req, res) => {
  try {
    const valid = validarDinamica(req.body);
    if (!valid.ok) return res.status(400).json({ success: false, error: valid.error });

    const alm = almacenDinamicas();
    const dinamica = await alm.dinamicas.crear(valid.valor);
    await registrarCambio(req.usuario, {
      tipo: 'instagram',
      seccion: 'Dinámicas IG',
      resumen: `Creó la dinámica «${dinamica.nombre}» (${dinamica.activa ? 'activa' : 'pausada'})`,
    });
    res.status(201).json({ success: true, almacen: alm.tipo, dinamica });
  } catch (err) {
    console.error('[IG DINAMICAS] crear:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo guardar la dinámica.' });
  }
});

// PUT /api/admin/instagram/dinamicas/:id — Editar dinámica existente
router.put('/dinamicas/:id', auth(), async (req, res) => {
  try {
    const valid = validarDinamica(req.body);
    if (!valid.ok) return res.status(400).json({ success: false, error: valid.error });

    const alm = almacenDinamicas();
    const existente = await alm.dinamicas.porId(req.params.id);
    if (!existente) return res.status(404).json({ success: false, error: 'No se encontró esa dinámica.' });

    const dinamica = await alm.dinamicas.actualizar(req.params.id, valid.valor);
    await registrarCambio(req.usuario, {
      tipo: 'instagram',
      seccion: 'Dinámicas IG',
      resumen: `Editó la dinámica «${dinamica.nombre}»`,
    });
    res.json({ success: true, almacen: alm.tipo, dinamica });
  } catch (err) {
    console.error('[IG DINAMICAS] editar:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo actualizar la dinámica.' });
  }
});

// PATCH /api/admin/instagram/dinamicas/:id/estado — Activar o pausar rápido
router.patch('/dinamicas/:id/estado', auth(), async (req, res) => {
  try {
    if (typeof req.body?.activa !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Debes indicar el estado (activa: true/false).' });
    }
    const alm = almacenDinamicas();
    const existente = await alm.dinamicas.porId(req.params.id);
    if (!existente) return res.status(404).json({ success: false, error: 'No se encontró esa dinámica.' });

    const dinamica = await alm.dinamicas.actualizar(req.params.id, { activa: req.body.activa });
    await registrarCambio(req.usuario, {
      tipo: 'instagram',
      seccion: 'Dinámicas IG',
      resumen: `${req.body.activa ? 'Activó' : 'Pausó'} la dinámica «${dinamica.nombre}»`,
    });
    res.json({ success: true, almacen: alm.tipo, dinamica });
  } catch (err) {
    console.error('[IG DINAMICAS] estado:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo cambiar el estado de la dinámica.' });
  }
});

// DELETE /api/admin/instagram/dinamicas/:id — Eliminar dinámica
router.delete('/dinamicas/:id', auth(), async (req, res) => {
  try {
    const alm = almacenDinamicas();
    const existente = await alm.dinamicas.porId(req.params.id);
    if (!existente) return res.status(404).json({ success: false, error: 'No se encontró esa dinámica.' });

    await alm.dinamicas.eliminar(req.params.id);
    await registrarCambio(req.usuario, {
      tipo: 'instagram',
      seccion: 'Dinámicas IG',
      resumen: `Eliminó la dinámica «${existente.nombre}»`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[IG DINAMICAS] eliminar:', err.message);
    res.status(500).json({ success: false, error: 'No se pudo eliminar la dinámica.' });
  }
});

module.exports = router;
