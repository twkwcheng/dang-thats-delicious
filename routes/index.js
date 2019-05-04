const express = require('express');

const router = express.Router();
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { catchErrors } = require('../handlers/errorHandlers');
const reviewController = require('../controllers/reviewController');
// Do work here
router
  .get('/', catchErrors(storeController.getStores))
  .get('/stores', catchErrors(storeController.getStores))
  .get('/stores/page/:page', catchErrors(storeController.getStores))
  // .get('/', storeController.homePage)
  // .get('/', storeController.myMiddleware, storeController.homePage)
  // .get('/', (req, res) => {
  //   res.render('index');
  // })
  // .get('/', (req, res) => {
  //   // const kevin = { name: 'kevin', age: 77, cool: false };
  //   // res.send('Hey! It works!');
  //   // res.json(kevin);
  //   // res.send(req.query.name);
  //   // http://localhost:7777/?name=kevin&age=77&cool=true
  //   // res.json(req.query);
  //   // res.render('hello', { name: 'Kevin', dog: 'お元気ですか' });
  //   // http://localhost:7777?dog=genki
  //   res.render('hello', {
  //     name: req.query.name,
  //     dog: req.query.dog,
  //     title: 'I love food.',
  //   });
  // })
  // .get('/reverse/:name', (req, res) => {
  //   // res.send('this is reverse page!');
  //   // http://localhost:7777/reverse/kevin
  //   // res.send(req.params.name);
  //   const reverse = [...req.params.name].reverse().join('');
  //   res.send(reverse);
  // })
  .get('/add', authController.isLoggedIn, storeController.addStore)
  .post('/add',
    storeController.upload,
    catchErrors(storeController.resize),
    catchErrors(storeController.createStore))
  .post('/add/:id',
    storeController.upload,
    catchErrors(storeController.resize),
    catchErrors(storeController.updateStore))
  .get('/stores/:id/edit', catchErrors(storeController.editStore))
  .get('/store/:slug', catchErrors(storeController.getStoreBySlug))
  .get('/tags', catchErrors(storeController.getStoreByTag))
  .get('/tags/:tag', catchErrors(storeController.getStoreByTag))
  .get('/login', userController.loginForm)
  .post('/login', authController.login)
  .get('/register', userController.registerForm)
  // 1.驗證註冊資料
  // 2.註冊使用者
  // 3.註記已經登入
  .post('/register', userController.validateRegister, catchErrors(userController.register), authController.login)
  .get('/logout', authController.logout)
  .get('/account', authController.isLoggedIn, userController.account)
  .post('/account', catchErrors(userController.updateAccount))
  .post('/account/forgot', catchErrors(authController.forgot))
  .get('/account/reset/:token', catchErrors(authController.reset))
  .post('/account/reset/:token', authController.confirmedPasswords, catchErrors(authController.update))
  .get('/map', storeController.mapPage)
  .get('/hearts',
    authController.isLoggedIn,
    catchErrors(storeController.getHearts))
  .post('/reviews/:id',
    authController.isLoggedIn,
    catchErrors(reviewController.addReview))
  .get('/top', catchErrors(storeController.getTopStores))
  // API
  .get('/api/search', catchErrors(storeController.searchStores))
  .get('/api/stores/near', catchErrors(storeController.mapStores))
  .post('/api/stores/:id/heart', catchErrors(storeController.heartStore));
module.exports = router;
