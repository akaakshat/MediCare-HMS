const PharmacyItem = require('../models/PharmacyItem');
const AuditLog = require('../models/AuditLog');
const mdmIntegration = require('../utils/mdmIntegration');

const normalizeItem = (item) => {
  const obj = item.toObject ? item.toObject() : { ...item };

  // Provide both legacy (quantity/unitPrice/expiryDate) and frontend-friendly fields
  return {
    ...obj,
    stock: obj.stock ?? obj.quantity ?? 0,
    price: obj.price ?? obj.unitPrice ?? 0,
    expiry: obj.expiry ?? obj.expiryDate ?? '',
    minStock: obj.minStock ?? 0,
    category: obj.category ?? '',
  };
};

exports.getItems = async (req, res) => {
  try {
    console.log('GET /api/pharmacy called');
    const items = await PharmacyItem.find().sort({ createdAt: -1 });
    res.json({ success: true, items: items.map(normalizeItem) });
  } catch (err) {
    console.error('Error fetching pharmacy items:', err);
    res.status(500).json({ success: false, message: 'Error fetching pharmacy items', error: err.message });
  }
};

exports.createItem = async (req, res) => {
  try {
    console.log('POST /api/pharmacy called');

    const payload = {
      ...req.body,
      quantity: req.body.stock ?? req.body.quantity ?? 0,
      unitPrice: req.body.price ?? req.body.unitPrice ?? 0,
      expiryDate: req.body.expiry ?? req.body.expiryDate ?? '',
      minStock: req.body.minStock ?? 0,
      category: req.body.category ?? '',
      sku: req.body.sku ?? '',
      medicineMasterId: req.body.medicineMasterId,
      medicineCategoryId: req.body.medicineCategoryId,
      dosageFormId: req.body.dosageFormId,
      unitId: req.body.unitId,
      vendorId: req.body.vendorId,
    };

    if (payload.medicineMasterId) {
      const valid = await mdmIntegration.validateMasterId('medicine_master', payload.medicineMasterId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid medicineMasterId provided' });
    }
    if (payload.medicineCategoryId) {
      const valid = await mdmIntegration.validateMasterId('medicine_category', payload.medicineCategoryId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid medicineCategoryId provided' });
    }
    if (payload.dosageFormId) {
      const valid = await mdmIntegration.validateMasterId('dosage_form', payload.dosageFormId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid dosageFormId provided' });
    }
    if (payload.unitId) {
      const valid = await mdmIntegration.validateMasterId('unit', payload.unitId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid unitId provided' });
    }
    if (payload.vendorId) {
      const valid = await mdmIntegration.validateMasterId('vendor', payload.vendorId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid vendorId provided' });
    }

    const item = new PharmacyItem({ ...payload, createdBy: req.user?.id });
    await item.save();

    await AuditLog.log(
      'CREATE',
      item._id,
      req.user,
      'MASTER_DATA',
      item._id,
      null,
      `Pharmacy item created: ${item.name || item.sku || item._id}`,
      req.ip,
      req.headers['user-agent'],
      { sku: item.sku, stock: item.stock }
    );

    res.status(201).json({ success: true, item: normalizeItem(item) });
  } catch (err) {
    console.error('Error creating pharmacy item:', err);
    res.status(500).json({ success: false, message: 'Error creating pharmacy item', error: err.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      quantity: req.body.stock ?? req.body.quantity,
      unitPrice: req.body.price ?? req.body.unitPrice,
      expiryDate: req.body.expiry ?? req.body.expiryDate,
      minStock: req.body.minStock,
      category: req.body.category,
      sku: req.body.sku,
      medicineMasterId: req.body.medicineMasterId,
      medicineCategoryId: req.body.medicineCategoryId,
      dosageFormId: req.body.dosageFormId,
      unitId: req.body.unitId,
      vendorId: req.body.vendorId,
    };

    if (payload.medicineMasterId) {
      const valid = await mdmIntegration.validateMasterId('medicine_master', payload.medicineMasterId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid medicineMasterId provided' });
    }
    if (payload.medicineCategoryId) {
      const valid = await mdmIntegration.validateMasterId('medicine_category', payload.medicineCategoryId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid medicineCategoryId provided' });
    }
    if (payload.dosageFormId) {
      const valid = await mdmIntegration.validateMasterId('dosage_form', payload.dosageFormId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid dosageFormId provided' });
    }
    if (payload.unitId) {
      const valid = await mdmIntegration.validateMasterId('unit', payload.unitId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid unitId provided' });
    }
    if (payload.vendorId) {
      const valid = await mdmIntegration.validateMasterId('vendor', payload.vendorId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid vendorId provided' });
    }

    const item = await PharmacyItem.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    await AuditLog.log(
      'UPDATE',
      item._id,
      req.user,
      'MASTER_DATA',
      item._id,
      null,
      `Pharmacy item updated: ${item.name || item.sku || item._id}`,
      req.ip,
      req.headers['user-agent'],
      { sku: item.sku, fields: Object.keys(payload) }
    );

    res.json({ success: true, item: normalizeItem(item) });
  } catch (err) {
    console.error('Error updating pharmacy item:', err);
    res.status(500).json({ success: false, message: 'Error updating pharmacy item', error: err.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const deleted = await PharmacyItem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Item not found' });

    await AuditLog.log(
      'DELETE',
      deleted._id,
      req.user,
      'MASTER_DATA',
      deleted._id,
      null,
      `Pharmacy item deleted: ${deleted.name || deleted.sku || deleted._id}`,
      req.ip,
      req.headers['user-agent'],
      { sku: deleted.sku }
    );

    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('Error deleting pharmacy item:', err);
    res.status(500).json({ success: false, message: 'Error deleting pharmacy item', error: err.message });
  }
};
