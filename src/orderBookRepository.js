const { v4: uuid } = require('uuid');

const repository = {};

const orderBook = {
  /*
   * The structure for asks and bids will have 2 indices: by price and then by id
   * - The index by price will be used to find filtering keys the matching orders
   * - The index by id will be used to save those orders when they are modified
   *   after matching. In this case, being a local structure with objects being
   *   moved around by reference, the updates will happen directly, only deletions
   *   when an order is totally filled is needed.
   * Example:
   * asks: {
   *   100: { // Index by price
   *     abc: { price: 100, amount: 11, id: 'abc' } // Index by id
   *   }
   * },
   */
  asks: {},
  bids: {},
};

const createOrderInOrderBook = (newOrder, specificIndex) => {
  const id = uuid();
  const record = {
    id,
    price: newOrder.price,
    amount: newOrder.amount,
  };
  if (!specificIndex[newOrder.price]) {
    // eslint-disable-next-line no-param-reassign
    specificIndex[newOrder.price] = {};
  }
  // eslint-disable-next-line no-param-reassign
  specificIndex[newOrder.price][id] = record;
  return id;
};

const deleteOrderInOrderBook = (order, specificIndex) => {
  if (specificIndex[order.price]) {
    // eslint-disable-next-line no-param-reassign
    delete specificIndex[order.price][order.id];
  }
};

const filterByPrice = (specificIndex, priceFilterFn) => Object.keys(specificIndex)
  .filter(priceFilterFn)
  .map((indexPrice) => specificIndex[indexPrice])
  .map((obj) => Object.values(obj))
  .flatMap((obj) => obj);

repository.createId = uuid;

repository.createAsk = (newOrder) => createOrderInOrderBook(newOrder, orderBook.asks);
repository.createBid = (newOrder) => createOrderInOrderBook(newOrder, orderBook.bids);

repository.deleteAsk = (order) => deleteOrderInOrderBook(order, orderBook.asks);
repository.deleteBid = (order) => deleteOrderInOrderBook(order, orderBook.bids);

repository.findAsksLowerOrEqual = (price) => {
  const priceFilterFn = (indexPrice) => indexPrice <= price;
  return filterByPrice(orderBook.asks, priceFilterFn);
};

repository.findBidsGreaterOrEqual = (price) => {
  const priceFilterFn = (indexPrice) => indexPrice >= price;
  return filterByPrice(orderBook.bids, priceFilterFn);
};

const flatMapOrders = (index) => Object.values(index)
  .map((obj) => Object.values(obj))
  .flatMap((obj) => obj);

repository.getAllOrderLists = () => ({
  asks: flatMapOrders(orderBook.asks),
  bids: flatMapOrders(orderBook.bids),
});

module.exports = repository;
