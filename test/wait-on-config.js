module.exports = {
  validateStatus: function (status) {
    return status >= 200 && status < 400
  },
  followRedirect: false
}
