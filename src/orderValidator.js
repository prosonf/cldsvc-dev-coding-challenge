const orderValidator = {};

orderValidator.validateNewOrder = (order) => {
  const errors = [];
  if (!order) {
    errors.push('No order specified');
  } else {
    if (!order.amount) {
      errors.push('Field amount is mandatory');
    } else if (typeof order.amount !== 'number') {
      errors.push('Field amount is not a number');
    } else if (Math.abs(order.amount) <= 100) {
      errors.push('Field amount should be > 100 or < 100');
    }

    if (!order.price && order.price !== 0) {
      errors.push('Field price is mandatory');
    } else if (typeof order.price !== 'number') {
      errors.push('Field price is not a number');
    } else if (order.price <= 0) {
      errors.push('Field price should be greater than 0');
    }
  }
  return errors;
};

module.exports = orderValidator;
