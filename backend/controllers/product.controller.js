const supabase = require('../db/supabaseClient');
const { successResponse, errorResponse } = require('../utils/formatResponse');

// Get all products
const getAllProducts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        density_kg_per_litre,
        description,
        color,
        created_at
      `)
      .order('name');

    if (error) throw error;

    // For each product get total volume and tank count
    const productsWithStats = await Promise.all(
      data.map(async (product) => {
        const { data: tanks } = await supabase
          .from('tanks')
          .select(`
            id,
            name,
            capacity_litres,
            tank_levels ( current_volume, fill_percentage, status )
          `)
          .eq('product_id', product.id)
          .eq('is_active', true);

        const totalCapacity = tanks?.reduce((sum, t) => sum + (t.capacity_litres || 0), 0) || 0;
        const totalVolume = tanks?.reduce((sum, t) => sum + (t.tank_levels?.current_volume || 0), 0) || 0;
        const tankCount = tanks?.length || 0;
        const overallFill = totalCapacity > 0
          ? Math.round((totalVolume / totalCapacity) * 100 * 10) / 10
          : 0;

        return {
          ...product,
          tank_count: tankCount,
          total_capacity: totalCapacity,
          total_volume: totalVolume,
          overall_fill: overallFill,
          tanks: tanks?.map(t => ({
            id: t.id,
            name: t.name,
            capacity_litres: t.capacity_litres,
            current_volume: t.tank_levels?.current_volume || 0,
            fill_percentage: t.tank_levels?.fill_percentage || 0,
            status: t.tank_levels?.status || 'empty'
          })) || []
        };
      })
    );

    return successResponse(res, 200, 'Products fetched successfully', productsWithStats);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch products', error.message);
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      return errorResponse(res, 404, 'Product not found');
    }

    return successResponse(res, 200, 'Product fetched successfully', product);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch product', error.message);
  }
};

// Create product
const createProduct = async (req, res) => {
  try {
    const { name, density_kg_per_litre, description, color } = req.body;

    if (!name) {
      return errorResponse(res, 400, 'Product name is required');
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existing) {
      return errorResponse(res, 400, `Product "${name}" already exists`);
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name: name.trim(),
        density_kg_per_litre: density_kg_per_litre || 0.90,
        description,
        color: color || '#22c55e'
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'add_product',
      description: `Created new product: ${name}`,
      new_value: { name, density_kg_per_litre, color }
    });

    return successResponse(res, 201, 'Product created successfully', product);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to create product', error.message);
  }
};

// Update product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, density_kg_per_litre, description, color } = req.body;

    const { data: oldProduct } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldProduct) {
      return errorResponse(res, 404, 'Product not found');
    }

    const { data: product, error } = await supabase
      .from('products')
      .update({
        name: name?.trim() || oldProduct.name,
        density_kg_per_litre: density_kg_per_litre || oldProduct.density_kg_per_litre,
        description: description || oldProduct.description,
        color: color || oldProduct.color
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'edit_product',
      description: `Updated product: ${oldProduct.name}`,
      old_value: oldProduct,
      new_value: product
    });

    return successResponse(res, 200, 'Product updated successfully', product);

  } catch (error) {
    return errorResponse(res, 500, 'Failed to update product', error.message);
  }
};

// Delete product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product } = await supabase
      .from('products')
      .select('name')
      .eq('id', id)
      .single();

    if (!product) {
      return errorResponse(res, 404, 'Product not found');
    }

    // Check if any active tanks use this product
    const { data: tanks } = await supabase
      .from('tanks')
      .select('id, name')
      .eq('product_id', id)
      .eq('is_active', true);

    if (tanks && tanks.length > 0) {
      return errorResponse(
        res, 400,
        `Cannot delete — ${tanks.length} active tank(s) use this product`
      );
    }

    await supabase
      .from('products')
      .delete()
      .eq('id', id);

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'delete_product',
      description: `Deleted product: ${product.name}`
    });

    return successResponse(res, 200, 'Product deleted successfully');

  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete product', error.message);
  }
};

module.exports = {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};