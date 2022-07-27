const express = require('express');
const orderMatchingService = require('../orderBookService');

const router = express.Router();

// eslint-disable-next-line no-unused-vars
router.post('/order/submit', (req, res, next) => {
  res.send(orderMatchingService.orderMatching(req.body));

  /*
    TODO
    - If the new order is a buy, then match with the other sell orders
    - If the new order is a sell, then match with the other buy orders

    Response format:
    {
      'id': '3f8ecd64-f37e-11eb-9a03-0242ac130003'
      'amount': ...,
      'price': ...,
      'status' 'FILLED' or 'PARTIALLY_FILLED' or 'REJECTED' or 'PENDING'
    }
  */
});

// eslint-disable-next-line no-unused-vars
router.get('/orderbook', (req, res, next) => {
  res.send(orderMatchingService.getAllOrderLists());
});

module.exports = router;
