module.exports = {
  // Higher-order function that catches an error and sends it to next
  handleError(fn) {
    return (req, res, next) => {
      fn(req, res, next).catch(next);
    }
  }
}
