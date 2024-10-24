// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  dateOfSale: Date,
  category: String,
  isSold: Boolean,
});

module.exports = mongoose.model('Transaction', transactionSchema);


// seed.js
const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Transaction = require('./models/Transaction');
dotenv.config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// API to fetch data from third-party URL and seed MongoDB
app.get('/api/seed', async (req, res) => {
  try {
    const { data } = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');

    // Clean the database before seeding
    await Transaction.deleteMany();

    // Insert the fetched data into MongoDB
    await Transaction.insertMany(data);

    res.json({ message: 'Database initialized with seed data!' });
  } catch (error) {
    console.error('Error fetching and seeding data:', error);
    res.status(500).json({ message: 'Error fetching and seeding data.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// routes/transactions.js
const express = require('express');
const Transaction = require('../models/Transaction');
const router = express.Router();

// List Transactions API
router.get('/', async (req, res) => {
  const { month, search = '', page = 1, perPage = 10 } = req.query;
  
  const regex = new RegExp(search, 'i'); // For case-insensitive search
  const startOfMonth = new Date(new Date().getFullYear(), month - 1, 1);
  const endOfMonth = new Date(new Date().getFullYear(), month, 0);
  
  const query = {
    dateOfSale: { $gte: startOfMonth, $lte: endOfMonth },
    $or: [
      { title: regex },
      { description: regex },
      { price: { $regex: regex } },
    ]
  };

  try {
    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));

    const total = await Transaction.countDocuments(query);
    
    res.json({ transactions, total, page, pages: Math.ceil(total / perPage) });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Error fetching transactions.' });
  }
});

module.exports = router;

// routes/statistics.js
const express = require('express');
const Transaction = require('../models/Transaction');
const router = express.Router();

// Statistics API
router.get('/', async (req, res) => {
  const { month } = req.query;
  const startOfMonth = new Date(new Date().getFullYear(), month - 1, 1);
  const endOfMonth = new Date(new Date().getFullYear(), month, 0);

  try {
    const totalSale = await Transaction.aggregate([
      { $match: { dateOfSale: { $gte: startOfMonth, $lte: endOfMonth }, isSold: true } },
      { $group: { _id: null, totalSaleAmount: { $sum: "$price" }, totalSoldItems: { $sum: 1 } } }
    ]);

    const notSoldCount = await Transaction.countDocuments({ dateOfSale: { $gte: startOfMonth, $lte: endOfMonth }, isSold: false });

    res.json({
      totalSaleAmount: totalSale[0]?.totalSaleAmount || 0,
      totalSoldItems: totalSale[0]?.totalSoldItems || 0,
      totalNotSoldItems: notSoldCount
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Error fetching statistics.' });
  }
});

module.exports = router;

// routes/barChart.js
const express = require('express');
const Transaction = require('../models/Transaction');
const router = express.Router();

// Bar Chart API
router.get('/', async (req, res) => {
  const { month } = req.query;
  const startOfMonth = new Date(new Date().getFullYear(), month - 1, 1);
  const endOfMonth = new Date(new Date().getFullYear(), month, 0);

  try {
    const chartData = await Transaction.aggregate([
      { $match: { dateOfSale: { $gte: startOfMonth, $lte: endOfMonth } } },
      {
        $bucket: {
          groupBy: "$price",
          boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
          default: "901-above",
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching bar chart data:', error);
    res.status(500).json({ message: 'Error fetching bar chart data.' });
  }
});

module.exports = router;

// routes/pieChart.js
const express = require('express');
const Transaction = require('../models/Transaction');
const router = express.Router();

// Pie Chart API
router.get('/', async (req, res) => {
  const { month } = req.query;
  const startOfMonth = new Date(new Date().getFullYear(), month - 1, 1);
  const endOfMonth = new Date(new Date().getFullYear(), month, 0);

  try {
    const pieChartData = await Transaction.aggregate([
      { $match: { dateOfSale: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.json(pieChartData);
  } catch (error) {
    console.error('Error fetching pie chart data:', error);
    res.status(500).json({ message: 'Error fetching pie chart data.' });
  }
});

module.exports = router;

// routes/combined.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Combined API
router.get('/', async (req, res) => {
  const { month } = req.query;

  try {
    const [transactions, statistics, barChartData, pieChartData] = await Promise.all([
      axios.get(`http://localhost:5000/api/transactions?month=${month}`),
      axios.get(`http://localhost:5000/api/statistics?month=${month}`),
      axios.get(`http://localhost:5000/api/bar-chart?month=${month}`),
      axios.get(`http://localhost:5000/api/pie-chart?month=${month}`)
    ]);

    res.json({
      transactions: transactions.data,
      statistics: statistics.data,
      barChartData: barChartData.data,
      pieChartData: pieChartData.data
    });
  } catch (error) {
    console.error('Error fetching combined data:', error);
    res.status(500).json({ message: 'Error fetching combined data.' });
  }
});

module.exports = router;
