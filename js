// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  isSold: Boolean,
  date: Date,
});

module.exports = mongoose.model('Transaction', transactionSchema);
// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const Transaction = require('./models/Transaction');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Get Transactions for a specific month
app.get('/api/transactions', async (req, res) => {
  const { month, search, page = 1 } = req.query;
  const perPage = 10;
  const regex = new RegExp(search, 'i');
  
  const startOfMonth = new Date(new Date().getFullYear(), month, 1);
  const endOfMonth = new Date(new Date().getFullYear(), parseInt(month) + 1, 0);

  const transactions = await Transaction.find({
    date: { $gte: startOfMonth, $lte: endOfMonth },
    $or: [
      { title: regex },
      { description: regex },
      { price: regex }
    ]
  })
  .skip((page - 1) * perPage)
  .limit(perPage);

  const total = await Transaction.countDocuments({
    date: { $gte: startOfMonth, $lte: endOfMonth },
    $or: [
      { title: regex },
      { description: regex },
      { price: regex }
    ]
  });

  res.json({ transactions, total, page, pages: Math.ceil(total / perPage) });
});

// Get Statistics
app.get('/api/statistics', async (req, res) => {
  const { month } = req.query;
  const startOfMonth = new Date(new Date().getFullYear(), month, 1);
  const endOfMonth = new Date(new Date().getFullYear(), parseInt(month) + 1, 0);

  const totalSale = await Transaction.aggregate([
    { $match: { date: { $gte: startOfMonth, $lte: endOfMonth }, isSold: true } },
    { $group: { _id: null, totalSale: { $sum: "$price" }, totalItems: { $sum: 1 } } }
  ]);

  const notSold = await Transaction.countDocuments({ date: { $gte: startOfMonth, $lte: endOfMonth }, isSold: false });

  res.json({ totalSale: totalSale[0]?.totalSale || 0, totalItems: totalSale[0]?.totalItems || 0, notSold });
});

// Get Bar Chart Data
app.get('/api/chart-data', async (req, res) => {
  const { month } = req.query;
  const startOfMonth = new Date(new Date().getFullYear(), month, 1);
  const endOfMonth = new Date(new Date().getFullYear(), parseInt(month) + 1, 0);

  const chartData = await Transaction.aggregate([
    { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
    {
      $bucket: {
        groupBy: "$price",
        boundaries: [0, 100, 200, 300, 400, 500],
        default: "500+",
        output: { count: { $sum: 1 } }
      }
    }
  ]);

  res.json(chartData);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

