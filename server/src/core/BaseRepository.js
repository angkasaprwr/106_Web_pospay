/**
 * Generic repository implementing the Repository Pattern over a Prisma model.
 * Feature repositories extend this and add domain-specific queries.
 */
class BaseRepository {
  /**
   * @param {import('@prisma/client').PrismaClient} prisma
   * @param {string} model - Prisma model delegate name (e.g. "student")
   */
  constructor(prisma, model) {
    this.prisma = prisma;
    this.model = model;
  }

  get delegate() {
    return this.prisma[this.model];
  }

  findById(id, options = {}) {
    return this.delegate.findUnique({ where: { id }, ...options });
  }

  findOne(where, options = {}) {
    return this.delegate.findFirst({ where, ...options });
  }

  findMany(args = {}) {
    return this.delegate.findMany(args);
  }

  count(where = {}) {
    return this.delegate.count({ where });
  }

  create(data, options = {}) {
    return this.delegate.create({ data, ...options });
  }

  update(id, data, options = {}) {
    return this.delegate.update({ where: { id }, data, ...options });
  }

  delete(id) {
    return this.delegate.delete({ where: { id } });
  }

  async paginate({ where = {}, page = 1, limit = 10, orderBy, include, select } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    // Izinkan hingga 1000 agar Status Tagihan / daftar tidak "menghilangkan" baris Bill di PostgreSQL
    const safeLimit = Math.min(1000, Math.max(1, parseInt(limit, 10) || 10));
    const [items, total] = await Promise.all([
      this.delegate.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: orderBy || { createdAt: 'desc' },
        ...(include ? { include } : {}),
        ...(select ? { select } : {}),
      }),
      this.delegate.count({ where }),
    ]);
    return { items, total, page: safePage, limit: safeLimit };
  }
}

module.exports = { BaseRepository };
