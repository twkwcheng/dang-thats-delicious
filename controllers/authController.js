const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');

const User = mongoose.model('User');
const promisify = require('es6-promisify');

const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
  failureRedirect: 'login',
  failureFlash: 'Failed Login!',
  successRedirect: '/',
  successFlash: 'You are now logged in!',
});

exports.logout = (req, res) => {
  req.logout();
  req.flash('success', 'You are now logged out! Bye~');
  res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
  // 檢查使用者是否已經被授權
  if (req.isAuthenticated()) {
    next(); // 繼續
    return;
  }
  req.flash('error', 'Oops you must be logged in to do that!');
  res.redirect('/login');
};

exports.forgot = async (req, res) => {
  // 1. 檢查重設密碼的 email 是否存在
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    // 為了避免被人取得 email 清單，在此最好不要顯示該帳號是否存在
    req.flash('error', 'No account with that email exists!');
    // req.flash('error', 'A password reset has been mailed to you.');
    return res.redirect('/login');
  }
  // 2. 重設該帳號的 tokens 與到期時間
  user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
  user.resetPasswordExpires = Date.now() + 3600000; // 一小時(毫秒)
  await user.save();
  // 3. 將 token 以 email 傳送
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
  await mail.send({
    user,
    subject: 'Password Reset',
    resetURL,
    filename: 'password-reset',
  });

  req.flash('success', `You have been emailed a password reset link.`);
  // 4. 重新導向 login 畫面
  res.redirect('/login');
};

exports.reset = async (req, res) => {
  // res.json(req.params);
  const user = await User.findOne({
    // 1. 是否有人取得 token
    resetPasswordToken: req.params.token,
    // 2. token 是否還在有效期限內
    resetPasswordExpires: { $gt: Date.now() }, // 資料庫的到期日已經是加上一小時
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }
  // 如果該重設密碼使用者存在，則顯示重設密碼畫面
  // console.log(user);
  res.render('reset', { title: 'Reset your Password' });
};

exports.confirmedPasswords = (req, res, next) => {
  if (req.body.password === req.body['password-confirm']) {
    next();
    return;
  }
  req.flash('error', 'Passwords do not match!');
  res.redirect('back');
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }, // 資料庫的到期日已經是加上一小時
  });
  if (!user) {
    req.flash('error', 'Password reset is invalid or has expired');
    return res.redirect('/login');
  }
  // 重設密碼寫入資料庫
  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  const updatedUser = await user.save();
  await req.login(updatedUser);
  req.flash('success', 'Nice! Your password has been reset! You are now logged in!');
  res.redirect('/');
};
