const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');

router.get('/',             ctrl.getAll);
router.post('/calculate',   ctrl.calculate);
router.post('/',            ctrl.upsert);
router.delete('/:id',       ctrl.remove);

module.exports = router;
