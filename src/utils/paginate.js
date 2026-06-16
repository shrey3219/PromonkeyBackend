/**
 * Parse pagination query params from request.
 * @param {object} query - req.query
 * @returns {{ page, limit, options }}
 */
const getPaginationOptions = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  return { page, limit };
};

/**
 * Build a standard paginated response envelope.
 * mongoose-paginate-v2 result → { data, pagination }
 */
const paginatedResponse = (result) => ({
  data: result.docs,
  pagination: {
    total:       result.totalDocs,
    page:        result.page,
    limit:       result.limit,
    totalPages:  result.totalPages,
    hasNextPage: result.hasNextPage,
    hasPrevPage: result.hasPrevPage,
    nextPage:    result.nextPage,
    prevPage:    result.prevPage,
  },
});

module.exports = { getPaginationOptions, paginatedResponse };
