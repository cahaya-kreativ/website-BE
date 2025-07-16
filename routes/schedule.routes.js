const router = require("express").Router();
const { create, read, detail, update, destroy } = require("../controllers/schedule.controllers");
const { restrict } = require("../middlewares/auth.middlewares");

router.post('/schedule', restrict, create);
router.get('/schedule',restrict, read);
router.get('/schedule/:id', restrict, detail)
router.put('/schedule/:id', restrict, update);
router.delete('/schedule/:id', restrict, destroy);

module.exports = router;