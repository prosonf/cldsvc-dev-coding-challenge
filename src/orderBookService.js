const repository = require('./orderBookRepository');

const service = {};

const TYPE_FILLED = 'FILLED'; // order matched entirely
const TYPE_PARTIALLY_FILLED = 'PARTIALLY_FILLED'; // order matched partially and is pending in orderbook
// eslint-disable-next-line no-unused-vars
const TYPE_REJECTED = 'REJECTED'; // order failed to match
const TYPE_PENDING = 'PENDING'; // order did not match and is pending in orderbook

function getOrderStatus(initialOrder, orderAfterMatching) {
  if (orderAfterMatching.amount === 0) {
    return TYPE_FILLED;
  }
  if (orderAfterMatching.amount === initialOrder.amount) {
    return TYPE_PENDING;
  }
  return TYPE_PARTIALLY_FILLED;
}
const askOperations = {
  lookForMatches: (order) => repository.findBidsGreaterOrEqual(order.price),
  match: (newOrder, ordersMatched) => {
    const ask = { ...newOrder };
    ordersMatched
      .sort((a, b) => a.price - b.price);
    for (let i = 0; i < ordersMatched.length && ask.amount !== 0; i += 1) {
      const bid = ordersMatched[i];
      const absoluteAskAmount = Math.abs(ask.amount);
      const amountToExchange = absoluteAskAmount < bid.amount ? absoluteAskAmount : bid.amount;
      ask.amount += amountToExchange;
      bid.amount -= amountToExchange;
    }
    const status = getOrderStatus(newOrder, ask);
    return { newOrder: { ...ask, status }, ordersModified: ordersMatched };
  },
  save: (newOrder, ordersModified) => {
    const id = newOrder.amount !== 0 ? repository.createAsk(newOrder) : repository.createId();
    ordersModified
      .filter((order) => order.amount === 0)
      .forEach((order) => repository.deleteBid(order));
    return {
      orderSaved: {
        ...newOrder,
        id,
      },
      ordersModified,
    };
  },
};

const bidOperations = {
  lookForMatches: (order) => repository.findAsksLowerOrEqual(order.price),
  match: (newOrder, ordersMatched) => {
    const bid = { ...newOrder };
    ordersMatched
      .sort((a, b) => a.price - b.price);
    for (let i = 0; i < ordersMatched.length && bid.amount > 0; i += 1) {
      const ask = ordersMatched[i];
      const absoluteAskAmount = Math.abs(ask.amount);
      const amountToExchange = absoluteAskAmount < bid.amount ? absoluteAskAmount : bid.amount;
      bid.amount -= amountToExchange;
      ask.amount += amountToExchange;
    }
    const status = getOrderStatus(newOrder, bid);
    return { newOrder: { ...bid, status }, ordersModified: ordersMatched };
  },
  save: (newOrder, ordersModified) => {
    const id = newOrder.amount !== 0 ? repository.createBid(newOrder) : repository.createId();
    ordersModified
      .filter((order) => order.amount === 0)
      .forEach((order) => repository.deleteAsk(order));
    return {
      orderSaved: {
        ...newOrder,
        id,
      },
      ordersModified,
    };
  },
};

function isBid(order) {
  return order.amount > 0;
}

const getOperationsForOrder = (order) => {
  if (isBid(order)) {
    return bidOperations;
  }
  return askOperations;
};

/**
 * Engine:
 * - Look for matches
 * - do the matching
 * - save modified orders + new order (what applies to every case)
 * - return new order with ID and statusd
 */
service.orderMatching = (order) => {
  const orderOperations = getOperationsForOrder(order);

  const ordersMatched = orderOperations.lookForMatches(order);
  const { newOrder, ordersModified } = orderOperations.match(order, ordersMatched);
  const { orderSaved } = orderOperations.save(newOrder, ordersModified);
  return { ...orderSaved, amount: order.amount };
};

service.getAllOrderLists = repository.getAllOrderLists;

module.exports = service;
