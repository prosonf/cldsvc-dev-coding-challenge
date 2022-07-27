const express = require('express');
const createError = require('http-errors');
const orderMatchingService = require('../orderBookService');
const orderValidator = require('../orderValidator');

const router = express.Router();

// eslint-disable-next-line no-unused-vars,consistent-return
router.post('/order/submit', (req, res, next) => {
  const errors = orderValidator.validateNewOrder(req.body);

  if (errors.length) {
    return next(createError(400, { errors }));
  }
  res.send(orderMatchingService.orderMatching(req.body));
});

// eslint-disable-next-line no-unused-vars
router.get('/orderbook', (req, res, next) => {
  res.send(orderMatchingService.getAllOrderLists());
});

module.exports = router;
