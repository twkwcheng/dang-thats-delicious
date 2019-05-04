/* eslint-disable func-names */
const mongoose = require('mongoose');
const slug = require('slugs');

mongoose.Promise = global.Promise;
const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!',
  },
  slug: String,
  description: {
    type: String,
    trim: true,
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: {
      type: String,
      default: 'Point',
      required: '請務必提供地理位置類型',
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!',
    }],
    address: {
      type: String,
      required: 'You must supply address!',
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author',
  },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

// 定義 indexes
storeSchema.index(
  {
    name: 'text',
    description: 'text'
  }
);

storeSchema.index(
  {
    location: '2dsphere'
  }
);

// 因為會使用到this，所以不使用箭頭函式
// eslint-disable-next-line func-names
storeSchema.pre('save', async function (next) {
  // if (this.location.type) {
  //   this.location.type = 'Point';
  // }
  console.log(this.location);
  console.log(this.location.type);
  console.log(this.location.coordinates);
  console.log(this.location.address);
  if (!this.isModified('name')) {
    next(); // 未改名，跳過本段程式碼
    return;
    // return next(); // 也可以這樣寫
  }
  this.slug = slug(this.name); // 把名字裡面的空白字元用連字號接起來
  // 要讓連字後的名字為唯一，例如 unique-1, unique-2, unique-3
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
});

// eslint-disable-next-line func-names
storeSchema.statics.getTagsList = function () {
  // 回傳一個標籤一個 store 物件，若原本的 store 包含五個不同標籤，則解構成五個 store
  return this.aggregate([
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }, // 降冪排序
  ]);
};

storeSchema.statics.getTopStores = function () {
  return this.aggregate([
    // 找到所有 stores 並產生所有 reviews
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'store',
        as: 'reviews',
      }
    },
    // 過濾出兩則以上 reviews 的 stores(MongoDB 第一筆叫做reviews.0，第二筆叫做reviews.1，餘此類推)
    {
      $match: {
        'reviews.1': { $exists: true },
      }
    },
    // 新增平均 review 欄位(不能用 $addField，新版本仍不支援)
    {
      $project: {
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        reviews: '$$ROOT.reviews',
        slug: '$$ROOT.slug',
        averageRating: { $avg: '$reviews.rating' },
      }
      // $addField: {
      //   averageRating: { $avg: '$reviews.rating' },
      // }
    },
    // 依據新欄位排序，最高分排第一
    {
      $sort: {
        averageRating: -1,
      }
    },
    // 只顯示前十筆 store 排序後資料
    {
      $limit: 10
    },
  ]);
};

// 找出 stores._id === reviews.store 的 reviews
storeSchema.virtual('reviews', {
  ref: 'Review', // 參考的 model
  localField: '_id', // store._id
  foreignField: 'store', // review 上參考欄位
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
