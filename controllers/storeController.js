// exports.myMiddleware = (req, res, next) => {
//   req.name = 'Kevin';
//   if (req.name === 'Kevin') {
//     throw Error('That is a stupid name.');
//   }
//   res.cookie('name', 'kevin is not so cool', { maxAge: 90000 });
//   next();
// };
const mongoose = require('mongoose');
// 呼叫Store.js model
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    // const isPhoto = file.mimetype.startWith('image/');
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  }
};

exports.homePage = (req, res) => {
  console.log(req.name);
  req.flash('error', 'ERROR: Something Happened!');
  req.flash('error', 'ERROR: Anthor thing happen');
  req.flash('error', 'ERROR: <h1>OH NO!!!</h1>');
  req.flash('info', 'INFO: Something Happened!');
  req.flash('warning', 'WARNING: Something Happened!');
  req.flash('success', 'SUCCESS: Something Happened!');
  res.render('index');
};

exports.addStore = (req, res) => {
  // res.send('add Store works!');
  res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // 檢查是否有新的檔案可以縮小尺寸
  if (!req.file) {
    next(); // 跳到下一個 middleware
    return;
  }
  // console.log(req.file);
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // 開始縮小尺寸
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // 一旦將縮小後的照片寫入檔案系統完成後，即可繼續
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  // res.json(req.body);
  const store = await (new Store(req.body)).save();
  // await store.save();
  // console.log('It worked!');
  req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
  // res.redirect('/');
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 3; // 每頁顯示筆數
  const skip = (page * limit) - limit; // 跳過筆數
  // 1. 查詢資料庫以取得所有store列表
  // const stores = await Store
  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });
  const countPromise = Store.count();
  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if (!stores.length && skip) {
    req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  // console.log(stores);
  res.render('stores', {
    title: 'Stores',
    stores,
    page,
    pages,
    count,
  });
};

// 確認 store 修改者與作者是否同一人
const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
};

exports.editStore = async (req, res) => {
  // 1. 找到 store ID
  // res.json(req.params);
  const store = await Store.findOne({ _id: req.params.id });
  // res.json(store);
  // 2. 確認使用者擁有修改 store 權限
  confirmOwner(store, req.user);
  // 3. render 表單以便使用者可以更新資料
  res.render('editStore', { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
  // 將地點 type 設為 point
  req.body.location.type = 'Point';
  // 找到 store 並更新
  // const store = Store.findOneAndUpdate(query, data, option);
  const store = await Store.findOneAndUpdate(
    { _id: req.params.id },
    req.body,
    {
      new: true, // 回傳更新後的 store 而非更新前的 store
      runValidators: true,
    },
  ).exec();
  req.flash(
    'success',
    `Successfully updateed <strong>${store.name}</strong> <a href="/stores/${store.slug}">View Store</a>`
  );
  res.redirect(`/stores/${store._id}/edit`);
  // 轉向更新後的新 store
};

exports.getStoreBySlug = async (req, res, next) => {
  // res.send('it works!');
  // res.json(req.params);
  const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
  if (!store) return next();
  // res.json(store);
  res.render('store', { store, title: store.name });
};

exports.getStoreByTag = async (req, res, next) => {
  // res.send('it works!');
  // const tags = await Store.getTagsList();
  const { tag } = req.params;
  const tagQuery = tag || { $exists: true };

  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  // res.json(result);
  // res.json(tags);
  // res.json(stores);
  res.render('tags', {
    tags,
    title: 'Tags',
    tag,
    stores,
  });
};

exports.searchStores = async (req, res) => {
  // res.json({ it: 'Worked' });
  // res.json(req.query);
  const stores = await Store
    // 找到符合條件的店
    .find(
      {
        $text: {
          $search: req.query.q,
        }
      },
      {
        score: { $meta: 'textScore' }
      }
    )
    // 依照分數排序
    .sort(
      {
        score: { $meta: 'textScore' }
      }
    )
    // 最多只顯示五項
    .limit(5);
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  // res.json({ it: 'works' });
  // res.json(req.query);
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  // res.json(coordinates);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates
        },
        $maxDistance: 10000 // 10KM
      }
    }
  };
  const stores = await Store.find(q).select('slug name description location photo').limit(10);
  res.json(stores);
};

exports.mapPage = (req, res) => {
  // res.send({ it: 'workd!' });
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  // console.log(hearts);
  // 已經有 heart 則 $pull，否則 $addToSet，不用 $push 以免重複增加多個重複 id
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { [operator]: { hearts: req.params.id } },
    { new: true }
  );
  // res.json(hearts);
  res.json(user);
};

exports.getHearts = async (req, res) => {
  // res.json({ it: 'worked' });
  const stores = await Store.find({
    _id: { $in: req.user.hearts }
  });
  // res.json(stores);
  res.render('stores', { title: 'Hearted Stores', stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  // res.json(stores);
  res.render('topStores', { title: 'Top Stores', stores });
};
