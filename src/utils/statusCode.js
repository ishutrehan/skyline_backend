const isSuccessStatusCode = (status) => {
  return status >= 200 && status <= 299;
};

module.exports = isSuccessStatusCode;
