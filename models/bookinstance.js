const mongoose = require('mongoose');
const { DateTime } = require('luxon');

const { Schema } = mongoose;

const BookInstanceSchema = new Schema({
  book: { type: Schema.Types.ObjectId, ref: 'Book', required: true }, // reference to the associated book
  imprint: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'],
    default: 'Maintenance',
  },
  due_back: { type: Date, default: Date.now },
});

// Virtual for bookinstance's URL
BookInstanceSchema.virtual('url').get(function () {
  return `/catalog/bookinstance/${this._id}`;
});

// Virtual for display in 'view' due date formatted
BookInstanceSchema.virtual('due_back_formatted').get(function () {
  return DateTime.fromJSDate(this.due_back).toLocaleString(DateTime.DATE_MED);
});

// Virtual for display in 'view' due date formatted
BookInstanceSchema.virtual('due_back_JSDate').get(function () {
  return DateTime.fromJSDate(this.due_back).toFormat('yyyy-MM-dd');
});

// Export model
module.exports = mongoose.model('BookInstance', BookInstanceSchema);

/*
1- enum: This allows us to set the allowed values of a string
2- default: We We use default to set the default status for newly created bookinstances
*/
