/**
 * Consistent success response envelope.
 */
function ok(res, data = null, message = 'OK', meta = undefined) {
  const payload = { success: true, message, data };
  if (meta) payload.meta = meta;
  return res.status(200).json(payload);
}

function created(res, data = null, message = 'Berhasil dibuat') {
  return res.status(201).json({ success: true, message, data });
}

function paginated(res, items, { page, limit, total }, message = 'OK') {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

module.exports = { ok, created, paginated };
