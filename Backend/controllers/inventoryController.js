const PharmacyItem = require('../models/PharmacyItem');
const Sale = require('../models/Sale');
const mongoose = require('mongoose');

const parseDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

exports.getInventorySummary = async (req, res) => {
  try {
    const today = new Date();
    const next30 = new Date();
    next30.setDate(today.getDate() + 30);

    const [summary, expiryAlerts, lowStockCount, topMovers, salesTrend] = await Promise.all([
      PharmacyItem.aggregate([
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalStock: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
            lowStock: {
              $sum: {
                $cond: [{ $lt: ['$quantity', '$minStock'] }, 1, 0]
              }
            },
            criticalStock: {
              $sum: {
                $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
              }
            }
          }
        }
      ]),
      PharmacyItem.find({ expiryDate: { $lte: next30, $gte: today } })
        .sort({ expiryDate: 1 })
        .limit(10)
        .lean(),
      PharmacyItem.countDocuments({ $expr: { $lt: ['$quantity', '$minStock'] } }),
      Sale.aggregate([
        { $match: { date: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30) } } },
        { $group: { _id: '$medicineId', totalSold: { $sum: '$quantity' } } },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'pharmacyitems',
            localField: '_id',
            foreignField: '_id',
            as: 'medicine'
          }
        },
        { $unwind: '$medicine' },
        {
          $project: {
            medicineId: '$_id',
            name: '$medicine.name',
            category: '$medicine.category',
            totalSold: 1,
            currentStock: '$medicine.quantity'
          }
        }
      ]),
      Sale.aggregate([
        {
          $match: {
            date: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30) }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date'
              }
            },
            totalSold: { $sum: '$quantity' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const summaryData = summary[0] || {
      totalItems: 0,
      totalStock: 0,
      totalValue: 0,
      lowStock: 0,
      criticalStock: 0
    };

    res.json({
      success: true,
      summary: {
        totalItems: summaryData.totalItems,
        totalStock: summaryData.totalStock,
        totalValue: summaryData.totalValue,
        lowStock: summaryData.lowStock,
        criticalStock: summaryData.criticalStock
      },
      expiryAlerts: expiryAlerts.map((item) => ({
        _id: item._id,
        name: item.name,
        stock: item.stock,
        expiryDate: item.expiryDate,
        status: item.stock === 0 ? 'Out of Stock' : item.stock < item.minStock ? 'Low Stock' : 'At Risk'
      })),
      topMovers,
      salesTrend
    });
  } catch (err) {
    console.error('Error fetching inventory summary:', err);
    res.status(500).json({ success: false, message: 'Error fetching inventory summary', error: err.message });
  }
};

exports.recordSale = async (req, res) => {
  try {
    const { medicineId, quantity, billId, department, date } = req.body;

    if (!medicineId || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'medicineId and positive quantity are required' });
    }

    const saleDate = date ? parseDate(date) : new Date();
    if (date && !saleDate) {
      return res.status(400).json({ success: false, message: 'Invalid sale date' });
    }

    const item = await PharmacyItem.findById(medicineId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Pharmacy item not found' });
    }

    item.quantity = Math.max(0, item.quantity - quantity);
    await item.save();

    const sale = await Sale.create({
      medicineId,
      quantity,
      billId: billId || null,
      soldBy: req.user?.id,
      department: department || item.department || '',
      date: saleDate
    });

    res.status(201).json({ success: true, sale });
  } catch (err) {
    console.error('Error recording sale:', err);
    res.status(500).json({ success: false, message: 'Error recording sale', error: err.message });
  }
};

exports.getSales = async (req, res) => {
  try {
    const { startDate, endDate, medicineId, department } = req.query;
    const query = {};

    if (startDate) {
      const parsed = parseDate(startDate);
      if (!parsed) return res.status(400).json({ success: false, message: 'Invalid startDate' });
      query.date = { ...query.date, $gte: parsed };
    }

    if (endDate) {
      const parsed = parseDate(endDate);
      if (!parsed) return res.status(400).json({ success: false, message: 'Invalid endDate' });
      query.date = { ...query.date, $lte: parsed };
    }

    if (medicineId) {
      if (!mongoose.Types.ObjectId.isValid(String(medicineId))) {
        return res.status(400).json({ success: false, message: 'Invalid medicineId' });
      }
      query.medicineId = medicineId;
    }

    if (department) {
      query.department = department;
    }

    const sales = await Sale.find(query)
      .sort({ date: -1 })
      .limit(200)
      .populate('medicineId', 'name category sku')
      .populate('soldBy', 'name email')
      .lean();

    res.json({ success: true, sales });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ success: false, message: 'Error fetching sales', error: err.message });
  }
};
