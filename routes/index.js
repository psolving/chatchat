var express = require('express');
var router = express.Router();
var authCtrl = require('../controllers/AuthCtrl');
var tutorsCtrl = require('../controllers/TutorsCtrl');
var historyCtrl = require('../controllers/HistoryCtrl');
var profileCtrl = require('../controllers/ProfileCtrl');
var middlewares = require('../controllers/middlewares');
var panelCtrl = require('../controllers/PanelCtrl');

/* GET home page. */
router.get('/', function(req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/tutors')
  } else {
    return res.render('index', { title: 'Express' });
  }
  
});

router.get('/login', authCtrl.login);
router.post('/login', authCtrl.loginPost);
router.get('/logout', authCtrl.logout);
router.get('/register', authCtrl.register);
router.post('/register', authCtrl.registerPost);


router.get('/tutors', middlewares.isAuthenticated, tutorsCtrl.searchIndex);
router.get('/tutors/:id', middlewares.isAuthenticated, tutorsCtrl.profile);
router.post('/tutors/:id/request', middlewares.isAuthenticated, tutorsCtrl.checkout);
router.post('/charge/:tutorId', middlewares.isAuthenticated, tutorsCtrl.sessionReq);
router.get('/golive', middlewares.isAuthenticated, tutorsCtrl.goLive);

router.get('/history', middlewares.isAuthenticated, historyCtrl.index);

router.get('/myprofile', middlewares.isAuthenticated, profileCtrl.index);

router.get('/panel/setting', middlewares.isAuthenticated, panelCtrl.settingIndex);
router.post('/panel/setting/:id', middlewares.isAuthenticated, panelCtrl.settingPost);


module.exports = router;
