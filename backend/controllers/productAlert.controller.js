const supabase = require('../db/supabaseClient');
const { successResponse, errorResponse } = require('../utils/formatResponse');

// ─── Get all product thresholds (joined with product name/color) ──────────────
const getProductThresholds = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('product_alert_thresholds')
      .select(`
        id, product_id, low_threshold_litres, high_threshold_litres, is_active, created_at, updated_at,
        products ( id, name, color )
      `)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return successResponse(res, 200, 'Product thresholds fetched', data || []);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch product thresholds', error.message);
  }
};

// ─── Upsert (create or update) a product threshold ───────────────────────────
const upsertProductThreshold = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { low_threshold_litres, high_threshold_litres } = req.body;

    if (low_threshold_litres === undefined && high_threshold_litres === undefined) {
      return errorResponse(res, 400, 'At least one threshold (low or high) must be provided');
    }

    // Verify product exists
    const { data: product } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .single();

    if (!product) return errorResponse(res, 404, 'Product not found');

    const payload = {
      product_id: productId,
      updated_at: new Date().toISOString(),
    };
    if (low_threshold_litres !== undefined)  payload.low_threshold_litres  = low_threshold_litres  === '' ? null : Number(low_threshold_litres);
    if (high_threshold_litres !== undefined) payload.high_threshold_litres = high_threshold_litres === '' ? null : Number(high_threshold_litres);

    const { data, error } = await supabase
      .from('product_alert_thresholds')
      .upsert(payload, { onConflict: 'product_id' })
      .select()
      .single();

    if (error) throw error;
    return successResponse(res, 200, `Threshold saved for "${product.name}"`, data);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to save product threshold', error.message);
  }
};

// ─── Delete a product threshold ───────────────────────────────────────────────
const deleteProductThreshold = async (req, res) => {
  try {
    const { id: productId } = req.params;

    const { error } = await supabase
      .from('product_alert_thresholds')
      .delete()
      .eq('product_id', productId);

    if (error) throw error;
    return successResponse(res, 200, 'Product threshold removed');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete product threshold', error.message);
  }
};

module.exports = {
  getProductThresholds,
  upsertProductThreshold,
  deleteProductThreshold,
};
