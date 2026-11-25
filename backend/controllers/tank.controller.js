const supabase = require('../db/supabaseClient');
const { successResponse, errorResponse } = require('../utils/formatResponse');
const {
  getFillPercentage,
  getTankStatus,
  checkOverfill,
  cmToLitres,
  litresToCm,
  hasConeBottom,
  LINEAR_CYLINDER_SHAPES,
  CONE_BOTTOM_SHAPES,
  RECTANGULAR_SHAPES,
  HORIZONTAL_CYLINDER_SHAPES,
  SPHERICAL_SHAPES,
} = require('../utils/tankShapeHelper');
const { triggerOverfillAlert, checkProductAlerts } = require('../services/alertService');

// ─── Tank select fields (reusable) ────────────────────────────────────────────
const TANK_SELECT = `
  id, name, shape, capacity_litres, location,
  low_threshold, high_threshold, created_at,
  litres_per_cm, cone_capacity_litres,
  diameter_cm, length_cm, width_cm, cone_height_cm,
  products ( id, name, color, density_kg_per_litre ),
  tank_levels ( current_volume, fill_percentage, status, updated_at )
`;

const formatTank = (tank) => ({
  id: tank.id,
  name: tank.name,
  shape: tank.shape,
  capacity_litres: tank.capacity_litres,
  location: tank.location,
  low_threshold: tank.low_threshold,
  high_threshold: tank.high_threshold,
  litres_per_cm: tank.litres_per_cm,
  cone_capacity_litres: tank.cone_capacity_litres,
  diameter_cm: tank.diameter_cm,
  length_cm: tank.length_cm,
  width_cm: tank.width_cm,
  cone_height_cm: tank.cone_height_cm,
  product_id: tank.products?.id,
  product_name: tank.products?.name || 'N/A',
  product_color: tank.products?.color || '#22c55e',
  density: tank.products?.density_kg_per_litre || 0.90,
  current_volume: tank.tank_levels?.current_volume || 0,
  fill_percentage: tank.tank_levels?.fill_percentage || 0,
  status: tank.tank_levels?.status || 'empty',
  updated_at: tank.tank_levels?.updated_at || tank.created_at,
});

// ─── Get all tanks ────────────────────────────────────────────────────────────
const getAllTanks = async (req, res) => {
  try {
    const user = req.user;
    let query = supabase
      .from('tanks')
      .select(TANK_SELECT)
      .eq('is_active', true)
      .order('name');

    if (user.role !== 'admin') {
      const { data: access } = await supabase
        .from('employee_tank_access')
        .select('tank_id')
        .eq('employee_id', user.id);

      const tankIds = access?.map(a => a.tank_id) || [];
      if (tankIds.length === 0) return successResponse(res, 200, 'Tanks fetched', []);
      query = query.in('id', tankIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    return successResponse(res, 200, 'Tanks fetched successfully', data.map(formatTank));
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch tanks', error.message);
  }
};

// ─── Get single tank ──────────────────────────────────────────────────────────
const getTank = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: tank, error } = await supabase
      .from('tanks')
      .select(TANK_SELECT)
      .eq('id', id)
      .single();

    if (error || !tank) return errorResponse(res, 404, 'Tank not found');
    return successResponse(res, 200, 'Tank fetched successfully', formatTank(tank));
  } catch (error) {
    return errorResponse(res, 500, 'Failed to fetch tank', error.message);
  }
};

// ─── Create tank ──────────────────────────────────────────────────────────────
const createTank = async (req, res) => {
  try {
    const {
      name, shape, capacity_litres,
      location, product_id,
      low_threshold, high_threshold,
      litres_per_cm, cone_capacity_litres,
    } = req.body;

    if (!name || !shape || !capacity_litres) {
      return errorResponse(res, 400, 'Name, shape and capacity are required');
    }

    const { data: existing } = await supabase
      .from('tanks').select('id').eq('name', name.trim()).eq('is_active', true).single();
    if (existing) return errorResponse(res, 400, `Tank "${name}" already exists`);


    const { data: tank, error } = await supabase
      .from('tanks')
      .insert({
        name: name.trim(),
        shape,
        capacity_litres,
        location: location || null,
        product_id: product_id || null,
        low_threshold: low_threshold || 20,
        high_threshold: high_threshold || 90,
        litres_per_cm: litres_per_cm ? Number(litres_per_cm) : null,
        cone_capacity_litres: cone_capacity_litres ? Number(cone_capacity_litres) : null,
        diameter_cm: null,
        length_cm: null,
        width_cm: null,
        cone_height_cm: null,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('tank_levels').insert({
      tank_id: tank.id,
      current_volume: 0,
      fill_percentage: 0,
      status: 'empty',
      updated_by: req.user.id,
    });

    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'add_tank',
      description: `Created new tank: ${name}`,
      tank_id: tank.id,
      tank_name: name,
      new_value: { name, shape, capacity_litres, litres_per_cm: litres_per_cm ? Number(litres_per_cm) : null },
    });

    return successResponse(res, 201, 'Tank created successfully', tank);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to create tank', error.message);
  }
};

// ─── Update tank ──────────────────────────────────────────────────────────────
const updateTank = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, shape, capacity_litres, location, product_id,
      low_threshold, high_threshold,
      litres_per_cm, cone_capacity_litres,
    } = req.body;

    const { data: oldTank } = await supabase.from('tanks').select('*').eq('id', id).single();
    if (!oldTank) return errorResponse(res, 404, 'Tank not found');

    const newShape = shape || oldTank.shape;

    const { data: tank, error } = await supabase
      .from('tanks')
      .update({
        name: name?.trim() || oldTank.name,
        shape: newShape,
        capacity_litres: capacity_litres || oldTank.capacity_litres,
        location: location !== undefined ? location : oldTank.location,
        product_id: product_id !== undefined ? product_id : oldTank.product_id,
        low_threshold: low_threshold || oldTank.low_threshold,
        high_threshold: high_threshold || oldTank.high_threshold,
        litres_per_cm: litres_per_cm !== undefined ? (litres_per_cm ? Number(litres_per_cm) : null) : oldTank.litres_per_cm,
        cone_capacity_litres: cone_capacity_litres !== undefined ? (cone_capacity_litres ? Number(cone_capacity_litres) : null) : oldTank.cone_capacity_litres,
        diameter_cm: null,
        length_cm: null,
        width_cm: null,
        cone_height_cm: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'edit_tank',
      description: `Updated tank: ${oldTank.name}`,
      tank_id: id,
      tank_name: oldTank.name,
      old_value: oldTank,
      new_value: tank,
    });

    return successResponse(res, 200, 'Tank updated successfully', tank);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to update tank', error.message);
  }
};

// ─── Delete tank ──────────────────────────────────────────────────────────────
const deleteTank = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: tank } = await supabase.from('tanks').select('name').eq('id', id).single();
    if (!tank) return errorResponse(res, 404, 'Tank not found');

    await supabase.from('tanks').update({ is_active: false }).eq('id', id);
    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'delete_tank',
      description: `Deleted tank: ${tank.name}`,
      tank_id: id,
      tank_name: tank.name,
    });

    return successResponse(res, 200, 'Tank deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Failed to delete tank', error.message);
  }
};

// ─── Helper: resolve volume from request body ──────────────────────────────────
const resolveVolume = async (tank, dip_cm, volume) => {
  if (dip_cm !== undefined && dip_cm !== null) {
    const result = cmToLitres(
      tank.shape,
      Number(dip_cm),
      tank.litres_per_cm,
      tank.cone_capacity_litres,
      tank.capacity_litres
    );
    return { litres: result.litres, dipCm: Number(dip_cm), error: null };
  }
  if (volume !== undefined && volume !== null) {
    return { litres: Number(volume), dipCm: null, error: null };
  }
  return { litres: 0, dipCm: null, error: 'Either dip_cm or volume must be provided' };
};

// ─── Add stock ────────────────────────────────────────────────────────────────
const addStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { dip_cm, volume, notes } = req.body;

    // dip_cm is the NEW TOTAL dip reading — convert to absolute volume then take delta
    const { data: tank, error: tankError } = await supabase
      .from('tanks')
      .select(`
        id, name, shape, capacity_litres, low_threshold, high_threshold,
        litres_per_cm, cone_capacity_litres, product_id,
        diameter_cm, length_cm, width_cm, cone_height_cm,
        products ( name ),
        tank_levels ( current_volume, fill_percentage )
      `)
      .eq('id', id)
      .single();

    if (tankError || !tank) return errorResponse(res, 404, 'Tank not found');

    const currentVolume = tank.tank_levels?.current_volume || 0;
    let volumeToAdd;
    let inputDipCm = null;

    if (dip_cm !== undefined && dip_cm !== null) {
      if (!tank.litres_per_cm) {
        return errorResponse(res, 400, 'This tank has no CM conversion rate set. Please edit the tank to configure it.');
      }

      const result = cmToLitres(
        tank.shape,
        Number(dip_cm),
        tank.litres_per_cm,
        tank.cone_capacity_litres,
        tank.capacity_litres
      );
      volumeToAdd = result.litres - currentVolume;
      inputDipCm = Number(dip_cm);

      if (volumeToAdd <= 0) {
        return errorResponse(res, 400,
          `New dip reading ${dip_cm} cm = ${result.litres.toLocaleString()} L is ≤ current volume (${currentVolume.toLocaleString()} L). Use Remove Stock for a lower reading.`
        );
      }
    } else {
      volumeToAdd = Number(volume);
    }

    if (!volumeToAdd || volumeToAdd <= 0) return errorResponse(res, 400, 'Volume must be > 0');

    const overfillCheck = checkOverfill(currentVolume, volumeToAdd, tank.capacity_litres);
    if (overfillCheck.willOverfill) {
      await triggerOverfillAlert({
        tankId: id, tankName: tank.name,
        productName: tank.products?.name || 'N/A',
        attemptedVolume: volumeToAdd,
        maxCanAdd: overfillCheck.maxCanAdd,
        currentVolume, capacity: tank.capacity_litres,
        attemptedBy: req.user.username, triggeredBy: req.user.id,
      });
      return errorResponse(res, 400, `Overfill blocked! Max you can add is ${overfillCheck.maxCanAdd.toLocaleString()} L`);
    }

    const newVolume = currentVolume + volumeToAdd;
    const newPercentage = getFillPercentage(newVolume, tank.capacity_litres);
    const newStatus = getTankStatus(newPercentage, tank.low_threshold, tank.high_threshold);

    await supabase.from('tank_levels').update({
      current_volume: newVolume,
      fill_percentage: newPercentage,
      status: newStatus,
      updated_by: req.user.id,
      updated_at: new Date().toISOString(),
    }).eq('tank_id', id);

    await supabase.from('tank_history').insert({
      tank_id: id, tank_name: tank.name,
      product_name: tank.products?.name || 'N/A',
      action: 'add_stock',
      volume_before: currentVolume, volume_after: newVolume,
      volume_changed: volumeToAdd,
      fill_percentage_before: tank.tank_levels?.fill_percentage || 0,
      fill_percentage_after: newPercentage,
      recorded_by: req.user.id, recorded_by_name: req.user.username,
      notes: notes || (inputDipCm !== null ? `Dip reading: ${inputDipCm} cm` : null),
    });

    await supabase.from('activity_log').insert({
      user_id: req.user.id, username: req.user.username, role: req.user.role,
      action: 'add_stock',
      description: inputDipCm !== null
        ? `Added stock to ${tank.name} (dip: ${inputDipCm} cm → +${volumeToAdd.toLocaleString()} L)`
        : `Added ${volumeToAdd.toLocaleString()} L to ${tank.name}`,
      tank_id: id, tank_name: tank.name,
      old_value: { volume: currentVolume }, new_value: { volume: newVolume },
    });

    // ── Product-level alert only (tank-level alerts disabled) ─────────────────────
    if (tank.product_id) {
      await checkProductAlerts({
        productId: tank.product_id,
        productName: tank.products?.name || 'N/A',
        triggeredBy: req.user.id,
      });
    }

    return successResponse(res, 200, 'Stock added successfully', {
      tank_id: id, tank_name: tank.name,
      volume_added: volumeToAdd, dip_cm: inputDipCm,
      current_volume: newVolume, fill_percentage: newPercentage, status: newStatus,
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to add stock', error.message);
  }
};

// ─── Remove stock ─────────────────────────────────────────────────────────────
const removeStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { dip_cm, volume, notes } = req.body;

    const { data: tank, error: tankError } = await supabase
      .from('tanks')
      .select(`
        id, name, shape, capacity_litres, low_threshold, high_threshold,
        litres_per_cm, cone_capacity_litres, product_id,
        diameter_cm, length_cm, width_cm, cone_height_cm,
        products ( name ),
        tank_levels ( current_volume, fill_percentage )
      `)
      .eq('id', id)
      .single();

    if (tankError || !tank) return errorResponse(res, 404, 'Tank not found');

    const currentVolume = tank.tank_levels?.current_volume || 0;
    let volumeToRemove;
    let inputDipCm = null;

    if (dip_cm !== undefined && dip_cm !== null) {
      if (!tank.litres_per_cm) {
        return errorResponse(res, 400, 'This tank has no CM conversion rate set. Please edit the tank to configure it.');
      }

      const result = cmToLitres(
        tank.shape,
        Number(dip_cm),
        tank.litres_per_cm,
        tank.cone_capacity_litres,
        tank.capacity_litres
      );
      volumeToRemove = currentVolume - result.litres;
      inputDipCm = Number(dip_cm);

      if (volumeToRemove <= 0) {
        return errorResponse(res, 400,
          `New dip reading ${dip_cm} cm = ${result.litres.toLocaleString()} L is ≥ current volume. Use Add Stock for a higher reading.`
        );
      }
    } else {
      volumeToRemove = Number(volume);
    }

    if (!volumeToRemove || volumeToRemove <= 0) return errorResponse(res, 400, 'Volume must be > 0');
    if (volumeToRemove > currentVolume) {
      return errorResponse(res, 400,
        `Cannot remove ${volumeToRemove.toLocaleString()} L — only ${currentVolume.toLocaleString()} L available`
      );
    }

    const newVolume = currentVolume - volumeToRemove;
    const newPercentage = getFillPercentage(newVolume, tank.capacity_litres);
    const newStatus = getTankStatus(newPercentage, tank.low_threshold, tank.high_threshold);

    await supabase.from('tank_levels').update({
      current_volume: newVolume,
      fill_percentage: newPercentage,
      status: newStatus,
      updated_by: req.user.id,
      updated_at: new Date().toISOString(),
    }).eq('tank_id', id);

    await supabase.from('tank_history').insert({
      tank_id: id, tank_name: tank.name,
      product_name: tank.products?.name || 'N/A',
      action: 'remove_stock',
      volume_before: currentVolume, volume_after: newVolume,
      volume_changed: volumeToRemove,
      fill_percentage_before: tank.tank_levels?.fill_percentage || 0,
      fill_percentage_after: newPercentage,
      recorded_by: req.user.id, recorded_by_name: req.user.username,
      notes: notes || (inputDipCm !== null ? `Dip reading: ${inputDipCm} cm` : null),
    });

    await supabase.from('activity_log').insert({
      user_id: req.user.id, username: req.user.username, role: req.user.role,
      action: 'remove_stock',
      description: inputDipCm !== null
        ? `Removed stock from ${tank.name} (dip: ${inputDipCm} cm → -${volumeToRemove.toLocaleString()} L)`
        : `Removed ${volumeToRemove.toLocaleString()} L from ${tank.name}`,
      tank_id: id, tank_name: tank.name,
      old_value: { volume: currentVolume }, new_value: { volume: newVolume },
    });

    // ── Product-level alert only (tank-level alerts disabled) ─────────────────────
    if (tank.product_id) {
      await checkProductAlerts({
        productId: tank.product_id,
        productName: tank.products?.name || 'N/A',
        triggeredBy: req.user.id,
      });
    }

    return successResponse(res, 200, 'Stock removed successfully', {
      tank_id: id, tank_name: tank.name,
      volume_removed: volumeToRemove, dip_cm: inputDipCm,
      current_volume: newVolume, fill_percentage: newPercentage, status: newStatus,
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to remove stock', error.message);
  }
};

// ─── CM → Litres conversion endpoint ─────────────────────────────────────────
const convertCmToLitres = async (req, res) => {
  try {
    const { id } = req.params;
    const { dip_cm } = req.body;

    if (dip_cm === undefined || isNaN(dip_cm) || Number(dip_cm) < 0) {
      return errorResponse(res, 400, 'dip_cm must be a non-negative number');
    }

    const { data: tank, error } = await supabase
      .from('tanks')
      .select('shape, capacity_litres, litres_per_cm, cone_capacity_litres, diameter_cm, length_cm, width_cm, cone_height_cm')
      .eq('id', id)
      .single();

    if (error || !tank) return errorResponse(res, 404, 'Tank not found');

    if (!tank.litres_per_cm) {
      return errorResponse(res, 400, 'Tank has no CM conversion rate configured');
    }

    const result = cmToLitres(
      tank.shape,
      Number(dip_cm),
      tank.litres_per_cm,
      tank.cone_capacity_litres,
      tank.capacity_litres
    );

    return successResponse(res, 200, 'Conversion successful', {
      dip_cm: Number(dip_cm),
      litres: result.litres,
      fill_percentage: result.fillPercentage,
      capacity_litres: tank.capacity_litres,
      litres_per_cm: tank.litres_per_cm,
    });
  } catch (error) {
    return errorResponse(res, 500, 'Conversion failed', error.message);
  }
};

// ─── Copy tank ────────────────────────────────────────────────────────────────
const copyTank = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: src, error: srcError } = await supabase
      .from('tanks')
      .select('*')
      .eq('id', id)
      .single();

    if (srcError || !src) return errorResponse(res, 404, 'Tank not found');

    const newName = `${src.name} (Copy)`;

    const { data: tank, error } = await supabase
      .from('tanks')
      .insert({
        name: newName,
        shape: src.shape,
        capacity_litres: src.capacity_litres,
        location: src.location,
        product_id: src.product_id,
        low_threshold: src.low_threshold,
        high_threshold: src.high_threshold,
        litres_per_cm: src.litres_per_cm,
        cone_capacity_litres: src.cone_capacity_litres,
        diameter_cm: src.diameter_cm,
        length_cm: src.length_cm,
        width_cm: src.width_cm,
        cone_height_cm: src.cone_height_cm,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('tank_levels').insert({
      tank_id: tank.id,
      current_volume: 0,
      fill_percentage: 0,
      status: 'empty',
      updated_by: req.user.id,
    });

    await supabase.from('activity_log').insert({
      user_id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      action: 'add_tank',
      description: `Copied tank "${src.name}" → "${newName}"`,
      tank_id: tank.id,
      tank_name: newName,
      new_value: { copied_from: id, name: newName },
    });

    return successResponse(res, 201, 'Tank copied successfully', tank);
  } catch (error) {
    return errorResponse(res, 500, 'Failed to copy tank', error.message);
  }
};

module.exports = {
  getAllTanks,
  getTank,
  createTank,
  updateTank,
  deleteTank,
  addStock,
  removeStock,
  convertCmToLitres,
  copyTank,
};