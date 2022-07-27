const request = require('supertest');
const app = require('../app');
const repository = require('../orderBookRepository');

/* eslint-disable no-undef */
describe('app', () => {
  afterEach(() => {
    const orders = repository.getAllOrderLists();
    orders.asks
      .forEach(repository.deleteAsk);
    orders.bids
      .forEach(repository.deleteBid);
  });

  describe('GET /orderbook', () => {
    it('should return an empty orderBook', () => {
      const expectedResult = {
        asks: [],
        bids: [],
      };
      return request(app)
        .get('/orderbook')
        .expect(200)
        .then((response) => {
          expect(response.body)
            .toEqual(expectedResult);
        });
    });

    it('should return an orderBook with asks & bids', () => {
      const ask = {
        price: 100,
        amount: -11,
      };
      const bid = {
        price: 100,
        amount: 12,
      };
      const expectedResult = {
        asks: [{
          ...ask,
          id: expect.any(String),
        }],
        bids: [{
          ...bid,
          id: expect.any(String),
        }],
      };

      repository.createAsk(ask);
      repository.createBid(bid);

      return request(app)
        .get('/orderbook')
        .expect(200)
        .then((response) => {
          expect(response.body)
            .toEqual(expectedResult);
        });
    });
  });

  describe('POST /order/submit', () => {
    describe('Validations', () => {
      it('should validate that amount and prices fields exist', () => {
        const emptyPayload = {};
        return request(app)
          .post('/order/submit')
          .send(emptyPayload)
          .expect(400)
          .then((response) => {
            expect(response.body.errors)
              .toEqual([
                'Field amount is mandatory',
                'Field price is mandatory',
              ]);
          });
      });

      it('should validate that amount and prices fields types are correct', () => {
        const ask = {
          amount: 'wrong type',
          price: 'wrong type',
        };
        return request(app)
          .post('/order/submit')
          .send(ask)
          .expect(400)
          .then((response) => {
            expect(response.body.errors)
              .toEqual([
                'Field amount is not a number',
                'Field price is not a number',
              ]);
          });
      });

      it('should validate that amount is not between 100 and -100', () => {
        const ask = {
          amount: 10,
          price: 1,
        };
        return request(app)
          .post('/order/submit')
          .send(ask)
          .expect(400)
          .then((response) => {
            expect(response.body.errors)
              .toEqual([
                'Field amount should be > 100 or < 100',
              ]);
          });
      });

      it('should validate that price is greater than 0', () => {
        const ask = {
          amount: 1000,
          price: 0,
        };
        return request(app)
          .post('/order/submit')
          .send(ask)
          .expect(400)
          .then((response) => {
            expect(response.body.errors)
              .toEqual([
                'Field price should be greater than 0',
              ]);
          });
      });
    });

    it('should accept an initial ask order as pending', () => {
      const ask = {
        amount: -200,
        price: 190,
      };
      return request(app)
        .post('/order/submit')
        .send(ask)
        .expect(200)
        .then((response) => {
          expect(response.body)
            .toEqual(expect.objectContaining({
              ...ask,
              id: expect.any(String),
              status: 'PENDING',
            }));
        });
    });

    it('should accept an ask order and filled it', async () => {
      // Given
      const bid = {
        amount: 110,
        price: 100,
      };
      repository.createBid(bid);

      const ask = {
        amount: -110,
        price: 90,
      };

      // When
      await request(app)
        .post('/order/submit')
        .send(ask)
        .expect(200)
        .then((response) => {
          expect(response.body)
            .toEqual(expect.objectContaining({
              ...ask,
              id: expect.any(String),
              status: 'FILLED',
            }));
        });

      // Then
      expect(repository.getAllOrderLists())
        .toEqual({ asks: [], bids: [] });
    });

    it('should accept an ask order and filled it partially', async () => {
      // Given
      const bid = {
        amount: 1000,
        price: 100,
      };
      repository.createBid(bid);

      const ask = {
        amount: -10000,
        price: 90,
      };

      // When
      await request(app)
        .post('/order/submit')
        .send(ask)
        .expect(200)
        .then((response) => {
          expect(response.body)
            .toEqual(expect.objectContaining({
              ...ask,
              id: expect.any(String),
              status: 'PARTIALLY_FILLED',
            }));
        });

      // Then
      expect(repository.getAllOrderLists())
        .toEqual({
          asks: [expect.objectContaining({
            ...ask,
            amount: ask.amount + bid.amount,
            id: expect.any(String),
          })],
          bids: [],
        });
    });

    it('should match an ask order with bids in order', async () => {
      // Given
      const bid1 = {
        amount: 1000,
        price: 100,
      };
      const bid2 = {
        amount: 1000,
        price: 110,
      };
      repository.createBid(bid1);
      const idBid2 = repository.createBid(bid2);

      const ask = {
        amount: -1500,
        price: 90,
      };

      // When
      await request(app)
        .post('/order/submit')
        .send(ask)
        .expect(200)
        .then((response) => {
          expect(response.body)
            .toEqual(expect.objectContaining({
              ...ask,
              id: expect.any(String),
              status: 'FILLED',
            }));
        });

      // Then
      expect(repository.getAllOrderLists())
        .toEqual({
          asks: [],
          bids: [expect.objectContaining({
            ...bid2,
            amount: 500,
            id: idBid2,
          })],
        });
    });

    it('should accept an initial bid as pending', () => {
      const bid = {
        amount: 200,
        price: 190,
      };
      return request(app)
        .post('/order/submit')
        .send(bid)
        .expect(200)
        .then((response) => {
          expect(response.body)
            .toEqual(expect.objectContaining({
              ...bid,
              id: expect.any(String),
              status: 'PENDING',
            }));
        });
    });

    it('should accept a bid order and filled it', async () => {
      // Given
      const ask = {
        amount: -110,
        price: 90,
      };
      repository.createAsk(ask);

      const bid = {
        amount: 110,
        price: 100,
      };

      // When
      await request(app)
        .post('/order/submit')
        .send(bid)
        .expect(200)
        .then((response) => {
          expect(response.body)
            .toEqual(expect.objectContaining({
              ...bid,
              id: expect.any(String),
              status: 'FILLED',
            }));
        });

      // Then
      expect(repository.getAllOrderLists())
        .toEqual({ asks: [], bids: [] });
    });

    it('should accept a bid order and filled it partially', async () => {
      // Given
      const ask = {
        amount: -500,
        price: 90,
      };
      repository.createAsk(ask);

      const bid = {
        amount: 1000,
        price: 100,
      };

      // When
      await request(app)
        .post('/order/submit')
        .send(bid)
        .expect(200)
        .then((response) => {
          expect(response.body)
            .toEqual(expect.objectContaining({
              ...bid,
              id: expect.any(String),
              status: 'PARTIALLY_FILLED',
            }));
        });

      // Then
      expect(repository.getAllOrderLists())
        .toEqual({
          asks: [],
          bids: [expect.objectContaining({
            ...bid,
            amount: ask.amount + bid.amount,
            id: expect.any(String),
          })],
        });
    });

    it('should match a bid order with asks in order', async () => {
      // Given
      const ask1 = {
        amount: -1000,
        price: 80,
      };
      const ask2 = {
        amount: -1000,
        price: 90,
      };
      repository.createAsk(ask1);
      const idAsk2 = repository.createAsk(ask2);

      const bid = {
        amount: 1500,
        price: 100,
      };

      // When
      await request(app)
        .post('/order/submit')
        .send(bid)
        .expect(200)
        .then((response) => {
          expect(response.body)
            .toEqual(expect.objectContaining({
              ...bid,
              id: expect.any(String),
              status: 'FILLED',
            }));
        });

      // Then
      expect(repository.getAllOrderLists())
        .toEqual({
          asks: [expect.objectContaining({
            ...ask2,
            amount: -500,
            id: idAsk2,
          })],
          bids: [],
        });
    });
  });
});
