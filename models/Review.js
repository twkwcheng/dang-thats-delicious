const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const reviewSchema = new mongoose.Schema({
  created: {
    type: Date,
    default: Date.now,
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    require: 'You must supply an author!',
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: 'Store',
    require: 'You must supply a store!',
  },
  text: {
    type: String,
    require: 'Your review must have text!',
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
});

function autopopulate(next) {
  this.populate('author');
  next();
}

reviewSchema.pre('find', autopopulate);
reviewSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Review', reviewSchema);
