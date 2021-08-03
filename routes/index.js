const express = require('express');

const router = express.Router();

/* Redirects to the specified page */
router.get('/', (req, res, next) => {
  res.redirect('/catalog');
});

module.exports = router;
