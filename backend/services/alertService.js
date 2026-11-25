const supabase = require('../db/supabaseClient');
const {
  sendLowStockAlert,
  sendTankFullAlert,
  sendOverfillAlert,
  sendProductLowStockAlert,
  sendProductAlertByVolume,
} = require('./emailService');

// ─── Check global alert toggle ────────────────────────────────────────────────
const areEmailAlertsEnabled = async () => {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'email_alerts_enabled')
      .single();
    return data?.value !== 'false';
  } catch {
    return true; // default ON if table missing
  }
};

// ─── Get active recipients ────────────────────────────────────────────────────
const getAlertRecipients = async () => {
  const { data, error } = await supabase
    .from('alert_recipients')
    .select('email, full_name, alert_types')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Failed to get alert recipients:', error.message);
    return [];
  }
  return data || [];
};

// ─── Save alert record ────────────────────────────────────────────────────────
const saveAlert = async ({ tankId, alertType, message, fillPercentage, currentVolume, capacity, triggeredBy }) => {
  const { data, error } = await supabase
    .from('alerts')
    .insert({
      tank_id: tankId,
      alert_type: alertType,
      message,
      fill_percentage: fillPercentage,
      current_volume: currentVolume,
      capacity,
      triggered_by: triggeredBy,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to save alert:', error.message);
    return null;
  }
  return data;
};

const markEmailSent = async (alertId) => {
  await supabase
    .from('alerts')
    .update({ email_sent: true, email_sent_at: new Date().toISOString() })
    .eq('id', alertId);
};

// ─── Get all tanks for a product (for grouped product alert) ─────────────────
const getProductTanks = async (productName) => {
  const { data } = await supabase
    .from('tanks')
    .select(`
      id, name, capacity_litres, low_threshold, high_threshold,
      tank_levels ( current_volume, fill_percentage, status )
    `)
    .eq('is_active', true)
    .filter('products.name', 'eq', productName);

  // Fallback: join via product name through products table
  const { data: tanks } = await supabase
    .from('tanks')
    .select(`
      id, name, capacity_litres, low_threshold, high_threshold,
      products!inner ( name ),
      tank_levels ( current_volume, fill_percentage, status )
    `)
    .eq('is_active', true)
    .eq('products.name', productName);

  return tanks || [];
};

// ─── Main alert check (called after every stock change) ──────────────────────
const checkAndTriggerAlerts = async ({
  tankId,
  tankName,
  productName,
  fillPercentage,
  currentVolume,
  capacity,
  lowThreshold,
  highThreshold,
  triggeredBy,
}) => {
  try {
    // Check global toggle first
    const alertsEnabled = await areEmailAlertsEnabled();
    if (!alertsEnabled) {
      console.log('ℹ️ Email alerts are disabled globally');
      return;
    }

    const recipients = await getAlertRecipients();
    if (recipients.length === 0) {
      console.log('⚠️ No alert recipients configured');
      return;
    }

    // ── Low stock ──────────────────────────────────────────────────────────
    if (fillPercentage <= lowThreshold && fillPercentage > 0) {
      const alert = await saveAlert({
        tankId,
        alertType: 'low_stock',
        message: `Tank ${tankName} is at ${fillPercentage}% — low stock warning`,
        fillPercentage,
        currentVolume,
        capacity,
        triggeredBy,
      });

      // Grouped product-level email: show ALL tanks for this product
      const lowStockRecipients = recipients
        .filter(r => r.alert_types?.includes('low_stock'))
        .map(r => r.email)
        .join(', ');

      if (lowStockRecipients) {
        // Try to get all sibling tanks for product summary
        let siblingTanks = [];
        try {
          const { data } = await supabase
            .from('tanks')
            .select(`
              id, name, capacity_litres,
              products!inner ( name ),
              tank_levels ( current_volume, fill_percentage, status )
            `)
            .eq('is_active', true)
            .eq('products.name', productName);
          siblingTanks = (data || []).map(t => ({
            name: t.name,
            current_volume: t.tank_levels?.current_volume || 0,
            fill_percentage: t.tank_levels?.fill_percentage || 0,
            capacity_litres: t.capacity_litres,
            status: t.tank_levels?.status || 'empty',
          }));
        } catch (_) {}

        const totalVol = siblingTanks.reduce((s, t) => s + t.current_volume, 0);
        const totalCap = siblingTanks.reduce((s, t) => s + t.capacity_litres, 0);

        let emailResult;
        if (siblingTanks.length > 1) {
          // Product-level grouped alert
          emailResult = await sendProductLowStockAlert({
            to: lowStockRecipients,
            productName,
            triggeredTankName: tankName,
            triggeredFill: fillPercentage,
            allTanks: siblingTanks,
            totalVolume: totalVol,
            totalCapacity: totalCap,
          });
        } else {
          // Single tank — use regular alert
          emailResult = await sendLowStockAlert({
            to: lowStockRecipients,
            tankName,
            fillPercentage,
            currentVolume,
            capacity,
            productName,
          });
        }

        if (emailResult?.success && alert) {
          await markEmailSent(alert.id);
        }
      }
    }

    // ── High stock / Tank full ─────────────────────────────────────────────
    if (fillPercentage >= highThreshold) {
      const alertType = fillPercentage >= 100 ? 'tank_full' : 'high_stock';
      const message = fillPercentage >= 100
        ? `Tank ${tankName} is completely full!`
        : `Tank ${tankName} is at ${fillPercentage}% — approaching full capacity`;

      const alert = await saveAlert({
        tankId,
        alertType,
        message,
        fillPercentage,
        currentVolume,
        capacity,
        triggeredBy,
      });

      const fullRecipients = recipients
        .filter(r => r.alert_types?.includes('high_stock') || r.alert_types?.includes('tank_full'))
        .map(r => r.email)
        .join(', ');

      if (fullRecipients) {
        const emailResult = await sendTankFullAlert({
          to: fullRecipients,
          tankName,
          fillPercentage,
          currentVolume,
          capacity,
          productName,
        });

        if (emailResult?.success && alert) {
          await markEmailSent(alert.id);
        }
      }
    }

  } catch (error) {
    console.error('❌ Alert check failed:', error.message);
  }
};

// ─── Overfill blocked alert ───────────────────────────────────────────────────
const triggerOverfillAlert = async ({
  tankId, tankName, productName,
  attemptedVolume, maxCanAdd,
  currentVolume, capacity,
  attemptedBy, triggeredBy,
}) => {
  try {
    const alertsEnabled = await areEmailAlertsEnabled();
    if (!alertsEnabled) return;

    const alert = await saveAlert({
      tankId,
      alertType: 'overfill_attempt',
      message: `Overfill attempt blocked on tank ${tankName} by ${attemptedBy}`,
      fillPercentage: (currentVolume / capacity) * 100,
      currentVolume,
      capacity,
      triggeredBy,
    });

    const recipients = await getAlertRecipients();
    const overfillRecipients = recipients
      .filter(r => r.alert_types?.includes('overfill_attempt'))
      .map(r => r.email)
      .join(', ');

    if (overfillRecipients) {
      const emailResult = await sendOverfillAlert({
        to: overfillRecipients,
        tankName,
        attemptedVolume,
        maxCanAdd,
        currentVolume,
        capacity,
        productName,
        attemptedBy,
      });

      if (emailResult?.success && alert) {
        await markEmailSent(alert.id);
      }
    }
  } catch (error) {
    console.error('❌ Overfill alert failed:', error.message);
  }
};

// ─── Global alert toggle ──────────────────────────────────────────────────────
const setEmailAlertsEnabled = async (enabled) => {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key: 'email_alerts_enabled', value: enabled ? 'true' : 'false', updated_at: new Date().toISOString() });
  return !error;
};

const getEmailAlertsEnabled = async () => areEmailAlertsEnabled();

// ─── Misc ─────────────────────────────────────────────────────────────────────
const getUnreadAlertsCount = async () => {
  const { count, error } = await supabase
    .from('alerts')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  if (error) return 0;
  return count || 0;
};

const markAllAlertsRead = async () => {
  const { error } = await supabase.from('alerts').update({ is_read: true }).eq('is_read', false);
  return !error;
};

// ─── Check product-level alert thresholds ────────────────────────────────────────
const checkProductAlerts = async ({ productId, productName, triggeredBy }) => {
  try {
    const alertsEnabled = await areEmailAlertsEnabled();
    if (!alertsEnabled) return;

    // Fetch threshold config
    const { data: threshold } = await supabase
      .from('product_alert_thresholds')
      .select('low_threshold_litres, high_threshold_litres, is_active')
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    if (!threshold) return; // no threshold configured for this product

    // Sum current_volume across all active tanks for this product
    const { data: tanks } = await supabase
      .from('tanks')
      .select(`
        id, name, capacity_litres,
        tank_levels ( current_volume, fill_percentage, status )
      `)
      .eq('product_id', productId)
      .eq('is_active', true);

    if (!tanks || tanks.length === 0) return;

    const allTanks = tanks.map(t => ({
      name: t.name,
      current_volume: t.tank_levels?.current_volume || 0,
      fill_percentage: t.tank_levels?.fill_percentage || 0,
      capacity_litres: t.capacity_litres,
      status: t.tank_levels?.status || 'empty',
    }));

    const totalVolume   = allTanks.reduce((s, t) => s + t.current_volume,   0);
    const totalCapacity = allTanks.reduce((s, t) => s + t.capacity_litres, 0);

    const recipients = await getAlertRecipients();
    if (recipients.length === 0) return;

    const emailList = recipients.map(r => r.email).join(', ');

    // ── Low product volume ─────────────────────────────────────────────
    if (threshold.low_threshold_litres !== null &&
        totalVolume <= threshold.low_threshold_litres) {

      const alert = await saveAlert({
        tankId: null,
        alertType: 'low_stock',
        message: `Product "${productName}" total stock is critically low: ${Math.round(totalVolume).toLocaleString()} L across ${allTanks.length} tank(s) (threshold: ${threshold.low_threshold_litres.toLocaleString()} L)`,
        fillPercentage: totalCapacity > 0 ? Math.round((totalVolume / totalCapacity) * 100) : 0,
        currentVolume: totalVolume,
        capacity: totalCapacity,
        triggeredBy,
      });

      const lowRecipients = recipients.filter(r => r.alert_types?.includes('low_stock')).map(r => r.email).join(', ');
      if (lowRecipients) {
        const emailResult = await sendProductAlertByVolume({
          to: lowRecipients,
          productName,
          alertType: 'low',
          totalVolume,
          totalCapacity,
          threshold: threshold.low_threshold_litres,
          allTanks,
        });
        if (emailResult?.success && alert) await markEmailSent(alert.id);
      }
    }

    // ── High product volume ───────────────────────────────────────────
    if (threshold.high_threshold_litres !== null &&
        totalVolume >= threshold.high_threshold_litres) {

      const alert = await saveAlert({
        tankId: null,
        alertType: 'high_stock',
        message: `Product "${productName}" total stock is above limit: ${Math.round(totalVolume).toLocaleString()} L across ${allTanks.length} tank(s) (threshold: ${threshold.high_threshold_litres.toLocaleString()} L)`,
        fillPercentage: totalCapacity > 0 ? Math.round((totalVolume / totalCapacity) * 100) : 0,
        currentVolume: totalVolume,
        capacity: totalCapacity,
        triggeredBy,
      });

      const highRecipients = recipients.filter(r => r.alert_types?.includes('high_stock') || r.alert_types?.includes('tank_full')).map(r => r.email).join(', ');
      if (highRecipients) {
        const emailResult = await sendProductAlertByVolume({
          to: highRecipients,
          productName,
          alertType: 'high',
          totalVolume,
          totalCapacity,
          threshold: threshold.high_threshold_litres,
          allTanks,
        });
        if (emailResult?.success && alert) await markEmailSent(alert.id);
      }
    }
  } catch (error) {
    console.error('❌ Product alert check failed:', error.message);
  }
};

module.exports = {
  checkAndTriggerAlerts,
  triggerOverfillAlert,
  checkProductAlerts,
  getUnreadAlertsCount,
  markAllAlertsRead,
  saveAlert,
  areEmailAlertsEnabled,
  setEmailAlertsEnabled,
  getEmailAlertsEnabled,
};